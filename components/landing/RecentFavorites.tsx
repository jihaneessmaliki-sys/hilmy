import Link from 'next/link'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { SectionHeader } from '@/components/ui/SectionHeader'

export function RecentFavorites() {
  return (
    <section className="bg-blanc py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <FadeInSection>
          <SectionHeader
            number="05"
            kicker="COUPS DE CŒUR"
            title="Les premières adresses arrivent."
            align="center"
            className="mb-6"
          />
          <p className="mx-auto max-w-xl text-center text-[14px] leading-[1.65] text-texte-sec">
            Pas de restos fantômes, pas de faux avis. Le carnet s&apos;écrit par vous,
            une adresse après l&apos;autre.
          </p>
        </FadeInSection>

        <FadeInSection delay={0.15}>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { num: '01', titre: 'Un resto', pitch: "Celui où tu vas depuis dix ans." },
              { num: '02', titre: 'Un salon', pitch: 'Celui qu&apos;on se recommande déjà.' },
              { num: '03', titre: 'Une boutique', pitch: 'Celle qui a changé ton dressing.' },
            ].map((c) => (
              <article
                key={c.num}
                className="flex h-full flex-col items-center rounded-sm border border-dashed border-or/30 bg-creme p-10 text-center transition-colors hover:border-or"
              >
                <span className="font-serif text-4xl font-light text-or/50">
                  {c.num}
                </span>
                <h3 className="mt-4 font-serif text-2xl font-light text-vert">
                  {c.titre}
                </h3>
                <p
                  className="mt-3 text-[13px] leading-[1.65] text-texte-sec"
                  dangerouslySetInnerHTML={{ __html: c.pitch }}
                />
              </article>
            ))}
          </div>
        </FadeInSection>

        <FadeInSection>
          <div className="mt-14 flex flex-col items-center gap-4 text-center">
            <Link
              href="/recommander"
              className="group inline-flex h-[56px] items-center gap-2.5 rounded-full bg-vert px-8 text-[11px] font-medium tracking-[0.28em] text-creme uppercase transition-all hover:bg-vert-dark"
            >
              Recommander la première
              <span
                className="text-or-light transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
            <span className="text-[11px] text-texte-sec">
              Gratuit, une minute, en voix Sara.
            </span>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}
