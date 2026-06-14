'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MotifModal } from '@/components/v2/MotifModal'

type Photo = {
  id: string
  status: string
  moderation_motif: string | null
  created_at: string
  url: string
  prenom: string
  place: { name: string; slug: string | null } | null
}

export function PhotoRow({ photo }: { photo: Photo }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const placeName = photo.place?.name ?? 'Lieu inconnu'
  const placeLink = photo.place?.slug ? `/recommandation/${photo.place.slug}` : null

  const setStatus = async (next: 'flagged' | 'published') => {
    setBusy(next)
    setError(null)
    const res = await fetch(`/api/admin/place-photos/${photo.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      setError(body.error ?? 'Erreur inconnue')
      return
    }
    router.refresh()
  }

  const confirmRemove = async (motif: string) => {
    setBusy('removed')
    setRemoveError(null)
    const res = await fetch(`/api/admin/place-photos/${photo.id}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motif }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      setRemoveError(body.error ?? 'Erreur inconnue')
      return
    }
    setRemoveOpen(false)
    router.refresh()
  }

  return (
    <li className="overflow-hidden rounded-sm border border-or/20 bg-blanc">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={`Photo de ${placeName}`}
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="font-serif text-lg font-light text-vert">{placeName}</p>
          <span className="text-[11px] text-texte-sec">
            par {photo.prenom} ·{' '}
            {new Date(photo.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>

        {photo.moderation_motif && photo.status === 'removed' && (
          <div className="mt-3 rounded-sm border border-red-900/20 bg-red-900/5 p-3">
            <p className="overline text-red-900">Motif de retrait</p>
            <p className="mt-1 text-[12px] italic text-texte">« {photo.moderation_motif} »</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-or/10 pt-4">
          {placeLink && (
            <a
              href={placeLink}
              target="_blank"
              rel="noopener"
              className="text-[11px] tracking-[0.22em] text-or uppercase hover:text-or-deep"
            >
              Voir la fiche →
            </a>
          )}
          {photo.status === 'published' && (
            <button
              type="button"
              onClick={() => setStatus('flagged')}
              disabled={busy !== null}
              className="inline-flex h-8 items-center rounded-full border border-or/30 px-4 text-[10px] font-medium tracking-[0.22em] text-texte-sec uppercase hover:border-or hover:text-or-deep disabled:opacity-60"
            >
              {busy === 'flagged' ? '…' : 'Signaler'}
            </button>
          )}
          {photo.status === 'flagged' && (
            <button
              type="button"
              onClick={() => setStatus('published')}
              disabled={busy !== null}
              className="inline-flex h-8 items-center rounded-full bg-vert px-4 text-[10px] font-medium tracking-[0.22em] text-creme uppercase hover:bg-vert-dark disabled:opacity-60"
            >
              {busy === 'published' ? '…' : 'Rétablir'}
            </button>
          )}
          {photo.status !== 'removed' && (
            <button
              type="button"
              onClick={() => {
                setRemoveError(null)
                setRemoveOpen(true)
              }}
              disabled={busy !== null}
              className="inline-flex h-8 items-center rounded-full bg-red-900 px-4 text-[10px] font-medium tracking-[0.22em] text-creme uppercase hover:bg-red-900/90 disabled:opacity-60"
            >
              Retirer
            </button>
          )}
          <span className="ml-auto text-[10px] tracking-[0.22em] text-texte-sec uppercase">
            {photo.status}
          </span>
        </div>

        {error && <p className="mt-2 text-[12px] text-red-900">{error}</p>}
      </div>

      <MotifModal
        open={removeOpen}
        titre="Retirer cette photo ?"
        description={
          <>
            <p>
              Soft delete : la photo disparaîtra des fiches (PR-c) et ne sera plus comptée.{' '}
              <strong className="text-vert">
                Le motif est obligatoire (10 caractères min.)
              </strong>
              .
            </p>
            <p className="mt-2 italic text-texte-sec">
              Le motif est visible dans l&apos;admin mais n&apos;est pas envoyé à l&apos;autrice.
            </p>
          </>
        }
        confirmLabel="Retirer la photo"
        placeholder="Visage de tiers, contenu inapproprié, doublon..."
        loading={busy === 'removed'}
        error={removeError}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveOpen(false)}
      />
    </li>
  )
}
