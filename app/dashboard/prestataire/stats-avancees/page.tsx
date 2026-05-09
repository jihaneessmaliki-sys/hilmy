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
import { hasCerclePro } from '@/lib/permissions'
import {
  aggregateByVille,
  aggregateByHeure,
  computeCategoryPercentile,
  benchmarkWording,
  type VueRow,
} from '@/lib/stats/aggregations'

const SINCE_DAYS = 30
const SINCE_7D_MS = 7 * 86_400_000
const SINCE_30D_MS = 30 * 86_400_000

/**
 * Labels FR voix Sara pour les 9 canaux profile_contacts (CHECK mig 15).
 * Mirror du dashboard lieu (PR-B2 #79) avec linkedin (au lieu de
 * google_maps qui est lieu-only). Ajouté Sprint K reframe 2026-05-09.
 */
const CONTACT_CHANNEL_COPY: Record<string, { emoji: string; label: string }> = {
  whatsapp: { emoji: '💬', label: 'Ont voulu te WhatsApper' },
  phone: { emoji: '📞', label: "Ont voulu t'appeler" },
  email: { emoji: '✉️', label: "Ont voulu t'écrire" },
  website: { emoji: '🌐', label: 'Ont voulu visiter ton site' },
  instagram: { emoji: '📸', label: 'Ont voulu te suivre sur Insta' },
  tiktok: { emoji: '🎵', label: 'Ont voulu te suivre sur TikTok' },
  linkedin: { emoji: '💼', label: 'Ont voulu te connecter sur LinkedIn' },
  facebook: { emoji: '👥', label: 'Ont voulu te suivre sur Facebook' },
  youtube: { emoji: '▶️', label: 'Ont voulu voir tes vidéos' },
}

type ContactRow = {
  channel: string
  emoji: string
  label: string
  last7: number
  last30: number
  total: number
}

