import { ReactNode } from 'react'
import { GoldLine } from '@/components/ui/GoldLine'

interface PageHeroProps {
  number: string
  kicker: string
  titre: ReactNode
  lead?: ReactNode
  children?: ReactNode
}

export function PageHero({ number, kicker, titre, lead, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-vert bg-grain pt-32 pb-16 md:pt-40 md:pb-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-10 h-[420px] w-[420px] rounded-full bg-or/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-container px-6 md:px-20">
        <div className="flex items-center gap-5">
          <span className="font-serif text-[44px] font-light leading-none text-or">
            {number}
          </span>
          <GoldLine width={60} />
          <span className="overline text-or">{kicker}</span>
        </div>
        <h1 className="mt-8 font-serif text-h1 font-light leading-[1.05] text-creme">
          {titre}
        </h1>
        {lead && (
          <p className="mt-6 max-w-2xl text-[15px] leading-[1.7] text-creme/75">{lead}</p>
        )}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  )
}
