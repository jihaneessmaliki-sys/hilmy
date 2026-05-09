'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PageShell } from '@/components/v2/PageShell'
import { PageHero } from '@/components/v2/PageHero'
import { FiltersBar } from '@/components/v2/FiltersBar'
import { EvenementCard } from '@/components/v2/EvenementCard'
import {
  SkeletonListGrid,
  LiveErrorState,
  LiveEmptyState,
} from '@/components/v2/LiveStates'
import {
  villesSuggestions,
  type Evenement as MockEvenement,
} from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/client'
import type { HilmyEvent } from '@/lib/supabase/types'

const MOIS_COURTS = [
  'janv',
  'févr',
  'mars',
  'avril',
  'mai',
  'juin',
  'juil',
  'août',
  'sept',
  'oct',
  'nov',
  'déc',
]

function formatDateFr(iso: string) {
  const d = new Date(iso)
  const jour = String(d.getDate()).padStart(2, '0')
  const mois = MOIS_COURTS[d.getMonth()]
  const annee = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${jour} ${mois} ${annee} · ${h}h${m}`
}

function relativeFr(iso: string): string {
  const now = Date.now()
  const target = new Date(iso).getTime()
  const diffDays = Math.round((target - now) / 86400000)
  if (diffDays < 0) return `il y a ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === 1) return 'demain'
  if (diffDays < 7) return `dans ${diffDays} jours`
  if (diffDays < 30) return `dans ${Math.round(diffDays / 7)} semaines`
  return `dans ${Math.round(diffDays / 30)} mois`
}

type DbEventWithCategory = HilmyEvent & {
  event_seasonal_category?: {
    id: string
    slug: string
    label: string
    emoji: string
  } | null
}

function adaptEvenementFromDb(e: DbEventWithCategory): MockEvenement {
  const seasonal = e.event_seasonal_category
  return {
    slug: e.slug ?? e.id,
    titre: e.title,
    date: formatDateFr(e.start_date),
    dateRelative: relativeFr(e.start_date),
    lieu: e.address ?? e.city ?? 'À venir',
    ville: e.city ?? '',
    categorie: e.event_type ?? 'Autre',
    description: e.description,
    organisatrice: 'HILMY',
    cover: '#D4C5B0',
    flyer: e.flyer_url ?? null,
    places: e.places_max ?? 20,
    inscrites: e.inscrites_count ?? 0,
    seasonal_category: seasonal
      ? { slug: seasonal.slug, label: seasonal.label, emoji: seasonal.emoji }
      : null,
  }
}

