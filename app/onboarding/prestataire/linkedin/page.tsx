'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import {
  OnboardingShell,
  OnboardingHeader,
} from '@/components/onboarding/OnboardingShell'

function LinkedinIcon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-or"
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

export default function LinkedinOnboardingPage() {
  return (
    <OnboardingShell step={2} totalSteps={3} backLabel="Changer de méthode">
      <section className="bg-creme pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-3xl px-6 md:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <OnboardingHeader
              number="04"
              kicker="DEPUIS LINKEDIN"
              title={
                <>
                  Bientôt,{' '}
                  <em className="font-serif italic text-or">promis.</em>
                </>
              }
              subtitle={
                <>
                  L&apos;import depuis LinkedIn arrivera dans la prochaine
                  version. Ton parcours pro reformaté version HILMY — chaleureux,
                  humain, pas corporate.
                </>
              }
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-12 rounded-sm border border-or/20 bg-blanc p-10 text-center md:p-14"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-or/10">
              <LinkedinIcon />
            </div>
            <p className="mt-6 font-serif text-3xl font-light text-vert">
              🚧 En préparation
            </p>
            <p className="mt-4 text-[14px] leading-[1.7] text-texte-sec">
              On finalise l&apos;intégration avec LinkedIn pour récupérer ton
              expérience et ton diplôme. Idéal pour les coachs, thérapeutes,
              consultantes et avocates.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/onboarding/prestataire/manuel"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
              >
                Remplir manuellement
                <span
                  className="text-or-light transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
              <Link
                href="/onboarding/prestataire"
                className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-or"
              >
                Retour aux méthodes
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </OnboardingShell>
  )
}
