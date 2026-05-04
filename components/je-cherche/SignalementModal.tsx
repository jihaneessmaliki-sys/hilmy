'use client'

import { useEffect, useState } from 'react'
import {
  signalDemandeAction,
  signalResponseAction,
} from '@/app/je-cherche/_actions'
import type { SignalementReason } from '@/lib/types/je-cherche'

const REASONS: { value: SignalementReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'inapproprie', label: 'Inapproprié' },
  { value: 'harcelement', label: 'Harcèlement' },
  { value: 'autre', label: 'Autre' },
]

export type SignalementTarget =
  | { type: 'demande'; id: string }
  | { type: 'response'; id: string; demandeId: string }

interface Props {
  target: SignalementTarget
  open: boolean
  onClose: () => void
  onSubmitted?: () => void
}

/**
 * Modal de signalement réutilisable.
 * Bottom sheet mobile, dialog centré desktop. Au-delà de 3 signalements,
 * la cible est auto-masquée par le trigger Supabase.
 */
export function SignalementModal({ target, open, onClose, onSubmitted }: Props) {
  const [reason, setReason] = useState<SignalementReason>('spam')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset state on open
  useEffect(() => {
    if (open) {
      setReason('spam')
      setComment('')
      setError(null)
      setSuccess(false)
      setSubmitting(false)
    }
  }, [open])

  // ESC pour fermer
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const trimmedComment = comment.trim()
    const commentToSend = trimmedComment.length > 0 ? trimmedComment : null

    const result =
      target.type === 'demande'
        ? await signalDemandeAction(target.id, reason, commentToSend)
        : await signalResponseAction(
            target.id,
            target.demandeId,
            reason,
            commentToSend,
          )

    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSuccess(true)
    onSubmitted?.()
    setTimeout(() => onClose(), 1600)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signalement-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-vert/40 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-t-3xl bg-blanc p-6 shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
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
            <h2
              id="signalement-modal-title"
              className="font-serif text-xl font-light text-vert"
            >
              Merci, on regarde ça.
            </h2>
            <p className="mt-3 text-[13px] leading-[1.6] text-texte-sec">
              La team examine ton signalement. Si plusieurs copines signalent
              le même contenu, il est masqué automatiquement.
            </p>
          </div>
        ) : (
          <>
            <h2
              id="signalement-modal-title"
              className="font-serif text-xl font-light text-vert"
            >
              Quelque chose ne va pas&nbsp;?
            </h2>
            <p className="mt-2 text-[12px] leading-[1.55] text-texte-sec">
              Au-delà de 3 signalements, le message est masqué le temps qu&apos;on
              vérifie.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-[11px] tracking-[0.22em] text-or uppercase">
                  Raison
                </legend>
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 transition-colors ${
                      reason === r.value
                        ? 'border-vert bg-creme-soft'
                        : 'border-or/15 bg-blanc hover:border-or/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="signalement-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) =>
                        setReason(e.target.value as SignalementReason)
                      }
                      className="h-4 w-4 accent-vert"
                    />
                    <span className="text-[14px] text-vert">{r.label}</span>
                  </label>
                ))}
              </fieldset>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] tracking-[0.22em] text-or uppercase">
                  Détails (facultatif)
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Si tu veux préciser…"
                  className="resize-none rounded-sm border border-or/20 bg-creme-soft p-3 text-[13px] text-vert placeholder:text-texte-sec/60 focus:border-or focus:outline-none"
                />
                <span className="text-[11px] text-texte-sec">
                  {comment.length} / 500
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
                  onClick={onClose}
                  className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-vert"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-5 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark disabled:opacity-60"
                >
                  {submitting ? 'Envoi…' : 'Signaler'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
