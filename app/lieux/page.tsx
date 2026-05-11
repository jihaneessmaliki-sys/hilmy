// TODO Sprint 8 : Remplacer placeholder par vraie page lieux
// avec filtrage par type, recherche par ville, etc.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPageShell } from '@/components/v2/ContentPageShell'

export const metadata: Metadata = {
  title: 'Les lieux Hilmy — Bientôt en ligne',
  description:
    "Les meilleurs lieux pour tes événements arrivent sur Hilmy. En attendant, découvre l'annuaire.",
  alternates: { canonical: '/lieux' },
  openGraph: {
    title: 'Les lieux Hilmy — Bientôt en ligne',
    description:
      "Les meilleurs lieux pour tes événements arrivent sur Hilmy. En attendant, découvre l'annuaire.",
    url: '/lieux',
    siteName: 'Hilmy',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/images/hero.jpg', width: 1200, height: 630, alt: 'Hilmy lieux' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Les lieux Hilmy — Bientôt en ligne',
    description: "Les meilleurs lieux pour tes événements arrivent sur Hilmy.",
    images: ['/images/hero.jpg'],
  },
}

export default function LieuxPage() {
  return (
    <ContentPageShell
      kicker="Bientôt sur Hilmy"
      titre={
        <>
          Les lieux
          <br />
          <em className="font-serif italic text-or">Hilmy.</em>
        </>
      }
      lead={
        <>
          Bientôt ici, les meilleurs lieux pour tes événements : baby showers,
          mariages, anniversaires, et fêtes en tout genre.
        </>
      }
    >
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <p className="font-sans text-[17px] leading-[1.75] text-vert">
          On finit de les sélectionner avec soin, entre copines. En attendant,
          va découvrir l&apos;annuaire complet — coiffeuses, esthéticiennes,
          traiteurs, photographes et plein d&apos;autres pépites qui
          t&apos;attendent.
        </p>
        <div className="pt-4">
          <Link
            href="/annuaire"
            className="inline-block rounded-full bg-or px-10 py-4 text-center text-[15px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)]"
          >
            Découvrir l&apos;annuaire
          </Link>
        </div>
      </div>
    </ContentPageShell>
  )
}
