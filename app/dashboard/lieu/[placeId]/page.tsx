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
import { getEffectivePalierLieu, isSelectionHilmy } from '@/lib/permissions-lieux'
import { VideosManager } from '@/components/v2/VideosManager'

const SINCE_7D_MS = 7 * 86_400_000
const SINCE_30D_MS = 30 * 86_400_000

/**
 * Labels FR voix Sara pour les 9 canaux place_contacts (CHECK mig 41).
 * Reformulés en récit émotionnel : "ce que les copines ont voulu faire"
 * plutôt que le nom technique du canal. Emoji volontaire (cf brief
 * reframe UX 2026-05-09 — exception aux brand rules sur emoji UI).
 */
const CONTACT_CHANNEL_COPY: Record<string, { emoji: string; label: string }> = {
  google_maps: { emoji: '🗺️', label: 'Sont venues te voir (Maps)' },
  phone: { emoji: '📞', label: "Ont voulu t'appeler" },
  email: { emoji: '✉️', label: "Ont voulu t'écrire" },
  instagram: { emoji: '📸', label: 'Ont voulu te suivre sur Insta' },
  tiktok: { emoji: '🎵', label: 'Ont voulu te suivre sur TikTok' },
  facebook: { emoji: '👥', label: 'Ont voulu te suivre sur Facebook' },
  youtube: { emoji: '▶️', label: 'Ont voulu voir tes vidéos' },
  whatsapp: { emoji: '💬', label: 'Ont voulu te WhatsApper' },
  website: { emoji: '🌐', label: 'Ont voulu visiter ton site' },
}

