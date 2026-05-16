'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import type { ProPerk } from '@/lib/supabase/types'

interface PerkModerationRowProps {
  perk: ProPerk
  presta: { nom: string; email: string | null; slug: string | null } | null
}

function discountLabel(perk: ProPerk): string {
  return perk.discount_type === 'percentage'
    ? `${perk.discount_value} %`
    : `${perk.discount_value} €`
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

export function PerkModerationRow({ perk, presta }: PerkModerationRowProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const canModerate = perk.status === 'pending_review'

  async function moderate(action: 'approve' | 'reject') {
    if (busy) return
    if (action === 'reject' && rejectReason.trim().length === 0) {
      setError('Une raison de refus est obligatoire.')
      return
    }
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pro-perks/${perk.id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? rejectReason.trim() : undefined,
        }),
      })
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'Erreur inconnue')
        setBusy(null)
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.')
      setBusy(null)
    }
  }

  return (
    <li className="overflow-hidden rounded-sm border border-or/20 bg-blanc">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:p-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-serif text-xl font-light text-vert">
              {perk.title}
            </p>
            <span className="rounded-full bg-or/15 px-2.5 py-0.5 text-[10px] tracking-[0.22em] text-or-deep uppercase">
              {discountLabel(perk)}
            </span>
            <span className="text-[11px] tracking-[0.18em] text-texte-sec uppercase">
              {presta?.nom ?? '—'}
              {presta?.email && ` · ${presta.email}`}
            </span>
          </div>
          {perk.description && (
            <p className="mt-2 text-[13px] leading-[1.6] text-texte-sec">
              {perk.description}
            </p>
          )}
          {perk.conditions && (
            <p className="mt-2 text-[12px] italic leading-[1.6] text-texte-sec">
              Conditions : {perk.conditions}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] tracking-[0.18em] text-texte-sec uppercase">
            <span>
              Utilisations max : {perk.max_uses ?? 'illimité'}
            </span>
            <span>Début : {formatDate(perk.starts_at)}</span>
            <span>Fin : {formatDate(perk.ends_at)}</span>
            <span>Reçue : {formatDate(perk.created_at)}</span>
          </div>
          {perk.status === 'rejected' && perk.rejection_reason && (
            <p className="mt-3 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
              Refus : {perk.rejection_reason}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 md:w-44 md:shrink-0">
          {presta?.slug && (
            <a
              href={`/prestataires/${presta.slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex h-9 items-center justify-center rounded-full border border-or/30 px-4 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:border-or hover:bg-creme-deep"
            >
              Voir la fiche
            </a>
          )}
          {canModerate && (
            <>
              <button
                type="button"
                onClick={() => moderate('approve')}
                disabled={busy !== null}
                className="inline-flex h-9 items-center justify-center rounded-full bg-vert px-4 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-vert-dark disabled:opacity-60"
              >
                {busy === 'approve' ? '…' : 'Approuver'}
              </button>
              <button
                type="button"
                onClick={() => setShowReject((v) => !v)}
                disabled={busy !== null}
                className="inline-flex h-9 items-center justify-center rounded-full border border-or/30 px-4 text-[11px] font-medium tracking-[0.22em] text-texte-sec uppercase transition-colors hover:border-red-900 hover:text-red-900 disabled:opacity-60"
              >
                Refuser
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showReject && canModerate && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-or/10 bg-creme-soft p-5"
          >
            <label htmlFor={`reject-${perk.id}`} className="overline text-or">
              Raison du refus (envoyée au prestataire)
            </label>
            <textarea
              id={`reject-${perk.id}`}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={3}
              className="mt-2 block w-full rounded-sm border border-or/30 bg-white px-3 py-2 text-[13px] text-vert focus:border-or focus:outline-none focus:ring-1 focus:ring-or"
              placeholder="Ex. la valeur de la réduction n'est pas claire — précise."
            />
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => moderate('reject')}
                disabled={busy !== null || rejectReason.trim().length === 0}
                className="inline-flex h-9 items-center justify-center rounded-full bg-red-900 px-4 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-red-950 disabled:opacity-60"
              >
                {busy === 'reject' ? '…' : 'Envoyer le refus'}
              </button>
              <button
                type="button"
                onClick={() => setShowReject(false)}
                className="inline-flex h-9 items-center justify-center px-4 text-[11px] font-medium tracking-[0.22em] text-texte-sec uppercase transition-colors hover:text-vert"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="border-t border-red-900/10 bg-red-900/5 px-5 py-2 text-[12px] text-red-900">
          {error}
        </p>
      )}
    </li>
  )
}
