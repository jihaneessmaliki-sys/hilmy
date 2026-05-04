'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  prestataireId: string
  prestataireName: string
}

/**
 * Bouton "Demander un devis" + modal de soumission.
 * Réservé aux fiches Cercle Pro (le composant n'est rendu que conditionnel
 * dans la page fiche prestataire — palier === 'cercle_pro').
 *
 * - Pré-remplit prénom + email depuis user_profiles si dispo
 * - POST /api/devis-requests (validation + insert + email best-effort)
 * - Si user non authentifiée : redirige vers /auth/signup avec retour
 */
export function DevisExpressCTA({ prestataireId, prestataireName }: Props) {
  const [open, setOpen] = useState(false)
  const [loadingMe, setLoadingMe] = useState(true)
  const [authedUserEmail, setAuthedUserEmail] = useState<string | null>(null)
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Pré-fill au mount (si user authentifiée)
  useEffect(() => {
    let cancelled = false
    async function fetchMe() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (user) {
        setAuthedUserEmail(user.email ?? null)
        setEmail(user.email ?? '')
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('prenom')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!cancelled && prof?.prenom) setPrenom(prof.prenom as string)
      }
      setLoadingMe(false)
    }
    fetchMe()
    return () => {
      cancelled = true
    }
  }, [])

  const handleOpen = () => {
    if (!authedUserEmail) {
      // Redirect vers signup avec retour sur la fiche
      window.location.href = `/auth/signup?redirect=${encodeURIComponent(window.location.pathname)}`
      return
    }
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (prenom.trim().length < 1) {
      setError("Ton prénom, c'est le minimum.")
      return
    }
    if (!email.includes('@')) {
      setError('Email invalide.')
      return
    }
    if (message.trim().length < 5) {
      setError('Dis-lui un peu plus (5 caractères minimum).')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/devis-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prestataire_id: prestataireId,
          prenom: prenom.trim(),
          email: email.trim().toLowerCase(),
          telephone: telephone.trim() || null,
          message: message.trim(),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError((json?.error as string) || 'Petit pépin. Réessaie dans un instant.')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setSubmitting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Petit pépin réseau.')
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    if (success) {
      setSuccess(false)
      setMessage('')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loadingMe}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-or px-6 py-3.5 text-[12px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light disabled:opacity-60"
        aria-label={`Demander un devis à ${prestataireName}`}
      >
        ✨ Demander un devis
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="devis-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-vert/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={handleClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-t-3xl bg-blanc p-6 shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fermer"
              className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-texte-sec transition-colors hover:bg-creme-deep hover:text-vert"
            >
              ✕
            </button>

            {success ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-or/15 text-or">
                  ✓
                </div>
                <h2 id="devis-modal-title" className="font-serif text-2xl font-light text-vert">
                  Demande envoyée.
                </h2>
                <p className="mt-3 text-[14px] leading-[1.6] text-texte-sec">
                  {prestataireName} reçoit ta demande directement par email.
                  Elle te répondra sous peu, en direct sur l&apos;email que tu
                  as laissé.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-or/40 px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:border-or hover:bg-creme-deep"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-or/20 text-[12px] text-or">
                    ✨
                  </span>
                  <span className="text-[10px] tracking-[0.28em] text-or uppercase">
                    Devis Express · Cercle Pro
                  </span>
                </div>
                <h2
                  id="devis-modal-title"
                  className="mt-3 font-serif text-2xl font-light text-vert"
                >
                  Demander un devis à {prestataireName}.
                </h2>
                <p className="mt-2 text-[13px] leading-[1.6] text-texte-sec">
                  Quelques infos pour qu&apos;elle te recontacte avec une
                  proposition adaptée. Pas de spam, ça part directement à la
                  prestataire.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[11px] tracking-[0.22em] text-or uppercase">
                        Prénom
                      </span>
                      <input
                        type="text"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        required
                        maxLength={80}
                        className="border-b border-or/30 bg-transparent py-2 text-[15px] text-vert focus:border-or focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[11px] tracking-[0.22em] text-or uppercase">
                        Email
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={200}
                        className="border-b border-or/30 bg-transparent py-2 text-[15px] text-vert focus:border-or focus:outline-none"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] tracking-[0.22em] text-or uppercase">
                      Téléphone (optionnel)
                    </span>
                    <input
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      maxLength={50}
                      placeholder="+33 6 ..."
                      className="border-b border-or/30 bg-transparent py-2 text-[15px] text-vert placeholder:text-texte-sec/50 focus:border-or focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] tracking-[0.22em] text-or uppercase">
                      Ton besoin
                    </span>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      minLength={5}
                      maxLength={2000}
                      rows={5}
                      placeholder="Dis-lui ce que tu cherches : type de prestation, date approximative, budget, contraintes..."
                      className="resize-none rounded-sm border border-or/20 bg-creme-soft p-3 font-serif text-[14px] italic leading-[1.55] text-vert placeholder:not-italic placeholder:font-sans placeholder:text-texte-sec/60 focus:border-or focus:outline-none"
                    />
                    <span className="text-[11px] text-texte-sec">
                      {message.length} / 2000
                    </span>
                  </label>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-vert"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-12 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark disabled:opacity-60"
                    >
                      {submitting ? 'Envoi…' : 'Envoyer ma demande'}
                      <span className="text-or-light" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
