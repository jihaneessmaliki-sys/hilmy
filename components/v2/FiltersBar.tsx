'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

interface Option {
  value: string
  label: string
}

interface FilterGroupConfig {
  id: string
  label: string
  options: Option[]
  value: string
  onChange: (v: string) => void
  /**
   * 'chips' (défaut) : boutons pills horizontaux. Convient aux dimensions à
   * faible cardinalité (Catégorie, Pays).
   *
   * 'dropdown' : bouton déclencheur + popover avec champ de filtre texte et
   * liste scrollable. Convient aux longues listes (Ville) — ne déborde jamais
   * la page (max-height + scroll interne).
   */
  variant?: 'chips' | 'dropdown'
}

interface FiltersBarProps {
  groups: FilterGroupConfig[]
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
            {groups.map((g) =>
              g.variant === 'dropdown' ? (
                <FilterDropdown key={g.id} {...g} />
              ) : (
                <FilterChips key={g.id} {...g} />
              ),
            )}
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

function FilterChips({ label, options, value, onChange }: FilterGroupConfig) {
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

/** Normalise pour un filtre insensible casse + accents. */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

function FilterDropdown({ label, options, value, onChange }: FilterGroupConfig) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)
  const selectedLabel = selected?.label ?? options[0]?.label ?? ''
  const isActive = value !== 'all'

  const filtered = useMemo(() => {
    const q = normalise(query.trim())
    if (!q) return options
    return options.filter((o) => normalise(o.label).includes(q))
  }, [options, query])

  // Fermeture au clic extérieur + Échap.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Focus le champ de filtre à l'ouverture, reset la recherche à la fermeture.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
    setQuery('')
  }, [open])

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <span className="overline text-or">{label}</span>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex min-h-[40px] items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium transition-all md:min-h-0 md:px-3.5 md:py-1.5 ${
            isActive
              ? 'bg-vert text-creme'
              : 'bg-blanc text-texte-sec hover:bg-creme-deep hover:text-vert'
          }`}
        >
          <span className="max-w-[160px] truncate">{selectedLabel}</span>
          <span
            aria-hidden="true"
            className={`text-[9px] transition-transform ${open ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </button>

        {open && (
          <div
            className="absolute left-0 z-40 mt-2 w-[clamp(220px,80vw,280px)] overflow-hidden rounded-xl border border-or/25 bg-blanc shadow-[0_24px_60px_-30px_rgba(15,61,46,0.5)]"
            role="dialog"
            aria-label={`Filtrer par ${label.toLowerCase()}`}
          >
            <div className="border-b border-or/15 p-2">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Filtrer ${label.toLowerCase()}…`}
                aria-label={`Filtrer la liste ${label.toLowerCase()}`}
                aria-controls={listId}
                className="w-full rounded-lg bg-creme-soft px-3 py-2 text-[13px] text-vert outline-none placeholder:text-texte-sec/50 focus:ring-1 focus:ring-or/40"
              />
            </div>
            <ul
              id={listId}
              role="listbox"
              className="max-h-[260px] overflow-y-auto overscroll-contain py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-center text-[12px] text-texte-sec">
                  Aucune ville
                </li>
              ) : (
                filtered.map((opt) => {
                  const active = value === opt.value
                  return (
                    <li key={opt.value} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(opt.value)
                          setOpen(false)
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                          active
                            ? 'bg-creme-deep font-medium text-vert'
                            : 'text-texte-sec hover:bg-creme-soft hover:text-vert'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {active && (
                          <span aria-hidden="true" className="text-or">
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
