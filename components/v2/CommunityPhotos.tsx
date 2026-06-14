'use client'

import { useState } from 'react'
import { PhotoLightbox } from '@/components/v2/PhotoLightbox'
import { ReportPhotoButton } from '@/components/v2/ReportPhotoButton'

export type CommunityPhoto = {
  /** id de la LIGNE photo (clé React + cible du signalement, NON identitaire). */
  photo_id: string
  /** URL publique calculée serveur depuis storage_path (aucune identité). */
  url: string
}

/**
 * Galerie AGRÉGÉE des photos communauté d'un lieu, détachée des commentaires
 * (la vue place_public_photos n'expose aucun recommendation_id → impossible de
 * relier une photo à un texte donc à une autrice). Réutilise la lightbox
 * partagée ; le bouton « Signaler » vit dans la lightbox via actionSlot.
 *
 * `canReport` : true sur la fiche connectée (POST direct), false en anonyme
 * (le bouton devient un lien vers la connexion). Aucune identité n'est rendue.
 */
export function CommunityPhotos({
  photos,
  canReport,
  loginHref,
  ariaLabel = 'Photos de la communauté',
}: {
  photos: CommunityPhoto[]
  canReport: boolean
  loginHref: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [startIndex, setStartIndex] = useState(0)

  if (photos.length === 0) return null

  const urls = photos.map((p) => p.url)

  return (
    <>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.photo_id}
            type="button"
            onClick={() => {
              setStartIndex(i)
              setOpen(true)
            }}
            aria-label={`Agrandir la photo ${i + 1}`}
            className="group relative aspect-square overflow-hidden rounded-sm border border-or/15 focus:outline-none focus:ring-2 focus:ring-or"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <PhotoLightbox
        images={urls}
        open={open}
        startIndex={startIndex}
        onClose={() => setOpen(false)}
        ariaLabel={ariaLabel}
        actionSlot={(i) => (
          <ReportPhotoButton
            photoId={photos[i].photo_id}
            canReport={canReport}
            loginHref={loginHref}
          />
        )}
      />
    </>
  )
}
