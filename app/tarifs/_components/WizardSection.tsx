'use client'

import { useEffect, useState } from 'react'
import {
  PRICING,
  PALIER_INFO,
  DUREE_OPTIONS,
  DUREE_PERIODE,
  formatPrice,
  buildMailtoPalier,
  type Palier,
  type Duree,
} from '../_lib/pricing'
import { createClient } from '@/lib/supabase/client'
import {
  applyDiscount,
  promoErrorMessage,
  validatePromoCode,
  type PromoCodeRow,
} from '@/lib/promo-codes'
import {
  PROMO_LANCEMENT_BADGE_LABEL,
  PROMO_LANCEMENT_PRICE_NOTE,
  applyPromoLancement,
  isPromoLancementActive,
} from '@/lib/promo-lancement'

type WizardKey = 'standard' | 'premium' | 'cercle_pro'

interface WizardSectionProps {
  /** Pré-selection venue de query params /tarifs?palier=... (deep-link mobile).
   *  Si défini, le wizard est sauté → on affiche directement le palier. */
  initialPalier?: Palier
  /** Code promo à appliquer automatiquement (deep-link mobile).
   *  Tente une validation Supabase au mount, comme si l'utilisatrice avait
   *  tapé le code à la main. */
  initialPromo?: string
}

const STEPS: {
  step: 1 | 2 | 3
  question: { before: string; em: string; after: string }
  hint: string
  options: { value: WizardKey; label: string; desc: string }[]
}[] = [
  {
    step: 1,
    question: { before: 'Où tu en es ', em: "aujourd'hui", after: ' ?' },
    hint: 'Pas de jugement, juste pour bien te conseiller.',
    options: [
      {
        value: 'standard',
        label: 'Je démarre',
        desc: 'Premiers pas, je teste, je découvre ma clientèle.',
      },
      {
        value: 'premium',
        label: 'Je suis lancée',
        desc: "J'ai une clientèle régulière, je veux développer.",
      },
      {
        value: 'cercle_pro',
        label: 'Je veux passer un cap',
        desc: "Pratique installée, j'investis pour exploser.",
      },
    ],
  },
  {
    step: 2,
    question: { before: 'Combien de ', em: 'photos', after: ' pour montrer ton univers ?' },
    hint: "Ton métier se voit autant qu'il s'explique.",
    options: [
      {
        value: 'standard',
        label: '5 me suffisent',
        desc: "L'essentiel : portrait, lieu, quelques moments.",
      },
      {
        value: 'premium',
        label: 'Une vingtaine',
        desc: 'Je veux raconter, montrer mes prestations en détail.',
      },
      {
        value: 'cercle_pro',
        label: 'Sans limite, vidéo aussi',
        desc: 'Mon univers est riche, je veux tout montrer.',
      },
    ],
  },
  {
    step: 3,
    question: { before: 'Tu veux ', em: 'voir tes stats', after: ' ?' },
    hint: 'Pour piloter ce qui marche, pas pour stresser.',
    options: [
      {
        value: 'standard',
        label: 'Le total des vues me suffit',
        desc: "J'ai pas besoin de chiffres précis pour l'instant.",
      },
      {
        value: 'premium',
        label: 'Stats hebdo',
        desc: 'Vues, contacts, ce qui marche. Toutes les semaines.',
      },
      {
        value: 'cercle_pro',
        label: 'Stats avancées + boost',
        desc: "Géo, horaires, et coup d'accélérateur quand je veux.",
      },
    ],
  },
]

const PALIER_PRICES_LABEL: Record<Palier, string> = {
  standard: '19€/mois',
  premium: '49€/mois',
  cercle_pro: '99€/mois',
}

function computeReco(answers: Record<number, WizardKey>): Palier {
  const score: Record<WizardKey, number> = { standard: 0, premium: 0, cercle_pro: 0 }
  for (const v of Object.values(answers)) score[v] += 1
  const entries = Object.entries(score) as [WizardKey, number][]
  let best: WizardKey = 'premium'
  let max = -1
  for (const [k, v] of entries) {
    if (v > max) {
      max = v
      best = k
    }
  }
  return best
}

