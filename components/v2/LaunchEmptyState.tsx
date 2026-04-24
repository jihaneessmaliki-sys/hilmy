'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'

interface LaunchEmptyStateProps {
  kicker: string
  titre: string
  pitch: string
  invitationLabel: string
  invitationHref: string
  secondaryLabel?: string
  secondaryHref?: string
  placeholders: { numero: string; role: string }[]
}

export function LaunchEmptyState({
  kicker,
  titre,
  pitch,
  invitationLabel,
  invitationHref,
  secondaryLabel,
  secondaryHref,
  placeholders,
}: LaunchEmptyStateProps) {
  return (
    <section className="bg-creme py-20 md:py-28">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"
        >
          <div className="flex items-center gap-4">
            <GoldLine width={48} />
            <span className="overline text-or">{kicker}</span>
            <GoldLine width={48} />
          </div>
          <h2 className="font-serif text-h2 font-light leading-[1.1] text-vert">
            {titre}
          </h2>
          <p className="max-w-xl text-[15px] leading-[1.7] text-texte-sec">{pitch}</p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href={invitationHref}
              className="group inline-flex h-[56px] items-center gap-2.5 rounded-full bg-vert px-8 text-[11px] font-medium tracking-[0.28em] text-creme uppercase transition-all hover:bg-vert-dark"
            >
              {invitationLabel}
              <span
                className="text-or-light transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
            {secondaryLabel && secondaryHref && (
              <Link
                href={secondaryHref}
                className="text-[12px] text-texte-sec transition-colors hover:text-or"
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        </motion.div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {placeholders.map((p, i) => (
            <motion.div
              key={p.numero}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 + i * 0.08 }}
            >
              <Link
                href={invitationHref}
                className="group flex h-full flex-col rounded-sm border border-dashed border-or/30 bg-blanc p-6 transition-all duration-500 hover:-translate-y-1 hover:border-or hover:bg-creme-deep"
              >
                <div className="flex h-48 w-full items-center justify-center rounded-sm border border-dashed border-or/30">
                  <span className="font-serif text-5xl font-light text-or/40">
                    {p.numero}
                  </span>
                </div>
                <p className="mt-5 overline text-or">À remplir</p>
                <h3 className="mt-2 font-serif text-lg font-light leading-tight text-vert">
                  {p.role}
                </h3>
                <div className="mt-auto pt-4">
                  <span className="inline-flex items-center gap-2 text-[11px] font-medium text-or-light transition-all group-hover:text-or group-hover:gap-3">
                    Prendre cette place
                    <span className="text-or" aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-12 text-center text-[11px] tracking-[0.28em] text-texte-sec uppercase"
        >
          Zéro faux profil · Zéro chiffre gonflé · Zéro abonnement
        </motion.p>
      </div>
    </section>
  )
}
