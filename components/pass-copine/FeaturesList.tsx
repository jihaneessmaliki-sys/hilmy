import { Heart, Clock, Tag, Star, Mail, type LucideIcon } from 'lucide-react'

interface Feature {
  Icon: LucideIcon
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    Icon: Heart,
    title: 'Favoris illimités',
    description: 'Sauvegarde sans compter.',
  },
  {
    Icon: Clock,
    title: 'Accès anticipé aux Rendez-vous Hilmy',
    description: '48h avant tout le monde.',
  },
  {
    Icon: Tag,
    title: 'Coupons Cercle Pro',
    description: "Réductions chez les pros qu'on adore.",
  },
  {
    Icon: Star,
    title: 'Badge Copine',
    description: "Sur tes « Je cherche », tes réponses, ton profil.",
  },
  {
    Icon: Mail,
    title: 'Newsletter premium Sara',
    description: "Une fois par semaine au lieu d'une fois par mois.",
  },
]

export function FeaturesList() {
  return (
    <section className="bg-creme pb-20 md:pb-28">
      <div className="mx-auto max-w-4xl px-6 md:px-8">
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {FEATURES.map(({ Icon, title, description }) => (
            <li
              key={title}
              className="flex items-start gap-4 rounded-md bg-white p-6 md:p-7"
            >
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-creme text-or">
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-serif text-[18px] font-light leading-tight text-vert">
                  {title}
                </p>
                <p className="mt-1.5 text-[14px] leading-[1.6] text-texte-sec">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
