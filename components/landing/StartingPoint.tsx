import { FadeInSection } from '@/components/ui/FadeInSection'
import { SectionHeader } from '@/components/ui/SectionHeader'

export function StartingPoint() {
  return (
    <section className="bg-blanc py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <FadeInSection>
          <div className="grid gap-12 md:grid-cols-2 md:gap-20">
            <SectionHeader
              number="01"
              kicker="LE POINT DE DÉPART"
              title={
                <>
                  Tu sais exactement
                  <br />
                  de quoi on parle.
                </>
              }
            />
            <div className="space-y-5 md:pt-20">
              <p className="text-[15px] leading-[1.7] text-texte">
                Cette fois où tu as scrollé une heure sur Instagram pour trouver une coiffeuse qui
                connaît tes cheveux. Cette fois où tu as harcelé trois groupes WhatsApp pour un resto
                sympa pour ton anniv. Cette fois où tu voulais juste une avocate de confiance, sans
                y passer ton dimanche.
              </p>
              <p className="text-[15px] leading-[1.7] font-medium text-or">
                Nous aussi. C'est pour ça qu'on a créé Hilmy.
              </p>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}
