'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  images: string[]
  open: boolean
  startIndex: number
  onClose: () => void
  /** Label accessible du lightbox. */
  ariaLabel?: string
}

/**
 * Lightbox charte V2 :
 *  - fond crème assombri + backdrop-blur (pas noir générique)
 *  - image centrée, max 90vh / 90vw, object-contain
 *  - close ✕ en haut droite, navigation ← → bas centré
 *  - compteur "03 / 08" discret
 *  - ESC / ← / → au clavier
 *  - swipe horizontal tactile (prev/next), swipe vertical vers le bas (fermer)
 *  - click backdrop → close
 *  - body scroll lock quand ouvert
 *  - focus trap simple sur le bouton close
 */
export function PhotoLightbox({
  images,
  open,
  startIndex,
  onClose,
  ariaLabel = 'Galerie photo',
}: Props) {
  const [index, setIndex] = useReducerIndex(startIndex, images.length)

  const prev = useCallback(() => {
    if (images.length <= 1) return
    setIndex((i) => (i - 1 + images.length) % images.length)
  }, [images.length, setIndex])

  const next = useCallback(() => {
    if (images.length <= 1) return
    setIndex((i) => (i + 1) % images.length)
  }, [images.length, setIndex])

  // Reset à startIndex quand ouverture
  useEffect(() => {
    if (open) setIndex(() => startIndex)
  }, [open, startIndex, setIndex])

  // Keyboard : ESC / flèches
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, prev, next])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Swipe tactile
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    if (absX > 60 && absX > absY) {
      if (dx < 0) next()
      else prev()
    } else if (dy > 90 && absY > absX) {
      onClose()
    }
    touchStart.current = null
  }

  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (open) {
      // Focus sur close à l'ouverture (accessibilité)
      closeButtonRef.current?.focus({ preventScroll: true })
    }
  }, [open])

  const safeIndex = Math.min(Math.max(index, 0), Math.max(0, images.length - 1))
  const src = images[safeIndex]
  const hasMultiple = images.length > 1

  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-vert/70 px-4 backdrop-blur-sm"
          onClick={onClose}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
        >
          {/* Image centrée — clic sur l'image ne ferme pas */}
          <motion.img
            key={safeIndex}
            src={src}
            alt=""
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[min(90vw,1100px)] rounded-sm object-contain shadow-2xl"
          />

          {/* Close */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            aria-label="Fermer"
            className="absolute top-5 right-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-or/40 bg-blanc/10 text-creme backdrop-blur transition-colors hover:border-or hover:bg-or/20 focus:outline-none focus:ring-2 focus:ring-or"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {/* Nav prev / next */}
          {hasMultiple && (
            <>
              <NavButton
                side="left"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
                ariaLabel="Photo précédente"
              />
              <NavButton
                side="right"
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
                ariaLabel="Photo suivante"
              />
              <div
                aria-live="polite"
                className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-blanc/10 px-4 py-1.5 text-[11px] tracking-[0.22em] text-creme uppercase backdrop-blur"
              >
                {String(safeIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function NavButton({
  side,
  onClick,
  ariaLabel,
}: {
  side: 'left' | 'right'
  onClick: (e: React.MouseEvent) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-or/40 bg-blanc/10 text-creme backdrop-blur transition-colors hover:border-or hover:bg-or/20 focus:outline-none focus:ring-2 focus:ring-or md:inline-flex ${
        side === 'left' ? 'left-5' : 'right-5'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ transform: side === 'left' ? 'rotate(180deg)' : undefined }}
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  )
}

// Petit helper setState-like pour un index borné.
function useReducerIndex(
  initial: number,
  total: number,
): [number, (upd: (prev: number) => number) => void] {
  const [value, set] = useState(initial)
  const update = useCallback(
    (upd: (prev: number) => number) => {
      set((p) => {
        const n = upd(p)
        if (total === 0) return 0
        return ((n % total) + total) % total
      })
    },
    [set, total],
  )
  return [value, update]
}
