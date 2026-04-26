/**
 * Pastille "✨ Sélection Hilmy" — réservée aux fiches Cercle Pro.
 *
 * Affichée dans le hero, à droite ou sous le badge palier. Visuellement
 * distincte du PalierBadge :
 *  - PalierBadge Cercle Pro = vert sombre + bordure or (badge sobre)
 *  - PastilleSelectionHilmy = or éclatant + texte vert (mise en valeur
 *    éditoriale)
 *
 * Le rendu volontairement plus "spotlighté" appuie l'idée que c'est une
 * sélection humaine de l'équipe Hilmy, pas juste un palier d'abonnement.
 */
export function PastilleSelectionHilmy() {
  return (
    <span
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-or px-3.5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase shadow-[0_4px_14px_-4px_rgba(201,169,97,0.55)]"
      aria-label="Sélection Hilmy"
    >
      <span aria-hidden="true">✨</span>
      <span>Sélection Hilmy</span>
    </span>
  )
}
