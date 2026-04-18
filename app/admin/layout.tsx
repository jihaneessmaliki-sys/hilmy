import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/supabase/session'
import { AdminNavLink } from './admin-nav-link'
import { AdminSignOut } from './admin-sign-out'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()
  if (!user.user_metadata?.is_admin) notFound()

  const admin = createAdminClient()
  // Les badges comptent des rows invisibles aux user clients (RLS) :
  // - profiles 'pending' (seul owner peut voir)
  // - events/recommendations 'flagged' (policy post-Chantier 4 =
  //   'published' OR owner)
  // → service_role pour avoir les vrais chiffres. Safe parce que
  // l'accès à ce layout est déjà gaté par le notFound() ci-dessus.
  const [prestaCount, eventCount, recoCount, reportCount] = await Promise.all([
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'flagged'),
    admin
      .from('recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'flagged'),
    admin
      .from('recommendation_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const nav = [
    { href: '/admin', label: 'Accueil', badge: undefined },
    {
      href: '/admin/prestataires-a-valider',
      label: 'Fiches à valider',
      badge: prestaCount.count ?? 0,
    },
    {
      href: '/admin/evenements-a-valider',
      label: 'Événements',
      badge: eventCount.count ?? 0,
    },
    {
      href: '/admin/recommandations-a-moderer',
      label: 'Recommandations',
      badge: recoCount.count ?? 0,
    },
    {
      href: '/admin/signalements',
      label: 'Signalements',
      badge: reportCount.count ?? 0,
    },
  ]

  return (
    <div className="flex min-h-screen bg-creme text-texte">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-or/15 bg-blanc md:flex">
        <div className="px-6 pt-8 pb-4">
          <Link
            href="/"
            className="font-serif text-xl font-light tracking-[0.32em] text-vert"
          >
            HILMY
          </Link>
          <p className="mt-1 text-[10px] tracking-[0.22em] text-or uppercase">
            Administration
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          <ul className="flex flex-col gap-0.5">
            {nav.map((n) => (
              <li key={n.href}>
                <AdminNavLink href={n.href} badge={n.badge}>
                  {n.label}
                </AdminNavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-or/15 px-6 py-4">
          <p className="truncate text-[11px] text-texte-sec">{user.email}</p>
          <AdminSignOut />
        </div>
      </aside>

      <div className="flex-1">
        <div className="border-b border-or/15 bg-blanc px-5 py-3 md:hidden">
          <nav className="flex gap-2 overflow-x-auto">
            {nav.map((n) => (
              <AdminNavLink key={n.href} href={n.href} badge={n.badge} compact>
                {n.label}
              </AdminNavLink>
            ))}
          </nav>
        </div>
        <main>{children}</main>
      </div>
    </div>
  )
}
