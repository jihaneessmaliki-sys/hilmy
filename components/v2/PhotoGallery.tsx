'use client'

import { useMemo, useState } from 'react'
import { PhotoLightbox } from './PhotoLightbox'

interface Props {
  /**
   * Liste d'URLs ou de couleurs hex. Les URLs sont cliquables pour
   * ouvrir le lightbox ; les hex (héritage mock) sont rendus en
   * gradient décoratif non-cliquable.
   */
  items: string[]
  /**
   * Classes Tailwind pour la grille. Défaut : 2 colonnes mobile,
   * 4 colonnes desktop (usage fiche prestataire V2).
   */
  gridClassName?: string
  /** Aspect ratio de chaque tuile. Défaut : aspect-square. */
  aspectClassName?: string
  /** Label accessible du lightbox (contexte : nom du lieu/prestataire). */
  ariaLabel?: string
}

function isUrl(s: string): boolean {
  return s.startsWith('http://') || s.startsWith('https://')
}

export function PhotoGallery({
  items,
  gridClassName = 'grid grid-cols-2 gap-3 md:grid-cols-4',
  aspectClassName = 'aspect-square',
  ariaLabel,
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  // On ne met dans le lightbox que les VRAIES photos (URLs).
  const photoUrls = useMemo(() => items.filter(isUrl), [items])

  // Map l'index global (dans `items`) vers l'index dans `photoUrls`.
  const indexInPhotos = useMemo(() => {
    const map = new Map<number, number>()
    let p = 0
    items.forEach((it, i) => {
      if (isUrl(it)) {
        map.set(i, p)
        p++
      }
    })
    return map
  }, [items])

  return (
    <>
      <div className={gridClassName}>
        {items.map((c, i) => {
          const asUrl = isUrl(c)
          if (asUrl) {
            const photoIdx = indexInPhotos.get(i) ?? 0
            return (
              <button
                key={i}
                type="button"
                onClick={() => setOpenIndex(photoIdx)}
                className={`group relative ${aspectClassName} overflow-hidden rounded-sm focus:outline-none focus:ring-2 focus:ring-or`}
                aria-label={`Agrandir la photo ${photoIdx + 1} sur ${photoUrls.length}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <span
                  className="pointer-events-none absolute inset-0 bg-vert/0 transition-colors duration-300 group-hover:bg-vert/10"
                  aria-hidden="true"
                />
              </button>
            )
          }
          // Tuile décorative (hex hérité mock-data) — non cliquable.
          return (
            <div
              key={i}
              className={`${aspectClassName} rounded-sm`}
              style={{
                background: `linear-gradient(135deg, ${c} 0%, ${
                  items[(i + 1) % items.length] ?? c
                } 100%)`,
              }}
            />
          )
        })}
      </div>

      <PhotoLightbox
        images={photoUrls}
        open={openIndex !== null}
        startIndex={openIndex ?? 0}
        onClose={() => setOpenIndex(null)}
        ariaLabel={ariaLabel}
      />
    </>
  )
}
