'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminNavLink({
  href,
  badge,
  compact,
  children,
}: {
  href: string
  badge?: number | string
  compact?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const active =
    href === pathname || (href !== '/admin' && pathname.startsWith(href))

  if (compact) {
    return (
      <Link
        href={href}
        className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase transition-colors ${
          active
            ? 'bg-vert text-creme'
            : 'bg-creme-soft text-texte-sec hover:bg-creme-deep hover:text-vert'
        }`}
      >
        {children}
        {typeof badge === 'number' && badge > 0 && (
          <span className={active ? 'text-or-light' : 'text-or'}>{badge}</span>
        )}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-sm px-4 py-2.5 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-vert text-creme'
          : 'text-texte hover:bg-creme-soft hover:text-vert'
      }`}
    >
      <span>{children}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] tracking-[0.18em] uppercase ${
            active ? 'bg-or text-vert' : 'bg-or/15 text-or-deep'
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}