function EvenementsV2PageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [categorie, setCategorie] = useState('all')
  const [ville, setVille] = useState('all')
  const [seasonalSlug, setSeasonalSlug] = useState<string>(
    searchParams.get('seasonal') ?? 'all',
  )

  // Keep URL ?seasonal=... synced with state for deep-link partage
  // (use case Hilmy : whatsapp share "events Ramadan").
  const updateSeasonalSlug = (next: string) => {
    setSeasonalSlug(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'all') {
      params.delete('seasonal')
    } else {
      params.set('seasonal', next)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveEvents, setLiveEvents] = useState<MockEvenement[]>([])
  // Liste complète des 12 catégories actives — affichées en chips même
  // si aucun event taggé. Permet de communiquer la dimension saisonnière
  // de Hilmy au lancement (au lieu d'une barre vide).
  const [allSeasonals, setAllSeasonals] = useState<
    { slug: string; label: string; emoji: string }[]
  >([])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        const now = new Date().toISOString()
        // Fetch parallèle : events à venir + catalogue des 12 catégories
        // saisonnières actives (toujours affichées en chips, même si
        // aucun event taggé).
        const [eventsRes, categoriesRes] = await Promise.all([
          supabase
            .from('events')
            .select(
              // mig 46 PR-F : event_seasonal_category_id + LEFT JOIN
              // event_seasonal_categories (relation auto-détectée par PostgREST
              // via la FK). Le LEFT JOIN renvoie null si pas de catégorie.
              'id, user_id, prestataire_id, title, slug, description, event_type, format, visibility, start_date, end_date, country, region, city, address, online_link, flyer_url, external_signup_url, price_type, price_amount, price_currency, places_max, inscrites_count, status, created_at, updated_at, event_seasonal_category_id, event_seasonal_category:event_seasonal_categories(id, slug, label, emoji)',
            )
            .eq('status', 'published')
            .gte('start_date', now)
            .order('start_date', { ascending: true }),
          supabase
            .from('event_seasonal_categories')
            .select('slug, label, emoji')
            .eq('is_active', true)
            .order('label', { ascending: true }),
        ])

        if (cancelled) return
        if (eventsRes.error) {
          setError(eventsRes.error.message)
          setLoading(false)
          return
        }
        const adapted = (eventsRes.data ?? []).map((row) =>
          adaptEvenementFromDb(row as unknown as DbEventWithCategory),
        )
        setLiveEvents(adapted)
        // Catalogue catégories : tolère un échec silencieux (la barre
        // affichera quand même les events s'ils existent, juste sans chips).
        if (!categoriesRes.error && categoriesRes.data) {
          setAllSeasonals(
            categoriesRes.data as { slug: string; label: string; emoji: string }[],
          )
        }
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  const dataSource = liveEvents

  const filtered = useMemo(() => {
    return dataSource.filter((e) => {
      if (categorie !== 'all' && e.categorie !== categorie) return false
      if (ville !== 'all' && e.ville !== ville) return false
      if (
        seasonalSlug !== 'all' &&
        e.seasonal_category?.slug !== seasonalSlug
      )
        return false
      return true
    })
  }, [dataSource, categorie, ville, seasonalSlug])

  const categories = Array.from(new Set(dataSource.map((e) => e.categorie)))
  const villesPresentes = Array.from(new Set(dataSource.map((e) => e.ville)))

  // Empty state spécifique quand une catégorie saisonnière est sélectionnée
  // mais que zéro event ne lui correspond — on encourage l'utilisatrice à
  // créer le premier event de cette période.
  const isEmptyForSelectedSeason =
    seasonalSlug !== 'all' &&
    !dataSource.some((e) => e.seasonal_category?.slug === seasonalSlug)
  const selectedSeasonalLabel =
    seasonalSlug !== 'all'
      ? allSeasonals.find((s) => s.slug === seasonalSlug)?.label ?? null
      : null

  const reset = () => {
    setCategorie('all')
    setVille('all')
    updateSeasonalSlug('all')
  }

  const featured = filtered[0]
  const rest = filtered.slice(1)

  // LIVE — skeleton
  if (loading) {
    return (
      <PageShell>
        <PageHero number="03" kicker="Les événements" titre={<>Les moments qu&apos;on vit ensemble.</>} />
        <SkeletonListGrid count={4} />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <PageHero number="03" kicker="Les événements" titre={<>Les événements</>} />
        <LiveErrorState message={error} retryHref="/evenements-v2" />
      </PageShell>
    )
  }

  if (dataSource.length === 0) {
    return (
      <PageShell>
        <PageHero
          number="03"
          kicker="Les événements"
          titre={<>Les moments qu&apos;on vit ensemble.</>}
          lead={<>L&apos;agenda commence tout juste à se remplir.</>}
        />
        <LiveEmptyState
          kicker="Zéro événement à venir"
          titre="Propose le premier."
          pitch="Un brunch, un book club, une balade. La team Hilmy t'aide à remplir les places."
          ctaLabel="Proposer un événement"
          ctaHref="/dashboard/utilisatrice/evenements/nouveau"
        />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHero
        number="03"
        kicker="Les événements"
        titre={
          <>
            Les moments
            <br />
            qu&apos;on vit ensemble.
          </>
        }
        lead={
          <>
            Brunchs, book clubs, ateliers, yoga au bord du lac. Ce que tu aurais aimé
            faire, mais avec qui ? Ici tu trouves tes copines-de-circonstance avant
            l&apos;événement.
          </>
        }
      >
        <Link
          href="/dashboard/utilisatrice/evenements/nouveau"
          className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-or px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light"
        >
          Proposer un événement
          <span
            className="transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </Link>
      </PageHero>

      <FiltersBar
        resultCount={filtered.length}
        onReset={reset}
        groups={[
          ...(allSeasonals.length > 0
            ? [
                {
                  id: 'seasonal',
                  label: 'Période',
                  value: seasonalSlug,
                  onChange: updateSeasonalSlug,
                  options: [
                    { value: 'all', label: 'Toutes' },
                    // Pas de pré-filtre dynamique : on affiche TOUJOURS les
                    // 12 catégories actives (ORDER BY label) pour communiquer
                    // la dimension saisonnière de Hilmy. Si la copine clique
                    // sur une période sans events, on lui propose d'en créer
                    // le premier (cf isEmptyForSelectedSeason ci-dessous).
                    ...allSeasonals.map((s) => ({
                      value: s.slug,
                      label: `${s.emoji} ${s.label}`,
                    })),
                  ],
                },
              ]
            : []),
          {
            id: 'categorie',
            label: 'Catégorie',
            value: categorie,
            onChange: setCategorie,
            options: [
              { value: 'all', label: 'Toutes' },
              ...categories.map((c) => ({ value: c, label: c })),
            ],
          },
          {
            id: 'ville',
            label: 'Ville',
            value: ville,
            onChange: setVille,
            options: [
              { value: 'all', label: 'Toutes' },
              ...villesPresentes
                .sort((a, b) => villesSuggestions.indexOf(a) - villesSuggestions.indexOf(b))
                .map((v) => ({ value: v, label: v })),
            ],
          },
        ]}
      />

      <section className="py-10 sm:py-14 md:py-20">
        <div className="mx-auto max-w-container px-4 sm:px-6 md:px-20">
          <AnimatePresence mode="wait">
            {filtered.length > 0 ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-10"
              >
                {featured && (
                  <div className="overflow-hidden rounded-sm bg-blanc shadow-[0_30px_60px_-40px_rgba(15,61,46,0.2)]">
                    <EvenementCard e={featured} index={0} variant="hero" />
                  </div>
                )}
                {rest.length > 0 && (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((e, i) => (
                      <EvenementCard key={e.slug} e={e} index={i + 1} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-sm border border-dashed border-or/30 bg-blanc py-20 text-center"
              >
                {isEmptyForSelectedSeason ? (
                  <>
                    <p className="font-serif text-3xl font-light text-vert">
                      Pas encore d&apos;événement pour
                      {selectedSeasonalLabel ? ' ' : ' '}
                      {selectedSeasonalLabel ?? 'cette période'}.
                    </p>
                    <p className="mt-3 text-[14px] leading-[1.7] text-texte-sec">
                      Sois la première à en créer un !
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-serif text-3xl font-light text-vert">
                      Pas d&apos;événement qui colle.
                    </p>
                    <p className="mt-3 text-[14px] leading-[1.7] text-texte-sec">
                      Enlève un filtre, ou organise-toi le tien.
                    </p>
                  </>
                )}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-creme-deep"
                  >
                    Tout réinitialiser
                  </button>
                  <Link
                    href="/dashboard/utilisatrice/evenements/nouveau"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
                  >
                    Proposer un événement
                    <span className="text-or-light" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </PageShell>
  )
}

// useSearchParams() requiert un boundary <Suspense> côté Next 14 app router
// pour la pre-render statique. Wrap minimal — le contenu reste rendu côté
// client après hydration.
export default function EvenementsV2Page() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <PageHero
            number="03"
            kicker="Les événements"
            titre={<>Les moments qu&apos;on vit ensemble.</>}
          />
          <SkeletonListGrid count={4} />
        </PageShell>
      }
    >
      <EvenementsV2PageInner />
    </Suspense>
  )
}