export default async function StatsAvanceesPage() {
  const { prestataire } = await requirePrestataire()

  // Garde Cercle Pro (founders incluses via hasCerclePro)
  if (!hasCerclePro(prestataire)) {
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

  // 2. Pairs : autres prestataires de même catégorie (Premium + Cercle Pro,
  //    incluant les founders qui bénéficient d'un Cercle Pro effectif).
  //    On count leurs vues 30j pour bench. On exclut soi-même.
  const { data: peers } = await supabase
    .from('profiles')
    .select('id')
    .eq('categorie', prestataire.categorie)
    .or('palier.in.(premium,cercle_pro),is_founder.eq.true')
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

  // 3. Tap-to-contact : agrégation par canal sur 7j/30j/total
  //    (Sprint K reframe — section nouvelle, exclusivité Cercle Pro qui
  //    valorise le palier 99€/mois). RLS owner-read sur profile_contacts
  //    (mig 15) → client standard suffit, pas besoin de service-role.
  const { data: contactsRows } = await supabase
    .from('profile_contacts')
    .select('contact_type, clicked_at')
    .eq('profile_id', prestataire.id)

  type ClickRow = { contact_type: string; clicked_at: string }
  const clicks = (contactsRows ?? []) as ClickRow[]
  const now7 = Date.now() - SINCE_7D_MS
  const now30 = Date.now() - SINCE_30D_MS
  const byChannel: Map<string, ContactRow> = new Map()
  for (const c of clicks) {
    const ts = new Date(c.clicked_at).getTime()
    const copy = CONTACT_CHANNEL_COPY[c.contact_type] ?? {
      emoji: '·',
      label: c.contact_type,
    }
    const row =
      byChannel.get(c.contact_type) ??
      {
        channel: c.contact_type,
        emoji: copy.emoji,
        label: copy.label,
        last7: 0,
        last30: 0,
        total: 0,
      }
    row.total++
    if (ts >= now30) row.last30++
    if (ts >= now7) row.last7++
    byChannel.set(c.contact_type, row)
  }
  const contactRows = Array.from(byChannel.values()).sort(
    (a, b) => b.total - a.total,
  )

  // 4. Agrégations vues
  const villes = aggregateByVille(myRows, 8)
  const heures = aggregateByHeure(myRows)
  const percentile = computeCategoryPercentile(myViewsCount, peerCounts)
  const wording = benchmarkWording(percentile)

  // 5. Top heure (pour StatCard)
  const topHeure = heures.reduce(
    (best, cur) => (cur.vues > best.vues ? cur : best),
    { heure: '—', vues: 0 },
  )
  const topVille = villes[0]

  const categorieLabel =
    CATEGORIES_MAP[prestataire.categorie] ?? prestataire.categorie

  // Pluralisation FR (1 → "", N>1 → "s")
  const pluralS = (n: number) => (n > 1 ? 's' : '')

  return (
    <>
      <DashboardHeader
        kicker={`Le détail des copines, ${prestataire.nom}`}
        titre={
          <>Voilà ce que les copines{' '}
            <em className="font-serif italic text-or">pensent de toi.</em>
          </>
        }
        lead={`Sur les ${SINCE_DAYS} derniers jours, en profondeur.`}
        actions={
          <Link
            href="/dashboard/prestataire"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
          >
            ← Retour à mon espace
          </Link>
        }
      />

      {/* ─── KPIs résumé ─────────────────────────────────────────── */}
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-8 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">
            Les copines te découvrent · {SINCE_DAYS} derniers jours
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            kicker="Au total"
            value={`${myViewsCount.toLocaleString('fr-FR')} copine${pluralS(myViewsCount)}`}
            hint="se sont arrêtées sur ton profil"
            variant="vert"
            index={0}
          />
          <StatCard
            kicker="Elles viennent surtout de"
            value={topVille ? topVille.ville : '—'}
            hint={
              topVille
                ? `${topVille.vues.toLocaleString('fr-FR')} copine${pluralS(topVille.vues)} de cette ville`
                : 'On découvrira ta ville préférée sous peu'
            }
            variant="or"
            index={1}
          />
          <StatCard
            kicker="Quand elles te regardent"
            value={topHeure.vues > 0 ? topHeure.heure : '—'}
            hint={
              topHeure.vues > 0
                ? `Pic à ${topHeure.heure} (heure UTC)`
                : 'Pas encore d’heure de pic identifiable'
            }
            variant="vert"
            index={2}
          />
        </div>
      </section>

      {/* ─── Carte des villes ────────────────────────────────────── */}
      <section className="bg-blanc px-6 py-12 md:px-12 md:py-16">
        <div className="rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="overline text-or">D&apos;où viennent les copines</p>
              <h2 className="mt-2 font-serif text-2xl font-light text-vert">
                Tes 8 villes-pépites.
              </h2>
              <p className="mt-1 text-[12px] italic text-texte-sec">
                Chaque barre, c&apos;est une ville où on parle de toi.
              </p>
            </div>
          </div>
          <VillesBarChart data={villes} />
        </div>
      </section>

      {/* ─── Pics horaires ───────────────────────────────────────── */}
      <section className="px-6 py-12 md:px-12 md:py-16">
        <div className="rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="overline text-or">Quand on te regarde</p>
              <h2 className="mt-2 font-serif text-2xl font-light text-vert">
                Les heures où elles s&apos;arrêtent sur ton profil.
              </h2>
              <p className="mt-1 text-[12px] italic text-texte-sec">
                Réparti par heure de la journée (UTC) sur les 30 derniers jours.
                Idéal pour caler tes posts Insta ou tes annonces d&apos;événements.
              </p>
            </div>
          </div>
          <HeuresBarChart data={heures} />
        </div>
      </section>

      {/* ─── Tap-to-contact tracé (nouveau Sprint K — Cercle Pro only) ─ */}
      <section className="bg-blanc px-6 py-12 md:px-12 md:py-16">
        <div className="mb-6 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Elles ont fait le pas</span>
        </div>

        {clicks.length >= 1 ? (
          <>
            <h2 className="mb-8 font-serif text-[clamp(1.75rem,3vw,2.25rem)] font-light leading-[1.15] text-vert">
              <em className="italic text-or">{clicks.length}</em> copine{pluralS(clicks.length)}{' '}
              {clicks.length > 1 ? 'sont passées' : 'est passée'} de la
              curiosité à l&apos;action.
            </h2>
            <div className="overflow-hidden rounded-sm border border-or/15 bg-blanc">
              <table className="w-full">
                <thead className="border-b border-or/10 bg-creme-soft">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-[0.22em] text-or uppercase md:px-6">
                      Comment elles t&apos;ont cherchée
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.22em] text-or uppercase md:px-6">
                      Cette semaine
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.22em] text-or uppercase md:px-6">
                      Ce mois
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.22em] text-or uppercase md:px-6">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contactRows.map((row, i) => (
                    <tr
                      key={row.channel}
                      className={
                        i === contactRows.length - 1
                          ? ''
                          : 'border-b border-or/10'
                      }
                    >
                      <td className="px-4 py-4 md:px-6">
                        <span className="flex items-center gap-3">
                          <span
                            className="text-[18px] leading-none"
                            aria-hidden="true"
                          >
                            {row.emoji}
                          </span>
                          <span className="text-[14px] font-medium text-vert">
                            {row.label}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-[14px] text-texte md:px-6">
                        {row.last7.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-4 text-right text-[14px] text-texte md:px-6">
                        {row.last30.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-4 text-right font-serif text-[15px] italic text-or-deep md:px-6">
                        {row.total.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-sm border border-or/15 bg-creme-soft p-8 md:p-12">
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.25rem)] font-light leading-[1.15] text-vert">
              Pour qu&apos;elles te contactent, il faut qu&apos;elles{' '}
              <em className="italic text-or">trouvent comment.</em>
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-texte-sec">
              Vérifie que tes infos contact sont à jour sur ta fiche —
              c&apos;est la première chose qu&apos;on regarde.
            </p>
            {prestataire.slug && (
              <Link
                href={`/prestataire-v2/${prestataire.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-vert px-7 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
              >
                Voir ma fiche publique
                <span className="text-or-light" aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ─── Où tu te situes (benchmark catégorie reframé) ───────── */}
      <section className="bg-vert px-6 py-12 text-creme md:px-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">Où tu te situes</span>
          </div>
          <h2 className="mt-4 font-serif text-3xl font-light text-creme md:text-4xl">
            Parmi les copines en{' '}
            <em className="italic text-or">{categorieLabel}</em>.
          </h2>

          {percentile !== null && (
            <div className="mt-8 rounded-sm border border-or/30 bg-vert-dark/40 p-6 md:p-8">
              <p className="font-serif text-[64px] font-light leading-none text-or md:text-[80px]">
                {percentile}<span className="text-[36px] md:text-[44px]">e</span>
              </p>
              <p className="mt-1 text-[11px] tracking-[0.28em] text-or-light uppercase">
                Tu te places ici dans ta catégorie
              </p>
            </div>
          )}

          <p className="mt-6 text-[15px] leading-[1.7] text-creme/85">
            {wording}
          </p>

          <p className="mt-6 text-[11px] italic text-creme/55">
            Comparé aux autres copines de la catégorie {categorieLabel}{' '}
            (paliers Premium et Cercle Pro, sur la même fenêtre 30 jours,
            échantillon de {peerCounts.length} fiches).
          </p>
        </div>
      </section>

      {/* ─── Footer transparence ──────────────────────────────────── */}
      <p className="px-6 pb-12 pt-8 text-center font-sans text-[12px] italic text-texte-sec md:px-12">
        On compte précieusement chaque pas qu&apos;une copine fait vers
        toi, depuis le 9 mai 2026.
      </p>
    </>
  )
}
