'use client'

import { useState } from 'react'
import {
  PRICING,
  DUREE_OPTIONS,
  DUREE_PERIODE,
  formatPrice,
  buildMailtoLieu,
  type Duree,
} from '../_lib/pricing'

const FEATURES = [
  'Fiche reco visible dans toute la team',
  'Photos illimitées',
  'Pastille « Sélection Hilmy »',
  'Mise en avant dans le feed',
  'Stats vues + saves',
  'Tap-to-contact tracé',
  'Mise en avant événements saisonniers',
]

export function LieuPricing() {
  const [duree, setDuree] = useState<Duree>(1)
  const price = PRICING.lieu[duree]
  const totalLine =
    price.t !== null
      ? `Soit ${price.t}€ ${DUREE_PERIODE[duree]}`.trim()
      : ''
  const mailto = buildMailtoLieu(duree)

  return (
    <div className="mx-auto max-w-[1200px] px-6 md:px-20">
      {/* Toggle durée */}
      <div className="mb-10 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Durée d'engagement Sélection Hilmy"
          className="inline-flex gap-0.5 rounded-full bg-creme p-1"
        >
          {DUREE_OPTIONS.map(({ value, label, discount }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={duree === value}
              onClick={() => setDuree(value)}
              className={`whitespace-nowrap rounded-full px-5 py-3 text-[13px] font-medium transition-all sm:px-5 ${
                duree === value ? 'bg-vert text-creme' : 'text-vert'
              }`}
            >
              {label}
              {discount > 0 ? (
                <span
                  className={`ml-1.5 text-[10px] font-semibold ${
                    duree === value ? 'text-or-light' : 'text-or'
                  }`}
                >
                  -{discount}%
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Lieu card */}
      <div className="mx-auto flex max-w-[520px] justify-center">
        <div className="w-full rounded-[32px] border-2 border-or bg-white p-12 md:p-12">
          <h3 className="font-serif text-[32px] font-light leading-tight text-vert">
            Sélection Hilmy
          </h3>
          <p className="mb-8 mt-1.5 font-serif text-sm italic text-texte-sec">
            Pour devenir une bonne adresse de la team.
          </p>

          <div className="mb-7 border-b border-vert/8 pb-7">
            <span className="font-serif text-[60px] font-light leading-none text-vert">
              {formatPrice(price.m)}
            </span>
            <span className="ml-1.5 text-sm text-texte-sec">/mois</span>
            <p className="mt-2 min-h-[18px] text-[13px] text-texte-sec">{totalLine}</p>
          </div>

          <ul className="mb-8 space-y-1.5">
            {FEATURES.map((f) => (
              <li key={f} className="relative pl-7 text-sm leading-relaxed text-vert">
                <span aria-hidden className="absolute left-0 top-1 font-semibold text-or">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>

          <a
            href={mailto}
            className="block w-full rounded-full bg-vert px-8 py-4 text-center text-[15px] font-medium text-creme transition-all hover:-translate-y-0.5 hover:bg-vert/90 hover:shadow-[0_8px_24px_rgba(15,61,46,0.18)]"
            aria-label={`Demander ma fiche Sélection Hilmy (${formatPrice(price.m)} par mois)`}
          >
            Je veux ma fiche
          </a>
        </div>
      </div>
    </div>
  )
}
