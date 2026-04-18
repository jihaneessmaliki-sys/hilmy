import { Navigation } from '@/components/landing/Navigation'
import { HeroV2 } from '@/components/landing/HeroV2'
import { StartingPoint } from '@/components/landing/StartingPoint'
import { FloatingQuote } from '@/components/landing/FloatingQuote'
import { ThreePromises } from '@/components/landing/ThreePromises'
import { NineUniverses } from '@/components/landing/NineUniverses'
import { ElleProfiles } from '@/components/landing/ElleProfiles'
import { RecentFavorites } from '@/components/landing/RecentFavorites'
import { ForPrestataires } from '@/components/landing/ForPrestataires'
import { Manifesto } from '@/components/landing/Manifesto'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { FooterV2 } from '@/components/landing/FooterV2'

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-creme text-texte">
      <Navigation />
      <main>
        <HeroV2 />
        <StartingPoint />
        <FloatingQuote />
        <ThreePromises />
        <NineUniverses />
        <ElleProfiles />
        <RecentFavorites />
        <ForPrestataires />
        <Manifesto />
        <FAQ />
        <FinalCTA />
      </main>
      <FooterV2 />
    </div>
  )
}
