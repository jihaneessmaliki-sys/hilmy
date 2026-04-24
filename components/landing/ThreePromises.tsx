import Link from 'next/link'
import Image from 'next/image'
import { Users, Heart, Calendar, type LucideIcon } from 'lucide-react'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { GoldLine } from '@/components/ui/GoldLine'

type Promise = {
  num: string
  icon: LucideIcon
  kicker: string
  title: string
  body: string
  cta: string
  href: string
  image: string
  imageAlt: string
  fallback: string
}

const promises: Promise[] = [
  {
    num: 'I',
    icon: Users,
    kicker: "L'ANNUAIRE",
    title: 'Des femmes vérifiées, par des femmes.',
    body: "Coiffeuses, avocates, photographes, nounous, thérapeutes. On vérifie chaque profil nous-mêmes, une par une. Zéro profil fake, zéro réponse automatique.",
    cta: "Voir l'annuaire",
    href: '/annuaire',
    image: '/images/promesse-annuaire.jpg',
    imageAlt: "Une femme pousse la porte d'une boutique de créatrice à Paris",
    fallback: '#D4C5B0',
  },
  {
    num: 'II',
    icon: Heart,
    kicker: 'LES RECOMMANDATIONS',
    title: 'Les adresses qui passent de main en main.',
    body: "Restos, boutiques, salons de thé, spas. Le bouche-à-oreille que tu n'as plus à chercher. Chaque adresse vient d'une vraie femme, qui l'aime vraiment.",
    cta: 'Découvrir les lieux',
    href: '/recommandations',
    image: '/images/promesse-recos.jpg',
    imageAlt: 'Une femme à la terrasse d\'un café parisien, téléphone avec HILMY à la main',
    fallback: '#EEE6D8',
  },
  {
    num: 'III',
    icon: Calendar,
    kicker: 'LES ÉVÉNEMENTS',
    title: 'Des moments à vivre ensemble.',
    body: "Brunchs, ateliers, book clubs, rencontres. Ce que tu aurais aimé faire, mais avec qui ? Ici, tu trouves tes copines-de-circonstance avant l'événement.",
    cta: 'Voir les événements',
    href: '/evenements-v2',
    image: '/images/promesse-evenements.jpg',
    imageAlt: 'Quatre femmes partagent un brunch dans un café chaleureux',
    fallback: '#B8C7B0',
  },
]

export function ThreePromises() {
  return (
    <section className="bg-creme py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <FadeInSection>
          <div className="mb-16 flex flex-col items-center text-center md:mb-20">
            <GoldLine width={40} />
            <h2 className="mt-6 max-w-3xl font-serif text-h2 font-light leading-[1.05] text-vert md:text-display">
              Les meilleures adresses,
              <br />
              <em className="italic text-or">entre copines.</em>
            </h2>
            <p className="mt-6 max-w-2xl text-[15px] leading-[1.7] text-texte-sec md:text-[16px]">
              Coiffeuse, pédiatre, resto du dimanche. Ce qu&apos;on se refile,
              enfin au même endroit.
            </p>
          </div>
        </FadeInSection>

        <div className="grid gap-6 md:grid-cols-3">
          {promises.map((p, i) => {
            const Icon = p.icon
            return (
            <FadeInSection key={p.num} delay={i * 0.15}>
              <article className="group flex h-full flex-col rounded-sm bg-blanc p-10 transition-all duration-500 hover:shadow-lg hover:-translate-y-1">
                <Icon
                  size={56}
                  strokeWidth={1.25}
                  className="text-or"
                  aria-hidden="true"
                />
                <div className="mt-4 flex items-center gap-3.5">
                  <span className="font-serif text-[24px] font-thin leading-none text-or">
                    {p.num}
                  </span>
                  <GoldLine width={40} />
                </div>
                <p className="mt-4 overline text-or">{p.kicker}</p>
                <div
                  className="relative mt-6 h-[240px] w-full overflow-hidden rounded-sm"
                  style={{ background: p.fallback }}
                >
                  <Image
                    src={p.image}
                    alt={p.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-vert/15 to-transparent"
                  />
                </div>
                <h3 className="mt-7 font-serif text-2xl font-light leading-snug text-vert">
                  {p.title}
                </h3>
                <p className="mt-4 text-[13px] leading-[1.7] text-texte-sec">{p.body}</p>
                <div className="mt-auto pt-8">
                  <Link
                    href={p.href}
                    className="group inline-flex items-center gap-2.5 text-[13px] font-medium text-vert hover:text-or transition-colors"
                  >
                    {p.cta}
                    <span
                      className="transition-transform group-hover:translate-x-1 text-or"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>
                </div>
              </article>
            </FadeInSection>
            )
          })}
        </div>
      </div>
    </section>
  )
}
