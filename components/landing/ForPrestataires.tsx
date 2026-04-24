import { FadeInSection } from '@/components/ui/FadeInSection'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { HilmyButton } from '@/components/ui/HilmyButton'
import { GoldLine } from '@/components/ui/GoldLine'

const bullets = [
  'Inscription gratuite, validation sous 48h',
  'Aucun abonnement, aucune commission',
  'Tu es trouvée par les femmes de ta ville',
  'Ton profil importé en 2 min (Google, Instagram, LinkedIn)',
]

export function ForPrestataires() {
  return (
    <section className="bg-creme">
      <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-2">
        {/* Left: editorial pullquote */}
        <FadeInSection className="h-full">
          <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-10 bg-vert px-8 py-20 text-center md:px-16 lg:min-h-[680px]">
            <GoldLine width={60} />
            <blockquote className="max-w-md font-serif text-3xl font-light italic leading-[1.3] text-creme md:text-[34px]">
              Une femme sait
              <br />
              où envoyer
              <br />
              une autre femme.
            </blockquote>
            <span className="overline text-or-light">Notre parti pris</span>
          </div>
        </FadeInSection>

        {/* Right: value prop */}
        <FadeInSection className="h-full" delay={0.2}>
          <div className="flex h-full flex-col justify-center gap-8 px-8 py-20 md:px-20">
            <SectionHeader
              number="06"
              kicker="PRESTATAIRE"
              title={
                <>
                  Fais-toi trouver
                  <br />
                  par celles qui te cherchent.
                </>
              }
            />
            <p className="max-w-md text-[15px] leading-[1.7] text-texte-sec">
              HILMY ouvre ses pages. Les premières fiches s&apos;y écrivent — la tienne
              peut en faire partie. Aucun abonnement, aucune commission, jamais.
            </p>
            <ul className="flex flex-col gap-3.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-3.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-or" aria-hidden="true" />
                  <span className="text-sm text-texte">{b}</span>
                </li>
              ))}
            </ul>
            <div className="pt-4">
              <HilmyButton variant="primary" withArrow href="/onboarding/prestataire">
                Créer ma fiche en 2 min
              </HilmyButton>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}
