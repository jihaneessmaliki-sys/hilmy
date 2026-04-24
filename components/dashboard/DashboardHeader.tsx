import { ReactNode } from 'react'
import { GoldLine } from '@/components/ui/GoldLine'

interface DashboardHeaderProps {
  kicker: string
  titre: ReactNode
  lead?: ReactNode
  actions?: ReactNode
}

export function DashboardHeader({
  kicker,
  titre,
  lead,
  actions,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-or/10 px-6 py-10 md:flex-row md:items-end md:justify-between md:px-12 md:py-14">
      <div className="flex-1">
        <div className="flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">{kicker}</span>
        </div>
        <h1 className="mt-5 font-serif text-h1 font-light leading-[1.05] text-vert">
          {titre}
        </h1>
        {lead && (
          <p className="mt-4 max-w-2xl text-[14px] leading-[1.65] text-texte-sec">
            {lead}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}
