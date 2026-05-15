import { Toaster } from 'sonner'
import { Sidebar, type SidebarItem } from '@/components/dashboard/Sidebar'
import { requireUserProfile } from '@/lib/supabase/session'
import { createClient } from '@/lib/supabase/server'

export default async function UtilisatriceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireUserProfile()
  const isAdmin = Boolean(user.user_metadata?.is_admin)

  // Pass Copine fast-path : lookup is_copine pour personnaliser le label
  // sidebar (Devenir Copine vs Mon Pass Copine) et afficher le badge sur
  // le UserBlock.
  const supabase = await createClient()
  const { data: copineRow } = await supabase
    .from('user_profiles')
    .select('is_copine')
    .eq('user_id', user.id)
    .maybeSingle()
  const isCopine = copineRow?.is_copine ?? false

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
    {
      href: isCopine ? '/dashboard/utilisatrice/copine' : '/pass-copine',
      label: isCopine ? 'Mon Pass Copine' : 'Devenir Copine',
      icon: '★',
    },
    { href: '/dashboard/utilisatrice/profil', label: 'Mon profil', icon: '❋' },
    {
      href: '/dashboard/utilisatrice/parametres',
      label: 'Paramètres',
      icon: '◦',
    },
    // Raccourci admin — uniquement si user_metadata.is_admin=true
    // (la route /admin reste gated par son propre layout).
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
          badge: isCopine ? 'Copine' : undefined,
        }}
        signOutLabel="À bientôt"
      />
      <div className="min-w-0 flex-1">{children}</div>
      {/* Sonner toast — voix Sara post-publication recos/events
          (Sprint U1.5 gamification UI). Position top-right, tons crème
          + or pour cohérence charte Hilmy. */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#F5F0E6',
            color: '#0F3D2E',
            border: '1px solid rgba(201, 169, 97, 0.4)',
            fontFamily: 'inherit',
          },
        }}
      />
    </div>
  )
}
