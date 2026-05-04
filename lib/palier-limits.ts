/**
 * Limites quantitatives par palier prestataire.
 * Single source of truth — alignée avec PALIER_INFO.features dans
 * app/tarifs/_lib/pricing.ts.
 *
 * Quand on change ces valeurs, mettre à jour aussi :
 *  - app/tarifs/_lib/pricing.ts (libellés des features)
 *  - components/v2/PalierBadge.tsx (badges)
 */

import type { Palier } from '@/app/tarifs/_lib/pricing'

/**
 * Nombre maximum de photos dans la galerie prestataire selon le palier.
 * - Standard : 5 photos (essentiel pour démarrer)
 * - Premium : 20 photos (raconter en détail)
 * - Cercle Pro : illimité (matérialisé par null)
 */
export const PHOTO_LIMIT: Record<Palier, number | null> = {
  standard: 5,
  premium: 20,
  cercle_pro: null,
}

/**
 * Helper boolean : la prestataire peut-elle ajouter une nouvelle photo ?
 * Retourne true si le palier est illimité OU si le compteur est sous la limite.
 */
export function canUploadMorePhotos(
  palier: Palier,
  currentCount: number,
): boolean {
  const limit = PHOTO_LIMIT[palier]
  if (limit === null) return true
  return currentCount < limit
}

/**
 * Libellé compteur affiché dans l'UI ("3 / 5 photos" ou "12 photos · illimité").
 */
export function photoCountLabel(palier: Palier, currentCount: number): string {
  const limit = PHOTO_LIMIT[palier]
  if (limit === null) {
    return `${currentCount} photo${currentCount > 1 ? 's' : ''} · illimité`
  }
  return `${currentCount} / ${limit} photos`
}
