'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createResponseAction } from '@/app/je-cherche/_actions'

interface Props {
  demandeId: string
  isAuthenticated: boolean
  /** URL pour rediriger vers signup si pas connectée */
  signupUrl: string
}

/**
 * Form sticky bottom pour ajouter une reco à une demande.
 * Si non-authentifiée : tap = redirect signup.
 * Le toggle "Recommander une adresse" est volontairement absent en V1
 * (sera ajouté en V2 avec un SearchPrestataire dédié).
 */
export function ResponseForm({ demandeId, isAuthenticated, signupUrl }: Props) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="sticky bottom-0 z-30 border-t border-or/15 bg-creme/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <p className="flex-1 text-[12px] text-texte-sec">
            Connecte-toi pour aider une copine.
          </p>
          <a
            href={signupUrl}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-5 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
          >
            Rejoindre
            <span className="text-or-light" aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = content.trim()
    if (trimmed.length < 5) {
      setError('5 caractères minimum.')
      return
    }
    startTransition(async () => {
      const result = await createResponseAction({
        demande_id: demandeId,
        content: trimmed,
        prestataire_id: null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setContent('')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="sticky bottom-0 z-30 border-t border-or/15 bg-creme/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 py-3 md:px-6">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-3 rounded-full border border-or/30 bg-blanc px-5 py-3 text-left text-[14px] text-texte-sec transition-colors hover:border-or/60"
            aria-label="Ouvrir le formulaire pour ajouter une reco"
          >
            <span className="text-or" aria-hidden="true">+</span>
            Ajouter une reco…
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
              rows={4}
              maxLength={1500}
              placeholder="Raconte-lui ta perle : nom, ville, pourquoi tu la recommandes…"
              className="w-full resize-none rounded-sm border border-or/20 bg-blanc p-3 text-[14px] leading-[1.55] text-vert placeholder:text-texte-sec/60 focus:border-or focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-texte-sec">
                {content.length} / 1500
              </span>
              {error && (
                <p
                  role="alert"
                  className="flex-1 text-right text-[11px] text-red-900"
                >
                  {error}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setContent('')
                    setError(null)
                  }}
                  className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-vert"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-5 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark disabled:opacity-60"
                >
                  {pending ? 'Envoi…' : 'Aider'}
                  <span className="text-or-light" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
