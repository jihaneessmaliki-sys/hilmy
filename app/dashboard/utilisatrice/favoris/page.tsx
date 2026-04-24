'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'

type FavoriType = 'prestataire' | 'lieu' | 'evenement'

type FavoriRow = {
  id: string
  type_item: FavoriType
  item_id: string
  created_at: string
}

type ItemSummary = {
  id: string
  type: FavoriType
  title: string
  subtitle: string
  href: string
  cover: string
}

export default function FavorisPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favoris, setFavoris] = useState<FavoriRow[]>([])
  const [items, setItems] = useState<Record<string, ItemSummary>>({})
  const [filter, setFilter] = useState<FavoriType | 'all'>('all')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Session expirée.')
      setLoading(false)
      return
    }

    const { data: favs, error: favError } = await supabase
      .from('favoris')
      .select('id, type_item, item_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (favError) {
      setError(favError.message)
      setLoading(false)
      return
    }

    setFavoris((favs ?? []) as FavoriRow[])

    // Batch fetch items par type
    const byType: Record<FavoriType, string[]> = {
      prestataire: [],
      lieu: [],
      evenement: [],
    }
    for (const f of favs ?? []) byType[f.type_item as FavoriType].push(f.item_id)

    const summaries: Record<string, ItemSummary> = {}

    if (byType.prestataire.length) {
      const { data } = await supabase
        .from('profiles')
        .select('id, nom, slug, categorie, ville, description')
        .in('id', byType.prestataire)
        .eq('status', 'approved')
      for (const p of data ?? []) {
        summaries[p.id] = {
          id: p.id,
          type: 'prestataire',
          title: p.nom,
          subtitle: `${p.categorie ?? ''} · ${p.ville ?? ''}`,
          href: `/prestataire-v2/${p.slug}`,
          cover: '#D4C5B0',
        }
      }
    }

    if (byType.lieu.length) {
      const { data } = await supabase
        .from('places')
        .select('id, name, slug, hilmy_category, city, main_photo_url')
        .in('id', byType.lieu)
      for (const l of data ?? []) {
        summaries[l.id] = {
          id: l.id,
          type: 'lieu',
          title: l.name,
          subtitle: `${l.hilmy_category ?? ''} · ${l.city ?? ''}`,
          href: `/recommandation/${l.slug ?? l.id}`,
          cover: '#EEE6D8',
        }
      }
    }

    if (byType.evenement.length) {
      const { data } = await supabase
        .from('events')
        .select('id, title, slug, city, start_date, event_type')
        .in('id', byType.evenement)
      for (const e of data ?? []) {
        summaries[e.id] = {
          id: e.id,
          type: 'evenement',
          title: e.title,
          subtitle: `${e.event_type ?? ''} · ${e.city ?? ''}`,
          href: `/evenement-v2/${e.slug ?? e.id}`,
          cover: '#B8C7B0',
        }
      }
    }

    setItems(summaries)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const visible = useMemo(() => {
    if (filter === 'all') return favoris
    return favoris.filter((f) => f.type_item === filter)
  }, [favoris, filter])

  const handleRemove = async (fav: FavoriRow) => {
    const supabase = createClient()
    // Optimistic update
    setFavoris((cur) => cur.filter((f) => f.id !== fav.id))
    const { error: delErr } = await supabase.from('favoris').delete().eq('id', fav.id)
    if (delErr) {
      // Revert
      setFavoris((cur) => [fav, ...cur])
      setError(delErr.message)
    }
  }

  const counts = useMemo(() => {
    return {
      all: favoris.length,
      prestataire: favoris.filter((f) => f.type_item === 'prestataire').length,
      lieu: favoris.filter((f) => f.type_item === 'lieu').length,
      evenement: favoris.filter((f) => f.type_item === 'evenement').length,
    }
  }, [favoris])

  return (
    <>
      <DashboardHeader
        kicker="Mes favoris"
        titre={
          <>
            Tes {favoris.length} adresses
            <br />
            <em className="font-serif italic text-or">gardées sous le coude.</em>
          </>
        }
        lead="Les prestataires, lieux et événements que tu as choisi de retenir. Un clic sur le cœur et c'est retiré."
      />

      {/* Filter tabs */}
      <section className="border-b border-or/10 px-6 pt-6 md:px-12">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: 'Tout' },
              { id: 'prestataire', label: 'Prestataires' },
              { id: 'lieu', label: 'Lieux' },
              { id: 'evenement', label: 'Événements' },
            ] as const
          ).map((t) => {
            const active = filter === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.22em] uppercase transition-all ${
                  active
                    ? 'bg-vert text-creme'
                    : 'bg-blanc text-texte-sec hover:bg-creme-deep hover:text-vert'
                }`}
              >
                {t.label}
                <span className={active ? 'text-or-light' : 'text-or'}>
                  {counts[t.id]}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="px-6 py-10 md:px-12 md:py-14">
        {error && (
          <p className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-sm bg-creme-deep"
              />
            ))}
          </div>
        ) : favoris.length === 0 ? (
          <EmptyState
            kicker="Aucun favori encore"
            titre="Tes premiers coups de cœur arrivent bientôt."
            pitch={
              <>
                Parcours l&apos;annuaire, clique sur le cœur en haut à droite
                d&apos;une carte — tout atterrit ici pour que tu retrouves plus tard.
              </>
            }
            ctaLabel="Explore l'annuaire"
            ctaHref="/annuaire"
            secondaryLabel="Ou les recommandations →"
            secondaryHref="/recommandations"
          />
        ) : (
          <div className="flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">
              {visible.length} {filter === 'all' ? 'au total' : 'dans ce filtre'}
            </span>
          </div>
        )}

        <AnimatePresence>
          {!loading && visible.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visible.map((f) => {
                const it = items[f.item_id]
                const cover = it?.cover ?? '#D4C5B0'
                return (
                  <motion.article
                    key={f.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="group relative overflow-hidden rounded-sm bg-blanc"
                  >
                    <div
                      className="h-32 w-full"
                      style={{
                        background: `linear-gradient(135deg, ${cover} 0%, ${cover} 100%)`,
                      }}
                    />
                    <div className="p-5">
                      <p className="overline text-or">
                        {f.type_item === 'prestataire'
                          ? 'Prestataire'
                          : f.type_item === 'lieu'
                            ? 'Lieu'
                            : 'Événement'}
                      </p>
                      {it ? (
                        <>
                          <Link
                            href={it.href}
                            className="mt-2 block font-serif text-lg font-light text-vert hover:text-or"
                          >
                            {it.title}
                          </Link>
                          <p className="mt-1 text-[11px] text-texte-sec">
                            {it.subtitle}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-[12px] italic text-texte-sec">
                          Cet item n&apos;est plus disponible.
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between border-t border-or/10 pt-3">
                        <span className="text-[11px] text-texte-sec">
                          Sauvegardé{' '}
                          {new Date(f.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(f)}
                          className="text-[11px] font-medium text-texte-sec transition-colors hover:text-red-900"
                          aria-label="Retirer des favoris"
                        >
                          ♥ Retirer
                        </button>
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  )
}
