'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { PageShell } from '@/components/v2/PageShell'
import { PageHero } from '@/components/v2/PageHero'
import { FiltersBar } from '@/components/v2/FiltersBar'
import { LieuCard } from '@/components/v2/LieuCard'
import {
  SkeletonListGrid,
  LiveErrorState,
  LiveEmptyState,
} from '@/components/v2/LiveStates'
import {
  categoriesLieux,
  villesSuggestions,
  type Lieu as MockLieu,
} from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/client'
import type { Place } from '@/lib/supabase/types'

function adaptPlaceFromDb(p: Place): MockLieu {
  const photosArr =
    Array.isArray(p.photos) && p.photos.length > 0
      ? (p.photos as string[])
      : p.main_photo_url
        ? [p.main_photo_url]
        : []
  const cover = photosArr[0] && photosArr[0].startsWith('#') ? photosArr[0] : '#EEE6D8'

  return {
    slug: p.slug ?? p.id,
    nom: p.name,
    categorie: p.hilmy_category ?? 'restos-cafes',
    ville: p.city ?? '',
    adresse: p.address ?? '',
    description: p.description ?? '',
    cover,
    galerie: photosArr,
    recommandePar: [],
    commentaires: [],
  }
}

export default function RecommandationsPage() {
  const [categorie, setCategorie] = useState('all')
  const [ville, setVille] = useState('all')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveLieux, setLiveLieux] = useState<MockLieu[]>([])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        const { data, error: err } = await supabase
          .from('places')
          .select(
            'id, google_place_id, name, slug, description, address, city, region, country, latitude, longitude, google_category, hilmy_category, main_photo_url, photos, created_at, updated_at',
          )
          .order('created_at', { ascending: false })

        if (cancelled) return
        if (err) {
          setError(err.message)
          setLoading(false)
          return
        }
        const adapted = (data ?? []).map((row) =>
          adaptPlaceFromDb(row as unknown as Place),
        )
        setLiveLieux(adapted)
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

  const dataSource = liveLieux

  const filtered = useMemo(() => {
    return dataSource.filter((l) => {
      if (categorie !== 'all' && l.categorie !== categorie) return false
      if (ville !== 'all' && l.ville !== ville) return false
      return true
    })
  }, [dataSource, categorie, ville])

  const villesPresentes = Array.from(new Set(dataSource.map((l) => l.ville)))
  const villesOptions = villesPresentes
    .sort((a, b) => villesSuggestions.indexOf(a) - villesSuggestions.indexOf(b))
    .map((v) => ({ value: v, label: v }))

  const reset = () => {
    setCategorie('all')
    setVille('all')
  }

  if (loading) {
    return (
      <PageShell>
        <PageHero number="02" kicker="Les recommandations" titre={<>Les adresses qui passent de main en main.</>} />
        <SkeletonListGrid count={6} />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <PageHero number="02" kicker="Les recommandations" titre={<>Les recommandations</>} />
        <LiveErrorState message={error} retryHref="/recommandations" />
      </PageShell>
    )
  }

  if (dataSource.length === 0) {
    return (
      <PageShell>
        <PageHero
          number="02"
          kicker="Les recommandations"
          titre={<>Les adresses qui passent de main en main.</>}
          lead={<>Le carnet des lieux commence à s&apos;écrire.</>}
        />
        <LiveEmptyState
          kicker="Premières adresses"
          titre="Recommande la première."
          pitch="Ton café du matin, ton spa-refuge, ta boutique préférée. Une adresse, un mot, c'est parti."
          ctaLabel="Recommander un lieu"
          ctaHref="/dashboard/utilisatrice/recommandations/nouvelle"
          secondaryLabel="Retour à l'accueil →"
          secondaryHref="/"
        />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHero
        number="02"
        kicker="Les recommandations"
        titre={
          <>
            Les adresses qui passent
            <br />
            de main en main.
          </>
        }
        lead={
          <>
            Restos de quartier, cafés où on traîne, spas qui font du bien, boutiques
            de créatrices. Chaque lieu vient d&apos;une femme qui l&apos;aime vraiment.
          </>
        }
      >
        <Link
          href="/dashboard/utilisatrice/recommandations/nouvelle"
          className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-or px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light"
        >
          Recommander un lieu
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
          {
            id: 'categorie',
            label: 'Catégorie',
            value: categorie,
            onChange: setCategorie,
            options: [
              { value: 'all', label: 'Toutes' },
              ...categoriesLieux.map((c) => ({
                value: c.slug,
                label: c.label,
              })),
            ],
          },
          {
            id: 'ville',
            label: 'Ville',
            value: ville,
            onChange: setVille,
            options: [{ value: 'all', label: 'Toutes' }, ...villesOptions],
          },
        ]}
      />

      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <AnimatePresence mode="wait">
            {filtered.length > 0 ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="columns-1 gap-6 sm:columns-2 lg:columns-3"
              >
                {filtered.map((l, i) => (
                  <LieuCard key={l.slug} lieu={l} index={i} />
                ))}
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
                <p className="font-serif text-3xl font-light text-vert">
                  Rien ici pour l&apos;instant.
                </p>
                <p className="mt-3 text-[14px] leading-[1.7] text-texte-sec">
                  Sois la première à recommander un lieu dans cette combinaison.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-creme-deep"
                  >
                    Tout réinitialiser
                  </button>
                  <Link
                    href="/dashboard/utilisatrice/recommandations/nouvelle"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
                  >
                    Recommander un lieu
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
