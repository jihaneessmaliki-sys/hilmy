'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import {
  OnboardingShell,
  OnboardingHeader,
} from '@/components/onboarding/OnboardingShell'

function InstagramIcon() {
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
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export default function InstagramOnboardingPage() {
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
              number="03"
              kicker="DEPUIS INSTAGRAM"
              title={
                <>
                  Bientôt,{' '}
                  <em className="font-serif italic text-or">promis.</em>
                </>
              }
              subtitle={
                <>
                  L&apos;import depuis un compte Business ou Creator arrivera
                  dans la prochaine version. En attendant, le remplissage
                  manuel prend 8 minutes.
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
              <InstagramIcon />
            </div>
            <p className="mt-6 font-serif text-3xl font-light text-vert">
              🚧 En préparation
            </p>
            <p className="mt-4 text-[14px] leading-[1.7] text-texte-sec">
              On finalise l&apos;intégration avec Meta pour récupérer ta bio,
              ton avatar et tes derniers posts. Tu pourras créer ta fiche en
              2 minutes.
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
