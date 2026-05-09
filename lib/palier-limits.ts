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
 * Caps vidéos (durée max + count max) sont APPLIQUÉS CÔTÉ API ROUTE
 * (PR-3, pas de trigger SQL). Le CHECK constraint duration_seconds<=90
 * (mig 43) est juste la borne dure absolue. Si tu changes les caps par
 * palier ici, le client affichera des limites trompeuses tant que
 * l'API route n'est pas synchronisée.
 *
 * Quand on change ces valeurs, mettre à jour aussi :
 *  - supabase/migrations/42_photos_gating_server_side.sql (caps photos SQL)
 *  - supabase/migrations/43_videos_infra.sql (CHECK durée vidéo SQL)
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

/* ═══════════════════════════════════════════════════════════════════
   VIDÉOS PRESTATAIRES (mig 43)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Durée maximum d'une vidéo en secondes selon le palier prestataire.
 *  - standard   : 0 → pas de vidéo autorisée
 *  - premium    : 60 secondes par vidéo
 *  - cercle_pro : 90 secondes par vidéo
 *
 * ⚠️ Doit rester aligné avec le CHECK constraint
 * `profile_videos_duration_check (duration_seconds <= 90)` (mig 43).
 * Le cap dur BDD est 90 (max absolu) ; le cap par palier est appliqué
 * côté API route avant insertion (PR-3).
 */
export const VIDEO_DURATION_MAX: Record<Palier, number> = {
  standard: 0,
  premium: 60,
  cercle_pro: 90,
}

/**
 * Nombre maximum de vidéos par fiche prestataire selon le palier.
 *  - standard   : 0 → pas de vidéo
 *  - premium    : 1 vidéo
 *  - cercle_pro : illimité (matérialisé par null)
 *
 * Pas de trigger SQL pour ce cap (cf décision Jiji 2026-05-10) :
 * validation côté API route en PR-3, plus simple et testable.
 */
export const VIDEO_COUNT_MAX: Record<Palier, number | null> = {
  standard: 0,
  premium: 1,
  cercle_pro: null,
}

/** Helper boolean : peut-on uploader une vidéo de plus ? */
export function canUploadVideo(palier: Palier, currentCount: number): boolean {
  const max = VIDEO_COUNT_MAX[palier]
  if (max === 0) return false
  return max === null || currentCount < max
}

/** Cap durée max pour ce palier (en secondes). 0 = pas de vidéo autorisée. */
export function getVideoDurationCap(palier: Palier): number {
  return VIDEO_DURATION_MAX[palier]
}

/** Libellé compteur vidéos UI ("0 / 1 vidéo", "3 vidéos · illimité"). */
export function videoCountLabel(palier: Palier, currentCount: number): string {
  const max = VIDEO_COUNT_MAX[palier]
  if (max === 0) return 'Vidéo non incluse dans ton palier'
  if (max === null) {
    return `${currentCount} vidéo${currentCount > 1 ? 's' : ''} · illimité`
  }
  return `${currentCount} / ${max} vidéo${max > 1 ? 's' : ''}`
}

/* ═══════════════════════════════════════════════════════════════════
   VIDÉOS LIEUX (mig 43)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Durée maximum d'une vidéo en secondes selon le palier lieu.
 *  - aucun           : 0 → pas de vidéo autorisée
 *  - selection_hilmy : 90 secondes par vidéo
 */
export const PLACE_VIDEO_DURATION_MAX: Record<LieuPalier, number> = {
  aucun: 0,
  selection_hilmy: 90,
}

/**
 * Nombre maximum de vidéos par fiche lieu selon le palier.
 *  - aucun           : 0
 *  - selection_hilmy : illimité (null)
 */
export const PLACE_VIDEO_COUNT_MAX: Record<LieuPalier, number | null> = {
  aucun: 0,
  selection_hilmy: null,
}

export function canUploadPlaceVideo(
  palier: LieuPalier,
  currentCount: number,
): boolean {
  const max = PLACE_VIDEO_COUNT_MAX[palier]
  if (max === 0) return false
  return max === null || currentCount < max
}

export function getPlaceVideoDurationCap(palier: LieuPalier): number {
  return PLACE_VIDEO_DURATION_MAX[palier]
}

export function placeVideoCountLabel(
  palier: LieuPalier,
  currentCount: number,
): string {
  const max = PLACE_VIDEO_COUNT_MAX[palier]
  if (max === 0) return 'Vidéo non incluse dans ce palier'
  if (max === null) {
    return `${currentCount} vidéo${currentCount > 1 ? 's' : ''} · illimité`
  }
  return `${currentCount} / ${max} vidéo${max > 1 ? 's' : ''}`
}