type ContactRow = {
  channel: string
  emoji: string
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

  // Agrégation des clics par canal sur 7j/30j/total.
  type ClickRow = { contact_type: string; clicked_at: string }
  const clicks = (contactsRes.data ?? []) as ClickRow[]
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

  // ─── Gating "data riche" vs "data jeune/encouragement" ──────────────
  // Voix Sara : on transforme chaque chiffre en récit. Quand la data
  // est trop jeune pour raconter une histoire, on bascule sur des
  // encouragements + actions concrètes plutôt que d'afficher des 0
  // déprimants. Seuils choisis pour qu'une fiche fraîche tombe en
  // mode jeune/encouragement et qu'une fiche établie passe en mode riche.
  const viewsRichMode = viewsTotal >= 10 || views7d >= 3
  const savesRichMode = savesTotal >= 1
  const contactsRichMode = clicks.length >= 1

  // Pluralisation simple FR (1 → "nouvelle", N>1 → "nouvelles", etc.)
  const pluralS = (n: number) => (n > 1 ? 's' : '')

  return (
    <>
      <DashboardHeader
        kicker={`Ton tableau de bord, ${place.name}`}
        titre={
          <>Voilà ce que les copines{' '}
            <em className="font-serif italic text-or">pensent de toi.</em>
          </>
        }
        actions={headerActions}
      />

      {/* ─── Section 1 — Les copines te découvrent ─────────────────── */}
      <section className="px-6 py-10 md:px-12 md:py-14">
        {viewsRichMode ? (
          <>
            <div className="mb-8 flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">Les copines te découvrent</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                kicker="Au total"
                value={`${viewsTotal.toLocaleString('fr-FR')} copine${pluralS(viewsTotal)}`}
                hint="se sont arrêtées sur ta fiche"
                variant="vert"
                index={0}
              />
              <StatCard
                kicker="Cette semaine"
                value={`${views7d.toLocaleString('fr-FR')}`}
                hint="ont voulu te connaître"
                variant="or"
                index={1}
              />
              <StatCard
                kicker="Ce mois"
                value={`${views30d.toLocaleString('fr-FR')} découverte${pluralS(views30d)}`}
                hint="sur les 30 derniers jours"
                variant="vert"
                index={2}
              />
            </div>

            {views30d >= 5 && (
              <div className="mt-8 rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="overline text-or">
                      Quand on s&apos;arrête sur ta fiche
                    </p>
                    <h2 className="mt-2 font-serif text-2xl font-light text-vert">
                      Les 30 derniers jours en image.
                    </h2>
                    <p className="mt-1 text-[12px] italic text-texte-sec">
                      Chaque pic, c&apos;est une copine qui t&apos;a découverte.
                    </p>
                  </div>
                  <span className="font-serif text-xl italic text-or">
                    ↗ {views30d}
                  </span>
                </div>
                <VuesAreaChart data={series} />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">Ta fiche est jeune</span>
            </div>
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.25rem)] font-light leading-[1.15] text-vert">
              Les premières copines{' '}
              <em className="italic text-or">arrivent.</em>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-texte-sec">
              Pendant qu&apos;elle prend ses marques, voilà 3 manières de
              l&apos;aider à briller :
            </p>

            <ul className="mt-10 grid gap-6 md:grid-cols-3">
              <li className="rounded-sm border border-or/15 bg-blanc p-6 md:p-7">
                <span
                  className="font-serif text-[44px] font-light italic leading-none text-or"
                  aria-hidden="true"
                >
                  01
                </span>
                <h3 className="mt-5 font-serif text-lg font-light leading-snug text-vert">
                  Partage le lien sur ton Insta story
                </h3>
                <p className="mt-3 text-[13px] leading-[1.6] text-texte-sec">
                  La team Hilmy y est très active.
                </p>
              </li>

              <li className="rounded-sm border border-or/15 bg-blanc p-6 md:p-7">
                <span
                  className="font-serif text-[44px] font-light italic leading-none text-or"
                  aria-hidden="true"
                >
                  02
                </span>
                <h3 className="mt-5 font-serif text-lg font-light leading-snug text-vert">
                  Glisse un QR code chez toi
                </h3>
                <p className="mt-3 text-[13px] leading-[1.6] text-texte-sec">
                  Tes vraies clientes deviennent ambassadrices.
                </p>
              </li>

              <li className="rounded-sm border border-or/15 bg-blanc p-6 md:p-7">
                <span
                  className="font-serif text-[44px] font-light italic leading-none text-or"
                  aria-hidden="true"
                >
                  03
                </span>
                {/* TODO PR-D : remplacer href="#" par /dashboard/lieu/[placeId]/evenements
                   une fois la sous-route événements lieu créée. */}
                <Link
                  href="#"
                  className="mt-5 block font-serif text-lg font-light leading-snug text-vert hover:text-or"
                >
                  Crée un événement saisonnier{' '}
                  <span className="text-or" aria-hidden="true">→</span>
                </Link>
                <p className="mt-3 text-[13px] leading-[1.6] text-texte-sec">
                  C&apos;est l&apos;auto-boost de la team Hilmy.
                </p>
              </li>
            </ul>
          </>
        )}
      </section>

      {/* ─── Section 2 — Elles te gardent précieusement ────────────── */}
      <section className="bg-blanc px-6 py-10 md:px-12 md:py-14">
        {savesRichMode ? (
          <>
            <div className="mb-6 flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">
                Elles te gardent précieusement
              </span>
            </div>
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.25rem)] font-light leading-[1.15] text-vert">
              <em className="italic text-or">{savesTotal}</em> copine{pluralS(savesTotal)}{' '}
              t&apos;ont ajoutée à leur carnet personnel <span aria-hidden="true">❤️</span>
            </h2>
            {saves7d >= 1 && (
              <p className="mt-5 text-[15px] leading-[1.7] text-texte">
                Cette semaine : <strong className="text-vert">{saves7d} nouvelle{pluralS(saves7d)}</strong>.
              </p>
            )}
            <p className="mt-5 max-w-2xl text-[15px] leading-[1.7] text-texte-sec">
              Tu fais partie de leurs bonnes adresses, celles qu&apos;on
              garde et qu&apos;on partage entre nous.
            </p>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">Le carnet d&apos;or des copines</span>
            </div>
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.25rem)] font-light leading-[1.15] text-vert">
              Pour qu&apos;on te garde, on doit{' '}
              <em className="italic text-or">te connaître.</em>
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-texte-sec">
              Tes premières fans arrivent — concentre-toi sur ta visibilité
              d&apos;abord, les saves suivront.
            </p>
          </>
        )}
      </section>

      {/* ─── Section 3 — Elles ont fait le pas ─────────────────────── */}
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-6 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Elles ont fait le pas</span>
        </div>

        {contactsRichMode ? (
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
          <div className="rounded-sm border border-or/15 bg-blanc p-8 md:p-12">
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.25rem)] font-light leading-[1.15] text-vert">
              Pour qu&apos;elles te contactent, il faut qu&apos;elles{' '}
              <em className="italic text-or">trouvent comment.</em>
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-texte-sec">
              Vérifie que tes infos contact sont à jour sur ta fiche —
              c&apos;est la première chose qu&apos;on regarde.
            </p>
            {place.slug && (
              <Link
                href={`/recommandation/${place.slug}`}
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

        <p className="mt-6 text-[11px] italic text-texte-sec">
          On compte précieusement chaque pas qu&apos;une copine fait vers
          toi, depuis le 9 mai 2026.
        </p>
      </section>

      {/* ─── Mes vidéos (Sélection Hilmy seulement) ─────────────────
          VideosManager affiche le mode "non incluse" si le lieu est
          en palier='aucun', donc on peut le rendre inconditionnellement
          mais ici on rend uniquement pour les Sélection Hilmy car on est
          déjà dans la branche cas B. */}
      <section className="bg-blanc px-6 py-12 md:px-12 md:py-16">
        <div className="mb-6 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Mes vidéos</span>
        </div>
        <VideosManager
          scope="lieu"
          placeId={place.id}
          userId={user.id}
          palier={getEffectivePalierLieu(place)}
        />
      </section>
    </>
  )
}
