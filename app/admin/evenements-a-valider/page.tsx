import { createAdminClient } from '@/lib/supabase/admin'
import { EventRow } from './eventRowClient'

type Status = 'published' | 'flagged' | 'removed'

export default async function EvenementsAValiderPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>
}) {
  const { status = 'published' } = await searchParams
  // Protection auth assurée par app/admin/layout.tsx. service_role
  // pour bypass les RLS SELECT (post-Chantier 4 les events 'flagged'
  // ne sont visibles qu'à leur owner via la nouvelle policy
  // "Read published or own events").
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select(
      `id, title, slug, start_date, city, format, event_type, price_type, price_amount, visibility, status, admin_notes, inscrites_count, flyer_url, description, created_at, prestataire:profiles ( nom )`,
    )
    .eq('status', status)
    .order('start_date', { ascending: true })

  const events = data ?? []

  return (
    <section className="px-6 py-10 md:px-12 md:py-14">
      <header className="border-b border-or/15 pb-6">
        <p className="overline text-or">Modération · événements</p>
        <h1 className="mt-3 font-serif text-3xl font-light text-vert md:text-4xl">
          {status === 'published' && 'Événements publiés.'}
          {status === 'flagged' && 'Événements signalés.'}
          {status === 'removed' && 'Événements retirés.'}
        </h1>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { key: 'published', label: 'Publiés' },
            { key: 'flagged', label: 'Signalés' },
            { key: 'removed', label: 'Retirés' },
          ] as const
        ).map((t) => {
          const active = status === t.key
          return (
            <a
              key={t.key}
              href={`?status=${t.key}`}
              className={`inline-flex items-center rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.22em] uppercase transition-colors ${
                active
                  ? 'bg-vert text-creme'
                  : 'bg-blanc text-texte-sec hover:bg-creme-deep hover:text-vert'
              }`}
            >
              {t.label}
            </a>
          )
        })}
      </nav>

      {error && (
        <p className="mt-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[13px] text-red-900">
          {error.message}
        </p>
      )}

      <div className="mt-8">
        {events.length === 0 ? (
          <div className="rounded-sm border border-or/15 bg-blanc p-10 text-center">
            <p className="font-serif text-xl italic text-vert">
              Aucun événement dans cette file.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {events.map((e) => (
              <EventRow key={e.id} ev={e} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
