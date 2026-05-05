'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GoldLine } from '@/components/ui/GoldLine'
import { CATEGORIES_MAP } from '@/lib/constants'
import { createDemandeAction } from '@/app/je-cherche/_actions'
import {
  JE_CHERCHE_CATEGORIES,
  JE_CHERCHE_COUNTRIES,
  type DemandeCategory,
  type DemandeCountry,
} from '@/lib/types/je-cherche'

const CATEGORY_LABELS: Record<DemandeCategory, string> = {
  beaute: CATEGORIES_MAP.beaute,
  'bien-etre': CATEGORIES_MAP['bien-etre'],
  'sante-mentale': CATEGORIES_MAP['sante-mentale'],
  'sport-nutrition': CATEGORIES_MAP['sport-nutrition'],
  'enfants-famille': CATEGORIES_MAP['enfants-famille'],
  maison: CATEGORIES_MAP.maison,
  cuisine: CATEGORIES_MAP.cuisine,
  evenementiel: CATEGORIES_MAP.evenementiel,
  'mode-style': CATEGORIES_MAP['mode-style'],
  'business-juridique': CATEGORIES_MAP['business-juridique'],
  'conseilleres-de-marque': CATEGORIES_MAP['conseilleres-de-marque'],
  autre: 'Autre',
}

const COUNTRY_LABELS: Record<DemandeCountry, string> = {
  CH: 'Suisse',
  FR: 'France',
  BE: 'Belgique',
  LU: 'Luxembourg',
  MC: 'Monaco',
}

interface Props {
  defaultCountry: DemandeCountry
  defaultCity: string
}

export function NouvelleDemandeForm({ defaultCountry, defaultCity }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<DemandeCategory>('autre')
  const [country, setCountry] = useState<DemandeCountry>(defaultCountry)
  const [canton, setCanton] = useState('')
  const [city, setCity] = useState(defaultCity)
  const [urgent, setUrgent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (trimmedTitle.length < 5) {
      setError('Le titre doit faire 5 caractères minimum.')
      return
    }
    if (trimmedTitle.length > 120) {
      setError('Le titre doit faire 120 caractères maximum.')
      return
    }
    if (trimmedContent.length < 10) {
      setError('Décris un peu plus (10 caractères minimum).')
      return
    }
    if (trimmedContent.length > 2000) {
      setError('Trop long (2000 caractères maximum).')
      return
    }

    startTransition(async () => {
      const result = await createDemandeAction({
        title: trimmedTitle,
        content: trimmedContent,
        category,
        country,
        canton: canton.trim() || null,
        city: city.trim() || null,
        urgency: urgent ? 'urgent' : 'normal',
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/je-cherche/${result.data.id}`)
    })
  }

  const isUrgent = urgent

  return (
    <article
      className={`rounded-sm p-6 md:p-10 transition-colors ${
        isUrgent
          ? 'border-2 border-[#D4847A] bg-[#D4847A]/5'
          : 'border border-or/15 bg-blanc'
      }`}
    >
      <Link
        href="/je-cherche"
        className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:text-or"
      >
        <span className="text-or" aria-hidden="true">←</span>
        Retour au feed
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <GoldLine width={40} />
        <span className="overline text-or">Demander à la team</span>
      </div>
      <h1 className="mt-3 font-serif text-[28px] font-light leading-tight text-vert md:text-[36px]">
        T&apos;as besoin de quoi&nbsp;?
      </h1>
      <p className="mt-2 text-[13px] text-texte-sec">
        On lit, on partage. Plus c&apos;est précis, mieux on t&apos;aide.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Titre */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-[0.22em] text-or uppercase">
            Tu cherches quoi&nbsp;?
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={5}
            maxLength={120}
            placeholder="Une décoratrice, un photographe, un coach…"
            className="border-b border-or/30 bg-transparent py-2 text-[16px] text-vert placeholder:text-texte-sec/50 focus:border-or focus:outline-none"
            aria-required="true"
          />
          {/* Helper : cadre la copine sur l'objet seul. Le préfixe "Cherche"
              est ajouté en display sur les cards (cf TeamCherche.tsx variant
              connected). Convention V1 : titre = juste l'objet, pas de phrase. */}
          <span className="text-[11px] italic text-texte-sec">
            Juste l&apos;essentiel — pas besoin d&apos;écrire «&nbsp;je cherche&nbsp;», on s&apos;en occupe.
          </span>
          <span className="text-[11px] text-texte-sec">
            {title.trim().length} / 120
          </span>
        </label>

        {/* Content */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-[0.22em] text-or uppercase">
            Raconte-nous
          </span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            minLength={10}
            maxLength={2000}
            rows={6}
            placeholder="Je cherche une ostéo douce, enceinte de 6 mois, plutôt à Lausanne ou alentours. Première grossesse, j'aimerais quelqu'un de patient…"
            className="resize-none rounded-sm border border-or/20 bg-creme-soft p-3 font-serif text-[14px] italic leading-[1.6] text-vert placeholder:not-italic placeholder:font-sans placeholder:text-texte-sec/60 focus:border-or focus:outline-none"
            aria-required="true"
          />
          <span className="text-[11px] text-texte-sec">
            {content.trim().length} / 2000
          </span>
        </label>

        {/* Catégorie */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-[0.22em] text-or uppercase">
            Catégorie
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DemandeCategory)}
            className="border-b border-or/30 bg-transparent py-2 text-[15px] text-vert focus:border-or focus:outline-none"
            aria-required="true"
          >
            {JE_CHERCHE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </label>

        {/* Pays + Canton + Ville */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-[0.22em] text-or uppercase">
              Pays
            </span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as DemandeCountry)}
              className="border-b border-or/30 bg-transparent py-2 text-[15px] text-vert focus:border-or focus:outline-none"
            >
              {JE_CHERCHE_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {COUNTRY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-[0.22em] text-or uppercase">
              Canton / Région (optionnel)
            </span>
            <input
              type="text"
              value={canton}
              onChange={(e) => setCanton(e.target.value)}
              maxLength={80}
              placeholder={country === 'CH' ? 'Vaud' : 'Île-de-France'}
              className="border-b border-or/30 bg-transparent py-2 text-[15px] text-vert placeholder:text-texte-sec/50 focus:border-or focus:outline-none"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-[0.22em] text-or uppercase">
            Ville (optionnel)
          </span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={120}
            placeholder="Lausanne"
            className="border-b border-or/30 bg-transparent py-2 text-[15px] text-vert placeholder:text-texte-sec/50 focus:border-or focus:outline-none"
          />
        </label>

        {/* Toggle urgent */}
        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-[#D4847A]/30 bg-blanc p-4 transition-colors hover:border-[#D4847A]/60">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#D4847A]"
          />
          <div>
            <p className="text-[14px] font-medium text-vert">C&apos;est urgent</p>
            <p className="mt-1 text-[12px] text-texte-sec">
              Ta demande remonte en haut du feed et apparaît avec un badge
              rose.
            </p>
          </div>
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[13px] text-red-900"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-vert px-6 text-[12px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark disabled:opacity-60"
        >
          {pending ? 'Envoi…' : 'Envoyer aux copines'}
          <span className="text-or-light" aria-hidden="true">→</span>
        </button>

        <p className="text-center text-[11px] text-texte-sec">
          Ta demande est publique. Reste copine, signale ce qui dérape.
        </p>
      </form>
    </article>
  )
}
