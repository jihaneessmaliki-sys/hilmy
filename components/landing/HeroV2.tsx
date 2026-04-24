'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { GoldLine } from '@/components/ui/GoldLine'

/* ─────────────────────────────────────────────────────────
   SYSTÈME DE SWITCH — change HERO_VARIANT pour tester
   ───────────────────────────────────────────────────────── */
export type VariantKey =
  | 'carnet'
  | 'girl-talk'
  | 'sans-filtre'
  | 'curation'
  | 'question'
  | 'promesse'

const HERO_VARIANT: VariantKey = 'carnet'

type HeroVariant = {
  h1: string
  sub: string
  /** Mot du h1 qui reçoit le shimmer or. Comparé case-insensitive + apostrophes ignorées. */
  keyword: string
}

export const HERO_VARIANTS: Record<VariantKey, HeroVariant> = {
  carnet: {
    h1: "Le carnet d'adresses, entre copines.",
    sub: "Le carnet d'adresses qui circule entre femmes, enfin digitalisé.",
    keyword: 'copines',
  },
  'girl-talk': {
    h1: "T'aurais pas une adresse pour…",
    sub: "Cette phrase que tu tapes chaque semaine sur WhatsApp. Ici, la réponse t'attend déjà.",
    keyword: 'adresse',
  },
  'sans-filtre': {
    h1: 'Les vraies adresses. Sans bullshit.',
    sub: 'Zéro partenariat, zéro avis bidon. Juste ce qui circule entre femmes qui connaissent.',
    keyword: 'vraies',
  },
  curation: {
    h1: 'Une sélection, pas un annuaire.',
    sub: "Chaque adresse vient d'une femme qui l'aime vraiment. Le reste, on s'en passe.",
    keyword: 'sélection',
  },
  question: {
    h1: 'Comment tu fais, toi ?',
    sub: 'Pour trouver une coiffeuse qui connaît tes cheveux. Une thérapeute qui écoute vraiment.',
    keyword: 'toi',
  },
  promesse: {
    h1: 'Les bonnes adresses, déjà triées.',
    sub: "On t'épargne le scroll Instagram, les groupes WhatsApp et les tests foireux.",
    keyword: 'triées',
  },
}

/* Normalise pour comparer le keyword (retire ponctuation + accents) */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?…:'']/g, '')
    .trim()

/* ─────────────────────────────────────────────────────────
   COMPOSANT
   ───────────────────────────────────────────────────────── */
