'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  /** ID Stripe (price_xxx). Server résout via PRICE_ID_MAP. */
  priceId: string
  /** Texte du bouton (voix Sara). */
  label: string
  /** Aria-label détaillé pour accessibilité. */
  ariaLabel?: string
  /** ClassName optionnelle pour custom styling (sinon défaut Hilmy or). */
  className?: string
  /** Contexte du checkout. 'onboarding' = la prestataire arrive du
   *  funnel d'inscription (/tarifs?from=onboarding) → le retour de
   *  paiement la mène à /onboarding/prestataire/publiee. Absent =
   *  checkout depuis le dashboard d'une fiche existante. */
  context?: 'onboarding'
  /** Code promo Hilmy saisi sur /tarifs (ex. ENSEMBLE). Transmis au
   *  serveur pour résoudre un essai gratuit (trial_end). Optionnel —
   *  absent = checkout normal. */
  promoCode?: string
}

/**
 * Bouton "Je souscris" — déclenche /api/stripe/checkout puis
 * window.location.href vers Stripe Checkout.
 *
 * Voix Sara : "Je m'abonne", "Je choisis cette formule", "Je souscris".
 * Pas "Acheter" ni "Buy now".
 *
 * Gère les erreurs serveur avec toast voix Sara (founder qui tente de
 * souscrire = 403, price_id inconnu = 422, Stripe down = 502) — sauf
 * 401 (pas de compte) et 404 (pas de fiche) qui redirigent vers le
 * funnel d'inscription au lieu de laisser la prospecte dans une impasse.
 */
export function SubscribeButton({
  priceId,
  label,
  ariaLabel,
  className,
  context,
  promoCode,
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: priceId,
          ...(context ? { context } : {}),
          ...(promoCode ? { promo_code: promoCode } : {}),
        }),
      })

      if (!res.ok) {
        // 401 = visiteuse sans compte, 404 = compte sans fiche prestataire.
        // Dans les deux cas on la remet sur le bon rail au lieu d'un toast
        // sans issue : le funnel d'inscription la ramène sur /tarifs
        // (?from=onboarding) une fois sa fiche créée.
        if (res.status === 401) {
          toast.info('Crée ton compte, on te ramène ici juste après.', {
            duration: 4000,
          })
          window.location.href = '/auth/signup?role=prestataire'
          return
        }
        if (res.status === 404) {
          toast.info('Il te manque juste ta fiche — deux minutes, promis.', {
            duration: 4000,
          })
          window.location.href = '/onboarding/prestataire'
          return
        }
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        const msg = json?.error ?? 'Impossible de démarrer la souscription.'
        toast.error(msg, { duration: 5000 })
        setLoading(false)
        return
      }

      const json = (await res.json()) as { url?: string }
      if (!json.url) {
        toast.error('Réponse Stripe invalide. Réessaie dans une minute.', {
          duration: 5000,
        })
        setLoading(false)
        return
      }

      // Redirige vers Stripe Checkout
      window.location.href = json.url
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erreur réseau.',
        { duration: 5000 },
      )
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={ariaLabel ?? label}
      className={
        className ??
        'block w-full rounded-full bg-or px-8 py-4 text-center text-[15px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)] disabled:cursor-wait disabled:opacity-70'
      }
    >
      {loading ? 'Redirection vers le paiement…' : label}
    </button>
  )
}
