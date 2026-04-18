import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATEGORIES_MAP } from '@/lib/constants'

// Protection auth : assurée par app/admin/layout.tsx
// (requireUser + user_metadata.is_admin, sinon notFound).
//
// TODO · Section 4 "Conversion / funnel" : à brancher après
// installation de Vercel Analytics ou GA4. Pour l'instant, tout
// ce qu'on sait faire c'est du comptage DB (snapshot statique).

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Récupère le prénom de l'admin pour la salutation.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: adminProfile } = user
    ? await supabase
        .from('user_profiles')
        .select('prenom')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }
  const prenom = adminProfile?.prenom ?? null

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const nowISO = now.toISOString()

  const [
    // USERS
    totalMembers,
    totalProviders,
    newThisWeek,
    newThisMonth,
    // MODÉRATION
    pendingProfiles,
    flaggedEvents,
    flaggedRecos,
    recoReports,
    placeReports,
    eventReports,
    // ACTIVITÉ
    publishedRecos,
    upcomingEvents,
    approvedProfiles,
    // Agrégations Top cities + catégories
    profilesCities,
    eventsCities,
    placesCities,
    profilesByCat,
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('signupType', 'member'),
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('signupType', 'provider'),
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo),
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthAgo),

    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Note : events n'ont pas de statut 'pending' (schéma actuel :
    // 'published' | 'flagged' | 'removed' | 'past'). On compte les
    // événements 'flagged' = signalés par la communauté et en attente
    // de décision admin, cohérent avec l'intent "à valider".
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'flagged'),
    supabase
      .from('recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'flagged'),
    admin
      .from('recommendation_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('place_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('event_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    supabase
      .from('recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published'),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('start_date', nowISO),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),

    supabase.from('profiles').select('ville').eq('status', 'approved'),
    supabase
      .from('events')
      .select('city')
      .eq('status', 'published')
      .gte('start_date', nowISO),
    supabase.from('places').select('city'),
    supabase.from('profiles').select('categorie').eq('status', 'approved'),
  ])

  // Agrège Top villes (somme prestataires + events + lieux par ville)
  const cityMap = new Map<string, number>()
  const bump = (map: Map<string, number>, key: string | null | undefined) => {
    if (!key) return
    const k = key.trim()
    if (!k) return
    // Normalise casse : "bruxelles" et "Bruxelles" fusionnent.
    const norm = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase()
    map.set(norm, (map.get(norm) ?? 0) + 1)
  }
  for (const p of profilesCities.data ?? []) bump(cityMap, p.ville)
  for (const e of eventsCities.data ?? []) bump(cityMap, e.city)
  for (const l of placesCities.data ?? []) bump(cityMap, l.city)
  const topCities = [...cityMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Agrège Top catégories (prestataires)
  const catMap = new Map<string, number>()
  for (const p of profilesByCat.data ?? []) bump(catMap, p.categorie)
  const topCats = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const totalSignalements =
    (recoReports.count ?? 0) +
    (placeReports.count ?? 0) +
    (eventReports.count ?? 0)

  return (
    <section className="px-6 py-10 md:px-12 md:py-14">
      <header className="border-b border-or/15 pb-8">
        <p className="overline text-or">Tableau de bord</p>
        <h1 className="mt-3 font-serif text-3xl font-light text-vert md:text-4xl">
          Bonjour{prenom ? `, ${prenom}` : ''}.
          <br />
          <em className="italic text-or">
            Voici où en est Hilmy aujourd&apos;hui.
          </em>
        </h1>
      </header>

      {/* Section 1 — USERS */}
      <SectionLabel>— La communauté —</SectionLabel>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Utilisatrices" value={totalMembers.count ?? 0} />
        <StatCard label="Prestataires" value={totalProviders.count ?? 0} />
        <StatCard
          label="Nouvelles cette semaine"
          value={newThisWeek.count ?? 0}
          context="7 derniers jours"
        />
        <StatCard
          label="Nouvelles ce mois"
          value={newThisMonth.count ?? 0}
          context="30 derniers jours"
        />
      </div>

      {/* Section 2 — MODÉRATION (cliquable) */}
      <SectionLabel>— À modérer —</SectionLabel>
      <div className="grid gap-4 md:grid-cols-4">
        <ModerationCard
          label="Fiches à valider"
          count={pendingProfiles.count ?? 0}
          href="/admin/prestataires-a-valider"
          hint="Nouvelles fiches prestataires"
        />
        <ModerationCard
          label="Événements signalés"
          count={flaggedEvents.count ?? 0}
          href="/admin/evenements-a-valider"
          hint="Reviews utilisatrices"
        />
        <ModerationCard
          label="Recos signalées"
          count={flaggedRecos.count ?? 0}
          href="/admin/recommandations-a-moderer"
          hint="Avis signalés par la commu"
        />
        <ModerationCard
          label="Signalements"
          count={totalSignalements}
          href="/admin/signalements"
          hint="Reports en attente"
        />
      </div>

      {/* Section 3 — ACTIVITÉ */}
      <SectionLabel>— Contenu vivant —</SectionLabel>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Recommandations publiées"
          value={publishedRecos.count ?? 0}
        />
        <StatCard
          label="Événements à venir"
          value={upcomingEvents.count ?? 0}
          context="publiés + futurs"
        />
        <StatCard
          label="Fiches actives"
          value={approvedProfiles.count ?? 0}
          context="status=approved"
        />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <TopList
          title="Top 3 villes"
          hint="Somme prestataires + lieux + événements"
          items={topCities.map(([name, count]) => ({ name, count }))}
        />
        <TopList
          title="Top 5 catégories prestataires"
          hint="Par nombre de fiches actives"
          items={topCats.map(([slug, count]) => ({
            name: CATEGORIES_MAP[slug] ?? slug,
            count,
          }))}
        />
      </div>

      <p className="mt-14 border-t border-or/15 pt-6 text-center text-[11px] italic leading-[1.6] text-texte-sec">
        Taux de conversion · funnel signup · temps moyen d&apos;onboarding
        <br />
        <span className="text-texte-muted">
          À brancher après installation de Vercel Analytics ou GA4.
        </span>
      </p>
    </section>
  )
}

