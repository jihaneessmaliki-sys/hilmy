import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUuid } from '@/lib/tracking'

export const runtime = 'nodejs'

/**
 * DELETE /api/videos/[id]?type=prestataire|lieu
 *
 * Supprime une vidéo + son thumbnail Storage + son row BDD.
 * Auth + ownership check obligatoire.
 *
 * Best-effort sur le DELETE Storage : si le fichier n'existe plus
 * (déjà delete par Supabase ON DELETE CASCADE par exemple), on ignore.
 *
 * Le query param ?type est obligatoire pour savoir quelle table cibler.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'id invalide' }, { status: 400 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  if (type !== 'prestataire' && type !== 'lieu') {
    return NextResponse.json(
      { error: 'Query param ?type=prestataire|lieu requis.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifiée' }, { status: 401 })
  }

  // Ownership check : on JOIN profiles/places pour vérifier
  // user_id / created_by_user_id correspond à l'utilisateur courant.
  if (type === 'prestataire') {
    const { data: video } = await supabase
      .from('profile_videos')
      .select(
        'id, storage_path, thumbnail_storage_path, profile:profiles!inner(user_id)',
      )
      .eq('id', id)
      .maybeSingle()
    if (!video) {
      return NextResponse.json({ error: 'Vidéo introuvable.' }, { status: 404 })
    }
    const ownerUserId = Array.isArray(video.profile)
      ? video.profile[0]?.user_id
      : (video.profile as { user_id?: string } | null)?.user_id
    if (ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "Tu n'es pas owner de cette vidéo." },
        { status: 403 },
      )
    }

    await deleteStorageFiles(
      'profile-videos',
      video.storage_path,
      video.thumbnail_storage_path,
    )

    const admin = createAdminClient()
    const { error } = await admin.from('profile_videos').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return new NextResponse(null, { status: 204 })
  }

  // type === 'lieu'
  const { data: video } = await supabase
    .from('place_videos')
    .select(
      'id, storage_path, thumbnail_storage_path, place:places!inner(created_by_user_id)',
    )
    .eq('id', id)
    .maybeSingle()
  if (!video) {
    return NextResponse.json({ error: 'Vidéo introuvable.' }, { status: 404 })
  }
  const ownerUserId = Array.isArray(video.place)
    ? video.place[0]?.created_by_user_id
    : (video.place as { created_by_user_id?: string } | null)?.created_by_user_id
  if (ownerUserId !== user.id) {
    return NextResponse.json(
      { error: "Tu n'es pas owner de cette vidéo." },
      { status: 403 },
    )
  }

  await deleteStorageFiles(
    'place-videos',
    video.storage_path,
    video.thumbnail_storage_path,
  )

  const admin = createAdminClient()
  const { error } = await admin.from('place_videos').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}

/**
 * Supprime vidéo + thumbnail du bucket. Best-effort (silent fail si
 * fichier déjà absent — race condition possible avec ON DELETE CASCADE
 * ou un cleanup cron).
 */
async function deleteStorageFiles(
  bucket: 'profile-videos' | 'place-videos',
  videoPath: string,
  thumbnailPath: string | null,
) {
  try {
    const admin = createAdminClient()
    const paths = [videoPath]
    if (thumbnailPath) paths.push(thumbnailPath)
    await admin.storage.from(bucket).remove(paths)
  } catch (err) {
    // Best-effort : on log mais on continue le DELETE BDD
    console.error('[videos delete] storage cleanup failed', err)
  }
}
