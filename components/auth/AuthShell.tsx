'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode } from 'react'
import { GoldLine } from '@/components/ui/GoldLine'

interface AuthShellProps {
  kicker: string
  titre: ReactNode
  citation?: ReactNode
  citationAuthor?: string
  children: ReactNode
}

export function AuthShell({
  kicker,
  titre,
  citation,
  citationAuthor,
  children,
}: AuthShellProps) {
  const reduce = useReducedMotion()

  return (
    <div className="min-h-screen bg-creme">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
        {/* Left — editorial side */}
        <motion.aside
          initial={reduce ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative hidden overflow-hidden bg-vert bg-grain px-16 py-20 text-creme lg:flex lg:flex-col lg:justify-between"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 top-1/3 h-[520px] w-[520px] rounded-full bg-or/12 blur-3xl"
          />
          <Link
            href="/"
            className="relative inline-flex items-center gap-3 font-serif text-2xl font-light tracking-[0.32em] text-creme"
          >
            HILMY
          </Link>

          <div className="relative">
            <div className="flex items-center gap-4">
              <GoldLine width={60} />
              <span className="overline text-or">HILMY</span>
            </div>
            <blockquote className="mt-10 max-w-lg font-serif text-4xl font-light leading-[1.15] text-creme md:text-[44px]">
              {citation ?? (
                <>
                  Une adresse qui circule
                  <br />
                  <em className="italic text-or">entre femmes</em>,
                  <br />
                  c&apos;est déjà une recommandation.
                </>
              )}
            </blockquote>
            {citationAuthor && (
              <p className="mt-6 text-[11px] tracking-[0.3em] text-or-light uppercase">
                — {citationAuthor}
              </p>
            )}
          </div>

          <div className="relative flex flex-wrap items-center justify-between gap-6 text-[11px] tracking-[0.22em] text-or uppercase">
            <span>Suisse · France · Belgique · Luxembourg · Monaco</span>
            <span>Zéro commission · Zéro pub · Zéro compromis</span>
          </div>
        </motion.aside>

        {/* Right — form */}
        <motion.section
          initial={reduce ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center px-6 py-14 md:px-14 md:py-20"
        >
          {/* Mobile logo */}
          <Link
            href="/"
            className="mb-8 inline-flex font-serif text-xl font-light tracking-[0.32em] text-vert lg:hidden"
          >
            HILMY
          </Link>

          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">{kicker}</span>
            </div>
            <h1 className="mt-6 font-serif text-[clamp(2rem,4vw,3rem)] font-light leading-[1.05] text-vert">
              {titre}
            </h1>

            {children}
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export function OAuthButton({
  label,
  provider,
  onClick,
}: {
  label: string
  provider: 'google' | 'apple'
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-12 w-full items-center justify-center gap-3 rounded-full border border-or/30 bg-blanc px-5 text-[13px] font-medium text-vert transition-all duration-300 hover:border-or hover:bg-creme-deep"
    >
      {provider === 'google' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21.35 11.1h-9.15v2.9h5.32c-.23 1.25-.95 2.3-2.03 3.02v2.5h3.28c1.92-1.77 3.03-4.38 3.03-7.47 0-.65-.06-1.28-.18-1.9z"
          />
          <path
            fill="#34A853"
            d="M12.2 21c2.75 0 5.05-.91 6.73-2.47l-3.28-2.5c-.91.61-2.07.97-3.45.97-2.65 0-4.9-1.79-5.7-4.19H3.1v2.62C4.77 18.78 8.21 21 12.2 21z"
          />
          <path
            fill="#FBBC05"
            d="M6.5 12.81c-.2-.61-.31-1.26-.31-1.93s.11-1.32.31-1.93V6.33H3.1A8.997 8.997 0 0 0 2.2 10.88c0 1.57.35 3.04.9 4.55l3.4-2.62z"
          />
          <path
            fill="#EA4335"
            d="M12.2 5.69c1.5 0 2.85.52 3.91 1.53l2.91-2.91C17.24 2.74 14.94 1.8 12.2 1.8 8.21 1.8 4.77 4.02 3.1 7.17l3.4 2.62c.8-2.4 3.05-4.1 5.7-4.1z"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      )}
      {label}
    </button>
  )
}

export function OrSeparator() {
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="h-px flex-1 bg-or/30" aria-hidden="true" />
      <span className="text-[10px] tracking-[0.3em] text-or uppercase">
        ou avec ton email
      </span>
      <span className="h-px flex-1 bg-or/30" aria-hidden="true" />
    </div>
  )
}

export function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="overline text-or">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="border-b border-or/20 bg-transparent py-2 text-[15px] text-vert placeholder:text-texte-sec/50 focus:border-or focus:outline-none"
      />
    </label>
  )
}
