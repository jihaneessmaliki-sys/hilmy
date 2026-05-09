'use client'

import { useState } from 'react'

interface Props {
  /** URL publique de la vidéo (Supabase Storage public bucket). */
  videoUrl: string
  /** URL publique du thumbnail JPEG. NULL = fallback couleur cover. */
  thumbnailUrl: string | null
  /** Durée en secondes (pour l'affichage "0:42"). */
  durationSeconds: number
  /** Aria label pour l'accessibilité. */
  ariaLabel?: string
  /** Couleur de fallback si pas de thumbnail (ex: '#D4C5B0'). */
  fallbackColor?: string
}

/**
 * Lecteur vidéo clic-to-play : affiche un thumbnail + overlay or rond
 * avec icône ▶ et label "Voir la vidéo". Au clic, remplace par
 * <video controls autoPlay> pour démarrer la lecture.
 *
 * Pas de auto-play sur mount (compatibilité iOS Safari + UX : la vidéo
 * ne se lance que si la copine clique explicitement).
 *
 * Pas de tracking video_views dans cette PR (out of scope MVP). Voir
 * tech-debt.md #8 pour la table à créer si on veut mesurer plus tard.
 */
export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  durationSeconds,
  ariaLabel = 'Voir la vidéo',
  fallbackColor = '#D4C5B0',
}: Props) {
  const [playing, setPlaying] = useState(false)

  const minutes = Math.floor(durationSeconds / 60)
  const seconds = Math.floor(durationSeconds % 60)
  const durationLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-sm bg-vert">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={videoUrl}
          poster={thumbnailUrl ?? undefined}
          controls
          autoPlay
          playsInline
          className="h-full w-full object-cover"
          aria-label={ariaLabel}
        />
      </div>
    )
  }

  const hasThumbnail = thumbnailUrl !== null && thumbnailUrl.length > 0

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={ariaLabel}
      className="group relative aspect-video w-full overflow-hidden rounded-sm bg-creme-deep transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.35)]"
      style={
        hasThumbnail
          ? undefined
          : {
              background: `linear-gradient(135deg, ${fallbackColor} 0%, ${fallbackColor} 100%)`,
            }
      }
    >
      {hasThumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl as string}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          loading="lazy"
        />
      )}

      {/* Overlay assombri pour lisibilité du label */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-vert/20 transition-opacity duration-300 group-hover:bg-vert/35"
      />

      {/* Cercle play centré + label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-or text-vert shadow-[0_8px_24px_-6px_rgba(201,169,97,0.7)] transition-transform duration-300 group-hover:scale-110 md:h-20 md:w-20"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="currentColor"
            className="ml-[3px] md:h-7 md:w-7"
          >
            <path d="M5 3l14 8-14 8z" />
          </svg>
        </span>
        <span className="font-serif text-[15px] italic text-creme drop-shadow-[0_1px_4px_rgba(15,61,46,0.6)] md:text-[17px]">
          Voir la vidéo
        </span>
      </div>

      {/* Durée bottom-right */}
      <span className="absolute right-3 bottom-3 rounded-full bg-vert/85 px-2.5 py-1 text-[11px] font-medium tracking-wider text-creme backdrop-blur md:right-4 md:bottom-4">
        {durationLabel}
      </span>
    </button>
  )
}
