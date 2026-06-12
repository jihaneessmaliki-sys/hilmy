'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Barre de recherche du hero — aiguilleur de destination (Lot A · A2-a).
 * Les chips SÉLECTIONNENT une destination ; la navigation se fait au submit
 * (Enter ou loupe), en passant terme + catégorie dans l'URL. Exception :
 * la chip Événements navigue IMMÉDIATEMENT (la page events ne lit pas ?q=,
 * cf. backlog A2-a-bis), donc pas de submit qui jetterait le terme.
 */
type Chip = {
  id: string
  label: string
  dest: string
  categorie?: string
  placeholder: string
  /** Navigation immédiate au clic (pas de sélection ni de submit). */
  immediate?: boolean
}

const CHIPS: Chip[] = [
  {
    id: 'prestataires',
    label: 'Prestataires',
    dest: '/annuaire',
    placeholder: 'Cherche une coiffeuse, une thérapeute…',
  },
  {
    id: 'restos',
    label: 'Restos & Cafés',
    dest: '/recommandations',
    categorie: 'restos-cafes',
    placeholder: 'Cherche un resto, un café…',
  },
  {
    id: 'boutiques',
    label: 'Boutiques',
    dest: '/recommandations',
    categorie: 'boutiques',
    placeholder: 'Cherche une boutique…',
  },
  {
    id: 'bien-etre',
    label: 'Bien-être',
    dest: '/recommandations',
    categorie: 'bien-etre',
    placeholder: 'Cherche un spa, un soin…',
  },
  {
    id: 'evenements',
    label: 'Événements',
    dest: '/evenements-v2',
    placeholder: 'Parcourir les événements…',
    immediate: true,
  },
]

export function HeroSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState('prestataires')
  const [query, setQuery] = useState('')

  const active = CHIPS.find((c) => c.id === selected) ?? CHIPS[0]

  function handleChip(chip: Chip) {
    if (chip.immediate) {
      router.push(chip.dest)
      return
    }
    setSelected(chip.id)
    inputRef.current?.focus()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (active.categorie) params.set('categorie', active.categorie)
    const q = query.trim()
    if (q) params.set('q', q)
    const qs = params.toString()
    router.push(qs ? `${active.dest}?${qs}` : active.dest)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      {/* Chips d'aiguillage */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {CHIPS.map((chip) => {
          const isActive = !chip.immediate && chip.id === selected
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleChip(chip)}
              aria-pressed={isActive}
              className={
                isActive
                  ? 'rounded-full border border-or bg-or px-4 py-1.5 text-[12px] font-medium tracking-[0.04em] text-vert transition-colors'
                  : 'rounded-full border border-creme/30 bg-white/5 px-4 py-1.5 text-[12px] tracking-[0.04em] text-creme/80 transition-colors hover:border-or/60 hover:text-creme'
              }
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Champ + bouton */}
      <div className="flex items-center gap-2 rounded-full bg-creme/95 py-1.5 pl-5 pr-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] ring-1 ring-or/20">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={active.placeholder}
          aria-label="Rechercher une adresse"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-vert outline-none placeholder:text-texte-sec/50"
        />
        <button
          type="submit"
          aria-label="Rechercher"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-or text-vert transition-colors hover:bg-or-light"
        >
          <span aria-hidden="true" className="text-lg">
            →
          </span>
        </button>
      </div>
    </form>
  )
}
