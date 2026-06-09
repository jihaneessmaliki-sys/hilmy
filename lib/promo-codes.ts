/**
 * Validation des codes promo côté client (saisie /tarifs) et côté serveur
 * (server action avant redirection Stripe).
 *
 * Source de vérité : table public.promo_codes (migration 35).
 * Policy RLS SELECT public n'expose que les codes ACTIFS et valides
 * dans la fenêtre temporelle, donc l'absence de retour = code invalide
 * (sans révéler si c'est faute de frappe ou code expiré).
 *
 * Compatible Stripe Coupons : quand Stripe LIVE sera actif, ajouter une
 * colonne stripe_coupon_id sur promo_codes et un mapping ici pour
 * passer le coupon_id à Stripe Checkout au lieu de calculer le discount
 * côté Hilmy.
 */

import type { Palier } from '@/app/tarifs/_lib/pricing'

export interface PromoCodeRow {
  id: string
  code: string
  /** 'discount' = remise % (discount_pct) ; 'trial' = essai gratuit
   *  jusqu'à trial_end. Ajouté en mig 61. */
  type: 'discount' | 'trial'
  /** Fin de l'essai gratuit (codes 'trial' uniquement). NULL sinon. */
  trial_end: string | null
  /** Pourcentage de remise (codes 'discount'). NULL pour les 'trial'. */
  discount_pct: number | null
  applies_to_palier: 'standard' | 'premium' | 'cercle_pro' | 'all'
  valid_from: string
  valid_until: string | null
  max_uses: number | null
  current_uses: number
  active: boolean
}

export type ValidatePromoResult =
  | { ok: true; code: PromoCodeRow }
  | { ok: false; reason: 'not_found' | 'wrong_palier' | 'max_uses_reached' }

/**
 * Vérifie qu'un code promo s'applique au palier demandé et n'a pas atteint
 * son quota. Retourne un statut typé pour permettre des messages UX précis.
 *
 * À appeler après le SELECT Supabase (qui filtre déjà active + temporel
 * grâce à la policy RLS).
 */
export function validatePromoCode(
  code: PromoCodeRow | null,
  palier: Palier,
): ValidatePromoResult {
  if (!code) return { ok: false, reason: 'not_found' }

  if (
    code.applies_to_palier !== 'all' &&
    code.applies_to_palier !== palier
  ) {
    return { ok: false, reason: 'wrong_palier' }
  }

  if (code.max_uses !== null && code.current_uses >= code.max_uses) {
    return { ok: false, reason: 'max_uses_reached' }
  }

  return { ok: true, code }
}

/**
 * Calcule le prix après remise (arrondi 2 décimales).
 */
export function applyDiscount(price: number, discountPct: number): number {
  if (discountPct <= 0) return price
  if (discountPct >= 100) return 0
  const factor = (100 - discountPct) / 100
  return Math.round(price * factor * 100) / 100
}

/**
 * Message UX standardisé pour chaque cas d'invalidité.
 * Voix Sara : tutoiement, ton copine, pas corporate.
 */
export function promoErrorMessage(
  reason: Exclude<ValidatePromoResult, { ok: true }>['reason'],
  palierLabel: string,
): string {
  switch (reason) {
    case 'not_found':
      return "Ce code n'existe pas ou n'est plus valide. Re-vérifie la frappe."
    case 'wrong_palier':
      return `Ce code n'est pas applicable au palier ${palierLabel}.`
    case 'max_uses_reached':
      return 'Ce code a atteint sa limite de copines. Désolée !'
  }
}
