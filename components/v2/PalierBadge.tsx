/**
 * Badge palier prestataire (chantier marketing 2).
 *
 * Variants visuels alignés sur la page /tarifs :
 *  - standard   : 🌿 fond crème, texte vert (sobre — gratuit/de base)
 *  - premium    : 💛 fond or, texte vert (premium = mis en avant)
 *  - cercle_pro : ⭐ fond vert sombre + bordure or (le palier prestige)
 *
 * Sizes :
 *  - small  : pour les cards d'annuaire (h-6, label compact)
 *  - medium : pour la fiche détail (h-8, plus visible)
 */

export type Palier = 'standard' | 'premium' | 'cercle_pro'

const LABEL: Record<Palier, string> = {
  standard: 'Standard',
  premium: 'Premium',
  cercle_pro: 'Cercle Pro',
}

const EMOJI: Record<Palier, string> = {
  standard: '🌿',
  premium: '💛',
  cercle_pro: '⭐',
}

interface Props {
  palier: Palier
  size?: 'small' | 'medium'
  className?: string
}

export function PalierBadge({ palier, size = 'small', className = '' }: Props) {
  const isSmall = size === 'small'

  const sizing = isSmall
    ? 'h-6 px-2.5 text-[10px] tracking-[0.18em] gap-1'
    : 'h-8 px-3.5 text-[11px] tracking-[0.22em] gap-1.5'

  const variantClass = (() => {
    switch (palier) {
      case 'standard':
        return 'bg-creme-soft border border-vert/25 text-vert-soft'
      case 'premium':
        return 'bg-or text-vert shadow-[0_4px_12px_-4px_rgba(201,169,97,0.5)]'
      case 'cercle_pro':
        return 'bg-vert text-or border border-or'
    }
  })()

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium uppercase ${sizing} ${variantClass} ${className}`}
      aria-label={`Palier ${LABEL[palier]}`}
    >
      <span aria-hidden="true">{EMOJI[palier]}</span>
      <span>{LABEL[palier]}</span>
    </span>
  )
}
