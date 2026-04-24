'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { GoldLine } from '@/components/ui/GoldLine'

interface OnboardingShellProps {
  children: ReactNode
  step?: number
  totalSteps?: number
  backHref?: string
  backLabel?: string
  eyebrow?: string
}

export function OnboardingShell({
  children,
  step = 1,
  totalSteps = 3,
  backHref = '/onboarding/prestataire',
  backLabel = 'Changer de méthode',
  eyebrow = 'Créer ma fiche prestataire',
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen bg-creme">
      <header className="relative z-10 border-b border-or/20 bg-blanc/70 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-container items-center justify-between px-6 md:px-20">
          <Link
            href="/"
            className="font-serif text-xl font-light tracking-[0.32em] text-vert md:text-[22px]"
          >
            HILMY
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <span className="overline text-or">{eyebrow}</span>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => {
                const isActive = i < step
                return (
                  <motion.span
                    key={i}
                    initial={false}
                    animate={{
                      width: isActive ? 28 : 8,
                      backgroundColor: isActive ? '#C9A961' : '#E5D4AF80',
                    }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="h-[3px] rounded-full"
                  />
                )
              })}
            </div>
          </div>
          <Link
            href={backHref}
            className="group inline-flex items-center gap-2 text-[12px] font-medium text-texte-sec transition-colors hover:text-or"
          >
            <span
              className="transition-transform group-hover:-translate-x-0.5 text-or"
              aria-hidden="true"
            >
              ←
            </span>
            {backLabel}
          </Link>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}

export function OnboardingHeader({
  number,
  kicker,
  title,
  subtitle,
}: {
  number: string
  kicker: string
  title: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <span className="font-serif text-[44px] font-light leading-none text-or">
          {number}
        </span>
        <GoldLine width={60} />
        <span className="overline text-or">{kicker}</span>
      </div>
      <h1 className="font-serif text-h1 font-light text-vert">{title}</h1>
      {subtitle && (
        <p className="max-w-2xl text-[15px] leading-[1.7] text-texte-sec">{subtitle}</p>
      )}
    </div>
  )
}
