import { createAdminClient } from '@/lib/supabase/admin'
import { ReportRow, type ReportRow as ReportRowType } from './reportRowClient'

type Status = 'pending' | 'resolved' | 'dismissed'

type RawReport = {
  id: string
  recommendation_id: string
  reporter_id: string
  reason: string | null
  status: string
  created_at: string
  reco: ReportRowType['reco']
}

export default async function SignalementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>
}) {
  const { status = 'pending' } = await searchParams

  // Service-role (le layout /admin vérifie déjà is_admin)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('recommendation_reports')
    .select(
      `id, recommendation_id, reporter_id, reason, status, created_at,
       reco:recommendations (
         id, comment, rating, status, type,
         profile:profiles ( nom, slug ),
         place:places ( name, slug )
       )`,
    )
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)

  const raw = ((data ?? []) as unknown) as RawReport[]

  // Enrichir avec prénom du reporter
  const reporterIds = Array.from(new Set(raw.map((r) => r.reporter_id)))
  const profileMap = new Map<string, string | null>()
  if (reporterIds.length > 0) {
    const { data: profs } = await admin
      .from('user_profiles')
      .select('user_id, prenom')
      .in('user_id', reporterIds)
    for (const p of profs ?? []) profileMap.set(p.user_id, p.prenom)
  }

  const reports: ReportRowType[] = raw.map((r) => ({
    id: r.id,
    recommendation_id: r.recommendation_id,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
    reco: r.reco,
    reporter: { prenom: profileMap.get(r.reporter_id) ?? null },
  }))

  return (
    <section className="px-6 py-10 md:px-12 md:py-14">
      <header className="border-b border-or/15 pb-6">
        <p className="overline text-or">Signalements</p>
        <h1 className="mt-3 font-serif text-3xl font-light text-vert md:text-4xl">
          {status === 'pending' && 'À traiter.'}
          {status === 'resolved' && 'Avis retirés.'}
          {status === 'dismissed' && 'Classés sans suite.'}
        </h1>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { key: 'pending', label: 'À traiter' },
            { key: 'resolved', label: 'Retirés' },
            { key: 'dismissed', label: 'Classés' },
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
        {reports.length === 0 ? (
          <div className="rounded-sm border border-or/15 bg-blanc p-10 text-center">
            <p className="font-serif text-xl italic text-vert">
              {status === 'pending'
                ? 'Aucun signalement à traiter — la communauté est sage.'
                : 'Rien dans cette file.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {reports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
