import { FadeInSection } from '@/components/ui/FadeInSection'
import { SectionHeader } from '@/components/ui/SectionHeader'

export function Manifesto() {
  return (
    <section className="bg-vert py-32 md:py-40">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <FadeInSection>
          <SectionHeader number="02" kicker="NOTRE MANIFESTO" align="center" theme="dark" className="mb-14" />
        </FadeInSection>
        <FadeInSection delay={0.15}>
          <p className="font-serif font-light text-creme leading-[1.35] text-[28px] md:text-[44px]">
            Une femme sait où envoyer
            <br />
            une autre femme.
            <br />
            La bienveillance vaut plus
            <br />
            qu'un algorithme.
            <br />
            La confiance se construit à la main,
            <br />
            un nom à la fois.
          </p>
        </FadeInSection>
        <FadeInSection delay={0.4}>
          <p className="mt-12 text-xs tracking-[0.05em] text-or-light">— L'équipe Hilmy</p>
        </FadeInSection>
      </div>
    </section>
  )
}
