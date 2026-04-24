import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { VuesAreaChart } from '@/components/dashboard/Charts'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/server'
import { requirePrestataire } from '@/lib/supabase/session'

export default async function PrestataireAccueilPage() {
  const { prestataire } = await requirePrestataire()
  const supabase = await createClient()

  const [reviewsRes, eventsRes] = await Promise.all([
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

  const reviews = reviewsRes.data ?? []
  const pendingReplies = reviews.filter((r) => !r.reponse_pro).length
  const upcomingEventsCount = eventsRes.count ?? 0

  // Chart placeholder — tant que nous n'avons pas une table profile_views,
  // on génère une série "sparkline" plate à partir de nb_vues.
  const total30j = prestataire.nb_vues
  const dailyAvg = Math.max(1, Math.round(total30j / 30))
  const vues30j = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return {
      jour: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      vues: Math.round(dailyAvg * (0.7 + Math.random() * 0.6)),
    }
  })

  const prenom = prestataire.nom.split(' ')[0] ?? prestataire.nom

  return (
    <>
      <DashboardHeader
        kicker={`Bonjour, ${prenom}`}
        titre={
          <>
            Ton activité,{' '}
            <em className="font-serif italic text-or">
              en un coup d&apos;œil.
            </em>
          </>
        }
        lead="Les chiffres depuis la création de ta fiche. Vues, avis, événements."
        actions={
          <Link
            href={`/prestataire-v2/${prestataire.slug}`}
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

      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-8 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Depuis la création</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            kicker="Vues fiche"
            value={prestataire.nb_vues.toLocaleString('fr-FR')}
            hint="Total depuis la publication"
            index={0}
          />
          <StatCard
            kicker="Avis reçus"
            value={prestataire.nb_avis}
            hint={
              prestataire.nb_avis > 0
                ? `Moyenne ★ ${prestataire.note_moyenne.toFixed(1)} / 5`
                : 'Aucun avis encore'
            }
            variant="or"
            index={1}
          />
          <StatCard
            kicker="À répondre"
            value={pendingReplies}
            hint={
              pendingReplies > 0
                ? 'Une réponse, et ta fiche gagne en chaleur'
                : 'Tu es à jour — bravo'
            }
            variant="vert"
            index={2}
          />
          <StatCard
            kicker="Événements à venir"
            value={upcomingEventsCount}
            hint="Publiés sur l'agenda"
            index={3}
          />
        </div>
      </section>

      <section className="bg-blanc px-6 py-12 md:px-12 md:py-16">
        <div className="rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="overline text-or">Évolution des vues</p>
              <h2 className="mt-2 font-serif text-2xl font-light text-vert">
                Sur 30 jours.
              </h2>
              <p className="mt-1 text-[11px] italic text-texte-sec">
                Données agrégées — le détail arrive avec Premium.
              </p>
            </div>
            <span className="font-serif text-xl italic text-or">
              ↗ {total30j.toLocaleString('fr-FR')}
            </span>
          </div>
          <VuesAreaChart data={vues30j} />
        </div>
      </section>

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
      </section>
    </>
  )
}
