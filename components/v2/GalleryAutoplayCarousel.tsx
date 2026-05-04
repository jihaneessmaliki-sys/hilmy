'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PhotoLightbox } from './PhotoLightbox'

interface Props {
  /** URLs photos à faire défiler. Les hex (héritage mock) sont filtrés. */
  items: string[]
  /** Intervalle d'autoplay en ms. Défaut 4000. */
  intervalMs?: number
  /** Label accessible (contexte : nom du prestataire). */
  ariaLabel?: string
}

function isUrl(s: string): boolean {
  return s.startsWith('http://') || s.startsWith('https://')
}

/**
 * Carrousel autoplay réservé aux prestataires Cercle Pro.
 *
 * - Auto-rotate toutes les `intervalMs` (4s par défaut)
 * - Pause au hover (desktop) et au focus clavier
 * - Pause si `prefers-reduced-motion`
 * - Pause si l'onglet est en background (visibility API)
 * - Swipe natif via scroll-snap + scroll horizontal CSS (touch-friendly)
 * - Click sur une photo ouvre le PhotoLightbox existant
 * - Indicateurs cliquables en bas
 */
export function GalleryAutoplayCarousel({
  items,
  intervalMs = 4000,
  ariaLabel,
}: Props) {
  const photos = items.filter(isUrl)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState<number | null>(null)
  const trackRef = useRef<HTMLUListElement | null>(null)
  const reducedMotionRef = useRef(false)

  // prefers-reduced-motion + visibility
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mq.matches
    const onMq = () => {
      reducedMotionRef.current = mq.matches
    }
    const onVisibility = () => setPaused(document.hidden)
    mq.addEventListener('change', onMq)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      mq.removeEventListener('change', onMq)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const scrollToIndex = useCallback((idx: number) => {
    const track = trackRef.current
    if (!track) return
    const child = track.children[idx] as HTMLElement | undefined
    if (!child) return
    track.scrollTo({ left: child.offsetLeft, behavior: 'smooth' })
  }, [])

  // Autoplay
  useEffect(() => {
    if (photos.length < 2) return
    if (paused) return
    if (lightboxOpen !== null) return
    if (reducedMotionRef.current) return
    const id = window.setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % photos.length
        scrollToIndex(next)
        return next
      })
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [photos.length, paused, lightboxOpen, intervalMs, scrollToIndex])

  // Sync active index quand l'utilisatrice swipe manuellement
  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const center = track.scrollLeft + track.clientWidth / 2
    let bestIdx = 0
    let bestDist = Infinity
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement
      const elCenter = el.offsetLeft + el.clientWidth / 2
      const d = Math.abs(elCenter - center)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    })
    setActiveIndex(bestIdx)
  }, [])

  if (photos.length === 0) return null

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ul
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={ariaLabel ?? 'Galerie carrousel'}
        aria-roledescription="carousel"
      >
        {photos.map((url, i) => (
          <li
            key={url + i}
            className="relative aspect-[4/3] w-full shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`Photo ${i + 1} sur ${photos.length}`}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(i)}
              className="group relative block h-full w-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-or"
              aria-label={`Agrandir la photo ${i + 1} sur ${photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <span
                className="pointer-events-none absolute inset-0 bg-vert/0 transition-colors duration-300 group-hover:bg-vert/10"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>

      {photos.length > 1 && (
        <div
          className="mt-4 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Navigation carrousel"
        >
          {photos.map((_, i) => {
            const isActive = i === activeIndex
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Aller à la photo ${i + 1}`}
                onClick={() => {
                  setActiveIndex(i)
                  scrollToIndex(i)
                }}
                className={`h-1.5 rounded-full transition-all ${
                  isActive ? 'w-8 bg-or' : 'w-2 bg-or/30 hover:bg-or/60'
                }`}
              />
            )
          })}
        </div>
      )}

      <PhotoLightbox
        images={photos}
        open={lightboxOpen !== null}
        startIndex={lightboxOpen ?? 0}
        onClose={() => setLightboxOpen(null)}
        ariaLabel={ariaLabel}
      />
    </div>
  )
}
