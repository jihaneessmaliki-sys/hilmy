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
      <div className="mx-auto max-w-container px-6 py-5 md:px-20">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
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
                className="text-vert underline-offset-4 hover:text-or hover:underline"
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
    <div className="flex items-center gap-3">
      <span className="overline text-or">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all ${
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
