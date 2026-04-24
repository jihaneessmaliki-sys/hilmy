import Link from 'next/link'
import { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'gold' | 'ghost'

interface ButtonProps {
  variant?: Variant
  children: ReactNode
  href?: string
  onClick?: () => void
  className?: string
  withArrow?: boolean
  type?: 'button' | 'submit'
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-vert text-creme hover:bg-vert-dark focus-visible:ring-vert',
  secondary:
    'bg-transparent border border-or-light/50 text-creme hover:border-or-light hover:bg-white/5 focus-visible:ring-or-light',
  gold:
    'bg-or text-vert hover:bg-or-light focus-visible:ring-or',
  ghost:
    'bg-transparent text-vert hover:text-or focus-visible:ring-vert px-0',
}

export function HilmyButton({
  variant = 'primary',
  children,
  href,
  onClick,
  className = '',
  withArrow = false,
  type = 'button',
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2.5 h-[58px] px-8 rounded-full text-[15px] font-medium font-sans transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'

  const classes = `${base} ${variantStyles[variant]} ${className}`

  const content = (
    <>
      {children}
      {withArrow && (
        <span
          className={`transition-transform duration-300 group-hover:translate-x-1 ${
            variant === 'gold' ? 'text-vert' : variant === 'primary' ? 'text-or-light' : ''
          }`}
          aria-hidden="true"
        >
          →
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`group ${classes}`}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} className={`group ${classes}`}>
      {content}
    </button>
  )
}
