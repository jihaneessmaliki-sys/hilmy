'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LayoutDashboard } from 'lucide-react'
import { useSession } from '@/components/auth/SessionProvider'

interface NavigationProps {
  /**
   * "transparent" (par défaut) : navbar transparente sur dark hero, devient
   * blanche au scroll. Convient aux pages avec un hero éditorial sombre.
   *
   * "solid" : navbar blanche dès le départ. À utiliser pour les pages de
   * contenu (manifeste, contact, legal…) qui n'ont pas de hero sombre.
   */
  variant?: 'transparent' | 'solid'
}

function dashboardPathFor(user: ReturnType<typeof useSession>['user']): string {
  // Safe default : utilisatrice si signupType absent/inconnu.
  const signupType = (user?.user_metadata?.signupType as string | undefined) ?? null
  return signupType === 'provider' ? '/dashboard/prestataire' : '/dashboard/utilisatrice'
}

export function Navigation({ variant = 'transparent' }: NavigationProps = {}) {
  const [scrolled, setScrolled] = useState(false)
  const { user } = useSession()

  useEffect(() => {
    if (variant === 'solid') {
      setScrolled(true)
      return
    }
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant])

  return (
    <nav
      aria-label="Navigation principale"
      className={`fixed inset-x-0 top-0 z-50 h-20 transition-all duration-500 ${
        scrolled
          ? 'bg-blanc/85 backdrop-blur-md border-b border-or/20'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-full max-w-container items-center justify-between px-6 md:px-20">
        <Link
          href={user ? '/accueil' : '/'}
          className={`font-serif text-xl font-light tracking-[0.32em] transition-colors md:text-[22px] ${
            scrolled ? 'text-vert' : 'text-creme'
          }`}
        >
          HILMY
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          {[
            { href: '/annuaire', label: "L'annuaire" },
            { href: '/recommandations', label: 'Recommandations' },
            { href: '/evenements-v2', label: 'Événements' },
            { href: '/tarifs', label: 'Tarifs' },
            { href: '/manifeste', label: 'À propos' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[13px] transition-colors ${
                scrolled ? 'text-vert hover:text-or' : 'text-creme hover:text-or-light'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4 md:gap-5">
          {user?.user_metadata?.is_admin && (
            <Link
              href="/admin"
              className={`hidden text-[11px] font-medium tracking-[0.22em] uppercase transition-colors md:inline-flex ${
                scrolled
                  ? 'text-or-deep hover:text-vert'
                  : 'text-or hover:text-or-light'
              }`}
            >
              · Admin
            </Link>
          )}
          {user ? (
            <Link
              href={dashboardPathFor(user)}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-5 text-[13px] font-semibold transition-all ${
                scrolled
                  ? 'border-vert text-vert hover:bg-vert hover:text-creme'
                  : 'border-or text-or hover:bg-or hover:text-vert'
              }`}
            >
              <LayoutDashboard size={16} strokeWidth={1.75} aria-hidden="true" />
              Mon espace
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`hidden text-[13px] transition-colors md:inline-flex ${
                  scrolled ? 'text-vert hover:text-or' : 'text-creme hover:text-or-light'
                }`}
              >
                Se connecter
              </Link>
              <Link
                href="/auth/signup"
                className={`inline-flex h-10 items-center rounded-full border px-5 text-[13px] font-semibold transition-all ${
                  scrolled
                    ? 'border-vert text-vert hover:bg-vert hover:text-creme'
                    : 'border-or text-or hover:bg-or hover:text-vert'
                }`}
              >
                Rejoindre
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
