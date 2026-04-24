import type { ReactNode } from 'react'
import { Navigation } from '@/components/landing/Navigation'
import { FooterV2 } from '@/components/landing/FooterV2'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * Shell partagé des pages de contenu V2 (manifeste, comment ça marche,
 * charte, contact, legal). Navigation solid + hero éditorial crème + footer V2.
 *
 * Les pages peuvent être Server Components — Navigation et FooterV2 sont
 * "use client" mais importés comme enfants, ce qui est supporté par Next.
 */
export function ContentPageShell({
  kicker,
  titre,
  lead,
  children,
}: {
  kicker: string
  titre: ReactNode
  lead?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-creme text-texte">
      <Navigation variant="solid" />

      <header className="pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="flex items-center gap-4">
            <GoldLine width={48} />
            <span className="overline text-or">{kicker}</span>
          </div>
          <h1 className="mt-6 font-serif text-[clamp(2.25rem,5vw,4rem)] font-light leading-[1.05] text-vert">
            {titre}
          </h1>
          {lead && (
            <p className="mt-6 max-w-2xl font-serif text-[18px] italic leading-[1.55] text-texte md:text-[20px]">
              {lead}
            </p>
          )}
        </div>
      </header>

      <main className="pb-24 md:pb-32">
        <div className="mx-auto max-w-container px-6 md:px-20">{children}</div>
      </main>

      <FooterV2 />
    </div>
  )
}
