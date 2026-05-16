import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { CopineSubscriptionStatus } from '@/components/pass-copine/CopineSubscriptionStatus'
import { getActiveCopineSubscription } from '@/lib/supabase/queries/copine-subscriptions'

export const metadata: Metadata = {
  title: 'Ton Pass Copine',
}

/**
 * Page gestion du Pass Copine.
 *
 * Auth gating : le layout parent (utilisatrice/layout.tsx) appelle déjà
 * requireUserProfile() qui redirige vers /auth/login si non connectée
 * et vers /onboarding si profil incomplet. Donc ici on a forcément un
 * user + user_profile.
 *
 * Si is_copine=false → redirect vers la landing /pass-copine. La source
 * de vérité est user_profiles.is_copine (mirror dénormalisé maintenu
 * par le webhook).
 *
 * Détails du plan (4,99€/mois ou 49€/an, date de renouvellement,
 * cancel_at_period_end) lus depuis copine_subscriptions via le helper
 * RLS-safe getActiveCopineSubscription().
 */
export default async function PassCopineGestionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Belt-and-braces : le layout parent l'a déjà fait, on garde une
  // garde explicite ici pour clarté et pour gérer le cas (rare) où le
  // user_profile n'aurait pas encore la colonne is_copine peuplée.
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_copine, copine_since')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.is_copine) {
    redirect('/pass-copine')
  }

  const { data: sub } = await getActiveCopineSubscription()

  return (
    <div className="min-h-screen bg-creme">
      <DashboardHeader
        kicker="Pass Copine"
        titre={
          <>
            Ton <span className="italic text-or">Pass Copine</span>
          </>
        }
        lead="Gère ton abonnement, change de plan ou annule quand tu veux. Tu restes maîtresse de la suite."
      />
      <CopineSubscriptionStatus
        copineSince={profile.copine_since}
        plan={sub?.plan ?? null}
        currentPeriodEnd={sub?.current_period_end ?? null}
        cancelAtPeriodEnd={sub?.cancel_at_period_end ?? false}
      />
    </div>
  )
}
