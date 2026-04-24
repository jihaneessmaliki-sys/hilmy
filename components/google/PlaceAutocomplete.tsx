'use client'

import { useEffect, useRef, useState } from 'react'

export type AutocompletePlace = {
  google_place_id: string
  name: string
  address: string
  city: string
  region: string
  country: string
  latitude: number
  longitude: number
  google_category: string | null
  google_category_label: string | null
  rating: number | null
  user_rating_count: number | null
}

interface Props {
  placeholder?: string
  onSelect: (place: AutocompletePlace) => void
  value?: string
  onChangeQuery?: (v: string) => void
}

export function PlaceAutocomplete({ placeholder, onSelect, value, onChangeQuery }: Props) {
  const [query, setQuery] = useState(value ?? '')
  const [results, setResults] = useState<AutocompletePlace[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value !== undefined) setQuery(value)
  }, [value])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleChange = (v: string) => {
    setQuery(v)
    onChangeQuery?.(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.trim().length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(v)}`)
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  const handlePick = (p: AutocompletePlace) => {
    setQuery(p.name)
    onChangeQuery?.(p.name)
    setOpen(false)
    onSelect(p)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => query.trim().length >= 3 && setOpen(true)}
        placeholder={placeholder ?? 'Tape le nom d\'un lieu…'}
        className="w-full rounded-sm border border-or/25 bg-blanc px-4 py-3 text-[15px] text-vert placeholder:text-texte-sec/60 focus:border-or focus:outline-none"
        autoComplete="off"
      />
      {loading && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] tracking-[0.22em] text-or uppercase">
          …
        </span>
      )}

      {open && (results.length > 0 || (query.length >= 3 && !loading)) && (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-sm border border-or/25 bg-blanc shadow-lg">
          {results.length > 0 ? (
            results.map((r) => (
              <button
                key={r.google_place_id}
                type="button"
                onClick={() => handlePick(r)}
                className="block w-full border-b border-or/10 px-4 py-3 text-left transition-colors last:border-0 hover:bg-creme-soft"
              >
                <span className="block font-serif text-[15px] text-vert">
                  {r.name}
                </span>
                <span className="mt-0.5 block text-[12px] text-texte-sec">
                  {r.address}
                </span>
                {r.rating !== null && r.user_rating_count ? (
                  <span className="mt-1 block text-[11px] tracking-[0.22em] text-or uppercase">
                    ★ {r.rating.toFixed(1)} · {r.user_rating_count} avis Google
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-4 py-4 text-center text-[12px] italic text-texte-sec">
              Aucun lieu trouvé. Essaie une autre orthographe.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
