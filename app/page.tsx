import { Navigation } from '@/components/landing/Navigation'
import { HeroV2 } from '@/components/landing/HeroV2'
import { StartingPoint } from '@/components/landing/StartingPoint'
import { ThreePromises } from '@/components/landing/ThreePromises'
import { ElleProfiles } from '@/components/landing/ElleProfiles'
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
        <Manifesto />
        <ThreePromises />
        <ElleProfiles />
        <FAQ />
        <FinalCTA />
      </main>
      <FooterV2 />
    </div>
  )
}
