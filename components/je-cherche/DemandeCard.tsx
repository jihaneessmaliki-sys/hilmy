import Link from 'next/link'
import { CATEGORIES_MAP } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { MemberName } from '@/components/badges/MemberName'
import type { DemandeWithProfile } from '@/lib/types/je-cherche'

const CATEGORY_LABELS: Record<string, string> = {
  ...CATEGORIES_MAP,
  autre: 'Autre',
}

function categorieLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug
}

function initial(prenom: string | null): string {
  if (!prenom || prenom.length === 0) return '·'
  return prenom.charAt(0).toUpperCase()
}

function locationLabel(d: { canton: string | null; city: string | null; country: string }): string {
  if (d.city) return d.city
  if (d.canton) return d.canton
  return d.country
}

interface Props {
  demande: DemandeWithProfile
  /** Si true, retire l'anti-overflow truncate du titre (vue détail). */
  full?: boolean
}

/**
 * Card demande pour le feed /je-cherche et la home.
 * Server Component (pure).
 */
export function DemandeCard({ demande }: Props) {
  const isUrgent = demande.urgency === 'urgent' && demande.status === 'open'
  const excerpt =
    demande.content.length > 200
      ? `${demande.content.slice(0, 200).trim()}…`
      : demande.content

  return (
    <Link
      href={`/je-cherche/${demande.id}`}
      className="group block rounded-sm border border-or/15 bg-blanc p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-or/40 hover:shadow-[0_16px_32px_-20px_rgba(15,61,46,0.25)]"
      aria-label={`Demande de ${demande.prenom ?? 'une copine'} : ${demande.title}`}
    >
      {/* Header : avatar + prénom + lieu + temps */}
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-creme-deep">
          {demande.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={demande.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center font-serif text-[16px] font-light text-or"
            >
              {initial(demande.prenom)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-vert">
            <MemberName
              prenom={demande.prenom}
              isCopine={demande.author_is_copine}
              copineSince={demande.author_copine_since}
            />
          </p>
          <p className="truncate text-[11px] text-texte-sec">
            {locationLabel(demande)} · {formatRelativeTime(demande.created_at)}
          </p>
        </div>
        {isUrgent && (
          <span
            className="inline-flex shrink-0 items-center rounded-full bg-[#D4847A]/15 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.18em] text-[#A85C50] uppercase"
            aria-label="Demande urgente"
          >
            Urgent
          </span>
        )}
      </div>

      {/* Catégorie pill */}
      <p className="mt-4 text-[10px] tracking-[0.22em] text-or-deep uppercase">
        {categorieLabel(demande.category)}
      </p>

      {/* Titre + extrait */}
      <h3 className="mt-2 font-serif text-[20px] font-light leading-tight text-vert break-words">
        {demande.title}
      </h3>
      <p className="mt-3 text-[13px] leading-[1.6] text-texte-sec break-words">
        {excerpt}
      </p>

      {/* Footer : compteur recos + status */}
      <div className="mt-5 flex items-center justify-between border-t border-or/10 pt-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-texte-sec">
          <span aria-hidden="true">·</span>
          {demande.response_count} reco
          {demande.response_count > 1 ? 's' : ''}
        </span>
        {demande.status === 'resolved' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-vert/10 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.18em] text-vert uppercase">
            Trouvé
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-vert transition-colors group-hover:text-or">
            Aider
            <span className="text-or" aria-hidden="true">→</span>
          </span>
        )}
      </div>
    </Link>
  )
}
