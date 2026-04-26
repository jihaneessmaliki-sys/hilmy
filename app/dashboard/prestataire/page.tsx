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

export default async function PrestataireAccueilPage() {
  const { prestataire } = await requirePrestataire()
  const supabase = await createClient()

  const palier = prestataire.palier ?? 'standard'
  const isPremiumOrAbove = palier === 'premium' || palier === 'cercle_pro'

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
  const vues30j = isPremiumOrAbove
    ? buildVues30jSeries(viewsLast30dRes.data ?? [])
    : []

  const reviews = reviewsRes.data ?? []
  const pendingReplies = reviews.filter((r) => !r.reponse_pro).length
  const upcomingEventsCount = eventsRes.count ?? 0

  const prenom = prestataire.nom.split(' ')[0] ?? prestataire.nom

  return (
    <>
      <DashboardHeader
        kicker={`Bonjour, ${prenom}`}
        titre={
          <>
            Ton activité,{' '}
            <em className="font-serif italic text-or">en un coup d&apos;œil.</em>
          </>
        }
        lead="Les chiffres depuis la création de ta fiche. Vues, contacts, avis."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {palier === 'cercle_pro' && <PastilleSelectionHilmy />}
            <PalierBadge palier={palier} size="medium" />
            <Link
              href={`/prestataire-v2/${prestataire.slug}`}
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
              <span className="font-serif italic">Fiche en revue —</span>{' '}
              On vérifie les infos puis on la met en ligne sous 24h ouvrées. Tu peux déjà la compléter.
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

      {/* === STATS PALIER-AWARE ===================================== */}
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-8 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">
            {palier === 'standard' ? 'Mes chiffres' : 'Mes chiffres détaillés'}
          </span>
        </div>

        {palier === 'standard' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              kicker="Vues totales"
              value={viewsTotal.toLocaleString('fr-FR')}
              hint="Depuis la publication de ta fiche"
              index={0}
            />
            <StatCard
              kicker="Clics totaux"
              value={contactsTotal.toLocaleString('fr-FR')}
              hint="WhatsApp, téléphone, email, réseaux…"
              variant="or"
              index={1}
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              kicker="Vues totales"
              value={viewsTotal.toLocaleString('fr-FR')}
              hint="Depuis la publication"
              index={0}
            />
            <StatCard
              kicker="Vues cette semaine"
              value={viewsLast7.toLocaleString('fr-FR')}
              hint="Sur les 7 derniers jours"
              variant="or"
              index={1}
            />
            <StatCard
              kicker="Clics WhatsApp"
              value={whatsappCount.toLocaleString('fr-FR')}
              hint="Visites qui ont cliqué pour t'écrire"
              variant="vert"
              index={2}
            />
            <StatCard
              kicker="Clics email / site"
              value={emailWebsiteCount.toLocaleString('fr-FR')}
              hint="Email + site web cumulés"
              index={3}
            />
          </div>
        )}

        {/* Bandeau upsell Standard → Premium */}
        {palier === 'standard' && (
          <div className="mt-6 rounded-sm border border-or/30 bg-or/10 p-6 md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
              <div>
                <p className="overline text-or">Passe en Premium</p>
                <p className="mt-2 font-serif text-[18px] italic leading-[1.4] text-vert md:text-[20px]">
                  Vues hebdo, clics par canal, courbe sur 30 jours…
                </p>
                <p className="mt-2 text-[13px] leading-[1.6] text-texte-sec">
                  Le détail de ton audience et l&apos;évolution de ta fiche
                  sont réservés aux paliers Premium et Cercle Pro.
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

        {/* Bandeau "stats avancées coming soon" Cercle Pro */}
        {palier === 'cercle_pro' && (
          <div className="mt-6 rounded-sm bg-vert p-6 text-creme md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
              <div>
                <p className="overline text-or">Stats avancées · à venir</p>
                <p className="mt-2 font-serif text-[18px] italic leading-[1.4] text-creme md:text-[20px]">
                  Carte des villes, pics horaires, benchmark catégorie.
                </p>
                <p className="mt-2 text-[13px] leading-[1.6] text-creme/75">
                  Tu fais partie du Cercle Pro : ces vues plus fines
                  arrivent dans la V1.2. On te prévient dès qu&apos;elles
                  sont prêtes.
                </p>
              </div>
              <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-or/40 px-4 text-[11px] font-medium tracking-[0.22em] text-or-light uppercase">
                Bientôt
              </span>
            </div>
          </div>
        )}
      </section>

      {/* === CHART 30 JOURS (Premium+ uniquement) ====================== */}
      {isPremiumOrAbove && (
        <section className="bg-blanc px-6 py-12 md:px-12 md:py-16">
          <div className="rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="overline text-or">Évolution des vues</p>
                <h2 className="mt-2 font-serif text-2xl font-light text-vert">
                  Sur 30 jours.
                </h2>
                <p className="mt-1 text-[11px] italic text-texte-sec">
                  Données réelles agrégées par jour.
                </p>
              </div>
              <span className="font-serif text-xl italic text-or">
                ↗ {viewsTotal.toLocaleString('fr-FR')}
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
            ctaHref={`/prestataire-v2/${prestataire.slug}`}
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
