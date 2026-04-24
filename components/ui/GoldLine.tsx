interface GoldLineProps {
  width?: number
  className?: string
}

export function GoldLine({ width = 40, className = '' }: GoldLineProps) {
  return (
    <span
      className={`block h-px bg-or ${className}`}
      style={{ width: `${width}px` }}
      aria-hidden="true"
    />
  )
}
