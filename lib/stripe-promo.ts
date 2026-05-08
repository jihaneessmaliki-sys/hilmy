/**
 * Helpers Stripe pour la promo lancement -50%.
 *
 * ⚠️ Stripe checkout n'est PAS encore branché dans le repo (pas de SDK
 * installé, pas de route /api/stripe/*). Ce module fournit les helpers
 * prêts à brancher pour le jour où le checkout sera implémenté :
 *
 *   import { getActiveStripeDiscounts } from '@/lib/stripe-promo'
 *
 *   const session = await stripe.checkout.sessions.create({
 *     mode: 'subscription',
 *     line_items: [...],
 *     discounts: getActiveStripeDiscounts(), // auto-applique LANCEMENT50 si flag on
 *     // ...
 *   })
 *
 * Le coupon `LANCEMENT50` est créé manuellement par Jiji dans le
 * dashboard Stripe. Ce fichier ne le crée jamais via API.
 */

import {
  PROMO_LANCEMENT_COUPON_ID,
  isPromoLancementActive,
} from '@/lib/promo-lancement'

/** Type minimal d'un discount passé à `stripe.checkout.sessions.create`. */
export type StripeCheckoutDiscount = { coupon: string }

/**
 * Retourne le tableau `discounts` à passer à un Stripe Checkout Session
 * quand la promo lancement est active. `undefined` sinon (Stripe ignore
 * silencieusement).
 *
 * Pour les 3 paliers (Standard / Premium / Cercle Pro) : le coupon
 * `LANCEMENT50` est configuré côté Stripe en pourcentage 50% — il
 * s'applique au prix de chaque palier sans logique différenciée côté code.
 */
export function getActiveStripeDiscounts():
  | StripeCheckoutDiscount[]
  | undefined {
  if (!isPromoLancementActive()) return undefined
  return [{ coupon: PROMO_LANCEMENT_COUPON_ID }]
}
