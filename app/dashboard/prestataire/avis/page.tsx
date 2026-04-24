'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'

type UserLite = { prenom: string | null; avatar_url: string | null } | null

type AvisRow = {
  id: string
  comment: string
  rating: number | null
  reponse_pro: string | null
  reponse_date: string | null
  created_at: string
  user: UserLite | UserLite[]
}

type Filter = 'all' | 'pending' | 'replied'

export default function MesAvisPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [avis, setAvis] = useState<AvisRow[]>([])
  const [filter, setFilter] = useState<Filter>('all')

  const [openReply, setOpenReply] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [publishing, setPublishing] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expirée.')
        setLoading(false)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!profile) {
        setError('Fiche prestataire introuvable.')
        setLoading(false)
        return
      }
      setProfileId(profile.id)

      const { data, error: recoErr } = await supabase
        .from('recommendations')
        .select(
          'id, comment, rating, reponse_pro, reponse_date, created_at, user:user_profiles ( prenom, avatar_url )',
        )
        .eq('profile_id', profile.id)
        .eq('type', 'prestataire')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (recoErr) setError(recoErr.message)
      setAvis((data ?? []) as AvisRow[])
      setLoading(false)
    }
    run()
  }, [])

  const publishReply = async (id: string) => {
    const text = (replyDraft[id] ?? '').trim()
    if (!text) return
    setPublishing(id)
    setError(null)
    const supabase = createClient()
    const { error: updErr } = await supabase
      .from('recommendations')
      .update({
        reponse_pro: text,
        reponse_date: new Date().toISOString(),
      })
      .eq('id', id)

    setPublishing(null)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setAvis((cur) =>
      cur.map((a) =>
        a.id === id
          ? { ...a, reponse_pro: text, reponse_date: new Date().toISOString() }
          : a,
      ),
    )
    setOpenReply(null)
  }

  const noteMoyenne =
    avis
      .filter((a) => a.rating !== null)
      .reduce((s, a) => s + (a.rating ?? 0), 0) /
    Math.max(1, avis.filter((a) => a.rating !== null).length)

  const filtered = avis.filter((a) => {
    if (filter === 'pending') return !a.reponse_pro
    if (filter === 'replied') return !!a.reponse_pro
    return true
  })

  const counts = {
    all: avis.length,
    pending: avis.filter((a) => !a.reponse_pro).length,
    replied: avis.filter((a) => !!a.reponse_pro).length,
  }

  return (
    <>
      <DashboardHeader
        kicker="Mes avis"
        titre={
          <>
            Les {avis.length} avis{' '}
            <em className="font-serif italic text-or">que tu as reçus.</em>
          </>
        }
        lead="Chaque réponse compte. Remercier prend dix secondes et ça se voit dans les retours."
      />

      {loading ? (
        <section className="px-6 py-10 md:px-12">
          <div className="h-64 animate-pulse rounded-sm bg-creme-deep" />
        </section>
      ) : error ? (
        <section className="px-6 py-10 md:px-12">
          <p className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[13px] text-red-900">
            {error}
          </p>
        </section>
      ) : avis.length === 0 ? (
        <section className="px-6 py-14 md:px-12">
          <EmptyState
            kicker="Pas encore"
            titre="Aucun avis pour l'instant."
            pitch="Les premières clientes vont arriver. En attendant, soigne ta fiche."
            ctaLabel="Voir ma fiche"
            ctaHref="/dashboard/prestataire/fiche"
          />
        </section>
      ) : (
        <section className="px-6 py-10 md:px-12 md:py-14">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <GoldLine width={40} />
              <span className="overline text-or">
                Note moyenne ★ {noteMoyenne.toFixed(1)} / 5
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'all', label: 'Tout' },
                  { id: 'pending', label: 'À répondre' },
                  { id: 'replied', label: 'Répondu' },
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
          </div>

          <ul className="space-y-6">
            {filtered.map((a) => {
              const u = Array.isArray(a.user) ? a.user[0] : a.user
              const isUrl =
                u?.avatar_url?.startsWith('http') ||
                u?.avatar_url?.startsWith('/')
              return (
                <li
                  key={a.id}
                  className="rounded-sm border border-or/15 bg-blanc p-6 md:p-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-10 w-10 rounded-full bg-cover bg-center ring-1 ring-or/30"
                        style={
                          isUrl
                            ? { backgroundImage: `url(${u?.avatar_url})` }
                            : { backgroundColor: '#D4C5B0' }
                        }
                      />
                      <div>
                        <p className="text-[14px] font-medium text-vert">
                          {u?.prenom ?? 'Anonyme'}
                        </p>
                        <p className="text-[11px] text-texte-sec">
                          {new Date(a.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {a.rating !== null && (
                      <div className="flex gap-0.5 text-or">
                        {Array.from({ length: 5 }).map((_, k) => (
                          <span
                            key={k}
                            className={
                              k < (a.rating ?? 0) ? 'opacity-100' : 'opacity-20'
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-5 font-serif text-[16px] italic leading-[1.6] text-texte">
                    « {a.comment} »
                  </p>

                  {a.reponse_pro && (
                    <div className="mt-5 rounded-sm bg-creme-soft p-5">
                      <p className="overline text-or">Ta réponse</p>
                      <p className="mt-2 text-[13px] leading-[1.6] text-texte">
                        {a.reponse_pro}
                      </p>
                      {a.reponse_date && (
                        <p className="mt-2 text-[10px] tracking-[0.18em] text-texte-sec/70 uppercase">
                          Publiée le{' '}
                          {new Date(a.reponse_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex items-center gap-4 border-t border-or/10 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenReply((o) => (o === a.id ? null : a.id))
                      }
                      className="group inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:text-or"
                    >
                      {a.reponse_pro
                        ? openReply === a.id
                          ? 'Fermer'
                          : 'Modifier ma réponse'
                        : openReply === a.id
                          ? 'Fermer'
                          : 'Répondre à cet avis'}
                      <span
                        className="text-or transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {openReply === a.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 rounded-sm bg-creme-deep p-5">
                          <p className="overline text-or">
                            Ta réponse publique
                          </p>
                          <textarea
                            value={replyDraft[a.id] ?? a.reponse_pro ?? ''}
                            onChange={(e) =>
                              setReplyDraft({
                                ...replyDraft,
                                [a.id]: e.target.value,
                              })
                            }
                            rows={3}
                            placeholder={`Merci ${
                              u?.prenom ?? 'pour ton mot'
                            }, ravie que notre rencontre t'ait portée…`}
                            className="mt-3 w-full resize-none rounded-sm border border-or/20 bg-blanc px-4 py-3 text-[14px] leading-[1.6] text-vert focus:border-or focus:outline-none"
                          />
                          <div className="mt-3 flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => publishReply(a.id)}
                              disabled={publishing === a.id}
                              className="inline-flex h-10 items-center gap-2 rounded-full bg-vert px-5 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark disabled:opacity-60"
                            >
                              {publishing === a.id
                                ? 'Publication…'
                                : a.reponse_pro
                                  ? 'Mettre à jour'
                                  : 'Publier ma réponse'}
                              <span
                                className="text-or-light"
                                aria-hidden="true"
                              >
                                →
                              </span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>

          {filtered.length === 0 && avis.length > 0 && (
            <p className="mt-10 text-center text-[13px] italic text-texte-sec">
              Rien à afficher dans ce filtre.
            </p>
          )}
        </section>
      )}
    </>
  )
}
