import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isValidUuid } from '@/lib/tracking'
import {
  insertProfileVideoAdmin,
  insertPlaceVideoAdmin,
} from '@/lib/supabase/queries/videos'
import {
  canUploadVideo,
  canUploadPlaceVideo,
  getVideoDurationCap,
  getPlaceVideoDurationCap,
} from '@/lib/palier-limits'
import { getEffectivePalier } from '@/lib/permissions'
import { getEffectivePalierLieu } from '@/lib/permissions-lieux'

export const runtime = 'nodejs'

/**
 * POST /api/videos/upload
 *
 * Body: {
 *   profile_id?: string (uuid),
 *   place_id?: string (uuid),
 *   storage_path: string,
 *   thumbnail_storage_path?: string | null,
 *   duration_seconds: number (1-90),
 *   size_bytes: number (1 - 52428800)
 * }
 *
 * Le client a DÉJÀ uploadé le fichier vidéo + thumbnail dans Storage
 * (bucket profile-videos ou place-videos). Cet endpoint :
 *   1. Vérifie ownership (profile.user_id ou place.created_by_user_id)
 *   2. Vérifie palier autorise vidéos + duration_seconds <= cap palier
 *   3. Vérifie count(videos) < cap palier (cap nombre, pas trigger SQL)
 *   4. INSERT BDD via admin client (bypass RLS, on a validé manuellement)
 *
 * Retourne 201 + le row ou 4xx avec erreur lisible côté UI.
 *
 * XOR profile_id/place_id : exactement un des deux doit être fourni.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'videos-upload',
    max: 10,
    windowMs: 60 * 1000,
  })
  if (limited) return limited

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifiée' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 })
  }

  const {
    profile_id,
    place_id,
    storage_path,
    thumbnail_storage_path,
    duration_seconds,
    size_bytes,
  } = body as Record<string, unknown>

  // ─── XOR profile_id / place_id ────────────────────────────────────
  const hasProfile = typeof profile_id === 'string' && profile_id.length > 0
  const hasPlace = typeof place_id === 'string' && place_id.length > 0
  if (hasProfile === hasPlace) {
    return NextResponse.json(
      { error: 'Fournis profile_id OU place_id, exactement un des deux.' },
      { status: 400 },
    )
  }
  if (hasProfile && !isValidUuid(profile_id)) {
    return NextResponse.json({ error: 'profile_id invalide.' }, { status: 400 })
  }
  if (hasPlace && !isValidUuid(place_id)) {
    return NextResponse.json({ error: 'place_id invalide.' }, { status: 400 })
  }

  // ─── Validate other fields ────────────────────────────────────────
  if (typeof storage_path !== 'string' || storage_path.length === 0) {
    return NextResponse.json({ error: 'storage_path requis.' }, { status: 400 })
  }
  if (
    typeof duration_seconds !== 'number' ||
    !Number.isFinite(duration_seconds) ||
    duration_seconds <= 0 ||
    duration_seconds > 90
  ) {
    return NextResponse.json(
      { error: 'duration_seconds doit être entre 1 et 90.' },
      { status: 400 },
    )
  }
  if (
    typeof size_bytes !== 'number' ||
    !Number.isFinite(size_bytes) ||
    size_bytes <= 0 ||
    size_bytes > 52428800
  ) {
    return NextResponse.json(
      { error: 'size_bytes invalide (max 50 MB).' },
      { status: 400 },
    )
  }
  const thumbPath =
    typeof thumbnail_storage_path === 'string' && thumbnail_storage_path.length > 0
      ? thumbnail_storage_path
      : null

  // ─── Branche prestataire ──────────────────────────────────────────
  if (hasProfile) {
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, user_id, palier, is_founder')
      .eq('id', profile_id as string)
      .maybeSingle()

    if (pErr || !profile) {
      return NextResponse.json(
        { error: 'Prestataire introuvable.' },
        { status: 404 },
      )
    }
    if (profile.user_id !== user.id) {
      return NextResponse.json(
        { error: "Tu n'es pas owner de cette fiche." },
        { status: 403 },
      )
    }

    const palier = getEffectivePalier(profile)
    const durationCap = getVideoDurationCap(palier)
    if (durationCap === 0) {
      return NextResponse.json(
        { error: 'Ton palier ne te permet pas d\'ajouter une vidéo.' },
        { status: 403 },
      )
    }
    const durSec = duration_seconds as number
    if (durSec > durationCap) {
      return NextResponse.json(
        {
          error: `Cette vidéo dépasse ${durationCap}s autorisées sur ton palier.`,
        },
        { status: 422 },
      )
    }

    // Check count cap
    const { count } = await supabase
      .from('profile_videos')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile_id as string)
    const currentCount = count ?? 0
    if (!canUploadVideo(palier, currentCount)) {
      return NextResponse.json(
        { error: 'Tu as atteint ta limite de vidéos pour ce palier.' },
        { status: 422 },
      )
    }

    const { data, error } = await insertProfileVideoAdmin({
      profile_id: profile_id as string,
      storage_path: storage_path as string,
      thumbnail_storage_path: thumbPath,
      duration_seconds: durSec,
      size_bytes: size_bytes as number,
    })

    if (error || !data) {
      return NextResponse.json(
        { error: error || 'Insertion échouée' },
        { status: 500 },
      )
    }
    return NextResponse.json(data, { status: 201 })
  }

  // ─── Branche lieu ─────────────────────────────────────────────────
  const { data: place, error: lErr } = await supabase
    .from('places')
    .select('id, created_by_user_id, palier')
    .eq('id', place_id as string)
    .maybeSingle()

  if (lErr || !place) {
    return NextResponse.json({ error: 'Lieu introuvable.' }, { status: 404 })
  }
  if (place.created_by_user_id !== user.id) {
    return NextResponse.json(
      { error: "Tu n'es pas owner de ce lieu." },
      { status: 403 },
    )
  }

  const palierLieu = getEffectivePalierLieu(place)
  const durationCap = getPlaceVideoDurationCap(palierLieu)
  if (durationCap === 0) {
    return NextResponse.json(
      { error: 'Le palier de ce lieu ne permet pas d\'ajouter une vidéo.' },
      { status: 403 },
    )
  }
  const durSec = duration_seconds as number
  if (durSec > durationCap) {
    return NextResponse.json(
      {
        error: `Cette vidéo dépasse ${durationCap}s autorisées sur ce palier.`,
      },
      { status: 422 },
    )
  }

  const { count } = await supabase
    .from('place_videos')
    .select('id', { count: 'exact', head: true })
    .eq('place_id', place_id as string)
  const currentCount = count ?? 0
  if (!canUploadPlaceVideo(palierLieu, currentCount)) {
    return NextResponse.json(
      { error: 'Ce lieu a atteint sa limite de vidéos.' },
      { status: 422 },
    )
  }

  const { data, error } = await insertPlaceVideoAdmin({
    place_id: place_id as string,
    storage_path: storage_path as string,
    thumbnail_storage_path: thumbPath,
    duration_seconds: durSec,
    size_bytes: size_bytes as number,
  })

  if (error || !data) {
    return NextResponse.json(
      { error: error || 'Insertion échouée' },
      { status: 500 },
    )
  }
  return NextResponse.json(data, { status: 201 })
}
