import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inscription',
  description: "Rejoins la team Hilmy. Inscris-toi gratuitement pour découvrir l'annuaire des copines.",
  robots: { index: false, follow: false },
  alternates: { canonical: '/auth/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
