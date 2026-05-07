import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { requirePrestataire } from '@/lib/supabase/session'
import { createClient } from '@/lib/supabase/server'
import { hasCerclePro } from '@/lib/permissions'
import { DevisRow } from './_components/DevisRow'

export default async function MesDevisPage() {
  const { prestataire } = await requirePrestataire()

  // Garde Cercle Pro : si pas Cercle Pro (et pas founder), redirige vers tarifs
  if (!hasCerclePro(prestataire)) {
    redirect('/dashboard/prestataire/abonnement')
  }

  const supabase = await createClient()
  const { data: devis, error } = await supabase
    .from('devis_requests')
    .select(
      'id, prenom, email, telephone, message, status, email_sent_at, email_error, created_at, updated_at',
    )
    .eq('prestataire_id', prestataire.id)
    .order('created_at', { ascending: false })

  const list = devis ?? []
  const pending = list.filter((d) => d.status === 'pending')
  const traitees = list.filter((d) => d.status !== 'pending')

  return (
    <>
      <DashboardHeader
        kicker="Devis Express"
        titre={
          <>
            Tes demandes,{' '}
            <em className="font-serif italic text-or">en direct.</em>
          </>
        }
        lead="Les copines qui te demandent un devis depuis ta fiche apparaissent ici. À toi de leur répondre par email ou téléphone."
        actions={
          <Link
            href={`/prestataire-v2/${prestataire.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
          >
            Voir ma fiche publique
            <span className="text-or" aria-hidden="true">
              →
            </span>
          </Link>
        }
      />

      {error && (
        <section className="px-6 py-6 md:px-12">
          <p className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
            {error.message}
          </p>
        </section>
      )}

      <section className="px-6 py-10 md:px-12 md:py-14">
        {list.length === 0 ? (
          <EmptyState
            kicker="Premiers devis"
            titre="Pas encore de demande de devis."
            pitch="Dès qu'une copine clique sur « Demander un devis » sur ta fiche, sa demande apparaît ici. Tu reçois aussi un email à chaque demande."
            ctaLabel="Voir ma fiche publique"
            ctaHref={`/prestataire-v2/${prestataire.slug}`}
          />
        ) : (
          <div className="space-y-12">
            {pending.length > 0 && (
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <GoldLine width={40} />
                  <span className="overline text-or">
                    À traiter — {pending.length}
                  </span>
                </div>
                <ul className="space-y-3">
                  {pending.map((d) => (
                    <DevisRow key={d.id} devis={d} />
                  ))}
                </ul>
              </div>
            )}

            {traitees.length > 0 && (
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <GoldLine width={40} />
                  <span className="overline text-or">
                    Historique — {traitees.length}
                  </span>
                </div>
                <ul className="space-y-3">
                  {traitees.map((d) => (
                    <DevisRow key={d.id} devis={d} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}
