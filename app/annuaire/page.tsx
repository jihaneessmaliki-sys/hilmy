'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { PageShell } from '@/components/v2/PageShell'
import { PageHero } from '@/components/v2/PageHero'
import { FiltersBar } from '@/components/v2/FiltersBar'
import { PrestataireCard } from '@/components/v2/PrestataireCard'
import {
  SkeletonListGrid,
  LiveErrorState,
  LiveEmptyState,
} from '@/components/v2/LiveStates'
import {
  villesSuggestions,
  categoriesPrestataires,
  type Prestataire as MockPrestataire,
} from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/client'
import type { Prestataire as DbPrestataire } from '@/lib/supabase/types'

// Adapte une ligne DB profiles → shape attendue par PrestataireCard (même shape que mock).
function adaptPrestataireFromDb(p: DbPrestataire): MockPrestataire {
  const galerie =
    Array.isArray(p.galerie) && p.galerie.length > 0
      ? (p.galerie as string[])
      : Array.isArray(p.photos) && p.photos.length > 0
        ? p.photos
        : []
  const metier =
    categoriesPrestataires.find((c) => c.slug === p.categorie)?.label ??
    p.categorie
  const coverColor =
    galerie[0] && galerie[0].startsWith('#') ? galerie[0] : '#D4C5B0'

  return {
    slug: p.slug,
    nom: p.nom,
    metier,
    categorie: p.categorie,
    ville: p.ville,
    note: p.note_moyenne ?? 0,
    avis: p.nb_avis ?? 0,
    prix: (p.prix_gamme as '€' | '€€' | '€€€') ?? '€€',
    cover: coverColor,
    tagline: p.tagline ?? p.description ?? '',
    bio: p.description ?? '',
    services: Array.isArray(p.services) ? p.services : [],
    galerie,
    tarifsDe: p.prix_from ?? 0,
    palier: p.palier,
  }
}

export default function AnnuairePage() {
  const [categorie, setCategorie] = useState('all')
  const [ville, setVille] = useState('all')
  const [note, setNote] = useState('all')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [livePrestataires, setLivePrestataires] = useState<MockPrestataire[]>([])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        const { data, error: err } = await supabase
          .from('profiles')
          .select(
            'id, user_id, nom, slug, categorie, ville, description, tagline, photos, galerie, services, prix_from, prix_gamme, devise, status, note_moyenne, nb_avis, nb_vues, approved_at, source_import, created_at, updated_at, admin_notes, whatsapp, instagram, tiktok, email, site_web, linkedin, palier'
          )
          .eq('status', 'approved')
          .order('approved_at', { ascending: false, nullsFirst: false })

        if (cancelled) return
        if (err) {
          setError(err.message)
          setLoading(false)
          return
        }
        const adapted = (data ?? []).map((row) =>
          adaptPrestataireFromDb(row as unknown as DbPrestataire),
        )
        setLivePrestataires(adapted)
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

  const dataSource = livePrestataires

  const filtered = useMemo(() => {
    return dataSource.filter((p) => {
      if (categorie !== 'all' && p.categorie !== categorie) return false
      if (ville !== 'all' && p.ville !== ville) return false
      if (note === '45' && p.note < 4.5) return false
      if (note === '48' && p.note < 4.8) return false
      return true
    })
  }, [dataSource, categorie, ville, note])

  const villesPresentes = Array.from(new Set(dataSource.map((p) => p.ville)))
  const villesOptions = villesPresentes
    .sort((a, b) => villesSuggestions.indexOf(a) - villesSuggestions.indexOf(b))
    .map((v) => ({ value: v, label: v }))

  const reset = () => {
    setCategorie('all')
    setVille('all')
    setNote('all')
  }

  // ── LIVE : skeleton pendant chargement ────────────────────────────
  if (loading) {
    return (
      <PageShell>
        <PageHero
          number="01"
          kicker="L'annuaire"
          titre={
            <>
              Les prestataires,
              <br />
              choisies une par une.
            </>
          }
        />
        <SkeletonListGrid count={6} />
      </PageShell>
    )
  }

  // ── LIVE : erreur ─────────────────────────────────────────────────
  if (error) {
    return (
      <PageShell>
        <PageHero
          number="01"
          kicker="L'annuaire"
          titre={<>L&apos;annuaire</>}
        />
        <LiveErrorState message={error} retryHref="/annuaire" />
      </PageShell>
    )
  }

  // ── LIVE : DB vide ────────────────────────────────────────────────
  if (dataSource.length === 0) {
    return (
      <PageShell>
        <PageHero
          number="01"
          kicker="L'annuaire"
          titre={
            <>
              Les prestataires,
              <br />
              choisies une par une.
            </>
          }
          lead={<>Le carnet commence à peine à s&apos;écrire.</>}
        />
        <LiveEmptyState
          kicker="Premières copines"
          titre="Les premières fiches arrivent bientôt."
          pitch="On vérifie chaque profil à la main — quelques jours parfois. Reviens vite ou inscris-toi pour être prévenue."
          ctaLabel="Créer ma fiche"
          ctaHref="/onboarding/prestataire"
          secondaryLabel="Être prévenue →"
          secondaryHref="/inscription"
        />
      </PageShell>
    )
  }

  // ── LIVE : grille normale avec filtres ────────────────────────────
  return (
    <PageShell>
      <PageHero
        number="01"
        kicker="L'annuaire"
        titre={
          <>
            Les prestataires,
            <br />
            choisies une par une.
          </>
        }
        lead={
          <>
            Coachs, thérapeutes, coiffeuses, avocates… vérifiées à la main.
            Zéro profil fake, zéro commission. Parcours l&apos;annuaire ou filtre selon ton
            besoin.
          </>
        }
      />

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
              ...categoriesPrestataires.map((c) => ({
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
          {
            id: 'note',
            label: 'Note',
            value: note,
            onChange: setNote,
            options: [
              { value: 'all', label: 'Toutes' },
              { value: '45', label: '4,5 +' },
              { value: '48', label: '4,8 +' },
            ],
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
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filtered.map((p, i) => (
                  <PrestataireCard key={p.slug} p={p} index={i} />
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
                  Pas encore de profil qui colle.
                </p>
                <p className="mt-3 text-[14px] leading-[1.7] text-texte-sec">
                  Desserre un filtre, ou recommande-nous quelqu&apos;une qu&apos;on devrait connaître.
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
                    href="/onboarding/prestataire"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
                  >
                    Recommander quelqu&apos;une
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
