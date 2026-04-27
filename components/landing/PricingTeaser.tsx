import { FadeInSection } from '@/components/ui/FadeInSection'
import { HilmyButton } from '@/components/ui/HilmyButton'
import { PRICING, PALIER_INFO, type Palier } from '@/app/tarifs/_lib/pricing'

// Teaser homepage des 3 paliers prestataires. Source de vérité prix +
// labels = app/tarifs/_lib/pricing.ts (option B brief batch 3.2 home).
// Les taglines de cette section sont volontairement DIFFÉRENTES de
// PALIER_INFO[].tagline (qui sert sur /tarifs) — le teaser home utilise
// un copy plus court et accrocheur.
//
// Pas de wizard, pas de toggle durée, pas de mailto : c'est un teaser
// visuel pur, la conversion réelle se fait sur /tarifs.
interface TeaserCard {
  palier: Palier
  tagline: string
  highlight: boolean
  badge?: string
}

const TEASER_CARDS: TeaserCard[] = [
  {
    palier: 'standard',
    tagline: 'Pour démarrer en toute simplicité',
    highlight: false,
  },
  {
    palier: 'premium',
    tagline: 'Pour faire la différence',
    highlight: true,
    badge: 'Le plus choisi',
  },
  {
    palier: 'cercle_pro',
    tagline: 'Pour entrer dans le cercle',
    highlight: false,
  },
]

export function PricingTeaser() {
  return (
    <section className="bg-creme py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <FadeInSection>
          <div className="mx-auto max-w-2xl text-center">
            <p className="overline text-or">DEVENIR PRESTATAIRE</p>
            <h2 className="mt-5 font-serif text-h2 font-light leading-tight text-vert">
              Trois paliers, un seul état d&apos;esprit.
            </h2>
            <p className="mt-6 text-[15px] leading-[1.7] text-texte-sec">
              Choisis ce qui te ressemble. Tu peux changer à tout moment.
            </p>
          </div>
        </FadeInSection>

        <div className="mt-14 grid gap-6 md:mt-16 md:grid-cols-3 md:gap-8">
          {TEASER_CARDS.map((card, i) => {
            const info = PALIER_INFO[card.palier]
            const price = PRICING[card.palier][1].m
            return (
              <FadeInSection key={card.palier} delay={i * 0.08}>
                <div
                  className={`relative flex h-full flex-col rounded-md bg-white p-8 transition-all md:p-10 ${
                    card.highlight
                      ? 'border-2 border-or shadow-[0_16px_40px_rgba(15,61,46,0.08)] md:scale-[1.03]'
                      : 'border border-creme-deep'
                  }`}
                >
                  {card.highlight && card.badge ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-or px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-vert">
                      {card.badge}
                    </span>
                  ) : null}
                  <p className="font-serif text-lg font-medium text-vert">{info.name}</p>
                  <p className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-serif text-[48px] font-light leading-none text-vert md:text-5xl">
                      {price}€
                    </span>
                    <span className="text-sm text-texte-sec">/ mois</span>
                  </p>
                  <p className="mt-4 text-[14px] leading-relaxed text-texte-sec">
                    {card.tagline}
                  </p>
                </div>
              </FadeInSection>
            )
          })}
        </div>

        <FadeInSection delay={0.3}>
          <div className="mt-14 flex justify-center md:mt-16">
            <HilmyButton variant="gold" withArrow href="/tarifs">
              Voir tous les détails et trouver ma formule
            </HilmyButton>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}
