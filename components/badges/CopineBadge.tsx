import { Star } from 'lucide-react'

interface CopineBadgeProps {
  copineSince: Date | string | null
  /** Taille icône en px. */
  size?: number
  className?: string
}

function formatMonthYear(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/**
 * Badge Copine — étoile or + tooltip natif.
 *
 * Affiche rien si copineSince est null (user non Copine ou copine_since
 * jamais set). Pas de tooltip lib externe : title HTML natif suffit
 * pour ce micro-affordance.
 */
export function CopineBadge({
  copineSince,
  size = 14,
  className = '',
}: CopineBadgeProps) {
  if (!copineSince) return null
  const since = formatMonthYear(copineSince)
  const label = since ? `Copine Hilmy depuis ${since}` : 'Copine Hilmy'
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center text-or ${className}`}
    >
      <Star size={size} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
    </span>
  )
}
