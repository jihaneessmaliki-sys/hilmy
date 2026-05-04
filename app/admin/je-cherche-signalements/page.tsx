import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { SignalementActions } from './_components/SignalementActions'

export const dynamic = 'force-dynamic'

interface SignalementRow {
  id: string
  reporter_id: string
  demande_id: string | null
  response_id: string | null
  reason: string
  comment: string | null
  created_at: string
}

interface DemandeRow {
  id: string
  title: string
  content: string
  status: string
  flag_count: number
}

interface ResponseRow {
  id: string
  demande_id: string
  content: string
  is_hidden: boolean
  flag_count: number
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  inapproprie: 'Inapproprié',
  harcelement: 'Harcèlement',
  autre: 'Autre',
}

export default async function JeChercheSignalementsAdminPage() {
  // Le admin layout vérifie déjà is_admin -> on peut utiliser service-role.
  const admin = createAdminClient()

  const [signalementsRes, demandesIdsRes] = await Promise.all([
    admin
      .from('demande_signalements')
      .select('id, reporter_id, demande_id, response_id, reason, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    Promise.resolve(null),
  ])

  const signalements = (signalementsRes.data ?? []) as SignalementRow[]

  if (signalements.length === 0) {
    return (
      <section className="px-6 py-12 md:px-12">
        <h1 className="font-serif text-3xl font-light text-vert">
          Signalements Je cherche
        </h1>
        <p className="mt-6 text-[14px] italic text-texte-sec">
          Aucun signalement pour l&apos;instant. La team est sage.
        </p>
      </section>
    )
  }

  // Pre-fetch des targets en parallèle
  const demandeIds = Array.from(
    new Set(
      signalements
        .map((s) => s.demande_id)
        .filter((id): id is string => typeof id === 'string'),
    ),
  )
  const responseIds = Array.from(
    new Set(
      signalements
        .map((s) => s.response_id)
        .filter((id): id is string => typeof id === 'string'),
    ),
  )
  const reporterIds = Array.from(new Set(signalements.map((s) => s.reporter_id)))

  const [demandesRes, responsesRes, reportersRes] = await Promise.all([
    demandeIds.length > 0
      ? admin
          .from('demandes')
          .select('id, title, content, status, flag_count')
          .in('id', demandeIds)
      : Promise.resolve({ data: [] as DemandeRow[], error: null }),
    responseIds.length > 0
      ? admin
          .from('demande_responses')
          .select('id, demande_id, content, is_hidden, flag_count')
          .in('id', responseIds)
      : Promise.resolve({ data: [] as ResponseRow[], error: null }),
    admin
      .from('user_profiles')
      .select('user_id, prenom')
      .in('user_id', reporterIds),
  ])

  const demandesMap = new Map<string, DemandeRow>()
  for (const d of (demandesRes.data ?? []) as DemandeRow[]) demandesMap.set(d.id, d)
  const responsesMap = new Map<string, ResponseRow>()
  for (const r of (responsesRes.data ?? []) as ResponseRow[]) responsesMap.set(r.id, r)
  const reporterPrenoms = new Map<string, string>()
  for (const p of reportersRes.data ?? [])
    reporterPrenoms.set(p.user_id as string, (p.prenom as string | null) ?? '—')

  return (
    <section className="px-6 py-10 md:px-12 md:py-14">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-3xl font-light text-vert">
          Signalements Je cherche
        </h1>
        <span className="text-[11px] tracking-[0.22em] text-or uppercase">
          {signalements.length} dernier{signalements.length > 1 ? 's' : ''}
        </span>
      </div>

      <ul className="space-y-3">
        {signalements.map((s) => {
          const target = s.demande_id
            ? demandesMap.get(s.demande_id)
            : s.response_id
              ? responsesMap.get(s.response_id)
              : null
          const targetType = s.demande_id ? 'demande' : 'response'
          const targetId = s.demande_id ?? s.response_id ?? ''
          const linkHref = s.demande_id
            ? `/je-cherche/${s.demande_id}`
            : s.response_id && (target as ResponseRow | undefined)?.demande_id
              ? `/je-cherche/${(target as ResponseRow).demande_id}#response-${s.response_id}`
              : '#'

          let excerpt = '—'
          let isHidden = false
          let flagCount = 0
          if (target) {
            if (s.demande_id) {
              const d = target as DemandeRow
              excerpt = `${d.title} — ${d.content.slice(0, 120)}…`
              isHidden = d.status === 'hidden'
              flagCount = d.flag_count
            } else {
              const r = target as ResponseRow
              excerpt = r.content.slice(0, 160) + (r.content.length > 160 ? '…' : '')
              isHidden = r.is_hidden
              flagCount = r.flag_count
            }
          }

          return (
            <li
              key={s.id}
              className="rounded-sm border border-or/15 bg-blanc p-5"
            >
              <header className="flex flex-wrap items-center gap-3 text-[12px]">
                <span className="rounded-full bg-[#D4847A]/15 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.18em] text-[#A85C50] uppercase">
                  {REASON_LABELS[s.reason] ?? s.reason}
                </span>
                <span className="text-texte-sec">sur</span>
                <span className="rounded-full bg-creme-deep px-2.5 py-0.5 text-[10px] font-medium tracking-[0.18em] text-vert uppercase">
                  {targetType}
                </span>
                {isHidden && (
                  <span className="rounded-full bg-vert/15 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.18em] text-vert uppercase">
                    Masqué (auto)
                  </span>
                )}
                <span className="ml-auto text-[11px] text-texte-sec">
                  {formatRelativeTime(s.created_at)}
                </span>
              </header>

              <p className="mt-3 text-[12px] text-texte-sec">
                Reporter :{' '}
                <span className="font-medium text-vert">
                  {reporterPrenoms.get(s.reporter_id) ?? '—'}
                </span>{' '}
                · flag_count actuel :{' '}
                <span className="font-medium text-vert">{flagCount}</span>
              </p>

              {s.comment && (
                <p className="mt-3 rounded-sm bg-creme-soft px-3 py-2 text-[12px] italic text-texte">
                  « {s.comment} »
                </p>
              )}

              <div className="mt-3 rounded-sm border border-or/10 bg-creme-soft px-3 py-2 text-[13px] italic text-texte">
                {excerpt}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] tracking-[0.22em] text-or-deep uppercase hover:text-or"
                >
                  Voir en contexte →
                </Link>
                <SignalementActions
                  targetType={targetType}
                  targetId={targetId}
                  isHidden={isHidden}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
