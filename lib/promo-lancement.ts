/**
 * Promo lancement -50% — feature flag + helpers prix.
 *
 * Activation : variable d'env publique `NEXT_PUBLIC_PROMO_LANCEMENT`.
 *  - 'true'  → promo active (prix barrés + nouveau prix -50% + badge
 *              sur /tarifs et homepage, coupon Stripe LANCEMENT50
 *              auto-appliqué au futur checkout)
 *  - sinon   → prix normaux, pas de badge, pas de coupon
 *
 * À désactiver manuellement le jour de sortie de l'app mobile en
 * passant la var à 'false' côté Vercel + .env.local.
 *
 * Lu côté client ET serveur : NEXT_PUBLIC_* est inliné par Next à
 * build-time, donc safe à utiliser dans des composants 'use client'.
 */

/** Pourcentage de remise appliquée pendant la promo lancement. */
export const PROMO_LANCEMENT_DISCOUNT_PCT = 50

/** ID du coupon Stripe à passer en `discounts: [{ coupon: ... }]` au futur checkout. */
export const PROMO_LANCEMENT_COUPON_ID = 'LANCEMENT50'

/** Wording réutilisé sur les badges et mentions. */
export const PROMO_LANCEMENT_BADGE_LABEL = 'Offre copines lancement —50%'
export const PROMO_LANCEMENT_PRICE_NOTE =
  '—50% jusqu\'à la sortie de l\'app Hilmy'
export const PROMO_LANCEMENT_BANNER_TEXT =
  '—50% sur tous les tarifs jusqu\'à la sortie de l\'app'

/**
 * Vrai si la promo lancement est active. Lit la variable d'env publique
 * (compatible client + serveur, inlinée par Next à build-time).
 */
export function isPromoLancementActive(): boolean {
  return process.env.NEXT_PUBLIC_PROMO_LANCEMENT === 'true'
}

/**
 * Applique la remise de la promo lancement à un prix.
 * Pas de remise si la promo est inactive.
 *
 * Exemple : applyPromoLancement(19) → 9.5 si actif, 19 sinon.
 */
export function applyPromoLancement(price: number): number {
  if (!isPromoLancementActive()) return price
  return price * (1 - PROMO_LANCEMENT_DISCOUNT_PCT / 100)
}
