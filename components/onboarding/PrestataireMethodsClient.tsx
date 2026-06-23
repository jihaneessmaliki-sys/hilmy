'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import {
  OnboardingShell,
  OnboardingHeader,
} from '@/components/onboarding/OnboardingShell'
import { MethodCard } from '@/components/onboarding/MethodCard'
import { MapPin, PenLine } from 'lucide-react'

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
      'On récupère ton adresse, tes horaires, tes photos. Tu corriges, tu publies.',
    ideal: 'Restaurants, spas, salons, boutiques — tout lieu physique.',
    duree: '2 min',
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
                  Deux façons de créer ta fiche : à la main, ou depuis Google
                  Places. Quelques infos et tu es prête à rejoindre la team.
                  Trois formules d&apos;abonnement à partir de 19€/mois, sans
                  commission sur tes prestations — le détail sur{' '}
                  <Link
                    href="/tarifs"
                    className="text-or-deep underline-offset-4 hover:text-or hover:underline"
                  >
                    /tarifs
                  </Link>
                  .
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
              <MethodCard
                key={m.slug}
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
                k: 'Simple',
                v: 'Crée ta fiche, choisis ta formule, tu es en ligne tout de suite.',
              },
              {
                k: 'Entre copines',
                v: 'On veille à ce que la communauté reste un espace de confiance.',
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
