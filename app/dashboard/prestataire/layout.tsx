import { Sidebar, type SidebarItem } from '@/components/dashboard/Sidebar'
import { requirePrestataire } from '@/lib/supabase/session'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES_MAP } from '@/lib/constants'

export default async function PrestataireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, prestataire } = await requirePrestataire()
  const isAdmin = Boolean(user.user_metadata?.is_admin)
  const supabase = await createClient()

  // Badge "nouveaux avis" = recommendations sans reponse_pro, publiées
  const { count: newReviewsCount } = await supabase
    .from('recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', prestataire.id)
    .eq('type', 'prestataire')
    .eq('status', 'published')
    .is('reponse_pro', null)

  const items: SidebarItem[] = [
    { href: '/dashboard/prestataire', label: 'Accueil', icon: '·' },
    { href: '/dashboard/prestataire/fiche', label: 'Ma fiche', icon: '❋' },
    {
      href: '/dashboard/prestataire/avis',
      label: 'Mes avis',
      icon: '★',
      badge:
        newReviewsCount && newReviewsCount > 0
          ? `${newReviewsCount} nouveau${newReviewsCount > 1 ? 'x' : ''}`
          : undefined,
    },
    {
      href: '/dashboard/prestataire/evenements',
      label: 'Mes événements',
      icon: '◇',
    },
    {
      href: '/dashboard/prestataire/abonnement',
      label: 'Mon abonnement',
      icon: '◈',
    },
    {
      href: '/dashboard/prestataire/parametres',
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

  const metier = CATEGORIES_MAP[prestataire.categorie] ?? prestataire.categorie
  const avatar = prestataire.galerie?.[0] ?? prestataire.photos?.[0] ?? '#D4C5B0'

  return (
    <div className="flex min-h-screen flex-col bg-creme text-texte md:flex-row">
      <Sidebar
        items={items}
        user={{
          prenom: prestataire.nom,
          avatar,
          meta: `${metier} · ${prestataire.ville}`,
          badge: prestataire.status === 'approved' ? undefined : 'En attente',
        }}
        signOutLabel="À bientôt"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