// ────────────────────────────────────────────────────────────────
// UI bricks
// ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-12 mb-5 overline text-or">{children}</p>
  )
}

function StatCard({
  label,
  value,
  context,
}: {
  label: string
  value: number
  context?: string
}) {
  return (
    <div className="rounded-sm border border-or/15 bg-blanc p-6">
      <p className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl font-light text-vert">
        {value.toLocaleString('fr-FR')}
      </p>
      {context && (
        <p className="mt-2 text-[11px] italic text-texte-muted">{context}</p>
      )}
    </div>
  )
}

function ModerationCard({
  label,
  count,
  href,
  hint,
}: {
  label: string
  count: number
  href: string
  hint: string
}) {
  const hot = count > 0
  return (
    <Link
      href={href}
      className={`group block rounded-sm border p-6 transition-all duration-300 ${
        hot
          ? 'border-or bg-or/10 hover:bg-or/20'
          : 'border-or/15 bg-blanc hover:bg-creme-soft'
      }`}
    >
      <p
        className={`text-[11px] tracking-[0.22em] uppercase ${
          hot ? 'text-or-deep' : 'text-texte-sec'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-3 font-serif text-4xl font-light ${
          hot ? 'text-or-deep' : 'text-vert'
        }`}
      >
        {count.toLocaleString('fr-FR')}
      </p>
      <p className="mt-2 text-[11px] italic text-texte-muted">{hint}</p>
      <span
        className={`mt-4 inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.22em] uppercase transition-all ${
          hot
            ? 'text-or-deep group-hover:gap-3'
            : 'text-vert group-hover:text-or'
        }`}
      >
        Voir la file
        <span
          className="text-or transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          →
        </span>
      </span>
    </Link>
  )
}

function TopList({
  title,
  hint,
  items,
}: {
  title: string
  hint: string
  items: { name: string; count: number }[]
}) {
  return (
    <div className="rounded-sm border border-or/15 bg-blanc p-6">
      <div className="flex items-baseline justify-between border-b border-or/10 pb-3">
        <p className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">
          {title}
        </p>
        <p className="text-[10px] italic text-texte-muted">{hint}</p>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 text-center text-[13px] italic text-texte-sec">
          Rien encore — le compteur est à zéro.
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          {items.map((it, i) => (
            <li
              key={it.name}
              className="flex items-center justify-between py-1.5"
            >
              <span className="flex items-center gap-3">
                <span className="font-serif text-sm font-light text-or/80">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[14px] text-vert">{it.name}</span>
              </span>
              <span className="font-serif text-lg font-light text-vert">
                {it.count.toLocaleString('fr-FR')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
