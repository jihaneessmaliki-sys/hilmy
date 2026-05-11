import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
  description: "Connecte-toi à Hilmy pour accéder à ta fiche prestataire ou tes adresses sauvegardées.",
  robots: { index: false, follow: false },
  alternates: { canonical: '/auth/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
