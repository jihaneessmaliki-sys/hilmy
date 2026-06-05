'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { GoldLine } from '@/components/ui/GoldLine'

export default function PubliePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-vert bg-grain">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-or/12 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-20 text-center text-creme">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-4"
        >
          <GoldLine width={40} />
          <span className="overline text-or">C'est en ligne · Bienvenue dans la team</span>
          <GoldLine width={40} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-28 w-28 items-center justify-center rounded-full border border-or/40 bg-or/10"
        >
          <span className="font-serif text-5xl text-or">✓</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-[clamp(2.5rem,5vw,4rem)] font-light leading-[1.05]"
        >
          Ta fiche est en ligne ! <span aria-hidden>🎉</span>
          <br />
          <em className="italic text-or">Les copines peuvent déjà te trouver.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="max-w-lg font-serif text-[17px] italic leading-[1.6] text-creme/80"
        >
          Elle est visible dans l&apos;annuaire Hilmy dès maintenant. Tu peux la
          peaufiner quand tu veux depuis ton espace — photos, services, ton
          histoire.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="grid w-full gap-4 sm:grid-cols-3"
        >
          {[
            { k: 'Fiche créée', v: 'C\'est fait ✓' },
            { k: 'Paiement confirmé', v: 'Merci à toi ✓' },
            { k: 'En ligne', v: 'Visible dans l\'annuaire ✓' },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-sm border border-or/20 bg-or/10 p-5 text-left backdrop-blur"
            >
              <p className="overline text-or">{s.k}</p>
              <p className="mt-2 text-[14px] text-creme">{s.v}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:gap-5"
        >
          <Link
            href="/dashboard/prestataire"
            className="group inline-flex h-[58px] items-center gap-2.5 rounded-full bg-or px-9 text-[11px] font-medium tracking-[0.28em] text-vert uppercase transition-all hover:bg-or-light"
          >
            Aller à mon espace
            <span
              className="transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
          <Link
            href="/"
            className="text-[12px] text-creme/70 transition-colors hover:text-or-light"
          >
            Retour à l&apos;accueil
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
