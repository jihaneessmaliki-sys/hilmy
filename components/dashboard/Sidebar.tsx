'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export type SidebarLink = {
  kind?: 'link'
  href: string
  label: string
  icon?: string
  badge?: string
}

export type SidebarGroup = {
  kind: 'group'
  label: string
  icon?: string
  items: SidebarLink[]
}

export type SidebarItem = SidebarLink | SidebarGroup

interface SidebarProps {
  user: {
    prenom: string
    nom?: string
    avatar: string
    meta?: string
    badge?: string
  }
  items: SidebarItem[]
  signOutLabel?: string
}

function isGroup(it: SidebarItem): it is SidebarGroup {
  return it.kind === 'group'
}

export function Sidebar({ user, items, signOutLabel = 'À bientôt' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const isActive = (href: string) =>
    href === pathname ||
    (href !== '/dashboard/utilisatrice' &&
      href !== '/dashboard/prestataire' &&
      pathname.startsWith(href))

  // Un groupe est "actif" si l'un de ses enfants l'est (utile pour le style + l'ouverture par défaut).
  const isGroupActive = (g: SidebarGroup) =>
    g.items.some((ch) => isActive(ch.href))

  // État d'ouverture des groupes : ouverts par défaut si un enfant est actif.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {}
    for (const it of items) {
      if (isGroup(it)) o[it.label] = isGroupActive(it)
    }
    return o
  })

  // Si la route change et qu'un enfant d'un groupe devient actif, on ouvre le groupe.
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      for (const it of items) {
        if (isGroup(it) && isGroupActive(it)) next[it.label] = true
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-or/15 bg-creme/85 px-5 backdrop-blur md:hidden">
        <Link
          href="/accueil"
          className="font-serif text-xl font-light tracking-[0.32em] text-vert"
        >
          HILMY
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-or/30 bg-blanc px-4 text-[11px] font-medium tracking-[0.2em] text-vert uppercase"
        >
          <span className="flex flex-col gap-1" aria-hidden="true">
            <span className="block h-px w-4 bg-vert" />
            <span className="block h-px w-4 bg-vert" />
            <span className="block h-px w-4 bg-vert" />
          </span>
          Menu
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-or/15 bg-creme-soft shadow-lg md:hidden"
          >
            <div className="px-5 py-4">
              <UserBlock user={user} />
            </div>
            <ul className="flex flex-col gap-0.5 px-3 pb-5">
              {items.map((it) =>
                isGroup(it) ? (
                  <MobileGroup
                    key={it.label}
                    group={it}
                    open={!!openGroups[it.label]}
                    onToggle={() => toggleGroup(it.label)}
                    isActive={isActive}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ) : (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between rounded-sm px-4 py-3 text-[14px] transition-colors ${
                        isActive(it.href)
                          ? 'bg-vert text-creme'
                          : 'text-vert hover:bg-blanc'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {it.icon && (
                          <span className="font-serif text-or italic">{it.icon}</span>
                        )}
                        {it.label}
                      </span>
                      {it.badge && (
                        <span className="text-[10px] tracking-[0.22em] text-or uppercase">
                          {it.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-or/15 bg-creme-soft md:flex">
        <div className="px-8 pt-10">
          <Link
            href="/accueil"
            className="font-serif text-2xl font-light tracking-[0.32em] text-vert transition-colors hover:text-or"
          >
            HILMY
          </Link>
        </div>

        <div className="px-8 pt-10">
          <UserBlock user={user} />
        </div>

        <nav className="mt-8 flex-1 overflow-y-auto px-4 pb-8">
          <ul className="flex flex-col gap-0.5">
            {items.map((it) =>
              isGroup(it) ? (
                <DesktopGroup
                  key={it.label}
                  group={it}
                  open={!!openGroups[it.label]}
                  onToggle={() => toggleGroup(it.label)}
                  isActive={isActive}
                  groupActive={isGroupActive(it)}
                />
              ) : (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={`group flex items-center justify-between rounded-sm px-4 py-3 text-[14px] transition-all duration-300 ${
                      isActive(it.href)
                        ? 'bg-vert text-creme'
                        : 'text-texte hover:bg-blanc hover:text-vert'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`font-serif italic transition-colors ${
                          isActive(it.href) ? 'text-or' : 'text-or/70'
                        }`}
                      >
                        {it.icon}
                      </span>
                      {it.label}
                    </span>
                    {it.badge && (
                      <span
                        className={`text-[10px] tracking-[0.22em] uppercase ${
                          isActive(it.href) ? 'text-or-light' : 'text-or'
                        }`}
                      >
                        {it.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="border-t border-or/15 p-6">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="group inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-texte-sec uppercase transition-colors hover:text-or disabled:opacity-60"
          >
            <span
              className="text-or transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            >
              ←
            </span>
            {signingOut ? 'Déconnexion…' : signOutLabel}
          </button>
        </div>
      </aside>
    </>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${open ? 'rotate-90' : 'rotate-0'}`}
    >
      <path
        d="M7 5l6 5-6 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DesktopGroup({
  group,
  open,
  onToggle,
  isActive,
  groupActive,
}: {
  group: SidebarGroup
  open: boolean
  onToggle: () => void
  isActive: (href: string) => boolean
  groupActive: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-sm px-4 py-3 text-[14px] transition-all duration-300 ${
          groupActive
            ? 'text-vert'
            : 'text-texte hover:bg-blanc hover:text-vert'
        }`}
      >
        <span className="flex items-center gap-3">
          {group.icon && (
            <span
              className={`font-serif italic transition-colors ${
                groupActive ? 'text-or' : 'text-or/70'
              }`}
            >
              {group.icon}
            </span>
          )}
          {group.label}
        </span>
        <span className={groupActive ? 'text-or' : 'text-or/60'}>
          <Chevron open={open} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {group.items.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={`flex items-center gap-3 rounded-sm py-2.5 pl-11 pr-4 text-[13px] transition-all duration-300 ${
                    isActive(child.href)
                      ? 'bg-vert text-creme'
                      : 'text-texte hover:bg-blanc hover:text-vert'
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${
                      isActive(child.href) ? 'bg-or-light' : 'bg-or/60'
                    }`}
                    aria-hidden="true"
                  />
                  {child.label}
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}

function MobileGroup({
  group,
  open,
  onToggle,
  isActive,
  onNavigate,
}: {
  group: SidebarGroup
  open: boolean
  onToggle: () => void
  isActive: (href: string) => boolean
  onNavigate: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-sm px-4 py-3 text-[14px] text-vert hover:bg-blanc"
      >
        <span className="flex items-center gap-3">
          {group.icon && (
            <span className="font-serif text-or italic">{group.icon}</span>
          )}
          {group.label}
        </span>
        <span className="text-or">
          <Chevron open={open} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {group.items.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-sm py-2.5 pl-11 pr-4 text-[13px] transition-colors ${
                    isActive(child.href)
                      ? 'bg-vert text-creme'
                      : 'text-vert hover:bg-blanc'
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${
                      isActive(child.href) ? 'bg-or-light' : 'bg-or/60'
                    }`}
                    aria-hidden="true"
                  />
                  {child.label}
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}

function UserBlock({
  user,
}: {
  user: { prenom: string; nom?: string; avatar: string; meta?: string; badge?: string }
}) {
  const isUrl = user.avatar?.startsWith('http') || user.avatar?.startsWith('/')
  return (
    <div className="flex items-center gap-4">
      <span
        className="h-14 w-14 shrink-0 rounded-full bg-creme-deep ring-1 ring-or/40 bg-cover bg-center"
        style={
          isUrl
            ? { backgroundImage: `url(${user.avatar})` }
            : { backgroundColor: user.avatar || '#D4C5B0' }
        }
        aria-label={`Avatar ${user.prenom}`}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-serif text-xl font-light text-vert">
            {user.prenom}
          </p>
          {user.badge && (
            <span className="rounded-full bg-or/15 px-2 py-0.5 text-[9px] tracking-[0.22em] text-or-deep uppercase">
              {user.badge}
            </span>
          )}
        </div>
        {user.meta && (
          <p className="text-[11px] text-texte-sec">{user.meta}</p>
        )}
      </div>
    </div>
  )
}
