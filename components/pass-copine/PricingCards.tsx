'use client'

import { useState } from 'react'
import { toast } from 'sonner'

type Plan = 'monthly' | 'annual'

/**
 * Cards de souscription Pass Copine. Appelle POST /api/stripe/checkout
 * avec { plan } — le price_id est résolu server-side via les env vars
 * STRIPE_PRICE_COPINE_* (décision A5 Phase 2).
 *
 * Pattern d'appel calqué sur components/SubscribeButton.tsx :
 * fetch → window.location.href vers session.url Stripe Checkout.
 */
export function PricingCards() {
  const [loading, setLoading] = useState<Plan | null>(null)

  async function handleSubscribe(plan: Plan) {
    if (loading) return
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const json = (await res.json().catch(() => null)) as
        | { url?: string; error?: string; redirect?: string }
        | null

      if (!res.ok) {
        if (res.status === 409 && json?.redirect) {
          window.location.href = json.redirect
          return
        }
        const msg = json?.error ?? 'Impossible de démarrer la souscription.'
        toast.error(msg, { duration: 5000 })
        setLoading(null)
        return
      }

      if (!json?.url) {
        toast.error('Réponse Stripe invalide. Réessaie dans une minute.', {
          duration: 5000,
        })
        setLoading(null)
        return
      }

      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau.', {
        duration: 5000,
      })
      setLoading(null)
    }
  }

  return (
    <section className="bg-creme pb-20 md:pb-28">
      <div className="mx-auto max-w-4xl px-6 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {/* Annuel — highlighted */}
          <div className="relative flex h-full flex-col rounded-md border-2 border-or bg-creme p-8 shadow-[0_16px_40px_rgba(15,61,46,0.08)] md:p-10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-or px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-vert">
              Meilleur prix · 2 mois offerts
            </span>
            <p className="font-serif text-lg font-medium text-vert">Annuel</p>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="font-serif text-[48px] font-light leading-none text-vert md:text-5xl">
                49 €
              </span>
              <span className="text-sm text-texte-sec">/ an</span>
            </p>
            <p className="mt-4 text-[14px] leading-relaxed text-texte-sec">
              Le choix des copines fidèles · 2 mois offerts.
            </p>
            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={() => handleSubscribe('annual')}
                disabled={loading !== null}
                className="block w-full rounded-full bg-or px-8 py-4 text-center text-[15px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)] disabled:cursor-wait disabled:opacity-70"
              >
                {loading === 'annual'
                  ? 'Redirection vers le paiement…'
                  : 'Je prends mon Pass'}
              </button>
            </div>
          </div>

          {/* Mensuel */}
          <div className="relative flex h-full flex-col rounded-md border border-creme-deep bg-white p-8 md:p-10">
            <p className="font-serif text-lg font-medium text-vert">Mensuel</p>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="font-serif text-[48px] font-light leading-none text-vert md:text-5xl">
                4,99 €
              </span>
              <span className="text-sm text-texte-sec">/ mois</span>
            </p>
            <p className="mt-4 text-[14px] leading-relaxed text-texte-sec">
              Sans engagement.
            </p>
            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={() => handleSubscribe('monthly')}
                disabled={loading !== null}
                className="block w-full rounded-full border border-vert bg-transparent px-8 py-4 text-center text-[15px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-vert hover:text-creme disabled:cursor-wait disabled:opacity-70"
              >
                {loading === 'monthly'
                  ? 'Redirection vers le paiement…'
                  : 'Je prends mon Pass'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[13px] italic text-texte-sec">
            Tu peux annuler quand tu veux. Promis, on ne fait pas la tête.
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-or">
            — La team Hilmy
          </p>
        </div>
      </div>
    </section>
  )
}
