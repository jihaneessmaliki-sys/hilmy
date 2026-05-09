import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { VuesAreaChart } from '@/components/dashboard/Charts'
import { GoldLine } from '@/components/ui/GoldLine'
import { PastilleSelectionHilmy } from '@/components/v2/PastilleSelectionHilmy'
import { requireUser } from '@/lib/supabase/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOwnedPlaceById } from '@/lib/supabase/queries/places'
import { isSelectionHilmy } from '@/lib/permissions-lieux'

const SINCE_7D_MS = 7 * 86_400_000
const SINCE_30D_MS = 30 * 86_400_000

/**
 * Labels FR humains pour les contact_type stockés dans place_contacts
 * (CHECK constraint mig 41 — 9 valeurs). Évite d'afficher "google_maps"
 * brut dans le tableau tap-to-contact.
 */
const CONTACT_LABELS: Record<string, string> = {
  phone: 'Téléphone',
  website: 'Site web',
  email: 'Email',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  google_maps: 'Google Maps',
  whatsapp: 'WhatsApp',
}

type ContactRow = {
  channel: string
  label: string
  last7: number
  last30: number
  total: number
}

/**
 * Construit la série [{jour: 'DD/MM', vues: n}] pour les 30 derniers
 * jours, avec 0 pour les jours sans donnée. Aligné sur le helper
 * équivalent du dashboard prestataire (app/dashboard/prestataire/page.tsx).
 */
function buildVues30jSeries(rows: { viewed_at: string }[]) {
  const buckets: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets[key] = 0
  }
  for (const row of rows) {
    const key = row.viewed_at.slice(0, 10)
    if (key in buckets) buckets[key]++
  }
  return Object.entries(buckets).map(([key, vues]) => {
    const [, mm, dd] = key.split('-')
    return { jour: `${dd}/${mm}`, vues }
  })
}

/**
 * Dashboard owner lieu — page détail d'un lieu (Phase 2A · PR-B2).
 *
 * Gating produit :
 *   - palier='aucun'           → bloc upsell, pas de stats affichées
 *   - palier='selection_hilmy' → 3 sections stats (vues, saves, contacts)
 *
 * Sécurité : `getOwnedPlaceById` filtre `created_by_user_id = auth.uid()`,
 * retourne null silencieusement si l'utilisatrice n'est pas owner — on
 * redirect vers la liste sans révéler l'existence du lieu (403-style).
 *
 * RLS :
 *   - place_views, place_contacts : owner-read via mig 41 → client standard OK
 *   - favoris : RLS owner-only sur user_id (mig 05) → l'owner du LIEU ne
 *     peut pas lire les favoris des AUTRES users via client standard. On
 *     utilise admin client (service-role) pour la query agrégée saves.
 *     Justifié : agrégat sans PII, server component only, pattern aligné
 *     sur les API routes de tracking.
 */
