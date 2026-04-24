'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MotifModal } from '@/components/v2/MotifModal'

type EventRow = {
  id: string
  title: string
  slug: string | null
  start_date: string
  city: string | null
  format: string
  event_type: string
  price_type: string
  price_amount: number | null
  visibility: string
  status: string
  admin_notes: string | null
  inscrites_count: number
  flyer_url: string | null
  description: string
  created_at: string
  prestataire: { nom: string } | { nom: string }[] | null
}

export function EventRow({ ev }: { ev: EventRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const presta = Array.isArray(ev.prestataire)
    ? ev.prestataire[0]
    : ev.prestataire

  const callApprove = async () => {
    setBusy('approve')
    setError(null)
    const res = await fetch(`/api/admin/events/${ev.id}/approve`, {
      method: 'POST',
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
    setBusy('remove')
    setRemoveError(null)
    const res = await fetch(`/api/admin/events/${ev.id}/remove`, {
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

  const hasInscrites = ev.inscrites_count > 0

  return (
    <li className="overflow-hidden rounded-sm border border-or/20 bg-blanc">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:p-6">
        <div className="h-24 w-full shrink-0 overflow-hidden rounded-sm bg-creme-deep md:h-20 md:w-28">
          {ev.flyer_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ev.flyer_url}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="flex-1">
          <p className="font-serif text-xl font-light text-vert">{ev.title}</p>
          <p className="mt-1 text-[12px] text-texte-sec">
            {new Date(ev.start_date).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {ev.city && ` · ${ev.city}`}
            {ev.format === 'en_ligne' ? ' · En ligne' : ''}
          </p>
          <p className="mt-1 text-[11px] tracking-[0.22em] text-or uppercase">
            {ev.event_type} ·{' '}
            {ev.price_type === 'gratuit'
              ? 'Gratuit'
              : `${ev.price_amount ?? 0} (payant)`}{' '}
            · {ev.visibility === 'members_only' ? 'Membres' : 'Public'}
            {hasInscrites && (
              <>
                {' · '}
                <strong className="text-vert">
                  {ev.inscrites_count} inscrite
                  {ev.inscrites_count > 1 ? 's' : ''}
                </strong>
              </>
            )}
          </p>
          {presta && (
            <p className="mt-2 text-[12px] text-texte-sec">
              Organisé par{' '}
              <span className="font-medium text-vert">{presta.nom}</span>
            </p>
          )}
          <p className="mt-3 line-clamp-2 text-[13px] italic text-texte">
            {ev.description}
          </p>

          {ev.admin_notes && ev.status === 'removed' && (
            <div className="mt-3 rounded-sm border border-red-900/20 bg-red-900/5 p-3">
              <p className="overline text-red-900">Motif de retrait</p>
              <p className="mt-1 text-[12px] italic text-texte">
                « {ev.admin_notes} »
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 md:w-44 md:shrink-0">
          {ev.slug && (
            <a
              href={`/evenement-v2/${ev.slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex h-9 items-center justify-center rounded-full border border-or/30 px-4 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:border-or hover:bg-creme-soft"
            >
              Preview
            </a>
          )}
          {ev.status !== 'published' && (
            <button
              type="button"
              onClick={callApprove}
              disabled={busy !== null}
              className="inline-flex h-9 items-center justify-center rounded-full bg-vert px-4 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-vert-dark disabled:opacity-60"
            >
              {busy === 'approve' ? '…' : 'Publier'}
            </button>
          )}
          {ev.status !== 'removed' && (
            <button
              type="button"
              onClick={() => {
                setRemoveError(null)
                setRemoveOpen(true)
              }}
              disabled={busy !== null}
              className="inline-flex h-9 items-center justify-center rounded-full bg-red-900 px-4 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-red-900/90 disabled:opacity-60"
            >
              Retirer
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="border-t border-or/10 bg-red-900/5 px-5 py-2 text-[12px] text-red-900">
          {error}
        </p>
      )}

      <MotifModal
        open={removeOpen}
        titre={`Retirer « ${ev.title} » ?`}
        description={
          <>
            {hasInscrites ? (
              <p>
                <strong className="text-vert">
                  {ev.inscrites_count} inscrite
                  {ev.inscrites_count > 1 ? 's seront' : ' sera'} prévenue
                  {ev.inscrites_count > 1 ? 's' : ''} par email
                </strong>{' '}
                de l&apos;annulation avec le motif que tu vas saisir.
              </p>
            ) : (
              <p>
                L&apos;événement sera retiré. Aucun email à envoyer (0
                inscrite).
              </p>
            )}
            <p className="mt-2 italic text-texte-sec">
              Soft delete · motif obligatoire (10 caractères min).
            </p>
          </>
        }
        confirmLabel={hasInscrites ? 'Retirer + prévenir' : 'Retirer'}
        placeholder="Explique à l'organisatrice et aux inscrites..."
        loading={busy === 'remove'}
        error={removeError}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveOpen(false)}
      />
    </li>
  )
}
