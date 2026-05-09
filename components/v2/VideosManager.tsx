'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadVideo } from '@/components/v2/UploadVideo'
import { VideoPlayer } from '@/components/v2/VideoPlayer'
import {
  canUploadVideo,
  canUploadPlaceVideo,
  getVideoDurationCap,
  getPlaceVideoDurationCap,
  videoCountLabel,
  placeVideoCountLabel,
} from '@/lib/palier-limits'
import type { Palier } from '@/app/tarifs/_lib/pricing'
import type { LieuPalier } from '@/lib/permissions-lieux'

type VideoRow = {
  id: string
  storage_path: string
  thumbnail_storage_path: string | null
  duration_seconds: number
  size_bytes: number
}

interface BaseProps {
  /** UUID owner du fichier Storage (= profile.user_id ou place.created_by_user_id). */
  userId: string
}

type Props =
  | (BaseProps & {
      scope: 'prestataire'
      profileId: string
      palier: Palier
    })
  | (BaseProps & {
      scope: 'lieu'
      placeId: string
      palier: LieuPalier
    })

/**
 * Section UI "Mes vidéos" partagée entre dashboard prestataire fiche
 * et dashboard lieu détail. Gère :
 *   - Fetch initial des vidéos existantes
 *   - Affichage VideoPlayer pour chacune
 *   - Bouton "Supprimer" par vidéo
 *   - Bouton UploadVideo si palier autorise + sous le cap count
 *   - Mode "non autorisé" avec invitation à upgrader si palier=standard
 *     ou palier=aucun
 *
 * Toutes les writes vidéo passent par les API routes /api/videos/*
 * qui ré-valident palier + ownership server-side.
 */
export function VideosManager(props: Props) {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isPresta = props.scope === 'prestataire'
  const bucket = isPresta ? 'profile-videos' : 'place-videos'
  const supabaseTable = isPresta ? 'profile_videos' : 'place_videos'
  const fkColumn = isPresta ? 'profile_id' : 'place_id'
  const fkValue = isPresta ? props.profileId : props.placeId

  const fetchVideos = async () => {
    const supabase = createClient()
    const { data, error: fetchErr } = await supabase
      .from(supabaseTable)
      .select('id, storage_path, thumbnail_storage_path, duration_seconds, size_bytes')
      .eq(fkColumn, fkValue)
      .order('created_at', { ascending: true })
    if (fetchErr) {
      setError(fetchErr.message)
      setLoading(false)
      return
    }
    setVideos((data ?? []) as VideoRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fkValue])

  const handleDelete = async (videoId: string) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Supprimer définitivement cette vidéo ? Cette action est irréversible.',
      )
    ) {
      return
    }
    setDeletingId(videoId)
    setError(null)
    try {
      const res = await fetch(
        `/api/videos/${videoId}?type=${isPresta ? 'prestataire' : 'lieu'}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(json?.error || 'La suppression a échoué.')
        setDeletingId(null)
        return
      }
      setVideos((vs) => vs.filter((v) => v.id !== videoId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau.')
    }
    setDeletingId(null)
  }

  // Cap durée + count selon palier
  const durationCap = isPresta
    ? getVideoDurationCap(props.palier)
    : getPlaceVideoDurationCap(props.palier)
  const canUpload = isPresta
    ? canUploadVideo(props.palier, videos.length)
    : canUploadPlaceVideo(props.palier, videos.length)
  const countLabel = isPresta
    ? videoCountLabel(props.palier, videos.length)
    : placeVideoCountLabel(props.palier, videos.length)

  // Helper public URL Storage
  const getPublicUrl = (path: string) => {
    const supabase = createClient()
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  if (loading) {
    return (
      <div className="h-32 animate-pulse rounded-sm bg-creme-deep" />
    )
  }

  // Mode "vidéo non incluse" : Standard / palier=aucun → upsell card,
  // pas de upload possible.
  if (durationCap === 0) {
    const upsellTarget = isPresta
      ? '/dashboard/prestataire/abonnement'
      : '/tarifs#selection-hilmy'
    const upsellLabel = isPresta ? 'Passer Premium' : 'Passer Sélection Hilmy'
    return (
      <div className="rounded-sm border border-or/30 bg-creme-soft p-6 md:p-7">
        <p className="overline text-or">Vidéo · disponible avec l&apos;upgrade</p>
        <p className="mt-2 font-serif text-[18px] italic leading-[1.4] text-vert md:text-[20px]">
          Tu peux te montrer en mouvement avec une vidéo de 60 à 90 secondes.
        </p>
        <p className="mt-2 max-w-2xl text-[13px] leading-[1.6] text-texte-sec">
          {isPresta
            ? 'Une vidéo courte t\'aide à transmettre l\'ambiance de tes prestations — ce qui ne passe pas en photo. Disponible dès le palier Premium.'
            : "Une vidéo courte montre l'ambiance du lieu. Disponible avec Sélection Hilmy."}
        </p>
        <a
          href={upsellTarget}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
        >
          {upsellLabel}
          <span className="text-or-light" aria-hidden="true">→</span>
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] tracking-[0.22em] text-texte-sec uppercase">
          {countLabel}
        </p>
        {!canUpload && videos.length > 0 && (
          <p className="text-[11px] italic text-texte-sec">
            Limite atteinte sur ton palier.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
          {error}
        </p>
      )}

      {videos.length === 0 ? (
        <p className="rounded-sm border border-dashed border-or/30 bg-blanc p-6 text-center text-[13px] italic text-texte-sec md:p-8">
          Pas encore de vidéo. Une vidéo courte (60-90s) aide les copines
          à sentir ton univers en quelques secondes.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {videos.map((v) => {
            const videoUrl = getPublicUrl(v.storage_path)
            const thumbnailUrl = v.thumbnail_storage_path
              ? getPublicUrl(v.thumbnail_storage_path)
              : null
            return (
              <li key={v.id} className="space-y-3">
                <VideoPlayer
                  videoUrl={videoUrl}
                  thumbnailUrl={thumbnailUrl}
                  durationSeconds={v.duration_seconds}
                  size="small"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-texte-sec">
                    {(v.size_bytes / (1024 * 1024)).toFixed(1)} Mo · {v.duration_seconds}s
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(v.id)}
                    disabled={deletingId === v.id}
                    className="text-[11px] tracking-[0.22em] text-red-900 uppercase hover:text-red-700 disabled:opacity-60"
                  >
                    {deletingId === v.id ? 'Suppression…' : 'Supprimer'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {canUpload && (
        <div className="pt-2">
          <UploadVideo
            {...(isPresta
              ? { profileId: props.profileId }
              : { placeId: props.placeId })}
            userId={props.userId}
            maxDurationSeconds={durationCap}
            onUploadComplete={() => fetchVideos()}
            onError={(msg) => setError(msg)}
          />
        </div>
      )}
    </div>
  )
}
