import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/session'
import { PrestataireMethodsClient } from '@/components/onboarding/PrestataireMethodsClient'

export default async function OnboardingPrestatairePage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (data) redirect('/dashboard/prestataire')

  return <PrestataireMethodsClient />
}
