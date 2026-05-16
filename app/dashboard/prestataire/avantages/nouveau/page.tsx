import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { requirePrestataire } from '@/lib/supabase/session'
import { hasCerclePro } from '@/lib/permissions'
import { PerkForm } from '../_components/PerkForm'

export const metadata: Metadata = {
  title: 'Nouvelle offre Copines',
}

/**
 * Page création d'une offre Pro Perk.
 *
 * Auth gating : requirePrestataire() redirige déjà vers /onboarding
 * si pas de fiche. On ajoute un gate hasCerclePro qui redirige vers
 * la page liste (qui affiche le teasing upgrade).
 *
 * Le form est un Client Component (validation + appel API), wrappé
 * dans un Server Component pour le gating SSR + métadonnées.
 */
export default async function NouvelleOffrePage() {
  const { prestataire } = await requirePrestataire()
  if (!hasCerclePro(prestataire)) {
    redirect('/dashboard/prestataire/avantages')
  }

  return (
    <div className="min-h-screen bg-creme">
      <DashboardHeader
        kicker="Pro Perks"
        titre={
          <>
            Nouvelle <span className="italic text-or">offre Copines</span>
          </>
        }
        lead="Ton offre passera par une modération rapide avant d'apparaître aux Copines."
      />
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-2xl">
          <PerkForm />
        </div>
      </section>
    </div>
  )
}
