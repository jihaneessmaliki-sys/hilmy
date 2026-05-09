/**
 * Source de vérité pour le gating de features par palier lieu.
 *
 * Mirror de lib/permissions.ts (prestataires) mais simplifié :
 *  - Pas de système founder côté lieux pour l'instant
 *  - 2 paliers seulement : 'aucun' (gratuit/communautaire) et
 *    'selection_hilmy' (39€/mois, pastille + tri prio + stats + photos
 *    illimitées + auto-boost événementiel)
 *
 * Tous les call-sites qui gatent une feature payante lieu doivent passer
 * par ces helpers plutôt que de lire `palier` directement (cohérence avec
 * la convention prestataires : cf bug ⚠️ #3 de l'audit du 2026-05-09 où
 * une lecture brute avait laissé passer le mauvais palier sur /abonnement).
 *
 * BDD : colonne `places.palier` ajoutée par migration 41.
 */

export type LieuPalier = 'aucun' | 'selection_hilmy'

export type PlaceGatingFields = {
  palier?: LieuPalier | null
}

/**
 * Palier effectif appliqué pour le gating.
 * Pas de mapping founder côté lieux → on retourne le palier stocké,
 * fallback 'aucun' si NULL/undefined (lieu créé avant migration 41 ou
 * sans palier configuré).
 *
 * Existe pour symétrie avec getEffectivePalier() côté prestataires :
 * si on introduit un système founder/legacy/grandfathered côté lieux
 * plus tard, on l'ajoute ici sans toucher aux call-sites.
 */
export function getEffectivePalierLieu(p: PlaceGatingFields): LieuPalier {
  return p.palier ?? 'aucun'
}

/** Accès aux features Sélection Hilmy (pastille, tri prio, stats, etc.). */
export function hasSelectionHilmy(p: PlaceGatingFields): boolean {
  return getEffectivePalierLieu(p) === 'selection_hilmy'
}

/**
 * Alias plus lisible de hasSelectionHilmy() — quand le code de lecture
 * exprime "ce lieu EST Sélection Hilmy" plutôt que "ce lieu A accès aux
 * features Sélection Hilmy". Sémantiquement identique.
 */
export function isSelectionHilmy(p: PlaceGatingFields): boolean {
  return hasSelectionHilmy(p)
}
