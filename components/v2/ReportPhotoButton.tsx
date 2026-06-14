'use client'

import { useState } from 'react'

/**
 * Bouton « Signaler » d'une photo communauté, posé dans la lightbox.
 *
 * Signalement RÉSERVÉ aux connectées (décision PR-c) :
 *  - non connectée → lien vers la connexion (aucune action possible) ;
 *  - connectée → POST /api/place-photos/[id]/report (gaté RLS user_id=auth.uid()).
 *
 * Un signalement ne masque RIEN : la photo reste publiée, il alimente la file
 * de modération admin (modération a posteriori). L'UI ne fait que déclencher.
 */
export function ReportPhotoButton({
  photoId,
  canReport,
  loginHref,
}: {
  photoId: string
  canReport: boolean
  loginHref: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  // Non connectée : pas de signalement direct, on invite à se connecter.
  if (!canReport) {
    return (
      <a
        href={loginHref}
        className="inline-flex items-center gap-1.5 rounded-full border border-or/40 bg-blanc/10 px-3 py-1.5 text-[11px] tracking-[0.18em] text-creme uppercase backdrop-blur transition-colors hover:border-or hover:bg-or/20"
      >
        Connecte-toi pour signaler
      </a>
    )
  }

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-or/40 bg-blanc/10 px-3 py-1.5 text-[11px] tracking-[0.18em] text-creme uppercase backdrop-blur">
        Merci, c'est noté
      </span>
    )
  }

  const submit = async () => {
    setState('sending')
    try {
      const res = await fetch(`/api/place-photos/${photoId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      if (!res.ok) throw new Error('report failed')
      setState('done')
      setOpen(false)
    } catch {
      setState('error')
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setState('idle')
          setOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-or/40 bg-blanc/10 px-3 py-1.5 text-[11px] tracking-[0.18em] text-creme uppercase backdrop-blur transition-colors hover:border-or hover:bg-or/20"
      >
        Signaler
      </button>
    )
  }

  return (
    <div className="w-[min(86vw,340px)] rounded-sm border border-or/30 bg-vert/90 p-4 text-creme shadow-2xl backdrop-blur">
      <p className="text-[13px] leading-[1.55]">
        Signaler cette photo (visage d'un tiers, droit à l'image, contenu illicite) ?
        Elle sera examinée par la modération.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motif (facultatif)"
        rows={2}
        className="mt-3 w-full resize-none rounded-sm border border-or/30 bg-blanc/10 px-3 py-2 text-[13px] text-creme placeholder:text-creme/50 focus:border-or focus:outline-none"
      />
      {state === 'error' && (
        <p className="mt-2 text-[12px] text-or-light">Échec de l'envoi, réessaie.</p>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={state === 'sending'}
          className="rounded-full px-3 py-1.5 text-[11px] tracking-[0.18em] text-creme/80 uppercase transition-colors hover:text-creme disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={state === 'sending'}
          className="rounded-full border border-or/50 bg-or/20 px-3 py-1.5 text-[11px] tracking-[0.18em] text-creme uppercase transition-colors hover:bg-or/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'sending' ? 'Envoi…' : 'Signaler'}
        </button>
      </div>
    </div>
  )
}
