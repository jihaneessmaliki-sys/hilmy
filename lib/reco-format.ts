/**
 * Formats PARTAGÉS de la note agrégée + du compte de copines.
 *
 * Une seule source de vérité de format → la fiche PUBLIQUE (anon) et la fiche
 * CONNECTÉE affichent la note/prix de façon strictement identique (même valeur,
 * même format). Pas de divergence d'affichage entre les deux rendus.
 */

/** Note moyenne en français, 1 décimale max, sans zéro superflu : 4,6 ; 5. */
export function formatRating(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

/** « copine » au singulier, « copines » au pluriel. */
export function copineWord(n: number): string {
  return n > 1 ? 'copines' : 'copine'
}
