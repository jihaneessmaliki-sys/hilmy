import { createClient } from '@/lib/supabase/server'
import { Navigation } from './Navigation'

interface NavigationServerProps {
  variant?: 'transparent' | 'solid'
}

/**
 * Wrapper Server de la Navigation publique : fetch is_copine + copine_since
 * côté serveur et passe les props initiales au Client Component.
 *
 * Pourquoi un wrapper plutôt que d'étendre SessionProvider : on évite
 * de toucher du code central + de payer un fetch supplémentaire sur
 * chaque mount client. Le pattern Server fetch + Client interactive
 * est le standard Next 14 (RSC).
 *
 * Note : si l'état Copine change pendant la session (souscription en
 * cours d'onglet), la nav ne se met à jour qu'à la prochaine navigation
 * (router.refresh côté checkout success → re-render du Server Component).
 */
export async function NavigationServer({
  variant = 'transparent',
}: NavigationServerProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isCopine = false
  let copineSince: string | null = null
  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('is_copine, copine_since')
      .eq('user_id', user.id)
      .maybeSingle()
    isCopine = data?.is_copine ?? false
    copineSince = data?.copine_since ?? null
  }

  return (
    <Navigation
      variant={variant}
      isCopine={isCopine}
      copineSince={copineSince}
    />
  )
}
