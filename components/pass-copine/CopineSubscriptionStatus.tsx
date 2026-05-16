'use client'

import { useState } from 'react'
import { toast } from 'sonner'

type Plan = 'monthly' | 'annual'

interface CopineSubscriptionStatusProps {
  copineSince: string | null
  plan: Plan | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

function formatLongDate(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

function formatMonthYear(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(d)
}

function planLabel(plan: Plan | null): string {
  if (plan === 'monthly') return 'Mensuel · 4,99 €/mois'
  if (plan === 'annual') return 'Annuel · 49 €/an'
  return '—'
}

export function CopineSubscriptionStatus({
  copineSince,
  plan,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: CopineSubscriptionStatusProps) {
  const [loading, setLoading] = useState(false)
  const sinceLabel = formatMonthYear(copineSince)
  const renewalLabel = formatLongDate(currentPeriodEnd)

  async function handleOpenPortal() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal?type=copine', {
        method: 'POST',
      })
      const json = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null

      if (!res.ok || !json?.url) {
        const msg =
          json?.error ?? 'Impossible d\'ouvrir le portail. Réessaie dans une minute.'
        toast.error(msg, { duration: 5000 })
        setLoading(false)
        return
      }
      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau.', {
        duration: 5000,
      })
      setLoading(false)
    }
  }

  return (
    <section className="bg-creme pb-20 md:pb-28">
      <div className="mx-auto max-w-2xl px-6 md:px-8">
        {sinceLabel && (
          <p className="text-center text-[15px] text-texte-sec md:text-[16px]">
            Tu es Copine Hilmy depuis{' '}
            <span className="font-medium text-vert">{sinceLabel}</span>.
          </p>
        )}

        <div className="mt-8 rounded-md border border-creme-deep bg-white p-8 md:p-10">
          <dl className="space-y-5">
            <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-6">
              <dt className="text-[11px] font-medium uppercase tracking-[0.22em] text-or">
                Plan
              </dt>
              <dd className="font-serif text-[18px] font-light text-vert">
                {planLabel(plan)}
              </dd>
            </div>
            {renewalLabel && (
              <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-6">
                <dt className="text-[11px] font-medium uppercase tracking-[0.22em] text-or">
                  {cancelAtPeriodEnd ? 'Fin du Pass' : 'Prochain renouvellement'}
                </dt>
                <dd className="text-[15px] text-texte">{renewalLabel}</dd>
              </div>
            )}
          </dl>

          {cancelAtPeriodEnd && renewalLabel && (
            <div
              role="status"
              className="mt-6 rounded-md border border-or/40 bg-or/10 p-4 text-[13px] leading-[1.6] text-vert"
            >
              Ton Pass se termine le <span className="font-medium">{renewalLabel}</span>.
              Tu redeviens utilisatrice classique après cette date — tes
              favoris au-delà de 10 restent visibles mais tu ne pourras plus
              en ajouter.
            </div>
          )}

          <div className="mt-8">
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={loading}
              className="block w-full rounded-full bg-or px-8 py-4 text-center text-[15px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)] disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? 'Ouverture du portail…' : 'Gérer mon abonnement'}
            </button>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-[13px] italic text-texte-sec">
            Une question ? Réponds à n&apos;importe quel email de Sara, on lit tout.
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-or">
            — La team Hilmy
          </p>
        </div>
      </div>
    </section>
  )
}
