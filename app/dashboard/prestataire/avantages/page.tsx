import Link from 'next/link'
import type { Metadata } from 'next'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { requirePrestataire } from '@/lib/supabase/session'
import { hasCerclePro } from '@/lib/permissions'
import { listPerksForPrestataire } from '@/lib/supabase/queries/pro-perks'
import type { ProPerk, ProPerkStatus } from '@/lib/supabase/types'
import { PerkOwnerRow } from './_components/PerkOwnerRow'

export const metadata: Metadata = {
  title: 'Tes offres Copines',
}

const STATUS_LABEL: Record<ProPerkStatus, string> = {
  pending_review: 'En attente',
  active: 'En ligne',
  paused: 'En pause',
  expired: 'Expirée',
  rejected: 'Refusée',
}

const STATUS_TONE: Record<ProPerkStatus, string> = {
  pending_review: 'bg-creme text-or-deep',
  active: 'bg-vert/10 text-vert',
  paused: 'bg-or/15 text-or-deep',
  expired: 'bg-texte/10 text-texte-sec',
  rejected: 'bg-red-900/10 text-red-900',
}

export default async function PrestataireAvantagesPage() {
  const { prestataire } = await requirePrestataire()
  const isCerclePro = hasCerclePro(prestataire)

  if (!isCerclePro) {
    return (
      <div className="min-h-screen bg-creme">
        <DashboardHeader
          kicker="Pro Perks"
          titre={
            <>
              Tes <span className="italic text-or">offres Copines</span>
            </>
          }
          lead="Crée une réduction pour les Copines. Elles te repèrent, elles viennent."
        />
        <section className="px-6 py-10 md:px-12 md:py-14">
          <div className="mx-auto max-w-2xl rounded-md border border-or/20 bg-white p-10 text-center md:p-14">
            <GoldLine className="mx-auto" width={48} />
            <h2 className="mt-6 font-serif text-[28px] font-light leading-tight text-vert md:text-[32px]">
              Réservé au Cercle Pro.
            </h2>
            <p className="mt-5 text-[15px] leading-[1.7] text-texte-sec">
              Les offres Copines sont réservées au Cercle Pro. C&apos;est le palier
              qui te met en avant auprès des Copines les plus engagées.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href="/dashboard/prestataire/abonnement"
                className="inline-flex items-center justify-center rounded-full bg-or px-8 py-4 text-[14px] font-semibold tracking-[0.18em] text-vert uppercase transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)]"
              >
                Passer au Cercle Pro
              </Link>
              <Link
                href="/tarifs"
                className="text-[12px] font-medium tracking-[0.22em] text-texte-sec uppercase hover:text-vert"
              >
                Voir les tarifs
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const { data: perks } = await listPerksForPrestataire(prestataire.id)
  const list = (perks ?? []) as ProPerk[]

  return (
    <div className="min-h-screen bg-creme">
      <DashboardHeader
        kicker="Pro Perks"
        titre={
          <>
            Tes <span className="italic text-or">offres Copines</span>
          </>
        }
        lead="Crée une réduction pour les Copines. Elles te repèrent, elles viennent."
        actions={
          <Link
            href="/dashboard/prestataire/avantages/nouveau"
            className="inline-flex items-center justify-center rounded-full bg-vert px-6 py-3 text-[12px] font-semibold tracking-[0.18em] text-creme uppercase transition-colors hover:bg-vert-dark"
          >
            Créer une offre
          </Link>
        }
      />
      <section className="px-6 py-10 md:px-12 md:py-14">
        {list.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-md border border-or/20 bg-white p-10 text-center">
            <p className="font-serif text-[22px] font-light italic text-vert">
              Aucune offre pour le moment.
            </p>
            <p className="mt-3 text-[14px] text-texte-sec">
              Lance ta première offre Copines pour te faire repérer.
            </p>
            <Link
              href="/dashboard/prestataire/avantages/nouveau"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-or px-6 py-3 text-[12px] font-semibold tracking-[0.18em] text-vert uppercase hover:bg-or-light"
            >
              Créer une offre
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {list.map((perk) => (
              <PerkOwnerRow
                key={perk.id}
                perk={perk}
                statusLabel={STATUS_LABEL[perk.status]}
                statusTone={STATUS_TONE[perk.status]}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
