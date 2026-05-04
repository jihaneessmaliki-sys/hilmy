'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { toggleThanksAction } from '@/app/je-cherche/_actions'
import { SignalementModal } from '@/components/je-cherche/SignalementModal'
import type { DemandeResponseWithProfile } from '@/lib/types/je-cherche'

interface Props {
  response: DemandeResponseWithProfile
  demandeId: string
  thanked: boolean
  isOwn: boolean
}

function initial(prenom: string | null): string {
  if (!prenom || prenom.length === 0) return '·'
  return prenom.charAt(0).toUpperCase()
}

export function ResponseRow({ response, demandeId, thanked, isOwn }: Props) {
  const [signalOpen, setSignalOpen] = useState(false)
  const [optimisticThanked, setOptimisticThanked] = useState(thanked)
  const [optimisticCount, setOptimisticCount] = useState(response.helpful_count)
  const [pending, startTransition] = useTransition()

  const handleThanks = () => {
    if (isOwn) return // pas de like sur soi-meme
    const wasThankd = optimisticThanked
    setOptimisticThanked(!wasThankd)
    setOptimisticCount(optimisticCount + (wasThankd ? -1 : 1))
    startTransition(async () => {
      const result = await toggleThanksAction(response.id, demandeId)
      if (!result.ok) {
        // rollback optimiste
        setOptimisticThanked(wasThankd)
        setOptimisticCount(optimisticCount)
      }
    })
  }

  return (
    <>
      <article className="rounded-sm border border-or/10 bg-blanc p-5">
        <header className="flex items-start gap-3">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-creme-deep">
            {response.author_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={response.author_avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-full w-full items-center justify-center font-serif text-[14px] font-light text-or"
              >
                {initial(response.author_prenom)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-vert">
              {response.author_prenom ?? 'Une copine'}
            </p>
            <p className="text-[11px] text-texte-sec">
              {formatRelativeTime(response.created_at)}
            </p>
          </div>
        </header>

        <p className="mt-4 whitespace-pre-wrap text-[14px] leading-[1.65] text-texte break-words">
          {response.content}
        </p>

        {response.prestataire && (
          <Link
            href={`/prestataire-v2/${response.prestataire.slug}`}
            className="mt-4 flex items-center gap-3 rounded-sm border border-or/20 bg-creme-soft p-3 transition-colors hover:border-or/50 hover:bg-creme-deep"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-creme-deep">
              {response.prestataire.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={response.prestataire.photo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-full w-full items-center justify-center font-serif text-or"
                >
                  ·
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-vert">
                {response.prestataire.nom}
              </p>
              <p className="truncate text-[11px] text-texte-sec">
                {response.prestataire.ville}
                {response.prestataire.nb_avis > 0 && (
                  <>
                    {' · '}
                    <span className="text-or">★</span>{' '}
                    {response.prestataire.note_moyenne.toFixed(1)} (
                    {response.prestataire.nb_avis} avis)
                  </>
                )}
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-medium text-or" aria-hidden="true">
              Voir →
            </span>
          </Link>
        )}

        <div className="mt-4 flex items-center gap-4 border-t border-or/10 pt-3">
          <button
            type="button"
            onClick={handleThanks}
            disabled={pending || isOwn}
            aria-pressed={optimisticThanked}
            className={`inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed ${
              optimisticThanked ? 'text-or' : 'text-texte-sec hover:text-or'
            }`}
            title={isOwn ? "Tu ne peux pas remercier ta propre reco" : undefined}
          >
            <span aria-hidden="true">{optimisticThanked ? '♥' : '♡'}</span>
            Merci copine
            {optimisticCount > 0 && (
              <span className="ml-0.5">({optimisticCount})</span>
            )}
          </button>
          {!isOwn && (
            <button
              type="button"
              onClick={() => setSignalOpen(true)}
              className="ml-auto text-[11px] tracking-[0.18em] text-texte-sec uppercase hover:text-vert"
            >
              Signaler
            </button>
          )}
        </div>
      </article>

      <SignalementModal
        target={{ type: 'response', id: response.id, demandeId }}
        open={signalOpen}
        onClose={() => setSignalOpen(false)}
      />
    </>
  )
}
