import Link from 'next/link'
import { ReactNode } from 'react'
import { GoldLine } from '@/components/ui/GoldLine'

interface EmptyStateProps {
  kicker?: string
  titre: string
  pitch: ReactNode
  ctaLabel?: string
  ctaHref?: string
  secondaryLabel?: string
  secondaryHref?: string
}

export function EmptyState({
  kicker,
  titre,
  pitch,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-sm border border-dashed border-or/30 bg-blanc px-6 py-16 text-center md:py-20">
      {kicker && (
        <div className="flex items-center gap-3">
          <GoldLine width={40} />
          <span className="overline text-or">{kicker}</span>
          <GoldLine width={40} />
        </div>
      )}
      <h3 className="font-serif text-3xl font-light text-vert md:text-[32px]">{titre}</h3>
      <p className="max-w-md text-[14px] leading-[1.65] text-texte-sec">{pitch}</p>
      {(ctaLabel || secondaryLabel) && (
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          {ctaLabel && ctaHref && (
            <Link
              href={ctaHref}
              className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-7 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
            >
              {ctaLabel}
              <span
                className="text-or-light transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          )}
          {secondaryLabel && secondaryHref && (
            <Link
              href={secondaryHref}
              className="text-[12px] text-texte-sec transition-colors hover:text-or"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
