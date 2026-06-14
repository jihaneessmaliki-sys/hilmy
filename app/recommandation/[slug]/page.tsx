import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  RecommandationDetail,
  type RecoView,
  type VideoEntry,
} from '@/components/v2/RecommandationDetail'
import { RecommandationDetailPublic } from '@/components/v2/RecommandationDetailPublic'
import type { Lieu as MockLieu } from '@/lib/mock-data'
import {
  getPlaceBySlug,
  getPlacesByCategorie,
} from '@/lib/supabase/queries/places'
import {
  getPublicPlaceDetail,
  getPublicPlaceRecos,
  getPublicSimilar,
} from '@/lib/supabase/queries/places-public'
import { getRecommendationsByPlace } from '@/lib/supabase/queries/recommendations'
import { getPlaceVideos } from '@/lib/supabase/queries/videos'
import { getUserGamificationByUserIds } from '@/lib/supabase/queries/gamification'
import type { GamificationStatut } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/server'
import type { Place, Recommendation } from '@/lib/supabase/types'
import { DIET_TAGS_MAP, dietTagLabel, recTagLabel } from '@/lib/constants'

const AVATAR_PALETTE = ['#B8C7B0', '#D9C9A8', '#C4B8D4', '#E8C5B5', '#A8C4C9', '#D4B8A8']

function avatarFor(userId: string) {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function relativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.round(diffMs / 86_400_000)
  if (days < 1) return "aujourd'hui"
  if (days < 7) return `il y a ${days} j`
  if (days < 30) {
    const w = Math.round(days / 7)
    return `il y a ${w} sem.`
  }
  if (days < 365) {
    const m = Math.round(days / 30)
    return `il y a ${m} mois`
  }
  const y = Math.round(days / 365)
  return `il y a ${y} an${y > 1 ? 's' : ''}`
}

function adaptDbPlace(p: Place): MockLieu {
  const photosArr =
    Array.isArray(p.photos) && p.photos.length > 0
      ? (p.photos as string[])
      : p.main_photo_url
        ? [p.main_photo_url]
        : []
  const cover = photosArr[0] && photosArr[0].startsWith('#') ? photosArr[0] : '#EEE6D8'
  return {
    slug: p.slug ?? p.id,
    nom: p.name,
    categorie: p.hilmy_category ?? 'restos-cafes',
    ville: p.city ?? '',
    adresse: p.address ?? '',
    description: p.description ?? '',
    cover,
    galerie: photosArr,
    recommandePar: [],
    commentaires: [],
  }
}

