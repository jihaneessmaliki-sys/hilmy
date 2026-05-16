'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ProPerk } from '@/lib/supabase/types'

interface PerkOwnerRowProps {
  perk: ProPerk
  statusLabel: string
  statusTone: string
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

function discountLabel(perk: ProPerk): string {
  return perk.discount_type === 'percentage'
    ? `${perk.discount_value} %`
    : `${perk.discount_value} €`
}

export function PerkOwnerRow({ perk, statusLabel, statusTone }: PerkOwnerRowProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const canPause = perk.status === 'active'
  const canResume = perk.status === 'paused'

  async function toggleStatus(action: 'pause' | 'resume') {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/pro-perks/${perk.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? 'Impossible de changer le statut.')
        setBusy(false)
        return
      }
      toast.success(action === 'pause' ? 'Offre mise en pause.' : 'Offre réactivée.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau.')
      setBusy(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-md border border-or/20 bg-white">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:p-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif text-[20px] font-light text-vert">
              {perk.title}
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] tracking-[0.22em] uppercase ${statusTone}`}
            >
              {statusLabel}
            </span>
            <span className="rounded-full bg-or/15 px-2.5 py-0.5 text-[10px] tracking-[0.22em] text-or-deep uppercase">
              {discountLabel(perk)}
            </span>
          </div>
          {perk.description && (
            <p className="mt-2 text-[13px] leading-[1.6] text-texte-sec">
              {perk.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] tracking-[0.18em] text-texte-sec uppercase">
            <span>
              Utilisations : <span className="text-vert">{perk.used_count}</span>
              {perk.max_uses ? ` / ${perk.max_uses}` : ' (illimité)'}
            </span>
            <span>Début : {formatDate(perk.starts_at)}</span>
            <span>Fin : {formatDate(perk.ends_at)}</span>
          </div>
          {perk.status === 'rejected' && perk.rejection_reason && (
            <p className="mt-3 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
              Raison du refus : {perk.rejection_reason}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 md:w-40 md:shrink-0">
          {canPause && (
            <button
              type="button"
              onClick={() => toggleStatus('pause')}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center rounded-full border border-or/30 px-4 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:border-or hover:bg-creme-deep disabled:opacity-60"
            >
              {busy ? '…' : 'Mettre en pause'}
            </button>
          )}
          {canResume && (
            <button
              type="button"
              onClick={() => toggleStatus('resume')}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center rounded-full bg-vert px-4 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-vert-dark disabled:opacity-60"
            >
              {busy ? '…' : 'Réactiver'}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
