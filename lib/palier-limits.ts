/**
 * Limites quantitatives par palier prestataire ET par palier lieu.
 * Single source of truth — alignée avec PALIER_INFO.features dans
 * app/tarifs/_lib/pricing.ts.
 *
 * ⚠️ Caps photos doivent rester alignés avec le trigger SQL
 * `enforce_profiles_galerie_cap` / `enforce_places_photos_cap`
 * (mig 42). Si tu changes ici, change aussi en BDD — sinon UI ment au
 * user (côté client il pense pouvoir, côté serveur le trigger rejette).
 *
 * Quand on change ces valeurs, mettre à jour aussi :
 *  - supabase/migrations/42_photos_gating_server_side.sql (caps SQL)
 *  - app/tarifs/_lib/pricing.ts (libellés des features)
 *  - components/v2/PalierBadge.tsx (badges)
 */

import type { Palier } from '@/app/tarifs/_lib/pricing'
import type { LieuPalier } from '@/lib/permissions-lieux'

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

/* ═══════════════════════════════════════════════════════════════════
   PALIERS LIEUX (places.palier — mig 41)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Nombre maximum de photos pour la galerie d'un lieu selon le palier.
 *  - aucun           : 8 photos (cap "matière minimale" pour fiche gratuite)
 *  - selection_hilmy : illimité (matérialisé par null)
 *
 * ⚠️ Doit rester aligné avec le trigger SQL `enforce_places_photos_cap`
 * (mig 42). Si tu changes ici, change aussi en BDD.
 */
export const PLACE_PHOTO_LIMIT: Record<LieuPalier, number | null> = {
  aucun: 8,
  selection_hilmy: null,
}

/** Helper boolean : le lieu peut-il ajouter une nouvelle photo ? */
export function canUploadMorePlacePhotos(
  palier: LieuPalier,
  currentCount: number,
): boolean {
  const limit = PLACE_PHOTO_LIMIT[palier]
  if (limit === null) return true
  return currentCount < limit
}

/** Libellé compteur côté UI lieu (mirror photoCountLabel pour prestataires). */
export function placePhotoCountLabel(
  palier: LieuPalier,
  currentCount: number,
): string {
  const limit = PLACE_PHOTO_LIMIT[palier]
  if (limit === null) {
    return `${currentCount} photo${currentCount > 1 ? 's' : ''} · illimité`
  }
  return `${currentCount} / ${limit} photos`
}
