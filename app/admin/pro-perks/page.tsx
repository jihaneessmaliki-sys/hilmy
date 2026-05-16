import { createAdminClient } from '@/lib/supabase/admin'
import { listPerksByStatusAdmin } from '@/lib/supabase/queries/pro-perks'
import type { ProPerk, ProPerkStatus } from '@/lib/supabase/types'
import { PerkModerationRow } from './PerkModerationRow'

type ListableStatus = Extract<
  ProPerkStatus,
  'pending_review' | 'active' | 'rejected' | 'paused'
>

const TABS: { key: ListableStatus; label: string; heading: string }[] = [
  { key: 'pending_review', label: 'En attente', heading: 'À modérer.' },
  { key: 'active', label: 'Actives', heading: 'En ligne.' },
  { key: 'rejected', label: 'Refusées', heading: 'Refusées.' },
  { key: 'paused', label: 'En pause', heading: 'En pause.' },
]

function isListable(status: string | undefined): status is ListableStatus {
  return (
    status === 'pending_review' ||
    status === 'active' ||
    status === 'rejected' ||
    status === 'paused'
  )
}

/**
 * Queue de modération admin des Pro Perks (mig 50).
 *
 * Auth gating : assuré par app/admin/layout.tsx (requireUser +
 * user_metadata.is_admin). service_role pour bypass RLS et voir tous
 * les statuts (pending_review n'est PAS dans la policy
 * public_active_select).
 *
 * Pattern copié sur app/admin/evenements-a-valider (tabs filter
 * par ?status=...).
 */
export default async function AdminProPerksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: rawStatus } = await searchParams
  const status: ListableStatus = isListable(rawStatus) ? rawStatus : 'pending_review'

  const perks = await listPerksByStatusAdmin(status)

  // Lookup prestataires pour afficher le nom/email côté admin
  // (l'info reste utile même pour les tabs autres que pending).
  const prestaIds = Array.from(new Set(perks.map((p) => p.prestataire_profile_id)))
  let prestaByid = new Map<
    string,
    { nom: string; email: string | null; slug: string | null }
  >()
  if (prestaIds.length > 0) {
    const admin = createAdminClient()
    const { data: prestas } = await admin
      .from('profiles')
      .select('id, nom, email, slug')
      .in('id', prestaIds)
    prestaByid = new Map(
      ((prestas as Array<{ id: string; nom: string; email: string | null; slug: string | null }> | null) ?? []).map(
        (p) => [p.id, { nom: p.nom, email: p.email, slug: p.slug }],
      ),
    )
  }

  const heading = TABS.find((t) => t.key === status)?.heading ?? 'Offres Cercle Pro.'

  return (
    <section className="px-6 py-10 md:px-12 md:py-14">
      <header className="border-b border-or/15 pb-6">
        <p className="overline text-or">Modération · offres Cercle Pro</p>
        <h1 className="mt-3 font-serif text-3xl font-light text-vert md:text-4xl">
          {heading}
        </h1>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
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

      <div className="mt-8">
        {perks.length === 0 ? (
          <div className="rounded-sm border border-or/15 bg-blanc p-10 text-center">
            <p className="font-serif text-xl italic text-vert">
              Aucune offre dans cette file.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {perks.map((perk: ProPerk) => (
              <PerkModerationRow
                key={perk.id}
                perk={perk}
                presta={prestaByid.get(perk.prestataire_profile_id) ?? null}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
