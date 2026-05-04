'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { DemandeCategory } from '@/lib/types/je-cherche'

interface PillItem {
  slug: DemandeCategory | 'all'
  label: string
}

interface Props {
  items: PillItem[]
  activeCategory: DemandeCategory | null
  urgencyOnly: boolean
}

/**
 * Barre de filtres pills sticky pour /je-cherche.
 * Pattern repris de FiltersBar (annuaire) : scroll-snap horizontal mobile,
 * flex-wrap desktop, tactile 40px min.
 *
 * Utilise URLSearchParams pour pouvoir partager / bookmarker un filtre actif.
 */
export function FiltresPills({ items, activeCategory, urgencyOnly }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const buildHref = useCallback(
    (category: DemandeCategory | 'all', urgent: boolean) => {
      const sp = new URLSearchParams(params.toString())
      if (category === 'all') sp.delete('category')
      else sp.set('category', category)
      if (urgent) sp.set('urgent', '1')
      else sp.delete('urgent')
      const qs = sp.toString()
      return qs ? `/je-cherche?${qs}` : '/je-cherche'
    },
    [params],
  )

  const toggleUrgency = () => {
    router.push(buildHref(activeCategory ?? 'all', !urgencyOnly))
  }

  return (
    <div className="sticky top-20 z-30 border-b border-or/15 bg-creme/85 backdrop-blur">
      <div className="mx-auto max-w-container px-4 py-4 sm:px-6 md:px-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          {/* Pills catégories */}
          <div
            className="-mx-4 flex snap-x snap-mandatory items-center gap-1.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
            role="group"
            aria-label="Filtres par catégorie"
          >
            {items.map((it) => {
              const isActive =
                (it.slug === 'all' && activeCategory === null) ||
                (it.slug !== 'all' && it.slug === activeCategory)
              return (
                <Link
                  key={it.slug}
                  href={buildHref(it.slug, urgencyOnly)}
                  scroll={false}
                  className={`min-h-[40px] shrink-0 snap-start rounded-full px-4 py-2 text-[12px] font-medium transition-all md:min-h-0 md:px-3.5 md:py-1.5 ${
                    isActive
                      ? 'bg-vert text-creme'
                      : 'bg-blanc text-texte-sec hover:bg-creme-deep hover:text-vert'
                  }`}
                  aria-pressed={isActive}
                >
                  {it.label}
                </Link>
              )
            })}
          </div>

          {/* Toggle urgent */}
          <button
            type="button"
            onClick={toggleUrgency}
            aria-pressed={urgencyOnly}
            className={`inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full px-4 text-[11px] font-medium tracking-[0.18em] uppercase transition-all md:self-auto ${
              urgencyOnly
                ? 'bg-[#D4847A] text-blanc'
                : 'border border-[#D4847A]/40 bg-blanc text-[#A85C50] hover:bg-[#D4847A]/10'
            }`}
          >
            Urgent
            {urgencyOnly && <span aria-hidden="true">✕</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
