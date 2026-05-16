'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { ProPerkClaim } from '@/lib/supabase/types'

interface PerkClaimButtonProps {
  perkId: string
  isCopine: boolean
  initialClaim: ProPerkClaim | null
}

/**
 * Bouton de claim d'un Pro Perk pour une Copine.
 *
 * 3 états :
 *   - Non-Copine → bouton désactivé + CTA "Je prends mon Pass"
 *   - Copine + pas encore claim → bouton "Récupérer mon code"
 *   - Copine + déjà claim → affiche le code HILMY-XXXX-YYYY + bouton
 *     "Marquer comme utilisé" si pas encore marqué
 *
 * Les codes sont générés server-side (crypto.randomBytes) et insérés
 * via /api/pro-perks/[id]/claim. L'idempotence est gérée côté serveur
 * (UNIQUE perk_id × user_id) : un 2e POST retourne le code existant.
 */
export function PerkClaimButton({
  perkId,
  isCopine,
  initialClaim,
}: PerkClaimButtonProps) {
  const [claim, setClaim] = useState<ProPerkClaim | null>(initialClaim)
  const [busy, setBusy] = useState(false)

  if (!isCopine) {
    return (
      <Link
        href="/pass-copine"
        className="block w-full rounded-full bg-vert px-6 py-3 text-center text-[12px] font-semibold tracking-[0.18em] text-creme uppercase transition-colors hover:bg-vert-dark"
      >
        Je prends mon Pass
      </Link>
    )
  }

  async function handleClaim() {
    if (busy || claim) return
    setBusy(true)
    try {
      const res = await fetch(`/api/pro-perks/${perkId}/claim`, {
        method: 'POST',
      })
      const json = (await res.json().catch(() => null)) as
        | {
            ok?: boolean
            code?: string
            claim_id?: string
            already_claimed?: boolean
            error?: string
          }
        | null
      if (!res.ok || !json?.ok || !json.code) {
        toast.error(json?.error ?? 'Impossible de récupérer ton code.')
        setBusy(false)
        return
      }
      setClaim({
        id: json.claim_id ?? '',
        perk_id: perkId,
        user_id: '',
        code_displayed: json.code,
        marked_used_at: null,
        created_at: new Date().toISOString(),
      })
      toast.success(
        json.already_claimed ? 'Voici ton code.' : 'Ton code est prêt.',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau.')
    } finally {
      setBusy(false)
    }
  }

  async function handleMarkUsed() {
    if (busy || !claim || claim.marked_used_at) return
    setBusy(true)
    try {
      const res = await fetch(`/api/pro-perks/${perkId}/claim`, {
        method: 'PATCH',
      })
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? 'Impossible de marquer comme utilisé.')
        setBusy(false)
        return
      }
      setClaim({ ...claim, marked_used_at: new Date().toISOString() })
      toast.success('Marqué comme utilisé.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau.')
    } finally {
      setBusy(false)
    }
  }

  if (claim) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-or/40 bg-creme p-4 text-center">
          <p className="text-[10px] font-medium tracking-[0.22em] text-or-deep uppercase">
            Ton code
          </p>
          <p
            className="mt-2 font-mono text-[18px] font-semibold tracking-[0.18em] text-vert"
            aria-label={`Code de réduction ${claim.code_displayed}`}
          >
            {claim.code_displayed}
          </p>
          {claim.marked_used_at && (
            <p className="mt-2 text-[11px] italic text-texte-sec">
              Marqué utilisé.
            </p>
          )}
        </div>
        {!claim.marked_used_at && (
          <button
            type="button"
            onClick={handleMarkUsed}
            disabled={busy}
            className="block w-full rounded-full border border-or/30 px-6 py-3 text-[12px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:border-or hover:bg-creme-deep disabled:opacity-60"
          >
            {busy ? '…' : 'Marquer comme utilisé'}
          </button>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClaim}
      disabled={busy}
      className="block w-full rounded-full bg-or px-6 py-3 text-[12px] font-semibold tracking-[0.18em] text-vert uppercase transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)] disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? '…' : 'Récupérer mon code'}
    </button>
  )
}