// SEO — métadonnées rendues côté serveur depuis la vue publique anon-safe.
// Aucune donnée perso (nom du lieu, ville, description éditoriale).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const detail = await getPublicPlaceDetail(slug)
  if (!detail) return { title: 'Recommandation · Hilmy' }
  const title = `${detail.name}${detail.city ? ` · ${detail.city}` : ''} — recommandé sur Hilmy`
  const description =
    detail.description?.slice(0, 155) ??
    `${detail.name}${detail.city ? ` à ${detail.city}` : ''}, recommandé par la communauté Hilmy.`
  const url = `/recommandation/${encodeURIComponent(slug)}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      ...(detail.main_photo_url ? { images: [detail.main_photo_url] } : {}),
    },
  }
}

export default async function RecommandationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Branche ANONYME ────────────────────────────────────────────────
  // Pas de session → rendu public allégé, branché UNIQUEMENT sur les vues
  // anon-safe (place_public_detail / place_public_recos), jamais les tables.
  // Le composant public ne connaît AUCUNE identité (cf. RecommandationDetailPublic).
  if (!user) {
    const detail = await getPublicPlaceDetail(slug)
    if (!detail) notFound()
    const [recos, similaires] = await Promise.all([
      getPublicPlaceRecos(slug),
      getPublicSimilar(detail.hilmy_category, slug),
    ])
    return (
      <RecommandationDetailPublic
        detail={detail}
        recos={recos}
        similaires={similaires}
      />
    )
  }

  // ── Branche CONNECTÉE (rendu riche existant, inchangé) ──────────────
  const { data: row, error } = await getPlaceBySlug(slug)
  if (error || !row) notFound()
  const l: MockLieu = adaptDbPlace(row)

  // Fetch des vidéos du lieu (mig 43 PR-3) — public read OK via RLS.
  const { data: videos } = await getPlaceVideos(row.id)
  const videoEntries: VideoEntry[] = (videos ?? []).map((v) => {
    const videoUrl = supabase.storage.from('place-videos').getPublicUrl(v.storage_path).data.publicUrl
    const thumbnailUrl = v.thumbnail_storage_path
      ? supabase.storage.from('place-videos').getPublicUrl(v.thumbnail_storage_path).data.publicUrl
      : null
    return {
      id: v.id,
      videoUrl,
      thumbnailUrl,
      durationSeconds: v.duration_seconds,
    }
  })

  // Fetch les recommandations publiées pour ce lieu + leurs autrices.
  const { data: recos } = await getRecommendationsByPlace(row.id)
  const recoRows = (recos ?? []) as Recommendation[]
  const userIds = Array.from(new Set(recoRows.map((r) => r.user_id)))
  const profilesById = new Map<
    string,
    {
      prenom: string
      is_copine: boolean | null
      copine_since: string | null
    }
  >()
  // Pré-fetch gamif batch (Sprint U1.5) — 1 RPC sur la vue user_gamification
  // pour tous les auteurs en parallèle des prenoms. RLS authenticated read OK.
  // Phase 6 : on ajoute is_copine + copine_since pour le badge MemberName.
  let gamifByUser = new Map<string, { statut: GamificationStatut }>()
  if (userIds.length > 0) {
    const [{ data: profs }, gamifMap] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('user_id, prenom, is_copine, copine_since')
        .in('user_id', userIds),
      getUserGamificationByUserIds(userIds),
    ])
    for (const p of (profs ?? []) as Array<{
      user_id: string
      prenom: string
      is_copine: boolean | null
      copine_since: string | null
    }>) {
      profilesById.set(p.user_id, {
        prenom: p.prenom,
        is_copine: p.is_copine ?? null,
        copine_since: p.copine_since ?? null,
      })
    }
    // On ne garde que le statut côté view-model (le reste pas utile ici)
    gamifByUser = new Map(
      Array.from(gamifMap.entries()).map(([uid, g]) => [uid, { statut: g.statut }]),
    )
  }
  const recoViews: RecoView[] = recoRows.map((r) => {
    const rawTags = r.tags ?? []
    const diets = rawTags.filter((t) => t in DIET_TAGS_MAP).map((t) => dietTagLabel(t))
    const tags = rawTags.filter((t) => !(t in DIET_TAGS_MAP)).map((t) => recTagLabel(t))
    const profile = profilesById.get(r.user_id)
    return {
      id: r.id,
      prenom: profile?.prenom ?? 'Une copine',
      avatar: avatarFor(r.user_id),
      date: relativeDate(r.created_at),
      rating: r.rating,
      comment: r.comment ?? '',
      tags,
      diets,
      priceIndicator: r.price_indicator,
      photos: r.photo_urls ?? [],
      statut: gamifByUser.get(r.user_id)?.statut ?? null,
      isCopine: profile?.is_copine ?? null,
      copineSince: profile?.copine_since ?? null,
    }
  })

  let similaires: MockLieu[] = []
  if (row.hilmy_category) {
    const { data: rowsSim } = await getPlacesByCategorie(row.hilmy_category)
    similaires = (rowsSim ?? [])
      .filter((x) => (x.slug ?? x.id) !== slug)
      .slice(0, 3)
      .map(adaptDbPlace)
  }

  return (
    <RecommandationDetail
      l={l}
      row={row}
      recoViews={recoViews}
      videoEntries={videoEntries}
      similaires={similaires}
    />
  )
}
