import { Sidebar, type SidebarItem } from '@/components/dashboard/Sidebar'
import { requireUser } from '@/lib/supabase/session'
import { createClient } from '@/lib/supabase/server'

/**
 * Layout du dashboard owner lieu (Phase 2A · PR-B2).
 *
 * Pattern aligné sur app/dashboard/prestataire/layout.tsx mais simplifié :
 *  - Pas de `requirePrestataire()` parce que le concept "owner lieu" n'a
 *    pas de table dédiée — on utilise places.created_by_user_id (mig 28).
 *    L'auth est juste vérifiée via requireUser() ; la page elle-même fait
 *    les queries places.
 *  - Sidebar à 3 entrées dont 2 placeholders (PR-D activera "Mes événements",
 *    une PR ultérieure activera l'édition fiche lieu).
 */
export default async function LieuDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()
  const isAdmin = Boolean(user.user_metadata?.is_admin)

  // Lecture user_profile pour prénom + avatar dans la sidebar (best-effort).
  // Un user qui aurait skip l'onboarding utilisatrice peut ne pas en avoir.
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('prenom, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const items: SidebarItem[] = [
    { href: '/dashboard/lieu', label: 'Accueil', icon: '·' },
    // Placeholders — actifs en PRs futures. href='#' pour l'instant : pas
    // de navigation, badge "Bientôt" pour clarifier le statut.
    { href: '#', label: 'Ma fiche', icon: '❋', badge: 'Bientôt' },
    { href: '#', label: 'Mes événements', icon: '◇', badge: 'PR-D' },
    // Raccourci admin — uniquement si user_metadata.is_admin=true.
    ...(isAdmin
      ? ([
          {
            href: '/admin',
            label: 'Admin',
            icon: '⚡',
            badge: 'BACK-OFFICE',
          },
        ] as SidebarItem[])
      : []),
  ]

  const prenom = (profile?.prenom as string | undefined) ?? 'Toi'
  const avatar = (profile?.avatar_url as string | undefined) ?? '#D4C5B0'

  return (
    <div className="flex min-h-screen flex-col bg-creme text-texte md:flex-row">
      <Sidebar
        items={items}
        user={{
          prenom,
          avatar,
          meta: 'Espace lieu',
        }}
        signOutLabel="À bientôt"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
