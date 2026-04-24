'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MotifModal } from '@/components/v2/MotifModal'

type RecoRow = {
  id: string
  type: 'place' | 'prestataire'
  comment: string | null
  rating: number | null
  status: string
  admin_notes: string | null
  created_at: string
  place_id: string | null
  profile_id: string | null
  place:
    | { name: string; slug: string | null }
    | { name: string; slug: string | null }[]
    | null
  profile:
    | { nom: string; slug: string }
    | { nom: string; slug: string }[]
    | null
  user: { prenom: string } | { prenom: string }[] | null
}

export function RecoRow({ reco }: { reco: RecoRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const place = Array.isArray(reco.place) ? reco.place[0] : reco.place
  const profile = Array.isArray(reco.profile) ? reco.profile[0] : reco.profile
  const user = Array.isArray(reco.user) ? reco.user[0] : reco.user

  const targetName = place?.name ?? profile?.nom ?? 'Lieu inconnu'
  const targetLink =
    reco.type === 'place' && place?.slug
      ? `/recommandation/${place.slug}`
      : profile?.slug
        ? `/prestataire-v2/${profile.slug}`
        : null

  const setStatus = async (next: 'flagged' | 'published') => {
    setBusy(next)
    setError(null)
    const res = await fetch(`/api/admin/recommendations/${reco.id}/status`, {
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
    const res = await fetch(`/api/admin/recommendations/${reco.id}/remove`, {
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
    <li className="rounded-sm border border-or/20 bg-blanc p-5 md:p-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="rounded-full bg-or/15 px-2 py-0.5 text-[10px] tracking-[0.22em] text-or-deep uppercase">
          {reco.type === 'place' ? 'Lieu' : 'Prestataire'}
        </span>
        <p className="font-serif text-lg font-light text-vert">{targetName}</p>
        {reco.rating !== null && (
          <span className="text-[12px] text-or">★ {reco.rating}</span>
        )}
        <span className="text-[11px] text-texte-sec">
          par {user?.prenom ?? 'Anonyme'} ·{' '}
          {new Date(reco.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>
      {reco.comment && (
        <p className="mt-3 font-serif text-[14px] italic leading-[1.6] text-texte">
          « {reco.comment} »
        </p>
      )}

      {reco.admin_notes && reco.status === 'removed' && (
        <div className="mt-3 rounded-sm border border-red-900/20 bg-red-900/5 p-3">
          <p className="overline text-red-900">Motif de retrait</p>
          <p className="mt-1 text-[12px] italic text-texte">
            « {reco.admin_notes} »
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-or/10 pt-4">
        {targetLink && (
          <a
            href={targetLink}
            target="_blank"
            rel="noopener"
            className="text-[11px] tracking-[0.22em] text-or uppercase hover:text-or-deep"
          >
            Voir la fiche →
          </a>
        )}
        {reco.status === 'published' && (
          <button
            type="button"
            onClick={() => setStatus('flagged')}
            disabled={busy !== null}
            className="inline-flex h-8 items-center rounded-full border border-or/30 px-4 text-[10px] font-medium tracking-[0.22em] text-texte-sec uppercase hover:border-or hover:text-or-deep disabled:opacity-60"
          >
            {busy === 'flagged' ? '…' : 'Signaler'}
          </button>
        )}
        {reco.status === 'flagged' && (
          <button
            type="button"
            onClick={() => setStatus('published')}
            disabled={busy !== null}
            className="inline-flex h-8 items-center rounded-full bg-vert px-4 text-[10px] font-medium tracking-[0.22em] text-creme uppercase hover:bg-vert-dark disabled:opacity-60"
          >
            {busy === 'published' ? '…' : 'Rétablir'}
          </button>
        )}
        {reco.status !== 'removed' && (
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
          {reco.status}
        </span>
      </div>

      {error && <p className="mt-2 text-[12px] text-red-900">{error}</p>}

      <MotifModal
        open={removeOpen}
        titre="Retirer cette recommandation ?"
        description={
          <>
            <p>
              Soft delete : l&apos;avis disparaîtra des fiches publiques et du
              dashboard de son autrice.{' '}
              <strong className="text-vert">
                Le motif est obligatoire (10 caractères min.)
              </strong>
              .
            </p>
            <p className="mt-2 italic text-texte-sec">
              Le motif est visible dans l&apos;admin mais n&apos;est pas envoyé
              à l&apos;autrice.
            </p>
          </>
        }
        confirmLabel="Retirer l'avis"
        placeholder="Contenu inapproprié, propos haineux, doublon..."
        loading={busy === 'removed'}
        error={removeError}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveOpen(false)}
      />
    </li>
  )
}
