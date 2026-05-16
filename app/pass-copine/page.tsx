import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavigationServer } from '@/components/landing/NavigationServer'
import { FooterV2 } from '@/components/landing/FooterV2'
import { PassCopineHero } from '@/components/pass-copine/PassCopineHero'
import { FeaturesList } from '@/components/pass-copine/FeaturesList'
import { PricingCards } from '@/components/pass-copine/PricingCards'

export const metadata: Metadata = {
  title: 'Pass Copine',
  description:
    "Le Pass Copine Hilmy — favoris illimités, accès anticipé aux Rendez-vous, coupons Cercle Pro, badge Copine et newsletter premium de Sara. 4,99 €/mois ou 49 €/an.",
  alternates: { canonical: '/pass-copine' },
  openGraph: {
    title: 'Le Pass Copine — Hilmy',
    description:
      "Tu fais déjà partie de la team. Le Pass, c'est juste pour aller plus loin.",
    url: '/pass-copine',
    type: 'website',
  },
}

/**
 * Landing publique du Pass Copine.
 *
 * Si la user est déjà Copine (is_copine=true), on redirige vers la page
 * gestion — pas besoin de lui montrer une page d'incitation. Phase 2 a
 * câblé toutes les URLs Stripe vers /dashboard/utilisatrice/copine, on
 * reste cohérent.
 */
export default async function PassCopinePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('is_copine')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data?.is_copine) {
      redirect('/dashboard/utilisatrice/copine')
    }
  }

  return (
    <>
      <NavigationServer variant="solid" />
      <main className="min-h-screen bg-creme text-texte">
        <PassCopineHero />
        <FeaturesList />
        <PricingCards />
      </main>
      <FooterV2 />
    </>
  )
}
