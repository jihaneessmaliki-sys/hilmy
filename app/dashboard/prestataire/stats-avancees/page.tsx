import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { StatCard } from '@/components/dashboard/StatCard'
import {
  VillesBarChart,
  HeuresBarChart,
} from '@/components/dashboard/AdvancedCharts'
import { requirePrestataire } from '@/lib/supabase/session'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES_MAP } from '@/lib/constants'
import {
  aggregateByVille,
  aggregateByHeure,
  computeCategoryPercentile,
  benchmarkWording,
  type VueRow,
} from '@/lib/stats/aggregations'

const SINCE_DAYS = 30

export default async function StatsAvanceesPage() {
  const { prestataire } = await requirePrestataire()

  // Garde Cercle Pro
  if (prestataire.palier !== 'cercle_pro') {
    redirect('/dashboard/prestataire/abonnement')
  }

  const supabase = await createClient()
  const since = new Date(
    Date.now() - SINCE_DAYS * 86_400_000,
  ).toISOString()

  // 1. Mes vues sur 30j (avec ville pour la carte)
  const { data: myViewsRows } = await supabase
    .from('profile_views')
    .select('viewed_at, city')
    .eq('profile_id', prestataire.id)
    .gte('viewed_at', since)

  const myRows: VueRow[] = (myViewsRows ?? []) as VueRow[]
  const myViewsCount = myRows.length

  // 2. Pairs : autres prestataires de même catégorie (Premium + Cercle Pro)
  //    On count leurs vues 30j pour bench. On exclut soi-même.
  const { data: peers } = await supabase
    .from('profiles')
    .select('id')
    .eq('categorie', prestataire.categorie)
    .in('palier', ['premium', 'cercle_pro'])
    .eq('status', 'approved')
    .neq('id', prestataire.id)

  const peerIds = (peers ?? []).map((p) => p.id)

  // Pour chaque peer, count vues 30j en parallèle (limit pour éviter
  // une vague de requêtes — top 50 pairs suffisent pour un percentile fiable)
  const peerSubset = peerIds.slice(0, 50)
  const peerCounts: number[] = await Promise.all(
    peerSubset.map(async (pid) => {
      const { count } = await supabase
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', pid)
        .gte('viewed_at', since)
      return count ?? 0
    }),
  )

  // 3. Agrégations
  const villes = aggregateByVille(myRows, 8)
  const heures = aggregateByHeure(myRows)
  const percentile = computeCategoryPercentile(myViewsCount, peerCounts)
  const wording = benchmarkWording(percentile)

  // 4. Top heure (pour StatCard)
  const topHeure = heures.reduce(
    (best, cur) => (cur.vues > best.vues ? cur : best),
    { heure: '—', vues: 0 },
  )
  const topVille = villes[0]

  const categorieLabel =
    CATEGORIES_MAP[prestataire.categorie] ?? prestataire.categorie

  return (
    <>
      <DashboardHeader
        kicker="Stats avancées"
        titre={
          <>
            Ton audience,{' '}
            <em className="font-serif italic text-or">en profondeur.</em>
          </>
        }
        lead={`Carte des villes, pics horaires, benchmark catégorie. Sur les ${SINCE_DAYS} derniers jours.`}
        actions={
          <Link
            href="/dashboard/prestataire"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
          >
            ← Retour au dashboard
          </Link>
        }
      />

      {/* KPIs résumé */}
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-8 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Vue d&apos;ensemble · {SINCE_DAYS}j</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            kicker="Vues totales 30j"
            value={myViewsCount.toLocaleString('fr-FR')}
            hint="Visiteuses uniques de ta fiche"
            index={0}
          />
          <StatCard
            kicker="Top ville"
            value={topVille ? topVille.ville : '—'}
            hint={topVille ? `${topVille.vues} vues` : 'Pas encore de données'}
            variant="or"
            index={1}
          />
          <StatCard
            kicker="Pic horaire"
            value={topHeure.vues > 0 ? topHeure.heure : '—'}
            hint={
              topHeure.vues > 0
                ? `${topHeure.vues} vues à ${topHeure.heure} (UTC)`
                : 'Pas encore de pic identifiable'
            }
            variant="vert"
            index={2}
          />
        </div>
      </section>

      {/* Carte des villes */}
      <section className="bg-blanc px-6 py-12 md:px-12 md:py-16">
        <div className="rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="overline text-or">Carte des villes</p>
              <h2 className="mt-2 font-serif text-2xl font-light text-vert">
                D&apos;où viennent tes copines.
              </h2>
              <p className="mt-1 text-[12px] italic text-texte-sec">
                Top 8 villes par nombre de vues sur 30j.
              </p>
            </div>
          </div>
          <VillesBarChart data={villes} />
        </div>
      </section>

      {/* Pics horaires */}
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="overline text-or">Pics horaires</p>
              <h2 className="mt-2 font-serif text-2xl font-light text-vert">
                Quand on te regarde.
              </h2>
              <p className="mt-1 text-[12px] italic text-texte-sec">
                Distribution des vues par heure de la journée (UTC) sur 30j.
                Idéal pour caler tes posts Insta ou tes annonces d&apos;événements.
              </p>
            </div>
          </div>
          <HeuresBarChart data={heures} />
        </div>
      </section>

      {/* Benchmark catégorie */}
      <section className="bg-vert px-6 py-12 text-creme md:px-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">Benchmark catégorie</span>
          </div>
          <h2 className="mt-4 font-serif text-3xl font-light text-creme md:text-4xl">
            Où tu te situes en{' '}
            <em className="italic text-or">{categorieLabel}</em>.
          </h2>

          {percentile !== null && (
            <div className="mt-8 rounded-sm border border-or/30 bg-vert-dark/40 p-6 md:p-8">
              <p className="font-serif text-[64px] font-light leading-none text-or md:text-[80px]">
                {percentile}
              </p>
              <p className="mt-1 text-[11px] tracking-[0.28em] text-or-light uppercase">
                Percentile dans ta catégorie
              </p>
            </div>
          )}

          <p className="mt-6 text-[15px] leading-[1.7] text-creme/85">
            {wording}
          </p>

          <p className="mt-6 text-[11px] italic text-creme/55">
            Comparaison vs les autres prestataires Premium et Cercle Pro de la
            catégorie {categorieLabel} sur la même fenêtre 30j (échantillon
            de {peerCounts.length} prestataires).
          </p>
        </div>
      </section>

      {/* Footer reassurance */}
      <p className="px-6 pb-12 pt-8 text-center font-sans text-[12px] italic text-texte-sec">
        Stats avancées · Cercle Pro · données agrégées 30j glissants
      </p>
    </>
  )
}
