import { CopineBadge } from './CopineBadge'

interface MemberNameProps {
  prenom: string | null
  /** Si true, rend le CopineBadge (icône or) à droite du prénom. */
  isCopine?: boolean | null
  /** Date d'activation Copine pour le tooltip du badge (mois année). */
  copineSince?: string | Date | null
  /** Fallback si prenom est null/empty. Par défaut "Une copine". */
  fallback?: string
  /** Taille du badge en px (default 12 — discret pour ne pas dominer). */
  badgeSize?: number
  className?: string
}

/**
 * Affichage unifié d'un prénom membre + badge Copine éventuel.
 *
 * Pattern : "Prénom ★" — badge APRÈS le prénom (convention Twitter/IG
 * checkmark). Le badge reste discret (size 12 par défaut) pour ne pas
 * dominer la card.
 *
 * Si !isCopine OU !copineSince, le badge n'est pas rendu — la
 * sémantique "Copine" implique un abo actif ET un timestamp.
 *
 * `inline-flex items-baseline` + `gap-1.5` garantit que le badge
 * vertical-aligne correctement avec la baseline du texte, quelle que
 * soit la taille du parent.
 */
export function MemberName({
  prenom,
  isCopine = false,
  copineSince = null,
  fallback = 'Une copine',
  badgeSize = 12,
  className = '',
}: MemberNameProps) {
  const displayName = prenom && prenom.length > 0 ? prenom : fallback
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span>{displayName}</span>
      {isCopine && copineSince ? (
        <CopineBadge copineSince={copineSince} size={badgeSize} />
      ) : null}
    </span>
  )
}
