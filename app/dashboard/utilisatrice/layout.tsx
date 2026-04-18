import { Sidebar, type SidebarItem } from '@/components/dashboard/Sidebar'
import { requireUserProfile } from '@/lib/supabase/session'

export default async function UtilisatriceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireUserProfile()

  const items: SidebarItem[] = [
    { href: '/dashboard/utilisatrice', label: 'Accueil', icon: '·' },
    {
      kind: 'group',
      label: 'Catalogues',
      icon: '❖',
      items: [
        { href: '/annuaire', label: 'Annuaire' },
        { href: '/recommandations', label: 'Recommandations' },
        { href: '/evenements-v2', label: 'Événements' },
      ],
    },
    { href: '/dashboard/utilisatrice/favoris', label: 'Mes favoris', icon: '♡' },
    {
      href: '/dashboard/utilisatrice/recommandations',
      label: 'Mes recommandations',
      icon: '✧',
    },
    {
      href: '/dashboard/utilisatrice/evenements',
      label: 'Mes événements',
      icon: '◇',
    },
    { href: '/dashboard/utilisatrice/profil', label: 'Mon profil', icon: '❋' },
    {
      href: '/dashboard/utilisatrice/parametres',
      label: 'Paramètres',
      icon: '◦',
    },
  ]

  const memberSince = new Date(profile.created_at).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex min-h-screen flex-col bg-creme text-texte md:flex-row">
      <Sidebar
        items={items}
        user={{
          prenom: profile.prenom,
          avatar: profile.avatar_url ?? '#D4C5B0',
          meta: `Membre depuis ${memberSince}`,
        }}
        signOutLabel="À bientôt"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
