import type { Metadata } from 'next'
import { NavigationServer } from '@/components/landing/NavigationServer'
import { HeroV2 } from '@/components/landing/HeroV2'
import { StartingPoint } from '@/components/landing/StartingPoint'
import { ThreePromises } from '@/components/landing/ThreePromises'
import { ElleProfiles } from '@/components/landing/ElleProfiles'
import { CopineDiscountsSection } from '@/components/landing/CopineDiscountsSection'
import { EvenementsSection } from '@/components/landing/EvenementsSection'
import { Manifesto } from '@/components/landing/Manifesto'
import { TeamCherche } from '@/components/landing/TeamCherche'
import { PricingTeaser } from '@/components/landing/PricingTeaser'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { FooterV2 } from '@/components/landing/FooterV2'

export const metadata: Metadata = {
  title: "Les meilleures adresses, entre copines",
  description:
    "Hilmy, les meilleures adresses entre copines. Annuaire francophone de prestataires : beauté, événementiel, lieux, lifestyle. Rejoins gratuitement la team.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hilmy — Les meilleures adresses, entre copines",
    description:
      "Annuaire francophone : beauté, événementiel, lieux, lifestyle. Recommandé entre copines.",
    url: "/",
    siteName: "Hilmy",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/images/hero.jpg", width: 1200, height: 630, alt: "Hilmy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hilmy — Les meilleures adresses, entre copines",
    description: "Annuaire francophone recommandé entre copines.",
    images: ["/images/hero.jpg"],
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-creme text-texte">
      <NavigationServer />
      <main>
        <HeroV2 />
        <StartingPoint />
        <Manifesto />
        <ThreePromises />
        <ElleProfiles />
        <CopineDiscountsSection />
        <EvenementsSection />
        <TeamCherche variant="public" />
        <PricingTeaser />
        <FAQ />
        <FinalCTA />
      </main>
      <FooterV2 />
    </div>
  )
}
