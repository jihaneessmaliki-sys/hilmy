'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markResolvedAction } from '@/app/je-cherche/_actions'
import { SignalementModal } from '@/components/je-cherche/SignalementModal'

interface Props {
  demandeId: string
  isOwner: boolean
  status: 'open' | 'resolved' | 'hidden' | 'closed'
}

/**
 * Actions sur une demande :
 *  - Owner + open : "C'est trouvé, merci les copines" -> markResolved
 *  - Non-owner : menu ⋯ avec "Signaler"
 */
export function DemandeActions({ demandeId, isOwner, status }: Props) {
  const router = useRouter()
  const [signalOpen, setSignalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleResolve = () => {
    startTransition(async () => {
      const result = await markResolvedAction(demandeId)
      if (result.ok) router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {isOwner && status === 'open' && (
          <button
            type="button"
            onClick={handleResolve}
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-or px-5 text-[11px] font-medium tracking-[0.22em] text-or-deep uppercase transition-all hover:bg-or hover:text-vert disabled:opacity-60"
          >
            {pending ? 'En cours…' : "C'est trouvé, merci les copines"}
          </button>
        )}

        {!isOwner && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Plus d'actions"
              aria-expanded={menuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-texte-sec transition-colors hover:bg-creme-deep hover:text-vert"
            >
              ⋯
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-sm border border-or/15 bg-blanc shadow-[0_16px_32px_-12px_rgba(15,61,46,0.25)]">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setSignalOpen(true)
                    }}
                    className="block w-full px-4 py-3 text-left text-[12px] text-texte transition-colors hover:bg-creme-soft"
                  >
                    Signaler cette demande
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <SignalementModal
        target={{ type: 'demande', id: demandeId }}
        open={signalOpen}
        onClose={() => setSignalOpen(false)}
      />
    </>
  )
}
