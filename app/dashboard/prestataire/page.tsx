import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { VuesAreaChart } from '@/components/dashboard/Charts'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GoldLine } from '@/components/ui/GoldLine'
import { PalierBadge } from '@/components/v2/PalierBadge'
import { PastilleSelectionHilmy } from '@/components/v2/PastilleSelectionHilmy'
import { createClient } from '@/lib/supabase/server'
import { requirePrestataire } from '@/lib/supabase/session'
import {
  getEffectivePalier,
  hasCerclePro,
  hasPremiumFeatures,
} from '@/lib/permissions'

export default async function PrestataireAccueilPage() {
  const { prestataire } = await requirePrestataire()
  const supabase = await createClient()

  // Palier effectif : founders → cercle_pro même si palier stocké = standard.
  const palier = getEffectivePalier(prestataire)
  const isPremiumOrAbove = hasPremiumFeatures(prestataire)
  const isCerclePro = hasCerclePro(prestataire)

  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()

  // Toutes les requêtes en parallèle. RLS gère l'isolation : un prestataire
  // ne lit que ses propres profile_views/contacts (cf. migration 15).
  const [
    viewsLast7Res,
    contactsListRes,
    viewsLast30dRes,
    reviewsRes,
    eventsRes,
  ] = await Promise.all([
    supabase
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', prestataire.id)
      .gte('viewed_at', since7d),
    supabase
      .from('profile_contacts')
      .select('contact_type')
      .eq('profile_id', prestataire.id),
    isPremiumOrAbove
      ? supabase
          .from('profile_views')
          .select('viewed_at')
          .eq('profile_id', prestataire.id)
          .gte('viewed_at', since30d)
          .order('viewed_at', { ascending: true })
      : Promise.resolve({ data: [] as { viewed_at: string }[] }),
    supabase
      .from('recommendations')
      .select(
        'id, comment, rating, reponse_pro, created_at, user:user_profiles ( prenom, avatar_url )',
      )
      .eq('profile_id', prestataire.id)
      .eq('type', 'prestataire')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('prestataire_id', prestataire.id)
      .eq('status', 'published')
      .gte('start_date', new Date().toISOString()),
  ])

  // Compteurs dérivés
  const viewsTotal = prestataire.nb_vues ?? 0
  const viewsLast7 = viewsLast7Res.count ?? 0

  const contactsList = contactsListRes.data ?? []
  const contactsTotal = contactsList.length
  const whatsappCount = contactsList.filter((c) => c.contact_type === 'whatsapp').length
  const emailWebsiteCount = contactsList.filter(
    (c) => c.contact_type === 'email' || c.contact_type === 'website',
  ).length

  // Construction du chart 30j (Premium+ seulement) — bucket par jour, jours
  // sans donnée à 0 pour avoir une courbe propre.
  const views30dRows = viewsLast30dRes.data ?? []
  const views30d = views30dRows.length
  const vues30j = isPremiumOrAbove ? buildVues30jSeries(views30dRows) : []

  const reviews = reviewsRes.data ?? []
  const pendingReplies = reviews.filter((r) => !r.reponse_pro).length
  const upcomingEventsCount = eventsRes.count ?? 0

  // ─── Gating "data riche" vs "data jeune/encouragement" ──────────────
  // Voix Sara : on transforme chaque chiffre en récit. Quand la data est
  // trop jeune pour raconter une histoire, on bascule sur des
  // encouragements + actions concrètes plutôt que d'afficher des 0
  // déprimants. Aligné sur le dashboard lieu (PR-B2 #79).
  const viewsRichMode = viewsTotal >= 10 || viewsLast7 >= 3

  // Pluralisation FR (1 → "", N>1 → "s").
  const pluralS = (n: number) => (n > 1 ? 's' : '')

  return (
    <>
      <DashboardHeader
        kicker={`Ton tableau de bord, ${prestataire.nom}`}
        titre={
          <>Voilà ce que les copines{' '}
            <em className="font-serif italic text-or">pensent de toi.</em>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {isCerclePro && <PastilleSelectionHilmy />}
            <PalierBadge palier={palier} size="medium" />
            <Link
              href={`/prestataires/${prestataire.slug}`}
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
          </div>
        }
      />

      {prestataire.status === 'pending' && (
        <section className="border-b border-or/20 bg-or/10 px-6 py-4 md:px-12">
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-[13px] text-vert">
              <span className="font-serif italic">Ta fiche est en ligne 🌸</span>{' '}
              Pense à la compléter pour qu&apos;on te trouve plus facilement.
            </p>
            <Link
              href="/dashboard/prestataire/fiche"
              className="text-[11px] tracking-[0.22em] text-or-deep uppercase hover:text-or"
            >
              Compléter →
            </Link>
          </div>
        </section>
      )}

      {/* ─── Section 1 — Les copines te découvrent ─────────────────── */}
      <section className="px-6 py-10 md:px-12 md:py-14">
        {viewsRichMode ? (
          <>
            <div className="mb-8 flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">
                Les copines te découvrent
              </span>
            </div>

            {!isPremiumOrAbove ? (
              <div className="grid gap-4 md:grid-cols-2">
                <StatCard
                  kicker="Au total"
                  value={`${viewsTotal.toLocaleString('fr-FR')} copine${pluralS(viewsTotal)}`}
                  hint="se sont arrêtées sur ton profil"
                  variant="vert"
                  index={0}
                />
                <StatCard
                  kicker="Elles ont fait le pas"
                  value={contactsTotal.toLocaleString('fr-FR')}
                  hint="ont voulu te joindre, tous canaux confondus"
                  variant="or"
                  index={1}
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  kicker="Au total"
                  value={`${viewsTotal.toLocaleString('fr-FR')} copine${pluralS(viewsTotal)}`}
                  hint="se sont arrêtées sur ton profil"
                  variant="vert"
                  index={0}
                />
                <StatCard
                  kicker="Cette semaine"
                  value={viewsLast7.toLocaleString('fr-FR')}
                  hint="ont voulu te connaître"
                  variant="or"
                  index={1}
                />
                <StatCard
                  kicker="Elles t'ont WhatsApp"
                  value={whatsappCount.toLocaleString('fr-FR')}
                  hint="ont cliqué pour t'écrire"
                  variant="vert"
                  index={2}
                />
                <StatCard
                  kicker="Elles ont voulu te joindre"
                  value={emailWebsiteCount.toLocaleString('fr-FR')}
                  hint="via email ou ton site"
                  index={3}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">Ton profil prend ses marques</span>
            </div>
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.25rem)] font-light leading-[1.15] text-vert">
              Les premières copines{' '}
              <em className="italic text-or">arrivent.</em>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-texte-sec">
              Pendant que ta fiche prend ses marques, voilà 3 manières de
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
                  Glisse un QR code dans tes communications client
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
                <Link
                  href="/dashboard/prestataire/evenements"
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

        {/* Bandeau invitation Standard → Premium (toujours visible si non
            Premium+, indépendant du mode riche/jeune) */}
        {!isPremiumOrAbove && (
          <div className="mt-10 rounded-sm border border-or/30 bg-or/10 p-6 md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
              <div>
                <p className="overline text-or">Passe en Premium</p>
                <p className="mt-2 font-serif text-[18px] italic leading-[1.4] text-vert md:text-[20px]">
                  Le détail des copines qui t&apos;ont voulue, semaine après
                  semaine.
                </p>
                <p className="mt-2 text-[13px] leading-[1.6] text-texte-sec">
                  Le détail des canaux qu&apos;elles ont cliqués et
                  l&apos;évolution de ta fiche sur 30 jours sont réservés
                  aux paliers Premium et Cercle Pro.
                </p>
              </div>
              <Link
                href="/tarifs"
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
              >
                Découvrir les paliers
                <span className="text-or-light" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Bandeau Premium → Cercle Pro — invitation à monter d'un cran
            pour accéder au tableau tap-to-contact détaillé par canal.
            Affiché uniquement pour les Premium pure (ni Standard, ni
            Cercle Pro). Décision Jiji 2026-05-09 (Sprint K commit add). */}
        {isPremiumOrAbove && !isCerclePro && (
          <div className="mt-10 rounded-sm border border-or/40 bg-creme-soft p-6 md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
              <div>
                <p className="overline text-or">
                  Le détail des copines · disponible en Cercle Pro
                </p>
                <p className="mt-2 font-serif text-[18px] italic leading-[1.4] text-vert md:text-[20px]">
                  Tu veux savoir précisément comment elles te cherchent ?
                </p>
                <p className="mt-2 text-[13px] leading-[1.6] text-texte-sec">
                  Insta, WhatsApp, Maps, téléphone… Le détail par canal
                  pour comprendre ce qui marche le mieux.
                </p>
              </div>
              <Link
                href="/dashboard/prestataire/abonnement"
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
              >
                Passer Cercle Pro
                <span className="text-or-light" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Bandeau Cercle Pro — page détaillée disponible */}
        {isCerclePro && (
          <div className="mt-10 rounded-sm bg-vert p-6 text-creme md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
              <div>
                <p className="overline text-or">Le détail des copines · disponible</p>
                <p className="mt-2 font-serif text-[18px] italic leading-[1.4] text-creme md:text-[20px]">
                  D&apos;où elles viennent, quand elles te regardent, comment
                  tu te situes.
                </p>
                <p className="mt-2 text-[13px] leading-[1.6] text-creme/75">
                  Tu fais partie du Cercle Pro — voici la vue 30 jours
                  glissants pour comprendre les copines en profondeur.
                </p>
              </div>
              <Link
                href="/dashboard/prestataire/stats-avancees"
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-or px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light"
              >
                Voir le détail
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* === CHART 30 JOURS (Premium+ + data riche + ≥5 vues 30d) ====== */}
      {isPremiumOrAbove && viewsRichMode && views30d >= 5 && (
        <section className="bg-blanc px-6 py-12 md:px-12 md:py-16">
          <div className="rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="overline text-or">
                  Quand on s&apos;arrête sur ton profil
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
            <VuesAreaChart data={vues30j} />
          </div>
        </section>
      )}

      {/* === AVIS RÉCENTS (intacts, tous paliers) ================== */}
      <section className="px-6 py-14 md:px-12 md:py-16">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">Tes derniers avis</span>
          </div>
          <Link
            href="/dashboard/prestataire/avis"
            className="group inline-flex items-center gap-2 text-[12px] font-medium text-vert hover:text-or"
          >
            Tout voir
            <span
              className="text-or transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
        <h2 className="mt-4 mb-8 font-serif text-2xl font-light text-vert">
          Ce qu&apos;elles disent de toi.
        </h2>

        {reviews.length === 0 ? (
          <EmptyState
            kicker="Premiers pas"
            titre="Pas encore d'avis."
            pitch="Dès qu'une copine dépose une reco sur ta fiche, elle apparaît ici. Tu pourras lui répondre en direct."
            ctaLabel="Voir ma fiche"
            ctaHref={`/prestataires/${prestataire.slug}`}
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 3).map((r) => {
              const u = Array.isArray(r.user) ? r.user[0] : r.user
              const isUrl =
                u?.avatar_url?.startsWith('http') ||
                u?.avatar_url?.startsWith('/')
              return (
                <li
                  key={r.id}
                  className="rounded-sm border border-or/15 bg-blanc p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-9 w-9 rounded-full bg-cover bg-center ring-1 ring-or/30"
                        style={
                          isUrl
                            ? { backgroundImage: `url(${u?.avatar_url})` }
                            : { backgroundColor: '#D4C5B0' }
                        }
                      />
                      <div>
                        <p className="text-[13px] font-medium text-vert">
                          {u?.prenom ?? 'Anonyme'}
                        </p>
                        <p className="text-[11px] text-texte-sec">
                          {new Date(r.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                    {r.rating !== null && (
                      <div className="flex gap-0.5 text-or">
                        {Array.from({ length: 5 }).map((_, k) => (
                          <span
                            key={k}
                            className={
                              k < (r.rating ?? 0) ? 'opacity-100' : 'opacity-20'
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-3 font-serif text-[14px] italic leading-[1.55] text-texte">
                    « {r.comment} »
                  </p>
                  {!r.reponse_pro && (
                    <p className="mt-3 text-[11px] tracking-[0.22em] text-or uppercase">
                      À répondre →
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* Compteur événements à venir, info utile, ne dépend pas du palier */}
        {upcomingEventsCount > 0 && (
          <p className="mt-10 text-[12px] italic text-texte-sec">
            Tu as {upcomingEventsCount} événement
            {upcomingEventsCount > 1 ? 's' : ''} publié
            {upcomingEventsCount > 1 ? 's' : ''} à venir ·{' '}
            <Link
              href="/dashboard/prestataire/evenements"
              className="text-vert hover:text-or transition-colors"
            >
              les gérer
            </Link>
            {pendingReplies > 0
              ? ` · ${pendingReplies} avis sans réponse`
              : null}
          </p>
        )}
      </section>

      {/* ─── Plus d'outils ─ liens utilitaires (Sprint 7bis) ───────── */}
      <section className="border-t border-or/10 px-6 py-10 md:px-12 md:py-12">
        <div className="flex items-center gap-4">
          <GoldLine width={32} />
          <span className="overline text-or">Plus d&apos;outils</span>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Link
            href="/dashboard/prestataire/devis"
            className="group flex items-center justify-between rounded-sm border border-or/15 bg-blanc px-5 py-4 transition-all hover:border-or/40 hover:shadow-sm"
          >
            <div>
              <p className="font-serif text-[16px] text-vert">
                Demandes de devis
              </p>
              <p className="mt-1 text-[12px] italic text-texte-sec">
                {isCerclePro
                  ? 'Les copines qui veulent un devis express.'
                  : 'Réservé Cercle Pro — voir l’abonnement.'}
              </p>
            </div>
            <span
              className="text-or transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
          <Link
            href="/dashboard/prestataire/parametres"
            className="group flex items-center justify-between rounded-sm border border-or/15 bg-blanc px-5 py-4 transition-all hover:border-or/40 hover:shadow-sm"
          >
            <div>
              <p className="font-serif text-[16px] text-vert">Paramètres</p>
              <p className="mt-1 text-[12px] italic text-texte-sec">
                Mot de passe, email, notifications.
              </p>
            </div>
            <span
              className="text-or transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </section>

      {/* ─── Footer transparence ──────────────────────────────────── */}
      <p className="px-6 pb-12 pt-2 text-center font-sans text-[12px] italic text-texte-sec md:px-12">
        On compte précieusement chaque pas qu&apos;une copine fait vers
        toi, depuis le 9 mai 2026.
      </p>
    </>
  )
}

/**
 * Construit la série [{jour: 'DD/MM', vues: n}] pour les 30 derniers
 * jours, avec 0 pour les jours sans donnée. Bucket par date locale ISO.
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
