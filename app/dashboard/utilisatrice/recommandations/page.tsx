'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GoldLine } from '@/components/ui/GoldLine'
import { ConfirmModal } from '@/components/v2/ConfirmModal'
import { createClient } from '@/lib/supabase/client'

type RecoRow = {
  id: string
  type: 'place' | 'prestataire'
  place_id: string | null
  profile_id: string | null
  comment: string
  rating: number | null
  photo_urls: string[] | null
  reponse_pro: string | null
  status: string
  created_at: string
}

type Target = {
  id: string
  title: string
  subtitle: string
  href: string
}

export default function MesRecommandationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recos, setRecos] = useState<RecoRow[]>([])
  const [targets, setTargets] = useState<Record<string, Target>>({})

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Session expirée.')
      setLoading(false)
      return
    }

    const { data, error: recoErr } = await supabase
      .from('recommendations')
      .select(
        'id, type, place_id, profile_id, comment, rating, photo_urls, reponse_pro, status, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (recoErr) {
      setError(recoErr.message)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as RecoRow[]
    setRecos(rows)

    const placeIds = rows.filter((r) => r.type === 'place' && r.place_id).map((r) => r.place_id!)
    const profileIds = rows
      .filter((r) => r.type === 'prestataire' && r.profile_id)
      .map((r) => r.profile_id!)

    const map: Record<string, Target> = {}

    if (placeIds.length) {
      const { data: places } = await supabase
        .from('places')
        .select('id, name, slug, city, hilmy_category')
        .in('id', placeIds)
      for (const p of places ?? []) {
        map[p.id] = {
          id: p.id,
          title: p.name,
          subtitle: `${p.hilmy_category ?? ''} · ${p.city ?? ''}`,
          href: `/recommandation/${p.slug ?? p.id}`,
        }
      }
    }

    if (profileIds.length) {
      const { data: pros } = await supabase
        .from('profiles')
        .select('id, nom, slug, ville, categorie')
        .in('id', profileIds)
      for (const p of pros ?? []) {
        map[p.id] = {
          id: p.id,
          title: p.nom,
          subtitle: `${p.categorie ?? ''} · ${p.ville ?? ''}`,
          href: `/prestataire-v2/${p.slug}`,
        }
      }
    }

    setTargets(map)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Suppression
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!pendingDeleteId) return
    setDeleting(true)
    setError(null)
    const supabase = createClient()
    const { error: delErr } = await supabase
      .from('recommendations')
      .update({ status: 'removed' })
      .eq('id', pendingDeleteId)
    setDeleting(false)
    if (delErr) {
      setError(delErr.message)
      setPendingDeleteId(null)
      return
    }
    // Optimistic UI : retire de la liste
    setRecos((cur) => cur.filter((r) => r.id !== pendingDeleteId))
    setPendingDeleteId(null)
  }

  const stats = useMemo(() => {
    const published = recos.filter((r) => r.status === 'published')
    const avg =
      published.filter((r) => r.rating).reduce((s, r) => s + (r.rating ?? 0), 0) /
      Math.max(1, published.filter((r) => r.rating).length)
    return { total: published.length, avgRating: isNaN(avg) ? 0 : avg }
  }, [recos])

  return (
    <>
      <DashboardHeader
        kicker="Mes recommandations"
        titre={
          <>
            Ce que tu as
            <br />
            <em className="font-serif italic text-or">déposé dans le carnet.</em>
          </>
        }
        lead="Merci — chaque recommandation fait grandir le réseau. Elles sont visibles par toutes les membres."
        actions={
          <Link
            href="/dashboard/utilisatrice/recommandations/nouvelle"
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-or px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light"
          >
            Recommander un lieu
            <span
              className="transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        }
      />

      <section className="px-6 py-10 md:px-12 md:py-14">
        {error && (
          <p className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-sm bg-creme-deep"
              />
            ))}
          </div>
        ) : recos.length === 0 ? (
          <EmptyState
            kicker="Zéro pour l'instant"
            titre="Pas encore recommandé d'adresse."
            pitch={
              <>
                Ton resto préféré, ton café de dimanche, ton spa-refuge.
                Partage-les — les copines t&apos;en seront reconnaissantes.
              </>
            }
            ctaLabel="Recommander un lieu"
            ctaHref="/recommander"
          />
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-4">
                <GoldLine width={40} />
                <span className="overline text-or">
                  Publiées · {stats.total}
                </span>
              </div>
              {stats.avgRating > 0 && (
                <span className="text-[12px] text-texte-sec">
                  Note moyenne donnée :{' '}
                  <span className="font-serif text-base text-vert">
                    {stats.avgRating.toFixed(1)} / 5
                  </span>
                </span>
              )}
            </div>

            <AnimatePresence>
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-4 md:grid-cols-2"
              >
                {recos.map((r) => {
                  const t =
                    targets[
                      r.type === 'place' ? r.place_id ?? '' : r.profile_id ?? ''
                    ]
                  return (
                    <motion.li
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="overflow-hidden rounded-sm border border-or/15 bg-blanc"
                    >
                      <div className="flex items-center justify-between border-b border-or/10 bg-creme-soft px-5 py-3">
                        <p className="overline text-or">
                          {r.type === 'place' ? 'Lieu' : 'Prestataire'}
                        </p>
                        <span className="text-[10px] tracking-[0.22em] text-texte-sec uppercase">
                          {r.status === 'published' ? 'En ligne' : r.status}
                        </span>
                      </div>
                      <div className="p-5">
                        {t ? (
                          <>
                            <Link
                              href={t.href}
                              className="font-serif text-lg font-light text-vert hover:text-or"
                            >
                              {t.title}
                            </Link>
                            <p className="mt-1 text-[11px] text-texte-sec">
                              {t.subtitle}
                            </p>
                          </>
                        ) : (
                          <p className="text-[12px] italic text-texte-sec">
                            Adresse archivée.
                          </p>
                        )}
                        {r.rating !== null && (
                          <div className="mt-3 flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={
                                  i < (r.rating ?? 0)
                                    ? 'text-or'
                                    : 'text-or/20'
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-texte">
                          “{r.comment}”
                        </p>
                        {r.reponse_pro && (
                          <div className="mt-4 rounded-sm bg-creme-soft p-3">
                            <p className="overline text-or">Réponse du pro</p>
                            <p className="mt-1 line-clamp-3 text-[12px] italic text-texte-sec">
                              {r.reponse_pro}
                            </p>
                          </div>
                        )}
                        <div className="mt-4 flex items-center justify-between border-t border-or/10 pt-3">
                          <p className="text-[11px] text-texte-sec">
                            Publiée{' '}
                            {new Date(r.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(r.id)}
                            className="text-[11px] tracking-[0.22em] text-texte-sec uppercase transition-colors hover:text-red-900"
                            aria-label="Supprimer cette recommandation"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </motion.ul>
            </AnimatePresence>
          </>
        )}
      </section>

      <ConfirmModal
        open={pendingDeleteId !== null}
        titre="Supprimer cette recommandation ?"
        description={
          <p>
            Cette action est irréversible. Ton avis disparaîtra de la fiche
            publique et de ta liste — tu ne pourras pas le récupérer.
          </p>
        }
        confirmLabel="Supprimer"
        cancelLabel="Garder"
        tone="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  )
}
