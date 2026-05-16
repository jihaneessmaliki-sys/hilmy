import { Toaster } from 'sonner'
import { Sidebar, type SidebarItem } from '@/components/dashboard/Sidebar'
import { requirePrestataire } from '@/lib/supabase/session'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES_MAP } from '@/lib/constants'
import { hasCerclePro } from '@/lib/permissions'

export default async function PrestataireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, prestataire } = await requirePrestataire()
  const isAdmin = Boolean(user.user_metadata?.is_admin)
  const supabase = await createClient()
  const isCerclePro = hasCerclePro(prestataire)

  // Badge "nouveaux avis" = recommendations sans reponse_pro, publiées
  const { count: newReviewsCount } = await supabase
    .from('recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', prestataire.id)
    .eq('type', 'prestataire')
    .eq('status', 'published')
    .is('reponse_pro', null)

  // Badge "nouveaux devis" — Cercle Pro uniquement (best-effort, table peut
  // ne pas encore exister tant que migration 36 pas appliquée).
  let pendingDevisCount = 0
  if (isCerclePro) {
    const { count } = await supabase
      .from('devis_requests')
      .select('id', { count: 'exact', head: true })
      .eq('prestataire_id', prestataire.id)
      .eq('status', 'pending')
    pendingDevisCount = count ?? 0
  }

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
    // Devis Express : entrée Cercle Pro uniquement
    ...(isCerclePro
      ? ([
          {
            href: '/dashboard/prestataire/devis',
            label: 'Mes devis',
            icon: '✨',
            badge:
              pendingDevisCount > 0
                ? `${pendingDevisCount} nouveau${pendingDevisCount > 1 ? 'x' : ''}`
                : undefined,
          },
        ] as SidebarItem[])
      : []),
    // Pro Perks (mig 50). Item toujours visible (cf décision D8
    // Phase 5) : levier de conversion vers Cercle Pro pour les
    // Standard/Premium qui découvrent la feature.
    {
      href: '/dashboard/prestataire/avantages',
      label: 'Mes offres Copines',
      icon: '★',
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
      {/* Sonner toast — utilisé pour le retour post-checkout Stripe
          (Sprint 7) + erreurs de souscription. Position top-right,
          tons crème + or charte Hilmy. */}
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
