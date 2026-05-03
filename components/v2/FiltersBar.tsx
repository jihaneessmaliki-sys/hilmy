'use client'

interface Option {
  value: string
  label: string
}

interface FiltersBarProps {
  groups: {
    id: string
    label: string
    options: Option[]
    value: string
    onChange: (v: string) => void
  }[]
  resultCount?: number
  onReset?: () => void
  resetLabel?: string
}

export function FiltersBar({
  groups,
  resultCount,
  onReset,
  resetLabel = 'Tout réinitialiser',
}: FiltersBarProps) {
  const hasActive = groups.some((g) => g.value !== 'all')

  return (
    <div className="sticky top-20 z-30 border-b border-or/15 bg-creme/85 backdrop-blur">
      <div className="mx-auto max-w-container px-4 py-4 sm:px-6 sm:py-5 md:px-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:gap-x-6 md:gap-y-4">
            {groups.map((g) => (
              <FilterGroup key={g.id} {...g} />
            ))}
          </div>
          <div className="flex items-center gap-5 text-[11px]">
            {typeof resultCount === 'number' && (
              <span className="tracking-[0.22em] text-texte-sec uppercase">
                {resultCount} résultat{resultCount > 1 ? 's' : ''}
              </span>
            )}
            {hasActive && onReset && (
              <button
                type="button"
                onClick={onReset}
                className="min-h-[44px] py-2 text-vert underline-offset-4 hover:text-or hover:underline"
              >
                {resetLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: Option extends never
  ? never
  : {
      id: string
      label: string
      options: Option[]
      value: string
      onChange: (v: string) => void
    }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <span className="overline text-or">{label}</span>
      <div
        className="-mx-4 flex snap-x snap-mandatory items-center gap-1.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
        role="group"
        aria-label={label}
      >
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`min-h-[40px] shrink-0 snap-start rounded-full px-4 py-2 text-[12px] font-medium transition-all md:min-h-0 md:px-3.5 md:py-1.5 ${
                active
                  ? 'bg-vert text-creme'
                  : 'bg-blanc text-texte-sec hover:bg-creme-deep hover:text-vert'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
