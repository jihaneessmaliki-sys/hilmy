'use client'

import Link from 'next/link'
import { useState } from 'react'
import { GoldLine } from '@/components/ui/GoldLine'

export function FooterV2() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setEmail('')
    }, 3000)
  }

  const cols = [
    {
      titre: 'Découvrir',
      liens: [
        { label: "L'annuaire", href: '/annuaire' },
        { label: 'Les recommandations', href: '/recommandations' },
        { label: 'Les événements', href: '/evenements-v2' },
        { label: 'Le manifeste', href: '/manifeste' },
      ],
    },
    {
      titre: 'Rejoindre',
      liens: [
        { label: 'Créer mon compte', href: '/auth/signup' },
        { label: 'Devenir prestataire', href: '/onboarding/prestataire' },
        { label: 'Recommander un lieu', href: '/dashboard/utilisatrice/recommandations/nouvelle' },
        { label: 'Organiser un événement', href: '/dashboard/utilisatrice/evenements/nouveau' },
      ],
    },
    {
      titre: 'Maison',
      liens: [
        { label: 'Notre manifeste', href: '/manifeste' },
        { label: 'Comment ça marche', href: '/comment-ca-marche' },
        { label: 'Charte', href: '/charte' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      titre: 'Légal',
      liens: [
        { label: 'Mentions légales', href: '/mentions-legales' },
        { label: 'CGU', href: '/cgu' },
        { label: 'Confidentialité', href: '/confidentialite' },
        { label: 'Cookies', href: '/cookies' },
      ],
    },
  ]

  return (
    <footer className="relative overflow-hidden bg-vert bg-grain pt-28 pb-10 md:pt-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-or/5 blur-3xl"
      />

      <div className="relative mx-auto max-w-container px-6 md:px-20">
        {/* Newsletter band */}
        <div className="grid gap-12 border-b border-or/15 pb-20 md:grid-cols-2 md:gap-24 md:pb-24">
          <div>
            <div className="flex items-center gap-4">
              <GoldLine width={48} />
              <span className="overline text-or">La lettre d&apos;HILMY</span>
            </div>
            <h3 className="mt-6 font-serif text-h2 font-light text-creme">
              Un dimanche par mois,
              <br />
              les adresses qu&apos;on s&apos;échange.
            </h3>
            <p className="mt-5 max-w-md text-[14px] leading-[1.7] text-creme/70">
              Une newsletter courte, pensée comme un message à une copine. Zéro pub,
              désabonnement en un clic.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="self-end">
            <label htmlFor="newsletter" className="sr-only">
              Adresse e-mail
            </label>
            <div className="flex h-14 items-center gap-2 border-b border-or/30 transition-colors focus-within:border-or">
              <input
                id="newsletter"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="flex-1 bg-transparent text-[15px] text-creme placeholder:text-creme/40 focus:outline-none"
              />
              <button
                type="submit"
                className="group inline-flex items-center gap-2 text-[11px] tracking-[0.28em] text-or uppercase transition-colors hover:text-or-light"
              >
                {submitted ? 'C&apos;est noté' : "S'inscrire"}
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </button>
            </div>
            <p className="mt-3 text-[11px] text-creme/40">
              En t&apos;inscrivant, tu acceptes notre charte de confidentialité.
            </p>
          </form>
        </div>

        {/* Links grid */}
        <div className="grid gap-12 py-20 md:grid-cols-6">
          <div className="md:col-span-2">
            <Link
              href="/"
              className="font-serif text-2xl font-light tracking-[0.32em] text-creme md:text-3xl"
            >
              HILMY
            </Link>
            <p className="mt-6 max-w-xs font-serif italic text-lg leading-[1.35] text-creme/70">
              Le carnet d&apos;adresses qu&apos;on se passe entre copines.
            </p>
            <div className="mt-8 flex items-center gap-4">
              {['Instagram', 'LinkedIn', 'Pinterest'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="text-[11px] tracking-[0.28em] text-creme/50 uppercase transition-colors hover:text-or"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.titre}>
              <p className="overline text-or">{col.titre}</p>
              <ul className="mt-6 space-y-3.5">
                {col.liens.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-creme/75 transition-colors hover:text-or-light"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom band */}
        <div className="flex flex-col-reverse items-start gap-4 border-t border-or/15 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-[11px] text-creme/50">
            © HILMY 2026 · Fait avec soin à Genève
          </p>
          <p className="text-[11px] tracking-[0.22em] text-or/70 uppercase">
            Suisse · France · Belgique · Luxembourg · Monaco
          </p>
        </div>
      </div>
    </footer>
  )
}
