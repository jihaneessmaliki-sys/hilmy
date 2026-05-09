import { PageShell } from '@/components/v2/PageShell'
import { PageHero } from '@/components/v2/PageHero'
import { LiveErrorState } from '@/components/v2/LiveStates'
import {
  categoriesPrestataires,
  type Prestataire as MockPrestataire,
} from '@/lib/mock-data'
import { getAllPrestataires } from '@/lib/supabase/queries/prestataires'
import { getProfileIdsWithVideos } from '@/lib/supabase/queries/videos'
import { getActiveSeasonalLabelsBatch } from '@/lib/supabase/queries/seasonal-boosts'
import type { Prestataire as DbPrestataire } from '@/lib/supabase/types'
import { AnnuaireClient } from './AnnuaireClient'

/**
 * Tri prioritaire annuaire :
 *  1. Boostés (auto-boost saisonnier actif PR-D mig 44) en haut
 *  2. Puis Cercle Pro avant Premium avant Standard
 *  3. À tier égal, ordre serveur (approved_at desc, déterministe)
 *
 * Le palier reçu ici est déjà le palier EFFECTIF (founders mappées à
 * cercle_pro côté server query helper) — donc les founders rankent
 * automatiquement en tête sans logique supplémentaire.
 *
 * Array.prototype.sort est stable en JS depuis ES2019 → tri secondaire
 * approved_at desc préservé naturellement.
 */
const PALIER_RANK: Record<string, number> = {
  cercle_pro: 0,
  premium: 1,
  standard: 2,
}

function sortByBoostThenPalier(list: MockPrestataire[]): MockPrestataire[] {
  return [...list].sort((a, b) => {
    // Boostés (active_boost non null) en haut
    const aBoosted = a.active_boost ? 0 : 1
    const bBoosted = b.active_boost ? 0 : 1
    if (aBoosted !== bBoosted) return aBoosted - bBoosted
    // Tie-break sur palier
    const ra = PALIER_RANK[a.palier ?? 'standard'] ?? 2
    const rb = PALIER_RANK[b.palier ?? 'standard'] ?? 2
    return ra - rb
  })
}

// Adapte une ligne DB profiles → shape attendue par PrestataireCard (même shape que mock).
function adaptPrestataireFromDb(p: DbPrestataire): MockPrestataire {
  const galerie =
    Array.isArray(p.galerie) && p.galerie.length > 0
      ? (p.galerie as string[])
      : Array.isArray(p.photos) && p.photos.length > 0
        ? p.photos
        : []
  const metier =
    categoriesPrestataires.find((c) => c.slug === p.categorie)?.label ??
    p.categorie
  const coverColor =
    galerie[0] && galerie[0].startsWith('#') ? galerie[0] : '#D4C5B0'

  return {
    slug: p.slug,
    nom: p.nom,
    metier,
    categorie: p.categorie,
    ville: p.ville,
    note: p.note_moyenne ?? 0,
    avis: p.nb_avis ?? 0,
    prix: (p.prix_gamme as '€' | '€€' | '€€€') ?? '€€',
    cover: coverColor,
    tagline: p.tagline ?? p.description ?? '',
    bio: p.description ?? '',
    services: Array.isArray(p.services) ? p.services : [],
    galerie,
    tarifsDe: p.prix_from ?? 0,
    palier: p.palier,
  }
}

// SSR : on fetch côté serveur via getAllPrestataires() qui strippe is_founder
// et retourne le palier effectif. Aucune donnée brute is_founder ne transite
// dans le bundle ni dans la JSON envoyée au client.
export default async function AnnuairePage() {
  const { data, error } = await getAllPrestataires()

  if (error) {
    return (
      <PageShell>
        <PageHero
          number="01"
          kicker="L'annuaire"
          titre={<>L&apos;annuaire</>}
        />
        <LiveErrorState message={error} retryHref="/annuaire" />
      </PageShell>
    )
  }

  const rows = data ?? []

  // Pré-fetch batch (évite N+1) :
  //  - vidéos → badge ▶ VIDÉO (PR-3 mig 43)
  //  - active boost → badge saisonnier top-left (PR-D mig 44)
  const ids = rows.map((p) => p.id)
  const [idsWithVideos, activeBoosts] = await Promise.all([
    getProfileIdsWithVideos(ids),
    getActiveSeasonalLabelsBatch(ids),
  ])

  const adapted = rows.map((p) => ({
    ...adaptPrestataireFromDb(p),
    has_videos: idsWithVideos.has(p.id),
    active_boost: activeBoosts.get(p.id) ?? null,
  }))
  const sorted = sortByBoostThenPalier(adapted)

  return <AnnuaireClient prestataires={sorted} />
}
