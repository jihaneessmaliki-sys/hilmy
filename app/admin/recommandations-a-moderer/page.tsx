import { createAdminClient } from '@/lib/supabase/admin'
import { RecoRow } from './recoRowClient'

type Status = 'published' | 'flagged' | 'removed'

export default async function RecommandationsAModererPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>
}) {
  const { status = 'flagged' } = await searchParams
  // Protection auth assurée par app/admin/layout.tsx. service_role
  // pour bypass les RLS SELECT (post-Chantier 4 les recos 'flagged'
  // ne sont visibles qu'à leur owner via la nouvelle policy
  // "Read published or own recommendations").
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('recommendations')
    .select(
      `id, type, comment, rating, status, admin_notes, created_at, place_id, profile_id, place:places ( name, slug ), profile:profiles ( nom, slug ), user:user_profiles ( prenom )`,
    )
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)

  const recos = data ?? []

  return (
    <section className="px-6 py-10 md:px-12 md:py-14">
      <header className="border-b border-or/15 pb-6">
        <p className="overline text-or">Modération · recommandations</p>
        <h1 className="mt-3 font-serif text-3xl font-light text-vert md:text-4xl">
          {status === 'flagged' && 'Recommandations signalées.'}
          {status === 'published' && 'Toutes les recommandations.'}
          {status === 'removed' && 'Recommandations retirées.'}
        </h1>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { key: 'flagged', label: 'Signalées' },
            { key: 'published', label: 'Publiées' },
            { key: 'removed', label: 'Retirées' },
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
        {recos.length === 0 ? (
          <div className="rounded-sm border border-or/15 bg-blanc p-10 text-center">
            <p className="font-serif text-xl italic text-vert">
              {status === 'flagged'
                ? 'Rien à modérer — la communauté est sage.'
                : 'Aucune recommandation dans cette file.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {recos.map((r) => (
              <RecoRow key={r.id} reco={r} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
