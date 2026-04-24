import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/server'
import { requirePrestataire } from '@/lib/supabase/session'

export default async function MesEvenementsPrestataire() {
  const { prestataire } = await requirePrestataire()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, slug, start_date, end_date, places_max, inscrites_count, status, visibility, city',
    )
    .eq('prestataire_id', prestataire.id)
    .order('start_date', { ascending: false })

  const events = data ?? []
  const now = Date.now()
  const upcoming = events.filter(
    (e) => new Date(e.start_date).getTime() >= now && e.status === 'published',
  )
  const past = events.filter(
    (e) => new Date(e.start_date).getTime() < now || e.status !== 'published',
  )

  return (
    <>
      <DashboardHeader
        kicker="Mes événements"
        titre={
          <>
            Ce que tu{' '}
            <em className="font-serif italic text-or">organises.</em>
          </>
        }
        lead="Ateliers, masterclass, rencontres — les moments que tu proposes à la communauté."
        actions={
          <Link
            href="/proposer-un-evenement"
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-or px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light"
          >
            Créer un événement
            <span
              className="transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        }
      />

      {error && (
        <section className="px-6 pt-6 md:px-12">
          <p className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[13px] text-red-900">
            {error.message}
          </p>
        </section>
      )}

      {events.length === 0 ? (
        <section className="px-6 py-14 md:px-12">
          <EmptyState
            kicker="À toi de jouer"
            titre="Pas encore d'événement."
            pitch="Un atelier, un masterclass, un workshop : propose le premier. On aide à remplir les places."
            ctaLabel="Créer un événement"
            ctaHref="/proposer-un-evenement"
          />
        </section>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="px-6 py-10 md:px-12 md:py-14">
              <div className="mb-8 flex items-center gap-4">
                <GoldLine width={40} />
                <span className="overline text-or">
                  À venir · {upcoming.length}
                </span>
              </div>
              <EventList rows={upcoming} />
            </section>
          )}
          {past.length > 0 && (
            <section className="bg-blanc px-6 py-10 md:px-12 md:py-14">
              <div className="mb-8 flex items-center gap-4">
                <GoldLine width={40} />
                <span className="overline text-or">
                  Passés ou non publiés · {past.length}
                </span>
              </div>
              <EventList rows={past} />
            </section>
          )}
        </>
      )}
    </>
  )
}

type EventRow = {
  id: string
  title: string
  slug: string | null
  start_date: string
  end_date: string | null
  places_max: number | null
  inscrites_count: number
  status: string
  visibility: string
  city: string | null
}

function EventList({ rows }: { rows: EventRow[] }) {
  return (
    <ul className="divide-y divide-or/15 rounded-sm border border-or/15 bg-blanc">
      {rows.map((e) => {
        const d = new Date(e.start_date)
        const dateStr = d.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        const max = e.places_max ?? 0
        const fillPct =
          max > 0 ? Math.min(100, Math.round((e.inscrites_count / max) * 100)) : 0
        const complet = max > 0 && e.inscrites_count >= max
        const statusLabel =
          e.status === 'published'
            ? complet
              ? 'Complet'
              : 'En ligne'
            : e.status === 'flagged'
              ? 'Signalé'
              : e.status === 'removed'
                ? 'Retiré'
                : 'Archivé'
        return (
          <li
            key={e.id}
            className="grid gap-4 px-6 py-6 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8"
          >
            <div>
              <Link
                href={`/evenement-v2/${e.slug ?? e.id}`}
                className="font-serif text-xl font-light text-vert hover:text-or"
              >
                {e.title}
              </Link>
              <p className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">
                {dateStr}
                {e.city && ` · ${e.city}`}
              </p>
            </div>
            {max > 0 ? (
              <div className="min-w-[200px]">
                <div className="mb-1 flex items-center justify-between text-[11px] text-texte-sec">
                  <span>
                    {e.inscrites_count} / {max} inscrites
                  </span>
                  <span className="text-or">{fillPct} %</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-creme-deep">
                  <div
                    className={`h-full ${complet ? 'bg-vert' : 'bg-or'}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-[11px] text-texte-sec">
                {e.inscrites_count} inscrites
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-[10px] tracking-[0.22em] uppercase ${
                e.status === 'published'
                  ? complet
                    ? 'bg-vert text-creme'
                    : 'bg-or/15 text-or-deep'
                  : 'bg-creme-deep text-texte-sec'
              }`}
            >
              {statusLabel}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
