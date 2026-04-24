import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/server'
import { requireUserProfile } from '@/lib/supabase/session'

export default async function UtilisatriceAccueilPage() {
  const { user, profile } = await requireUserProfile()
  const supabase = await createClient()

  // Stats en parallèle (count-only, léger)
  const [favCount, recoCount, eventFavCount, savedItemsRes, upcomingEventsRes] =
    await Promise.all([
      supabase
        .from('favoris')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('recommendations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'published'),
      supabase
        .from('favoris')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type_item', 'evenement'),
      // 3 dernières sauvegardes
      supabase
        .from('favoris')
        .select('id, type_item, item_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      // Events à venir où l'user est inscrite
      supabase
        .from('event_inscriptions')
        .select(
          `id, status, event:events ( id, title, slug, start_date, city, flyer_url, status, visibility )`,
        )
        .eq('user_id', user.id)
        .eq('status', 'inscrite')
        .limit(3),
    ])

  const nbFavoris = favCount.count ?? 0
  const nbRecos = recoCount.count ?? 0
  const nbEventsSauvegardes = eventFavCount.count ?? 0
  const dernieresSauvegardes = savedItemsRes.data ?? []
  type RawEvent = {
    id: string
    title: string
    slug: string | null
    start_date: string
    city: string | null
    flyer_url: string | null
    status: string
    visibility: string
  }
  const eventsAVenir = (
    (upcomingEventsRes.data ?? []) as unknown as { event: RawEvent | RawEvent[] | null }[]
  )
    .map((row) => (Array.isArray(row.event) ? row.event[0] : row.event))
    .filter(
      (e): e is RawEvent =>
        !!e && e.status === 'published' && new Date(e.start_date).getTime() > Date.now(),
    )

  return (
    <>
      <DashboardHeader
        kicker={`Bonjour, ${profile.prenom}`}
        titre={
          <>
            Ton carnet,{' '}
            <em className="font-serif italic text-or">tel que tu l&apos;as laissé.</em>
          </>
        }
        lead="Quelques nouvelles adresses sont arrivées depuis ta dernière visite. Jette un œil, enregistre ce que tu aimes."
      />

      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-10 flex items-center gap-4">
          <GoldLine width={48} />
          <span className="overline text-or">En un coup d&apos;œil</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            kicker="Favoris"
            value={nbFavoris}
            hint="Adresses et prestataires que tu gardes sous le coude"
            index={0}
          />
          <StatCard
            kicker="Recos postées"
            value={nbRecos}
            hint="Merci — chaque reco compte pour la communauté"
            variant="vert"
            index={1}
          />
          <StatCard
            kicker="Événements"
            value={nbEventsSauvegardes}
            hint={`Dont ${eventsAVenir.length} auxquels tu es inscrite`}
            index={2}
          />
        </div>
      </section>

      <section className="px-6 pb-10 md:px-12 md:pb-14">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">Tes dernières sauvegardes</span>
            </div>
            <h2 className="mt-4 font-serif text-h2 font-light text-vert">
              Les têtes qui reviennent dans ton carnet.
            </h2>
          </div>
          <Link
            href="/dashboard/utilisatrice/favoris"
            className="group inline-flex items-center gap-2 text-[13px] font-medium text-vert hover:text-or"
          >
            Voir tous mes favoris
            <span
              className="text-or transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>

        {dernieresSauvegardes.length === 0 ? (
          <EmptyState
            kicker="Rien encore"
            titre="Ton carnet est tout neuf."
            pitch={
              <>
                Tu n&apos;as encore sauvegardé aucune adresse. Parcours l&apos;annuaire,
                clique sur le cœur — tout s&apos;affichera ici.
              </>
            }
            ctaLabel="Découvrir l'annuaire"
            ctaHref="/annuaire"
            secondaryLabel="Ou les recommandations →"
            secondaryHref="/recommandations"
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-3">
            {dernieresSauvegardes.map((f: { id: string; type_item: string; item_id: string; created_at: string }) => (
              <li key={f.id} className="rounded-sm border border-or/15 bg-blanc p-5">
                <p className="overline text-or">
                  {f.type_item === 'prestataire'
                    ? 'Prestataire'
                    : f.type_item === 'lieu'
                      ? 'Lieu'
                      : 'Événement'}
                </p>
                <p className="mt-3 font-serif text-lg font-light text-vert">
                  Sauvegardé{' '}
                  {new Date(f.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                <p className="mt-2 font-mono text-[10px] text-texte-sec/70">
                  id : {f.item_id.slice(0, 8)}…
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-blanc px-6 py-14 md:px-12 md:py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">Événements qui arrivent</span>
            </div>
            <h2 className="mt-4 font-serif text-h2 font-light text-vert">
              Les prochains moments.
            </h2>
          </div>
          <Link
            href="/dashboard/utilisatrice/evenements"
            className="group inline-flex items-center gap-2 text-[13px] font-medium text-vert hover:text-or"
          >
            Voir tout l&apos;agenda
            <span
              className="text-or transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>

        {eventsAVenir.length === 0 ? (
          <EmptyState
            kicker="Rien à l'horizon"
            titre="Aucun événement dans ton agenda."
            pitch="Parcours les événements et inscris-toi à celui qui te parle."
            ctaLabel="Voir l'agenda"
            ctaHref="/evenements-v2"
          />
        ) : (
          <ul className="divide-y divide-or/10 rounded-sm border border-or/15 bg-creme-soft">
            {eventsAVenir.map((e) => {
              const d = new Date(e.start_date)
              const jour = String(d.getDate()).padStart(2, '0')
              const mois = d.toLocaleDateString('fr-FR', { month: 'short' })
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:gap-8 md:px-8"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-4xl font-light text-or">
                      {jour}
                    </span>
                    <span className="text-[11px] tracking-[0.22em] text-or-deep uppercase">
                      {mois}
                    </span>
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/evenement-v2/${e.slug ?? e.id}`}
                      className="font-serif text-xl font-light text-vert hover:text-or"
                    >
                      {e.title}
                    </Link>
                    {e.city && (
                      <p className="text-[11px] text-texte-sec">{e.city}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-or/15 px-3 py-1 text-[10px] tracking-[0.22em] text-or-deep uppercase">
                    Inscrite
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
