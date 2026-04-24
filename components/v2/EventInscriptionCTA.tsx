'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  eventId: string
  eventSlug: string
  isAuthenticated: boolean
  initiallyInscrite: boolean
  isOwner: boolean
  placesMax: number | null
  inscritesCount: number
  /** `solid` = gros CTA hero (vert plein), `outline` = secondaire dans sidebar. */
  variant?: 'solid' | 'outline'
  /** 'internal' (RSVP Hilmy), 'external' (billetterie externe), 'info_only' (gratuit sans inscription). */
  registrationMode?: 'internal' | 'external' | 'info_only'
  /** URL externe à utiliser pour 'external' ou 'info_only'. */
  externalUrl?: string | null
}

export function EventInscriptionCTA({
  eventId,
  eventSlug,
  isAuthenticated,
  initiallyInscrite,
  isOwner,
  placesMax,
  inscritesCount: initialInscritesCount,
  variant = 'solid',
  registrationMode = 'internal',
  externalUrl = null,
}: Props) {
  const router = useRouter()
  const [inscrite, setInscrite] = useState(initiallyInscrite)
  const [count, setCount] = useState(initialInscritesCount)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const complet = placesMax !== null && count >= placesMax

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const handleInscription = async () => {
    if (!isAuthenticated) {
      router.push(
        `/auth/signup?redirect=${encodeURIComponent(`/evenement-v2/${eventSlug}`)}`,
      )
      return
    }
    if (inscrite || complet || isOwner) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/inscription`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'Impossible de t\'inscrire pour l\'instant.')
        return
      }
      setInscrite(true)
      setCount((c) => c + 1)
      showToast('Tu es inscrite ✨')
      // Rafraîchir pour que l'adresse précise apparaisse (server re-render)
      router.refresh()
    } catch {
      setError('Erreur réseau. Réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDesinscription = async () => {
    if (!isAuthenticated || !inscrite) return
    if (!confirm('Annuler ton inscription ?')) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/inscription`, {
        method: 'DELETE',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'Impossible d\'annuler pour l\'instant.')
        return
      }
      setInscrite(false)
      setCount((c) => Math.max(0, c - 1))
      showToast('Inscription annulée.')
      router.refresh()
    } catch {
      setError('Erreur réseau. Réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  // Mode externe (billetterie) ou info_only (gratuit sans inscription) :
  // on remplace le CTA interne par un lien externe.
  if (registrationMode !== 'internal' && externalUrl) {
    const baseExternalSolid =
      'group inline-flex h-[56px] items-center justify-center gap-2.5 rounded-full bg-vert px-8 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark'
    const baseExternalOutline =
      'group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-or/40 px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc'
    const cls = variant === 'solid' ? baseExternalSolid : baseExternalOutline
    const label =
      registrationMode === 'info_only'
        ? 'Plus d\u2019infos'
        : 'S\u2019inscrire sur le site officiel'
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        {label}
        <span
          className={`${variant === 'solid' ? 'text-or-light' : 'text-or'} transition-transform group-hover:translate-x-1`}
          aria-hidden="true"
        >
          →
        </span>
      </a>
    )
  }

  // Si c'est l'organisatrice, pas de bouton S'inscrire — un pill lecture seule
  if (isOwner) {
    return (
      <div className="inline-flex h-[56px] items-center gap-2.5 rounded-full border border-or/40 bg-or/10 px-8 text-[11px] font-medium tracking-[0.22em] text-or-deep uppercase">
        Tu es l&apos;organisatrice
      </div>
    )
  }

  // Classes selon variant (bouton principal hero vs sidebar)
  const baseClassesSolid =
    'group inline-flex h-[56px] items-center justify-center gap-2.5 rounded-full px-8 text-[11px] font-medium tracking-[0.22em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-60'
  const baseClassesOutline =
    'group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[11px] font-medium tracking-[0.22em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-60'
  const base = variant === 'solid' ? baseClassesSolid : baseClassesOutline

  // Event complet
  if (complet && !inscrite) {
    return (
      <span
        className={`${base} border border-texte/30 bg-creme-deep text-texte cursor-not-allowed`}
      >
        Complet — {count}/{placesMax}
      </span>
    )
  }

  // Déjà inscrite
  if (inscrite) {
    return (
      <div className="relative flex flex-col items-start gap-2">
        <span
          className={`${base} ${
            variant === 'solid'
              ? 'bg-or text-vert'
              : 'bg-or text-vert border border-or'
          }`}
        >
          ✓ Tu es inscrite
        </span>
        <button
          type="button"
          onClick={handleDesinscription}
          disabled={submitting}
          className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-red-900 disabled:opacity-60"
        >
          {submitting ? 'Annulation…' : 'Se désinscrire'}
        </button>
        {error && <p className="text-[12px] text-red-900">{error}</p>}
        <Toast message={toast} />
      </div>
    )
  }

  // Pas encore inscrite, places disponibles
  return (
    <div className="relative flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleInscription}
        disabled={submitting}
        className={`${base} ${
          variant === 'solid'
            ? 'bg-vert text-creme hover:bg-vert-dark'
            : 'bg-or text-vert hover:bg-or-light'
        }`}
      >
        {submitting
          ? 'Inscription…'
          : isAuthenticated
            ? "S'inscrire"
            : "S'inscrire ✨"}
        <span
          className={`${variant === 'solid' ? 'text-or-light' : 'text-vert'} transition-transform group-hover:translate-x-1`}
          aria-hidden="true"
        >
          →
        </span>
      </button>
      {!isAuthenticated && variant === 'solid' && (
        <p className="text-[11px] italic text-texte-sec">
          Tu seras invitée à créer ton compte (30 secondes).
        </p>
      )}
      {error && <p className="text-[12px] text-red-900">{error}</p>}
      <Toast message={toast} />
    </div>
  )
}

function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-vert px-6 py-3 text-[13px] font-medium text-creme shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
