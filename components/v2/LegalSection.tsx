import { GoldLine } from '@/components/ui/GoldLine'
import type { ReactNode } from 'react'

/**
 * Section d'une page legal (CGU, mentions, confidentialité, cookies)
 * en charte V2. À utiliser dans ContentPageShell.
 */
export function LegalSection({
  numero,
  titre,
  children,
}: {
  numero?: string
  titre: string
  children: ReactNode
}) {
  return (
    <section>
      <div className="flex items-baseline gap-4">
        {numero ? (
          <span className="font-serif text-2xl italic text-or">{numero}</span>
        ) : (
          <GoldLine width={20} />
        )}
        <h2 className="font-serif text-[22px] font-light text-vert md:text-[26px]">
          {titre}
        </h2>
      </div>
      <div className="mt-4 space-y-3 text-[15px] leading-[1.8] text-texte">
        {children}
      </div>
    </section>
  )
}
