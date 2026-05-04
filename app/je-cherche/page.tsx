import Link from 'next/link'
import type { Metadata } from 'next'
import { PageShell } from '@/components/v2/PageShell'
import { GoldLine } from '@/components/ui/GoldLine'
import { DemandeCard } from '@/components/je-cherche/DemandeCard'
import { FiltresPills } from './_components/FiltresPills'
import { getDemandesFeed } from '@/lib/supabase/je-cherche'
import { CATEGORIES_MAP } from '@/lib/constants'
import type {
  DemandeCategory,
  DemandeFilters,
} from '@/lib/types/je-cherche'

export const dynamic = 'force-dynamic' // SSR pour SEO + fraîcheur du feed

export const metadata: Metadata = {
  title: 'Je cherche… — Hilmy',
  description:
    "Le feed des copines : demande à la team, elle a forcément l'adresse. Recommandations entre femmes en Suisse, France, Belgique, Luxembourg et Monaco.",
  openGraph: {
    title: 'Je cherche… — Hilmy',
    description:
      "Le feed des copines : demande à la team, elle a forcément l'adresse.",
    type: 'website',
  },
}

const VALID_CATEGORIES = new Set<DemandeCategory>([
  'beaute',
  'bien-etre',
  'sante-mentale',
  'sport-nutrition',
  'enfants-famille',
  'maison',
  'cuisine',
  'evenementiel',
  'mode-style',
  'business-juridique',
  'conseilleres-de-marque',
  'autre',
])

interface SearchParams {
  category?: string
  urgent?: string
}

export default async function JeCherchePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const category =
    sp.category && VALID_CATEGORIES.has(sp.category as DemandeCategory)
      ? (sp.category as DemandeCategory)
      : null
  const urgencyOnly = sp.urgent === '1'

  const filters: DemandeFilters = { category, urgencyOnly }
  const result = await getDemandesFeed(filters, { limit: 24 })
  const items = result.ok ? result.data.items : []
  const error = result.ok ? null : result.error

  // Catégories proposées dans la barre filtres (ordre business : santé en premier
  // pour matcher l'urgence souvent ressentie par les copines).
  const orderedCategories: { slug: DemandeCategory | 'all'; label: string }[] = [
    { slug: 'all', label: 'Toutes' },
    { slug: 'sante-mentale', label: CATEGORIES_MAP['sante-mentale'] },
    { slug: 'beaute', label: CATEGORIES_MAP.beaute },
    { slug: 'enfants-famille', label: CATEGORIES_MAP['enfants-famille'] },
    { slug: 'bien-etre', label: CATEGORIES_MAP['bien-etre'] },
    { slug: 'cuisine', label: CATEGORIES_MAP.cuisine },
    { slug: 'maison', label: CATEGORIES_MAP.maison },
    { slug: 'business-juridique', label: CATEGORIES_MAP['business-juridique'] },
    { slug: 'mode-style', label: CATEGORIES_MAP['mode-style'] },
    { slug: 'evenementiel', label: CATEGORIES_MAP.evenementiel },
    { slug: 'sport-nutrition', label: CATEGORIES_MAP['sport-nutrition'] },
    { slug: 'conseilleres-de-marque', label: CATEGORIES_MAP['conseilleres-de-marque'] },
    { slug: 'autre', label: 'Autre' },
  ]

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-vert bg-grain pt-28 pb-10 sm:pt-32 sm:pb-14 md:pt-40 md:pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-10 h-[420px] w-[420px] rounded-full bg-or/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-container px-4 sm:px-6 md:px-20">
          <div className="flex items-center gap-3 sm:gap-5">
            <GoldLine width={60} />
            <span className="overline text-or">Le feed des copines</span>
          </div>
          <h1 className="mt-6 font-serif text-[clamp(2.5rem,5.5vw,4rem)] font-light leading-[1.05] text-creme">
            Je cherche
            <span className="italic text-or">…</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-[1.7] text-creme/75">
            Demande à la team, elle a forcément l&apos;adresse. Pas un annuaire,
            pas un forum — juste les copines qui se passent leurs bons plans.
          </p>
        </div>
      </section>

      {/* Filtres pills (sticky) */}
      <FiltresPills
        items={orderedCategories}
        activeCategory={category}
        urgencyOnly={urgencyOnly}
      />

      {/* Feed */}
      <section className="px-4 py-10 sm:px-6 sm:py-14 md:px-20 md:py-16">
        <div className="mx-auto max-w-container">
          {error ? (
            <div className="rounded-sm border border-red-900/20 bg-red-900/5 p-6 text-center">
              <p className="font-serif text-lg text-red-900">
                Petit pépin pour charger le feed.
              </p>
              <p className="mt-2 text-[13px] text-texte-sec">{error}</p>
              <Link
                href="/je-cherche"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-creme-deep"
              >
                Réessayer
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-sm border border-dashed border-or/30 bg-blanc py-20 text-center">
              <p className="font-serif text-2xl font-light text-vert">
                Personne n&apos;a encore demandé.
              </p>
              <p className="mt-3 text-[14px] leading-[1.7] text-texte-sec">
                Lance le mouvement.
              </p>
              <Link
                href="/je-cherche/nouvelle"
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-vert px-7 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
              >
                + Demander à la team
                <span className="text-or-light" aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2">
              {items.map((d) => (
                <li key={d.id}>
                  <DemandeCard demande={d} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* FAB sticky bottom centré */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        <Link
          href="/je-cherche/nouvelle"
          className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-vert px-6 text-[12px] font-medium tracking-[0.22em] text-creme uppercase shadow-[0_12px_32px_-8px_rgba(15,61,46,0.45)] transition-all hover:-translate-y-0.5 hover:bg-vert-dark"
        >
          + Demander à la team
          <span className="text-or-light" aria-hidden="true">→</span>
        </Link>
      </div>
    </PageShell>
  )
}
