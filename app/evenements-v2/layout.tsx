import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Événements femmes-only',
  description:
    "Découvre les événements Hilmy : ateliers, brunchs, soirées entre copines en Suisse, France, Belgique. Réservés aux femmes francophones.",
  alternates: { canonical: '/evenements-v2' },
  openGraph: {
    title: 'Hilmy — Événements femmes-only',
    description: 'Ateliers, brunchs, soirées entre copines francophones.',
    url: '/evenements-v2',
    siteName: 'Hilmy',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/images/hero.jpg', width: 1200, height: 630, alt: 'Hilmy événements' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hilmy — Événements femmes-only',
    description: 'Ateliers, brunchs, soirées entre copines francophones.',
    images: ['/images/hero.jpg'],
  },
}

export default function EvenementsLayout({ children }: { children: React.ReactNode }) {
  return children
}
