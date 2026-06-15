'use client'

import { useState } from 'react'

type Contact = {
  phone: string | null
  opening_hours: string[] | null
}

/**
 * Téléphone + horaires d'un lieu, À LA DEMANDE (Google live).
 *
 * Rendu UNIQUEMENT dans la fiche connectée (RecommandationDetail) → invisible
 * en anonyme par construction. RIEN ne part au chargement : l'appel Google ne
 * se déclenche QUE si la membre clique le bouton (protection coût). La donnée
 * n'est ni stockée ni mise en cache durablement — elle vit dans ce composant
 * le temps de la session de page. Un re-clic ne rappelle pas (déjà chargé).
 */
export function PlaceLiveInfo({ placeId }: { placeId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>(
    'idle',
  )
  const [contact, setContact] = useState<Contact | null>(null)

  const load = async () => {
    if (status === 'loading' || status === 'loaded') return // pas de rappel
    setStatus('loading')
    try {
      const res = await fetch(`/api/places/${placeId}/contact`)
      if (!res.ok) throw new Error('contact failed')
      const body = (await res.json()) as { contact: Contact }
      setContact(body.contact)
      setStatus('loaded')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <button
        type="button"
        onClick={load}
        disabled={status === 'loading'}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-or/40 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc disabled:opacity-60"
      >
        {status === 'loading' ? 'Chargement…' : 'Voir horaires & téléphone'}
        {status !== 'loading' && (
          <span className="text-or" aria-hidden="true">
            →
          </span>
        )}
      </button>
    )
  }

  if (status === 'error') {
    return (
      <div className="mt-5">
        <p className="text-[12px] text-red-900">
          Impossible de récupérer les infos pour l&apos;instant.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle')
          }}
          className="mt-2 text-[11px] tracking-[0.18em] text-or uppercase hover:text-or-deep"
        >
          Réessayer
        </button>
      </div>
    )
  }

  // loaded
  const hours = contact?.opening_hours ?? []
  const phone = contact?.phone ?? null

  return (
    <div className="mt-5 space-y-4">
      {hours.length > 0 ? (
        <div>
          <p className="overline text-or">Horaires</p>
          <ul className="mt-2 space-y-1">
            {hours.map((line, i) => (
              <li key={i} className="text-[13px] leading-[1.5] text-vert">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[12px] text-texte-sec">Horaires non communiqués.</p>
      )}

      {phone && (
        <div>
          <p className="overline text-or">Téléphone</p>
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="mt-2 inline-flex text-[14px] font-medium text-vert underline decoration-or/40 underline-offset-4 transition-colors hover:decoration-or"
          >
            {phone}
          </a>
        </div>
      )}

      {/* Attribution Google requise par les CGU pour l'affichage hors carte. */}
      <p className="text-[10px] tracking-[0.18em] text-texte-sec uppercase">
        Source : Google
      </p>
    </div>
  )
}
