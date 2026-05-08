/**
 * Source de vérité pour le gating de features par palier prestataire.
 *
 * Règle métier (post-PR founders) :
 *  - `is_founder = true` est strictement équivalent à `palier = 'cercle_pro'`,
 *    quel que soit le palier stocké en DB.
 *  - Les founders bénéficient d'un accès Cercle Pro à vie (gratuit), sans
 *    abonnement Stripe associé.
 *
 * Tous les call-sites qui gatent une feature payante doivent passer par
 * ces helpers plutôt que de lire `palier` directement.
 */

import type { Palier } from '@/app/tarifs/_lib/pricing'

export type ProfileGatingFields = {
  palier?: Palier | null
  is_founder?: boolean | null
}

/**
 * Palier effectif appliqué pour le gating.
 * Founder → cercle_pro. Sinon palier stocké, fallback standard.
 */
export function getEffectivePalier(p: ProfileGatingFields): Palier {
  if (p.is_founder === true) return 'cercle_pro'
  return p.palier ?? 'standard'
}

/** Accès aux features Premium ou Cercle Pro (incluant founders). */
export function hasPremiumFeatures(p: ProfileGatingFields): boolean {
  const eff = getEffectivePalier(p)
  return eff === 'premium' || eff === 'cercle_pro'
}

/** Accès aux features Cercle Pro (incluant founders). */
export function hasCerclePro(p: ProfileGatingFields): boolean {
  return getEffectivePalier(p) === 'cercle_pro'
}

/** Vrai si la prestataire est founder (accès Cercle Pro à vie). */
export function isFounder(p: Pick<ProfileGatingFields, 'is_founder'>): boolean {
  return p.is_founder === true
}
