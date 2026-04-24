'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import {
  OnboardingShell,
  OnboardingHeader,
} from '@/components/onboarding/OnboardingShell'
import { MethodCard } from '@/components/onboarding/MethodCard'
import { MapPin, PenLine } from 'lucide-react'

function Instagram({
  size = 18,
  strokeWidth = 1.5,
}: {
  size?: number
  strokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function Linkedin({
  size = 18,
  strokeWidth = 1.5,
}: {
  size?: number
  strokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

const methods = [
  {
    slug: 'manuel',
    numero: '01',
    icon: <PenLine size={18} strokeWidth={1.5} />,
    titre: 'Remplir manuellement',
    accroche:
      "Le chemin le plus complet : tu remplis ta fiche en 4 étapes, dans ton style.",
    ideal: 'Pour toutes les prestataires — c\'est la méthode disponible aujourd\'hui.',
    duree: '8 min',
    recommande: true,
  },
  {
    slug: 'google',
    numero: '02',
    icon: <MapPin size={18} strokeWidth={1.5} />,
    titre: 'Depuis Google Places',
    accroche:
      'On récupérera ton adresse, tes horaires, tes photos. Tu corriges, tu publies.',
    ideal: 'Restaurants, spas, salons, boutiques — tout lieu physique.',
    duree: '2 min',
    bientot: true,
  },
  {
    slug: 'instagram',
    numero: '03',
    icon: <Instagram size={18} strokeWidth={1.5} />,
    titre: 'Depuis Instagram',
    accroche:
      'Ta bio, ta photo, tes six derniers posts — importés direct pour ta galerie.',
    ideal: 'Créatrices, influenceuses, marques. Compte Business ou Creator.',
    duree: '2 min',
    bientot: true,
  },
  {
    slug: 'linkedin',
    numero: '04',
    icon: <Linkedin size={18} strokeWidth={1.5} />,
    titre: 'Depuis LinkedIn',
    accroche:
      'Ton parcours pro reformaté version HILMY. Chaleureux, humain, pas corporate.',
    ideal: 'Coachs, thérapeutes en ligne, consultantes, avocates.',
    duree: '3 min',
    bientot: true,
  },
]

export function PrestataireMethodsClient() {
  return (
    <OnboardingShell
      step={1}
      totalSteps={3}
      backHref="/"
      backLabel="Retour à l'accueil"
    >
      <section className="relative overflow-hidden bg-creme pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <OnboardingHeader
              number="01"
              kicker="CRÉER MA FICHE"
              title={
                <>
                  Huit minutes.
                  <br />
                  Pour toujours.
                </>
              }
              subtitle={
                <>
                  Ta fiche est complètement gratuite, sans commission. On te
                  demande juste quelques infos et tu es en ligne. Les imports
                  automatiques arriveront bientôt.
                </>
              }
            />
          </motion.div>
        </div>
      </section>

      <section className="pb-20 md:pb-28">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-5 md:grid-cols-2">
            {methods.map((m, i) => (
              <div key={m.slug} className="relative">
                <MethodCard
                  index={i}
                  icon={m.icon}
                  numero={m.numero}
                  titre={m.titre}
                  accroche={m.accroche}
                  ideal={m.ideal}
                  duree={m.duree}
                  recommande={m.recommande}
                  href={`/onboarding/prestataire/${m.slug}`}
                />
                {m.bientot && (
                  <span className="absolute top-5 right-5 rounded-full bg-or/15 px-3 py-1 text-[10px] tracking-[0.22em] text-or-deep uppercase">
                    Bientôt
                  </span>
                )}
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-14 grid gap-5 md:grid-cols-3"
          >
            {[
              {
                k: 'Gratuit',
                v: "Zéro abonnement, zéro commission. Aujourd'hui et demain.",
              },
              {
                k: 'Validé à la main',
                v: "On regarde chaque fiche. C'est ça, la confiance entre nous.",
              },
              {
                k: 'Tes données',
                v: 'Hébergées en Europe. Jamais partagées. RGPD + nLPD suisse.',
              },
            ].map((r) => (
              <div
                key={r.k}
                className="rounded-sm border border-or/15 bg-blanc p-6"
              >
                <p className="overline text-or">{r.k}</p>
                <p className="mt-2 text-[13px] leading-[1.65] text-texte-sec">
                  {r.v}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-14 text-center"
          >
            <p className="text-[13px] text-texte-sec">
              Déjà un compte ?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-vert transition-colors hover:text-or"
              >
                Se connecter
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </OnboardingShell>
  )
}
