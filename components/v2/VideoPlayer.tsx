'use client'

import { useState } from 'react'

export type VideoPlayerSize = 'small' | 'medium' | 'large'

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
  /**
   * Taille du lecteur :
   *   - 'small'  : dashboard owner (grille 2-cols, parent dicte largeur)
   *   - 'medium' : fiche publique avec 2+ vidéos (max-w 600, mx-auto)
   *   - 'large'  : fiche publique avec 1 seule vidéo (max-w 800, mx-auto,
   *                aspect-ratio dicté par la vidéo elle-même → portrait
   *                ou paysage rendus en intrinsic)
   * Default 'medium' pour la rétrocompat.
   */
  size?: VideoPlayerSize
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
  size = 'medium',
}: Props) {
  const [playing, setPlaying] = useState(false)

  const minutes = Math.floor(durationSeconds / 60)
  const seconds = Math.floor(durationSeconds % 60)
  const durationLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`

  const hasThumbnail = thumbnailUrl !== null && thumbnailUrl.length > 0

  // Intrinsic = la vidéo/thumbnail dicte le ratio (size=large + thumbnail
  // dispo). Sans thumbnail, on garde aspect-video pour ne pas avoir un
  // bouton de hauteur 0 avant chargement.
  const isIntrinsic = size === 'large' && hasThumbnail

  const maxWidthClass =
    size === 'small'
      ? ''
      : size === 'medium'
        ? 'mx-auto max-w-[600px]'
        : 'mx-auto max-w-[800px]'

  // Container : aspect-video sauf en mode intrinsic (ratio dicté par
  // l'image/vidéo elle-même via block + h-auto).
  const aspectClass = isIntrinsic ? '' : 'aspect-video'

  if (playing) {
    // En lecture : pareil — large + thumbnail = intrinsic, sinon
    // aspect-video + object-contain pour letterbox propre.
    const videoLayoutClass = isIntrinsic
      ? 'block h-auto w-full'
      : 'h-full w-full object-contain'
    return (
      <div
        className={`relative w-full ${maxWidthClass} ${aspectClass} overflow-hidden rounded-sm bg-vert`}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={videoUrl}
          poster={thumbnailUrl ?? undefined}
          controls
          autoPlay
          playsInline
          className={videoLayoutClass}
          aria-label={ariaLabel}
        />
      </div>
    )
  }

  const imgLayoutClass = isIntrinsic
    ? 'block h-auto w-full transition-transform duration-700 group-hover:scale-[1.02]'
    : 'absolute inset-0 h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.02]'

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={ariaLabel}
      className={`group relative block w-full ${maxWidthClass} ${aspectClass} overflow-hidden rounded-sm bg-creme-deep transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.35)]`}
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
          className={imgLayoutClass}
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
