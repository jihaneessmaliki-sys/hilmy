import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { PageShell } from '@/components/v2/PageShell'
import { createClient } from '@/lib/supabase/server'
import { NouvelleDemandeForm } from './_components/NouvelleDemandeForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "T'as besoin de quoi ? — Je cherche · Hilmy",
  description:
    'Pose ta demande à la team Hilmy : recommandations entre copines en Suisse, France, Belgique, Luxembourg et Monaco.',
}

/**
 * Page nouvelle demande : full-screen mobile, container centré desktop.
 * Auth requise (server-side check + redirect signup avec retour).
 */
export default async function NouvelleDemandePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/signup?redirect=/je-cherche/nouvelle')
  }

  // Pré-remplir pays + canton/ville depuis user_profiles si dispo
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('pays, ville')
    .eq('user_id', user.id)
    .maybeSingle()

  const defaultCountry =
    profile?.pays === 'France'
      ? 'FR'
      : profile?.pays === 'Belgique'
        ? 'BE'
        : profile?.pays === 'Luxembourg'
          ? 'LU'
          : profile?.pays === 'Monaco'
            ? 'MC'
            : 'CH'
  const defaultCity = (profile?.ville as string | null) ?? ''

  return (
    <PageShell>
      <section className="px-4 py-12 sm:px-6 md:py-20">
        <div className="mx-auto max-w-xl">
          <NouvelleDemandeForm
            defaultCountry={defaultCountry}
            defaultCity={defaultCity}
          />
        </div>
      </section>
    </PageShell>
  )
}
