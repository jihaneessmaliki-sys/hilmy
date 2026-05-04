import Link from 'next/link'
import { GoldLine } from '@/components/ui/GoldLine'
import { CATEGORIES_MAP } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { getDemandesForHomeCarousel } from '@/lib/supabase/je-cherche'
import type { DemandeWithProfile } from '@/lib/types/je-cherche'

const CATEGORY_LABELS: Record<string, string> = {
  ...CATEGORIES_MAP,
  autre: 'Autre',
}

function locationLabel(d: { canton: string | null; city: string | null; country: string }): string {
  if (d.city) return d.city
  if (d.canton) return d.canton
  return d.country
}

function initial(prenom: string | null): string {
  if (!prenom || prenom.length === 0) return '·'
  return prenom.charAt(0).toUpperCase()
}

/**
 * Section home : carrousel horizontal "La team cherche…".
 * 4 demandes triées urgent > created_at, dernière card = CTA poster une demande.
 * Server Component.
 */
export async function TeamCherche() {
  const result = await getDemandesForHomeCarousel()
  const demandes: DemandeWithProfile[] = result.ok ? result.data : []

  return (
    <section className="bg-creme py-20 md:py-28">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <GoldLine width={48} />
              <span className="overline text-or">Le feed des copines</span>
            </div>
            <h2 className="mt-5 font-serif text-h2 font-light leading-[1.05] text-vert">
              La team{' '}
              <em className="italic text-or">cherche</em>
              <span className="text-or">…</span>
            </h2>
          </div>
          <Link
            href="/je-cherche"
            className="group inline-flex items-center gap-2 self-start text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:text-or md:self-auto"
          >
            Voir tout
            <span className="text-or transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>

        {/* Carrousel scroll-snap */}
        <div className="mt-10 -mx-6 md:-mx-20">
          <ul
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 md:px-20 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Demandes récentes des copines"
          >
            {demandes.map((d) => {
              const isUrgent = d.urgency === 'urgent' && d.status === 'open'
              return (
                <li key={d.id} className="w-[260px] shrink-0 snap-start sm:w-[280px]">
                  <Link
                    href={`/je-cherche/${d.id}`}
                    className="group flex h-full flex-col rounded-sm border border-or/15 bg-blanc p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-or/40 hover:shadow-[0_16px_32px_-20px_rgba(15,61,46,0.25)]"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-creme-deep">
                        {d.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="flex h-full w-full items-center justify-center font-serif text-[14px] font-light text-or">
                            {initial(d.prenom)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-vert">
                          {d.prenom ?? 'Une copine'}
                        </p>
                        <p className="truncate text-[10px] text-texte-sec">
                          {locationLabel(d)} · {formatRelativeTime(d.created_at)}
                        </p>
                      </div>
                      {isUrgent && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-[#D4847A]/15 px-2 py-0.5 text-[9px] font-medium tracking-[0.18em] text-[#A85C50] uppercase">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-[9px] tracking-[0.22em] text-or-deep uppercase">
                      {CATEGORY_LABELS[d.category] ?? d.category}
                    </p>
                    <h3 className="mt-1.5 line-clamp-3 font-serif text-[16px] font-light leading-tight text-vert break-words">
                      {d.title}
                    </h3>
                    <div className="mt-auto pt-4 text-[11px] font-medium text-texte-sec">
                      {d.response_count} reco{d.response_count > 1 ? 's' : ''}
                    </div>
                  </Link>
                </li>
              )
            })}

            {/* Card CTA finale : poster une demande */}
            <li className="w-[260px] shrink-0 snap-start sm:w-[280px]">
              <Link
                href="/je-cherche/nouvelle"
                className="group flex h-full flex-col items-center justify-center gap-4 rounded-sm bg-vert p-6 text-center text-creme transition-all duration-300 hover:-translate-y-0.5 hover:bg-vert-dark"
              >
                <span className="overline text-or">À toi</span>
                <p className="font-serif text-[20px] font-light italic leading-tight text-creme">
                  Demande à la team
                </p>
                <p className="text-[12px] leading-[1.55] text-creme/80">
                  On a forcément l&apos;adresse.
                </p>
                <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-or/40 px-4 py-2 text-[10px] font-medium tracking-[0.22em] text-or uppercase transition-all group-hover:bg-or group-hover:text-vert">
                  + Poster ma demande
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
