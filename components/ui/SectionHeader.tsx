import { ReactNode } from 'react'
import { GoldLine } from './GoldLine'

interface SectionHeaderProps {
  number: string
  kicker: string
  title?: ReactNode
  align?: 'left' | 'center'
  theme?: 'light' | 'dark'
  className?: string
}

export function SectionHeader({
  number,
  kicker,
  title,
  align = 'left',
  theme = 'light',
  className = '',
}: SectionHeaderProps) {
  const alignClasses = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  const titleColor = theme === 'dark' ? 'text-creme' : 'text-vert'
  const labelJustify = align === 'center' ? 'justify-center' : 'justify-start'

  return (
    <div className={`flex flex-col gap-6 ${alignClasses} ${className}`}>
      <div className={`flex items-center gap-5 ${labelJustify}`}>
        <span className="font-serif font-light text-[44px] leading-none text-or">{number}</span>
        <GoldLine width={60} />
        <span className="overline text-or">{kicker}</span>
      </div>
      {title && (
        <h2 className={`font-serif font-light text-h1 ${titleColor}`}>
          {title}
        </h2>
      )}
    </div>
  )
}