export function HeroV2({ variant }: { variant?: VariantKey } = {}) {
  const shouldReduceMotion = useReducedMotion()
  const chosen = variant ?? HERO_VARIANT
  const { h1, sub, keyword } = HERO_VARIANTS[chosen]

  // Mobile : animations 30 % plus rapides. Détecté au mount uniquement.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 767px)').matches)
  }, [])
  const speed = isMobile ? 0.7 : 1

  const words = h1.split(' ')
  const normalisedKeyword = normalise(keyword)

  // Variants pour le stagger
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08 * speed,
        delayChildren: 0.1,
      },
    },
  }

  const wordVariant = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    show: shouldReduceMotion
      ? { opacity: 1, y: 0 }
      : {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5 * speed, ease: 'easeOut' as const },
        },
  }

  // Délai après fin du stagger H1 pour sous-titre + CTA
  const subDelay = 0.6 * speed
  const ctaDelay = 1.2 * speed
  // Shimmer démarre juste après que tous les mots soient apparus
  const shimmerDelay = 0.1 + words.length * 0.08 * speed + 0.1

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-vert bg-grain pt-20 md:aspect-[16/9] md:min-h-0"
      style={{
        background:
          'linear-gradient(180deg, #092417 0%, #0F3D2E 40%, #1a4a3a 85%, #2a5c47 100%)',
      }}
    >
      {/* MOBILE : vidéo au format complet (pas de crop) en haut, texte en dessous — structure stack */}
      <div className="relative w-full md:hidden">
        <div className="relative aspect-video w-full overflow-hidden">
          <video
            aria-hidden="true"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/images/promesse-evenements.jpg"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(9,36,23,0.85) 100%)',
            }}
          />
        </div>
      </div>

      {/* DESKTOP : vidéo en fond complet (object-contain), texte superposé au centre */}
      <video
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/promesse-evenements.jpg"
        className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full object-contain md:block"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* Overlays desktop uniquement */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
        style={{ background: 'rgba(0,0,0,0.28)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 55%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 80%)',
        }}
      />

      {/* Contenu : en dessous de la vidéo sur mobile, superposé sur desktop */}
      <div className="relative mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 px-6 py-10 text-center md:h-full md:gap-7 md:py-14">
        {/* Eyebrow */}
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex items-center gap-4"
        >
          <GoldLine width={36} />
          <span
            className="overline text-or"
            style={{
              fontWeight: 700,
              letterSpacing: '0.35em',
              textShadow: '0 1px 8px rgba(0,0,0,0.4)',
            }}
          >
            HILMY
          </span>
          <GoldLine width={36} />
        </motion.div>

        {/* H1 — stagger mot par mot */}
        <motion.h1
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="font-serif font-light leading-[1.05] text-creme text-[clamp(2.5rem,5.5vw,4.5rem)]"
          aria-label={h1}
        >
          {words.map((word, i) => {
            const isKeyword = normalise(word) === normalisedKeyword
            return (
              <motion.span
                key={`${word}-${i}`}
                variants={wordVariant}
                className="inline-block"
                style={{ marginRight: i < words.length - 1 ? '0.25em' : 0 }}
              >
                {isKeyword ? (
                  <ShimmerWord delay={shimmerDelay} reduced={!!shouldReduceMotion}>
                    {word}
                  </ShimmerWord>
                ) : (
                  word
                )}
              </motion.span>
            )
          })}
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: 0.6 * speed,
            delay: subDelay,
            ease: 'easeOut',
          }}
          className="max-w-xl font-serif text-[16px] italic leading-[1.6] text-creme/75 md:text-[17px]"
        >
          {sub}
        </motion.p>

        {/* CTAs — scale léger à la fin */}
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: 0.4 * speed,
            delay: ctaDelay,
            ease: 'easeOut',
          }}
          className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          <Link
            href="/inscription"
            className="group inline-flex h-[58px] items-center gap-2.5 rounded-full bg-or px-8 text-[11px] font-medium tracking-[0.28em] text-vert uppercase transition-all duration-300 hover:bg-or-light"
          >
            Rejoindre
            <span
              className="transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
          <Link
            href="/onboarding/prestataire"
            className="group inline-flex h-[58px] items-center gap-2.5 rounded-full border border-creme/50 bg-transparent px-8 text-[11px] font-medium tracking-[0.28em] text-creme uppercase transition-all duration-300 hover:border-or hover:bg-or/10 hover:text-or-light"
          >
            Je suis prestataire
            <span
              className="text-or transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </motion.div>

        {/* Meta strip */}
        <motion.p
          initial={shouldReduceMotion ? undefined : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, delay: ctaDelay + 0.2 }}
          className="mt-6 text-[11px] tracking-[0.28em] text-or uppercase"
        >
          Suisse · France · Belgique · Luxembourg · Monaco
        </motion.p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────
   Shimmer or — passe UNE FOIS sur le mot-clé
   ───────────────────────────────────────────────────────── */
function ShimmerWord({
  children,
  delay,
  reduced,
}: {
  children: string
  delay: number
  reduced: boolean
}) {
  if (reduced) {
    return <span style={{ color: '#C9A961' }}>{children}</span>
  }

  return (
    <motion.span
      className="relative inline-block italic"
      initial={{ backgroundPosition: '200% 0' }}
      whileInView={{ backgroundPosition: '-200% 0' }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 1.4,
        delay,
        ease: 'easeOut',
      }}
      style={{
        backgroundImage:
          'linear-gradient(110deg, #C9A961 40%, #F0DFA8 46%, #FFF4D6 50%, #F0DFA8 54%, #C9A961 60%)',
        backgroundSize: '250% 100%',
        color: 'transparent',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
      }}
    >
      {children}
    </motion.span>
  )
}
