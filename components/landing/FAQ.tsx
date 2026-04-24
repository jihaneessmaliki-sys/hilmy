'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { SectionHeader } from '@/components/ui/SectionHeader'

const faqs = [
  {
    q: 'Pourquoi réservé aux femmes ?',
    a: "Parce qu'on voulait un espace où la confiance entre femmes soit la première brique. Les hommes restent bienvenus dans leurs familles, leurs business, leurs amitiés. Ici, on fait autre chose.",
  },
  {
    q: "C'est gratuit ?",
    a: "Entièrement gratuit pour les utilisatrices comme pour les prestataires. Aucun abonnement, aucune commission sur les prestations. Notre modèle économique viendra plus tard, jamais sur ton dos.",
  },
  {
    q: 'Comment valider un profil prestataire ?',
    a: "Chaque inscription est examinée à la main par l'équipe. On vérifie l'identité, l'activité, la cohérence. Délai : 24-48h, parfois plus si on doit te contacter.",
  },
  {
    q: "Et si une prestataire ne respecte pas ses engagements ?",
    a: "Tu peux la signaler depuis son profil. On examine chaque signalement avec attention. Les récidivistes sortent. Notre modération est humaine et rapide.",
  },
  {
    q: 'Mes données sont-elles en sécurité ?',
    a: "Hébergement en Europe (Francfort), conformité RGPD + nLPD suisse, aucun partage commercial, authentification sans mot de passe. Lire notre politique complète : /confidentialite",
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="bg-blanc py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <div className="grid gap-16 md:grid-cols-[400px_1fr] md:gap-24">
          <FadeInSection>
            <div className="md:sticky md:top-32">
              <SectionHeader
                number="03"
                kicker="QUESTIONS"
                title={
                  <>
                    On te répond
                    <br />
                    tout de suite.
                  </>
                }
              />
              <p className="mt-6 text-sm leading-[1.65] text-texte-sec">
                Tu te poses une autre question ?
                <br />
                Écris-nous à{' '}
                <a href="mailto:contact@hilmy.io" className="text-vert hover:text-or transition-colors">
                  contact@hilmy.io
                </a>
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.15}>
            <div className="border-t border-or/30">
              {faqs.map((faq, i) => (
                <div key={i} className="border-b border-or/30">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    aria-expanded={openIndex === i}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-or focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or focus-visible:ring-offset-2"
                  >
                    <h3 className="text-base font-medium text-vert md:text-lg">{faq.q}</h3>
                    <span
                      className={`shrink-0 font-serif text-[22px] font-light text-or transition-transform duration-300 ${
                        openIndex === i ? 'rotate-45' : ''
                      }`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openIndex === i && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        initial={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
                        animate={shouldReduceMotion ? undefined : { height: 'auto', opacity: 1 }}
                        exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 text-sm leading-[1.7] text-texte-sec md:pr-12">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  )
}
