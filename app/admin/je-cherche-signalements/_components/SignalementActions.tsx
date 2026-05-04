'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  restoreDemandeAction,
  restoreResponseAction,
} from '../_actions'

interface Props {
  targetType: 'demande' | 'response'
  targetId: string
  isHidden: boolean
}

/**
 * Actions admin sur un signalement Je cherche.
 * - "Restaurer" : remet le contenu visible (status='open' / is_hidden=false) +
 *   reset flag_count à 0 (force-clear, le contenu repart à zéro).
 * - "Confirmer le hide" : no-op (le contenu est déjà masqué auto par trigger).
 */
export function SignalementActions({ targetType, targetId, isHidden }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const handleRestore = () => {
    setError(null)
    setDone(null)
    startTransition(async () => {
      const result =
        targetType === 'demande'
          ? await restoreDemandeAction(targetId)
          : await restoreResponseAction(targetId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDone('Restauré.')
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3 ml-auto">
      {isHidden ? (
        <button
          type="button"
          onClick={handleRestore}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-vert/40 px-4 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-vert hover:bg-vert hover:text-creme disabled:opacity-60"
        >
          {pending ? 'En cours…' : 'Restaurer'}
        </button>
      ) : (
        <span className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">
          Visible (≤ 2 signalements)
        </span>
      )}
      {error && (
        <span className="text-[11px] text-red-900" role="alert">
          {error}
        </span>
      )}
      {done && <span className="text-[11px] text-vert">{done}</span>}
    </div>
  )
}
