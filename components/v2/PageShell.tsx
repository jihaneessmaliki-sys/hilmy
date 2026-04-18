'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode } from 'react'
import { Navigation } from '@/components/landing/Navigation'
import { FooterV2 } from '@/components/landing/FooterV2'

interface PageShellProps {
  children: ReactNode
  withFooter?: boolean
  className?: string
  /**
   * Variant de la navbar V2.
   * - `'transparent'` (défaut) : transparente sur dark hero, passe solid au scroll.
   * - `'solid'` : solid dès le départ (pages sans hero sombre, ex: /accueil connectée).
   */
  navVariant?: 'transparent' | 'solid'
}

export function PageShell({
  children,
  withFooter = true,
  className = '',
  navVariant = 'transparent',
}: PageShellProps) {
  const shouldReduceMotion = useReducedMotion()
  return (
    <div className={`min-h-screen overflow-x-hidden bg-creme text-texte ${className}`}>
      <Navigation variant={navVariant} />
      <motion.main
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.main>
      {withFooter && <FooterV2 />}
    </div>
  )
}
