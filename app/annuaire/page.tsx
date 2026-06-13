import type { Metadata } from 'next'
import { PageShell } from '@/components/v2/PageShell'
import { PageHero } from '@/components/v2/PageHero'
import { LiveErrorState } from '@/components/v2/LiveStates'
import {
  categoriesPrestataires,
  type Prestataire as MockPrestataire,
} from '@/lib/mock-data'
import { getAllPrestataires } from '@/lib/supabase/queries/prestataires'
import { getProfileIdsWithVideos } from '@/lib/supabase/queries/videos'
import type { Prestataire as DbPrestataire } from '@/lib/supabase/types'
import { AnnuaireClient } from './AnnuaireClient'

export const metadata: Metadata = {
  title: 'Annuaire prestataires francophones',
  description:
    'Découvre les adresses Hilmy : coiffeuses, esthéticiennes, événementiels, lieux. Sélectionnées par et pour les copines francophones en Suisse, France, Belgique.',
  alternates: { canonical: '/annuaire' },
  openGraph: {
    title: 'Hilmy — Annuaire prestataires',
    description:
      'Coiffeuses, esthéticiennes, événementiels, lieux. Recommandées entre copines francophones.',
    url: '/annuaire',
    siteName: 'Hilmy',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/images/hero.jpg', width: 1200, height: 630, alt: 'Hilmy annuaire' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hilmy — Annuaire prestataires',
    description: 'Coiffeuses, événementiels, lieux. Recommandées entre copines.',
    images: ['/images/hero.jpg'],
  },
}

/**
 * Tri prioritaire annuaire (Cercle Pro 99€/mois — feature "Mise en avant prio").
 * Cercle Pro apparaît avant Premium qui apparaît avant Standard.
 * À tier égal, on conserve l'ordre serveur (approved_at desc, déterministe).
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

function sortByPalierThenServerOrder(list: MockPrestataire[]): MockPrestataire[] {
  return [...list].sort((a, b) => {
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
    pays: p.pays ?? null,
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
export default async function AnnuairePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string }>
}) {
  const sp = await searchParams
  const initialQuery = sp.q ?? ''
  const initialCategorie = sp.categorie ?? 'all'

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

  // Pré-fetch en batch des IDs prestataires qui ont au moins 1 vidéo
  // (évite N+1 sur le badge ▶ VIDÉO côté card). Mig 43 PR-3.
  const idsWithVideos = await getProfileIdsWithVideos(rows.map((p) => p.id))

  const adapted = rows.map((p) => ({
    ...adaptPrestataireFromDb(p),
    has_videos: idsWithVideos.has(p.id),
  }))
  const sorted = sortByPalierThenServerOrder(adapted)

  return (
    <AnnuaireClient
      prestataires={sorted}
      initialQuery={initialQuery}
      initialCategorie={initialCategorie}
    />
  )
}
