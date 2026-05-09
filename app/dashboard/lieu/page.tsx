import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GoldLine } from '@/components/ui/GoldLine'
import { PastilleSelectionHilmy } from '@/components/v2/PastilleSelectionHilmy'
import { requireUser } from '@/lib/supabase/session'
import { getMyOwnedPlaces } from '@/lib/supabase/queries/places'
import { isSelectionHilmy } from '@/lib/permissions-lieux'

/**
 * Dashboard owner lieu — page d'accueil / liste des lieux possédés.
 *
 * Phase 2A · PR-B2 · décision Jiji B1 (multi-lieux : liste + détail) :
 *   - 0 lieu → EmptyState avec CTA création (route existante
 *     /dashboard/utilisatrice/recommandations/nouvelle qui crée une
 *     ghost-fiche via Google Places autocomplete + reco associée)
 *   - 1 lieu → redirect /dashboard/lieu/[id] pour éviter le silent fail
 *     "écran liste avec une seule carte"
 *   - 2+ lieux → liste de cartes triées Sélection Hilmy d'abord, puis
 *     alphabétiquement (cf getMyOwnedPlaces order)
 */
export default async function LieuDashboardPage() {
  const user = await requireUser()
  const { data: places, error } = await getMyOwnedPlaces(user.id)
  const list = places ?? []

  // Auto-redirect single-place. Ne PAS faire si error pour ne pas masquer
  // un échec réseau silencieusement.
  if (!error && list.length === 1) {
    redirect(`/dashboard/lieu/${list[0].id}`)
  }

  // 0 lieu possédé : EmptyState avec CTA vers le flow de création.
  if (list.length === 0) {
    return (
      <>
        <DashboardHeader
          kicker="Espace lieu"
          titre={
            <>
              Tu n&apos;as pas encore{' '}
              <em className="font-serif italic text-or">de fiche lieu.</em>
            </>
          }
          lead="Crée ta première fiche pour la rejoindre dans l'annuaire des copines. Tu pourras ensuite passer en Sélection Hilmy quand tu seras prête."
        />
        <section className="px-6 py-14 md:px-12 md:py-20">
          {error && (
            <p className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
              {error}
            </p>
          )}
          <EmptyState
            kicker="Premiers pas"
            titre="Aucun lieu pour l'instant."
            pitch="Une recommandation sur un café, un restaurant, une boutique que tu adores ? Crée la fiche depuis Google Maps en deux clics — elle apparaîtra ensuite ici."
            ctaLabel="Créer ma première fiche"
            ctaHref="/dashboard/utilisatrice/recommandations/nouvelle"
          />
        </section>
      </>
    )
  }

  // 2+ lieux : liste de cartes
  return (
    <>
      <DashboardHeader
        kicker="Espace lieu"
        titre={
          <>
            Tes lieux,{' '}
            <em className="font-serif italic text-or">en un coup d&apos;œil.</em>
          </>
        }
        lead={`Tu en gères ${list.length}. Clique sur une fiche pour voir ses stats et la gérer.`}
      />
      <section className="px-6 py-10 md:px-12 md:py-14">
        {error && (
          <p className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
            {error}
          </p>
        )}
        <div className="mb-8 flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Mes fiches</span>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((place) => {
            const isSelection = isSelectionHilmy(place)
            return (
              <li key={place.id}>
                <Link
                  href={`/dashboard/lieu/${place.id}`}
                  className="group flex h-full flex-col gap-3 rounded-sm border border-or/15 bg-blanc p-6 transition-all hover:-translate-y-0.5 hover:border-or hover:shadow-[0_24px_48px_-32px_rgba(15,61,46,0.25)] md:p-7"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-serif text-[20px] font-light leading-tight text-vert">
                      {place.name}
                    </h2>
                    {isSelection && <PastilleSelectionHilmy />}
                  </div>
                  <p className="text-[12px] tracking-[0.22em] text-texte-sec uppercase">
                    {place.city || '—'}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-or/10 pt-4">
                    <span className="text-[12px] text-texte-sec">
                      {(place.nb_vues ?? 0).toLocaleString('fr-FR')} vue
                      {(place.nb_vues ?? 0) > 1 ? 's' : ''}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.22em] text-or uppercase transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      Gérer →
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