export default async function LieuDetailPage({
  params,
}: {
  params: Promise<{ placeId: string }>
}) {
  const { placeId } = await params
  const user = await requireUser()

  const { data: place } = await getOwnedPlaceById(user.id, placeId)
  if (!place) {
    // Soit le lieu n'existe pas, soit l'utilisatrice n'est pas owner.
    // Redirect silencieux vers la liste — on ne révèle pas la cause.
    redirect('/dashboard/lieu')
  }

  // Best-effort prénom pour le header (fallback "toi").
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('prenom')
    .eq('user_id', user.id)
    .maybeSingle()
  const prenom = (profile?.prenom as string | undefined) ?? 'Toi'

  const isSelection = isSelectionHilmy(place)

  const headerActions = (
    <div className="flex flex-wrap items-center gap-3">
      {isSelection && <PastilleSelectionHilmy />}
      {place.slug && (
        <Link
          href={`/recommandation/${place.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
        >
          Voir ma fiche publique
          <span
            className="text-or transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </Link>
      )}
    </div>
  )

  // ─── Cas 1 : palier='aucun' → upsell, pas de stats ────────────────
  if (!isSelection) {
    return (
      <>
        <DashboardHeader
          kicker={`Bonjour, ${prenom}`}
          titre={
            <>
              Tu gères{' '}
              <em className="font-serif italic text-or">{place.name}</em>
            </>
          }
          lead={`${place.city ?? '—'}. Pour débloquer les stats et la mise en avant, passe en Sélection Hilmy.`}
          actions={headerActions}
        />
        <section className="px-6 py-12 md:px-12 md:py-16">
          <div className="rounded-sm bg-vert p-8 text-creme md:p-12">
            <div className="flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">Passe en Sélection Hilmy</span>
            </div>
            <h2 className="mt-5 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-light leading-[1.1] text-creme">
              Donne à <em className="italic text-or">{place.name}</em> sa
              place dans le carnet des copines.
            </h2>
            <p className="mt-5 max-w-2xl text-[14px] leading-[1.7] text-creme/85">
              Sélection Hilmy, c&apos;est la formule pour les lieux qu&apos;on
              veut mettre en avant entre nous : un café-cocooning, un brunch
              du dimanche, une boutique-pépite. Tu gardes ta fiche dans
              l&apos;annuaire — Sélection Hilmy ajoute le reste.
            </p>
            <ul className="mt-8 grid gap-3 text-[14px] leading-[1.55] md:grid-cols-2">
              {[
                'Pastille Sélection Hilmy sur la fiche publique',
                'Mise en avant dans le feed des recommandations',
                'Stats vues + saves + tap-to-contact tracé',
                'Photos illimitées sur ta galerie',
                'Auto-mise-en-avant quand tu publies un événement',
                'Support prioritaire de la team',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span
                    className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-or"
                    aria-hidden="true"
                  />
                  <span className="text-creme/90">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap items-baseline gap-3">
              <span className="font-serif text-[44px] font-light leading-none text-or md:text-[52px]">
                39€
              </span>
              <span className="text-sm text-creme/70">/ mois</span>
              <span className="text-[12px] italic text-creme/55">
                · sans engagement, résiliable à tout moment
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tarifs#selection-hilmy"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-or px-7 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light"
              >
                Passer Sélection Hilmy
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/tarifs"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-or/40 px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:border-or hover:text-or-light"
              >
                Voir les détails
              </Link>
            </div>
          </div>
        </section>
      </>
    )
  }

  // ─── Cas 2 : palier='selection_hilmy' → stats ─────────────────────
  const since7d = new Date(Date.now() - SINCE_7D_MS).toISOString()
  const since30d = new Date(Date.now() - SINCE_30D_MS).toISOString()

  // place_views : owner-read RLS OK via client standard.
  // place_contacts : owner-read RLS OK via client standard.
  // favoris : RLS owner-only user_id → admin client pour count agrégé
  // (justification cf header comment).
  const admin = createAdminClient()

  const [
    views7Res,
    views30Rows,
    contactsRes,
    saves7Res,
    saves30Res,
    savesTotalRes,
  ] = await Promise.all([
    supabase
      .from('place_views')
      .select('id', { count: 'exact', head: true })
      .eq('place_id', place.id)
      .gte('viewed_at', since7d),
    supabase
      .from('place_views')
      .select('viewed_at')
      .eq('place_id', place.id)
      .gte('viewed_at', since30d)
      .order('viewed_at', { ascending: true }),
    supabase
      .from('place_contacts')
      .select('contact_type, clicked_at')
      .eq('place_id', place.id),
    admin
      .from('favoris')
      .select('id', { count: 'exact', head: true })
      .eq('type_item', 'lieu')
      .eq('item_id', place.id)
      .gte('created_at', since7d),
    admin
      .from('favoris')
      .select('id', { count: 'exact', head: true })
      .eq('type_item', 'lieu')
      .eq('item_id', place.id)
      .gte('created_at', since30d),
    admin
      .from('favoris')
      .select('id', { count: 'exact', head: true })
      .eq('type_item', 'lieu')
      .eq('item_id', place.id),
  ])

  const viewsTotal = place.nb_vues ?? 0
  const views7d = views7Res.count ?? 0
  const views30dRows = (views30Rows.data ?? []) as { viewed_at: string }[]
  const views30d = views30dRows.length
  const series = buildVues30jSeries(views30dRows)

  const saves7d = saves7Res.count ?? 0
  const saves30d = saves30Res.count ?? 0
  const savesTotal = savesTotalRes.count ?? 0

  // Tap-to-contact : agrégation par canal sur 7j/30j/total.
  type ClickRow = { contact_type: string; clicked_at: string }
  const clicks = (contactsRes.data ?? []) as ClickRow[]
  const now7 = Date.now() - SINCE_7D_MS
  const now30 = Date.now() - SINCE_30D_MS
  const byChannel: Map<string, ContactRow> = new Map()
  for (const c of clicks) {
    const ts = new Date(c.clicked_at).getTime()
    const row =
      byChannel.get(c.contact_type) ??
      {
        channel: c.contact_type,
        label: CONTACT_LABELS[c.contact_type] ?? c.contact_type,
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

  return (
    <>
      <DashboardHeader
        kicker={`Bonjour, ${prenom}`}
        titre={
          <>
            Tu gères{' '}
            <em className="font-serif italic text-or">{place.name}</em>
          </>
        }
        lead={`${place.city ?? '—'}. Voici tes chiffres en direct.`}
        actions={headerActions}
      />

      {/* Section 1 — Stats vues */}
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-8 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Mes vues</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            kicker="Total"
            value={viewsTotal.toLocaleString('fr-FR')}
            hint="Depuis la création de ta fiche"
            index={0}
          />
          <StatCard
            kicker="7 derniers jours"
            value={views7d.toLocaleString('fr-FR')}
            hint="Sur la dernière semaine"
            variant="or"
            index={1}
          />
          <StatCard
            kicker="30 derniers jours"
            value={views30d.toLocaleString('fr-FR')}
            hint="Sur le dernier mois"
            variant="vert"
            index={2}
          />
        </div>

        {views30d >= 5 && (
          <div className="mt-8 rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="overline text-or">Évolution sur 30 jours</p>
                <h2 className="mt-2 font-serif text-2xl font-light text-vert">
                  Quand on regarde ta fiche.
                </h2>
                <p className="mt-1 text-[11px] italic text-texte-sec">
                  Données réelles agrégées par jour.
                </p>
              </div>
              <span className="font-serif text-xl italic text-or">
                ↗ {views30d}
              </span>
            </div>
            <VuesAreaChart data={series} />
          </div>
        )}
      </section>

      {/* Section 2 — Stats saves */}
      <section className="bg-blanc px-6 py-10 md:px-12 md:py-14">
        <div className="mb-8 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Mes saves</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            kicker="Total saves"
            value={savesTotal.toLocaleString('fr-FR')}
            hint="Copines qui ont sauvegardé"
            index={0}
          />
          <StatCard
            kicker="7 derniers jours"
            value={saves7d.toLocaleString('fr-FR')}
            hint="Saves cette semaine"
            variant="or"
            index={1}
          />
          <StatCard
            kicker="30 derniers jours"
            value={saves30d.toLocaleString('fr-FR')}
            hint="Saves ce mois"
            variant="vert"
            index={2}
          />
        </div>
      </section>

      {/* Section 3 — Tap-to-contact tracé */}
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-8 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Tap-to-contact tracé</span>
        </div>

        {contactRows.length === 0 ? (
          <EmptyState
            kicker="En attente"
            titre="Aucun clic sur tes canaux contact pour le moment."
            pitch="Dès qu'une copine clique sur un de tes canaux (Maps, téléphone, site web, Insta…) depuis ta fiche publique, le clic apparaîtra ici. Patience — la collecte démarre dès que les copines arrivent."
          />
        ) : (
          <div className="overflow-hidden rounded-sm border border-or/15 bg-blanc">
            <table className="w-full">
              <thead className="border-b border-or/10 bg-creme-soft">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-medium tracking-[0.22em] text-or uppercase md:px-6">
                    Canal
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.22em] text-or uppercase md:px-6">
                    7 jours
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.22em] text-or uppercase md:px-6">
                    30 jours
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
                    <td className="px-4 py-4 text-[14px] font-medium text-vert md:px-6">
                      {row.label}
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
        )}

        <p className="mt-6 text-[11px] italic text-texte-sec">
          Les clics sont trackés depuis le déploiement de PR-B1
          (2026-05-09). Les fiches plus anciennes peuvent avoir reçu des
          clics non comptabilisés avant cette date.
        </p>
      </section>
    </>
  )
}