export function WizardSection({ initialPalier, initialPromo }: WizardSectionProps = {}) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [answers, setAnswers] = useState<Record<number, WizardKey>>({})
  // Si un palier vient du deep-link, on saute le wizard et on affiche
  // directement le résultat avec ce palier pré-selectionné.
  const [showResult, setShowResult] = useState(!!initialPalier)
  const [palier, setPalier] = useState<Palier>(initialPalier ?? 'premium')
  const [duree, setDuree] = useState<Duree>(1)

  // Code promo (validation Supabase + recalcul prix)
  const [promoInput, setPromoInput] = useState((initialPromo ?? '').toUpperCase())
  const [promoStatus, setPromoStatus] = useState<
    'idle' | 'checking' | 'valid' | 'invalid'
  >('idle')
  const [promoMessage, setPromoMessage] = useState<string | null>(null)
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeRow | null>(null)
  // Toast léger après auto-application du code promo (deep-link mobile).
  const [promoToast, setPromoToast] = useState<string | null>(null)

  // Reset le code si l'utilisatrice change de palier (le code peut ne plus être éligible)
  useEffect(() => {
    if (!appliedPromo) return
    const check = validatePromoCode(appliedPromo, palier)
    if (!check.ok) {
      setAppliedPromo(null)
      setPromoStatus('invalid')
      setPromoMessage(
        promoErrorMessage(check.reason, PALIER_INFO[palier].name),
      )
    }
  }, [palier, appliedPromo])

  const handleApplyPromo = async () => {
    const trimmed = promoInput.trim()
    if (!trimmed) return
    setPromoStatus('checking')
    setPromoMessage(null)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('promo_codes')
        .select('id, code, discount_pct, applies_to_palier, valid_from, valid_until, max_uses, current_uses, active')
        .ilike('code', trimmed)
        .maybeSingle()

      const result = validatePromoCode(data as PromoCodeRow | null, palier)
      if (result.ok) {
        setAppliedPromo(result.code)
        setPromoStatus('valid')
        setPromoMessage(
          `Code «${result.code.code}» appliqué : -${result.code.discount_pct}%.`,
        )
      } else {
        setAppliedPromo(null)
        setPromoStatus('invalid')
        setPromoMessage(
          promoErrorMessage(result.reason, PALIER_INFO[palier].name),
        )
      }
    } catch {
      setAppliedPromo(null)
      setPromoStatus('invalid')
      setPromoMessage('Petit pépin réseau. Réessaie dans un instant.')
    }
  }

  // Auto-scroll vers le résultat + auto-apply du code promo si l'arrivée
  // est un deep-link mobile (?palier=…&promo=…). Une seule fois au mount
  // (les deps initialPalier/initialPromo ne bougent pas — viennent de
  // searchParams server-side).
  useEffect(() => {
    if (initialPalier) {
      // Petit délai pour laisser le rendu poser le DOM avant le scroll.
      setTimeout(() => {
        document
          .getElementById('reco-result')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
    if (initialPromo && initialPromo.trim().length > 0) {
      // Auto-apply : utilise le state du composant. handleApplyPromo lit
      // promoInput qui a été initialisé avec initialPromo.
      ;(async () => {
        await handleApplyPromo()
        setPromoToast(
          `Code promo ${initialPromo.toUpperCase()} appliqué — c'est offert.`,
        )
        setTimeout(() => setPromoToast(null), 4000)
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClearPromo = () => {
    setAppliedPromo(null)
    setPromoInput('')
    setPromoStatus('idle')
    setPromoMessage(null)
  }

  const handleSelect = (step: 1 | 2 | 3, value: WizardKey) => {
    const nextAnswers = { ...answers, [step]: value }
    setAnswers(nextAnswers)
    setTimeout(() => {
      if (step < 3) {
        setCurrentStep((step + 1) as 1 | 2 | 3)
      } else {
        const reco = computeReco(nextAnswers)
        setPalier(reco)
        setShowResult(true)
        setTimeout(() => {
          document
            .getElementById('reco-result')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 80)
      }
    }, 300)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as 1 | 2 | 3)
  }

  const handleReset = () => {
    setAnswers({})
    setShowResult(false)
    setCurrentStep(1)
    setTimeout(() => {
      document
        .getElementById('wizard')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const info = PALIER_INFO[palier]
  const price = PRICING[palier][duree]
  const discountPct = appliedPromo?.discount_pct ?? 0
  const monthlyAfterDiscount = applyDiscount(price.m, discountPct)
  const totalAfterDiscount =
    price.t !== null ? applyDiscount(price.t, discountPct) : null

  // Promo lancement -50% : exclusive avec un code copine saisi (la promo
  // lancement coupe l'affichage du champ code). Quand active, on remplace
  // le prix affiché par le prix -50% et on barre l'original.
  const promoLancActive = isPromoLancementActive() && !appliedPromo
  const lancMonthly = promoLancActive ? applyPromoLancement(price.m) : price.m
  const lancTotal =
    promoLancActive && price.t !== null
      ? applyPromoLancement(price.t)
      : price.t

  const totalLine = appliedPromo
    ? totalAfterDiscount !== null
      ? `Soit ${formatPrice(totalAfterDiscount)} ${DUREE_PERIODE[duree]}`.trim()
      : ''
    : lancTotal !== null
      ? `Soit ${formatPrice(lancTotal)} ${DUREE_PERIODE[duree]}`.trim()
      : ''

  const mailto = buildMailtoPalier(palier, duree, appliedPromo?.code ?? null)

  return (
    <div className="mx-auto max-w-[1200px] px-6 md:px-20">
      {/* Toast léger après auto-apply code promo deep-link */}
      {promoToast ? (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto mb-6 max-w-[480px] rounded-2xl border border-or bg-or/10 px-5 py-3 text-center text-[13px] font-medium text-vert"
        >
          {promoToast}
        </div>
      ) : null}

      {/* Keyframes pulse border (highlight card si deep-link palier) */}
      <style jsx global>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 24px 60px rgba(15, 61, 46, 0.2); }
          50% { box-shadow: 0 0 0 6px rgba(201, 169, 97, 0.45), 0 24px 60px rgba(15, 61, 46, 0.2); }
        }
      `}</style>

      {/* Wizard Card */}
      <div className="mx-auto max-w-[760px] rounded-[32px] bg-white p-10 shadow-[0_24px_60px_rgba(15,61,46,0.06)] md:p-14">
        {/* Progress dots */}
        <div className="mb-10 flex justify-center gap-2">
          {[1, 2, 3].map((n) => {
            const isActive = n === currentStep
            const isDone = n < currentStep
            return (
              <span
                key={n}
                aria-hidden
                className={`h-1 w-8 rounded-sm transition-all duration-300 ${
                  isDone
                    ? 'bg-vert'
                    : isActive
                      ? 'bg-or'
                      : 'bg-creme-deep'
                }`}
              />
            )
          })}
        </div>

        {STEPS.map(({ step, question, hint, options }) => (
          <div
            key={step}
            className={step === currentStep ? 'block' : 'hidden'}
            role="group"
            aria-label={`Étape ${step} sur 3`}
          >
            <h3 className="text-center font-serif text-[32px] font-light leading-tight">
              {question.before}
              <em className="font-normal not-italic text-or italic">{question.em}</em>
              {question.after}
            </h3>
            <p className="mb-10 mt-2 text-center text-sm text-texte-sec">{hint}</p>

            <div className="grid gap-3">
              {options.map((opt) => {
                const selected = answers[step] === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(step, opt.value)}
                    aria-label={`${opt.label} — ${opt.desc}`}
                    aria-pressed={selected}
                    className={`group flex w-full items-center justify-between gap-4 rounded-2xl border px-6 py-5 text-left transition-all duration-200 ${
                      selected
                        ? 'border-vert bg-vert text-creme'
                        : 'border-transparent bg-creme hover:-translate-y-0.5 hover:border-or hover:bg-white'
                    }`}
                  >
                    <span>
                      <span className="block text-[15px] font-medium">{opt.label}</span>
                      <span
                        className={`mt-1 block text-[13px] ${
                          selected ? 'text-or-light' : 'text-texte-sec'
                        }`}
                      >
                        {opt.desc}
                      </span>
                    </span>
                    <span aria-hidden>→</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Étape précédente"
            className={`border-b border-vert pb-1 pt-2 font-medium text-vert transition-colors hover:border-or hover:text-or ${
              currentStep > 1 ? 'visible' : 'invisible'
            }`}
          >
            ← Précédent
          </button>
          <span className="text-xs text-texte-sec" aria-live="polite">
            {currentStep}/3
          </span>
        </div>
      </div>

      {/* Reco result */}
      {showResult ? (
        <div id="reco-result" className="mt-20 animate-[fadeIn_.4s_ease]">
          <div className="mx-auto mb-12 max-w-[680px] text-center">
            <span className="mb-5 inline-block text-xs font-medium uppercase tracking-[.28em] text-or">
              Notre reco pour toi
            </span>
            <h2 className="font-serif text-[clamp(32px,4.5vw,44px)] font-light leading-tight tracking-tight">
              Pour où tu en es, c'est{' '}
              <em className="not-italic italic text-or">{info.name}</em>.
            </h2>
            <p className="mx-auto mt-4 max-w-[540px] text-[17px] text-texte-sec">
              {info.detail}
            </p>
          </div>

          {/* Toggle durée */}
          <div className="mb-10 flex justify-center">
            <div
              role="radiogroup"
              aria-label="Durée d'engagement"
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

          {/* Card + explanation */}
          <div className="mx-auto grid max-w-[1000px] grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div
              className={`relative rounded-[32px] border-2 border-or bg-vert p-12 text-creme shadow-[0_24px_60px_rgba(15,61,46,0.2)] ${
                promoLancActive ? 'mt-10' : ''
              } ${
                initialPalier ? 'animate-[pulse-border_2s_ease-out_1]' : ''
              }`}
            >
              {promoLancActive ? (
                <span className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-creme px-5 py-2 text-[11px] font-semibold uppercase tracking-[.18em] text-or shadow-[0_4px_12px_rgba(15,61,46,0.08)]">
                  {PROMO_LANCEMENT_BADGE_LABEL}
                </span>
              ) : null}
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-or px-4 py-2 text-[11px] font-semibold uppercase tracking-[.18em] text-vert">
                Pour toi
              </span>
              <h3 className="font-serif text-4xl font-light text-creme">{info.name}</h3>
              <p className="mb-8 mt-1 font-serif text-sm italic text-or-light">
                {info.tagline}
              </p>
              <div className="mb-7 border-b border-or/25 pb-7">
                {appliedPromo ? (
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-[60px] font-light leading-none text-creme">
                      {formatPrice(monthlyAfterDiscount)}
                    </span>
                    <span className="text-sm text-or-light line-through opacity-70">
                      {formatPrice(price.m)}
                    </span>
                    <span className="ml-1.5 text-sm text-or-light">/mois</span>
                  </div>
                ) : promoLancActive ? (
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-[60px] font-light leading-none text-creme">
                      {formatPrice(lancMonthly)}
                    </span>
                    <span className="text-sm text-or-light line-through opacity-70">
                      {formatPrice(price.m)}
                    </span>
                    <span className="ml-1.5 text-sm text-or-light">/mois</span>
                  </div>
                ) : (
                  <>
                    <span className="font-serif text-[60px] font-light leading-none text-creme">
                      {formatPrice(price.m)}
                    </span>
                    <span className="ml-1.5 text-sm text-or-light">/mois</span>
                  </>
                )}
                <p className="mt-2 min-h-[18px] text-[13px] text-or-light">
                  {totalLine}
                </p>
                {appliedPromo && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-or/15 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-or uppercase">
                    <span aria-hidden>✓</span>
                    Code «{appliedPromo.code}» −{appliedPromo.discount_pct}%
                  </p>
                )}
                {promoLancActive && (
                  <p className="mt-2 text-[11px] italic text-or-light/80">
                    {PROMO_LANCEMENT_PRICE_NOTE}
                  </p>
                )}
              </div>
              <ul className="mb-8 space-y-1.5">
                {info.features.map((f) => (
                  <li key={f} className="relative pl-7 text-sm leading-relaxed text-creme/90">
                    <span aria-hidden className="absolute left-0 top-1 font-semibold text-or">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {/* Champ code promo "J'ai un code copine" — masqué pendant la
                   promo lancement -50% (la remise est déjà appliquée pour
                   tout le monde, pas de stacking). */}
              <div className="mb-5">
                {promoLancActive ? null : !appliedPromo ? (
                  <details className="group">
                    <summary className="cursor-pointer list-none text-[12px] font-medium text-or-light transition-colors hover:text-or">
                      <span className="border-b border-or-light/40 pb-0.5 group-open:hidden">
                        + J&apos;ai un code copine
                      </span>
                      <span className="hidden border-b border-or-light/40 pb-0.5 group-open:inline">
                        − Masquer le champ
                      </span>
                    </summary>
                    <div className="mt-3 flex gap-2">
                      <label className="sr-only" htmlFor="promo-input">
                        Code copine
                      </label>
                      <input
                        id="promo-input"
                        type="text"
                        autoCapitalize="characters"
                        spellCheck={false}
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="TON CODE"
                        disabled={promoStatus === 'checking'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleApplyPromo()
                          }
                        }}
                        className="flex-1 rounded-full border border-or/30 bg-vert-dark/40 px-4 py-2.5 text-[13px] uppercase tracking-[0.12em] text-creme placeholder:text-creme/40 placeholder:tracking-[0.18em] focus:border-or focus:outline-none focus:ring-1 focus:ring-or"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={
                          promoStatus === 'checking' || promoInput.trim() === ''
                        }
                        className="rounded-full border border-or px-4 py-2.5 text-[11px] font-medium tracking-[0.22em] text-or uppercase transition-all hover:bg-or hover:text-vert disabled:opacity-50"
                      >
                        {promoStatus === 'checking' ? 'Vérif…' : 'Appliquer'}
                      </button>
                    </div>
                    {promoMessage && (
                      <p
                        role="status"
                        aria-live="polite"
                        className={`mt-2 text-[12px] ${
                          promoStatus === 'invalid'
                            ? 'text-red-200'
                            : 'text-or-light'
                        }`}
                      >
                        {promoMessage}
                      </p>
                    )}
                  </details>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-full border border-or/40 bg-or/10 px-4 py-2.5">
                    <span className="text-[12px] text-or-light">
                      ✓ {promoMessage}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearPromo}
                      className="text-[11px] tracking-[0.22em] text-or-light/80 uppercase transition-colors hover:text-or"
                    >
                      Retirer
                    </button>
                  </div>
                )}
              </div>

              <a
                href={mailto}
                className="block w-full rounded-full bg-or px-8 py-4 text-center text-[15px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)]"
                aria-label={`Choisir la formule ${info.name} (${formatPrice(
                  appliedPromo ? monthlyAfterDiscount : lancMonthly,
                )} par mois)`}
              >
                Je choisis cette formule
              </a>
            </div>

            <div>
              <h4 className="mb-4 font-serif text-[22px] font-normal leading-tight text-vert">
                Pourquoi cette formule ?
              </h4>
              <p className="mb-6 text-[15px] leading-relaxed text-texte-sec">
                {info.detail}
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="border-b border-vert pb-1 pt-2 text-sm font-medium text-vert transition-colors hover:border-or hover:text-or"
              >
                ↻ Recommencer le test
              </button>

              <div className="mt-6 flex flex-col">
                {(['standard', 'premium', 'cercle_pro'] as Palier[]).map((p) => {
                  const monthly = PRICING[p][1].m
                  const monthlyLanc = applyPromoLancement(monthly)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPalier(p)}
                      className="flex cursor-pointer justify-between border-t border-vert/8 py-3.5 text-[13px] text-texte-sec transition-colors hover:text-vert"
                    >
                      <span>Voir {PALIER_INFO[p].name}</span>
                      {promoLancActive ? (
                        <span className="flex items-baseline gap-2 font-medium text-vert">
                          <span>{formatPrice(monthlyLanc)}/mois</span>
                          <span className="text-[11px] text-texte-sec line-through">
                            {formatPrice(monthly)}
                          </span>
                        </span>
                      ) : (
                        <span className="font-medium text-vert">
                          {PALIER_PRICES_LABEL[p]}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
