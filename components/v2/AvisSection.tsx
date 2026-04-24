'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { GoldLine } from '@/components/ui/GoldLine'

export type AvisItem = {
  id: string
  comment: string | null
  rating: number | null
  created_at: string
  reponse_pro: string | null
  reponse_date: string | null
  user: { prenom: string | null; avatar_url: string | null } | null
  likes_count: number
  liked_by_me: boolean
}

interface Props {
  profileId: string
  profileSlug: string
  profileNom: string
  /** Organisatrice (user_id de la fiche) vue depuis la user courante */
  isOwner: boolean
  isAuthenticated: boolean
  initialAvis: AvisItem[]
}

export function AvisSection({
  profileId,
  profileSlug,
  profileNom,
  isOwner,
  isAuthenticated,
  initialAvis,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [avis, setAvis] = useState<AvisItem[]>(initialAvis)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const redirectToSignup = () => {
    const redirectTo = `/prestataire-v2/${profileSlug}#avis`
    router.push(`/auth/signup?redirect=${encodeURIComponent(redirectTo)}`)
  }

  // ── Form inline (si pas owner) ───────────────────────────────────
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    // Au moins un des deux doit être rempli ; commentaire, si saisi, doit respecter min/max.
    const hasRating = rating > 0
    const trimmed = comment.trim()
    const hasValidComment = trimmed.length >= 50 && trimmed.length <= 800
    const commentIsEmpty = trimmed.length === 0
    // Mode "juste note" : hasRating && commentIsEmpty
    // Mode "juste commentaire" : !hasRating && hasValidComment
    // Mode "les deux" : hasRating && hasValidComment
    return (
      !submitting &&
      ((hasRating && commentIsEmpty) ||
        (hasRating && hasValidComment) ||
        (!hasRating && hasValidComment))
    )
  }, [rating, comment, submitting])

  const missingHint = useMemo(() => {
    const trimmed = comment.trim()
    if (rating === 0 && trimmed.length === 0) {
      return 'Mets une note, un commentaire, ou les deux pour publier.'
    }
    if (trimmed.length > 0 && trimmed.length < 50) {
      return `Ton commentaire doit faire au moins 50 caractères (${trimmed.length}/50).`
    }
    if (trimmed.length > 800) {
      return `Max 800 caractères (${trimmed.length}/800).`
    }
    return null
  }, [rating, comment])

  const submitAvis = async () => {
    if (!isAuthenticated) {
      redirectToSignup()
      return
    }
    if (!canSubmit) return
    setSubmitting(true)
    setFormError(null)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      redirectToSignup()
      return
    }
    const trimmedComment = comment.trim()
    const { data: inserted, error: insErr } = await supabase
      .from('recommendations')
      .insert({
        user_id: user.id,
        type: 'prestataire',
        profile_id: profileId,
        rating: rating > 0 ? rating : null,
        comment: trimmedComment.length > 0 ? trimmedComment : null,
        status: 'published',
      })
      .select('id, created_at')
      .single()

    if (insErr || !inserted) {
      setFormError(insErr?.message ?? 'Impossible de publier.')
      setSubmitting(false)
      return
    }

    // Fetch user_profile pour nom + avatar
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('prenom, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()

    // Optimistic add
    const newItem: AvisItem = {
      id: inserted.id,
      comment: trimmedComment.length > 0 ? trimmedComment : null,
      rating: rating > 0 ? rating : null,
      created_at: inserted.created_at,
      reponse_pro: null,
      reponse_date: null,
      user: {
        prenom: prof?.prenom ?? null,
        avatar_url: prof?.avatar_url ?? null,
      },
      likes_count: 0,
      liked_by_me: false,
    }
    setAvis((cur) => [newItem, ...cur])
    setRating(0)
    setComment('')
    setSubmitting(false)
    showToast('Ton avis est publié ✨')

    // Best-effort notify prestataire (seulement si commentaire — email plus utile)
    if (trimmedComment.length > 0) {
      fetch('/api/recommendations/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: inserted.id }),
      }).catch(() => {})
    }

    router.refresh()
  }

  // ── Like handler ──────────────────────────────────────────────────
  const toggleLike = async (recoId: string) => {
    if (!isAuthenticated) {
      redirectToSignup()
      return
    }
    // Optimistic
    setAvis((cur) =>
      cur.map((a) =>
        a.id === recoId
          ? {
              ...a,
              liked_by_me: !a.liked_by_me,
              likes_count: a.liked_by_me ? a.likes_count - 1 : a.likes_count + 1,
            }
          : a,
      ),
    )
    const res = await fetch(`/api/recommendations/${recoId}/like`, {
      method: 'POST',
    })
    if (!res.ok) {
      // Revert
      setAvis((cur) =>
        cur.map((a) =>
          a.id === recoId
            ? {
                ...a,
                liked_by_me: !a.liked_by_me,
                likes_count: a.liked_by_me ? a.likes_count - 1 : a.likes_count + 1,
              }
            : a,
        ),
      )
      showToast('Impossible pour l\'instant. Réessaie.')
    }
  }

  // ── Report handler ────────────────────────────────────────────────
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const submitReport = async () => {
    if (!reportingId) return
    setReportSubmitting(true)
    const res = await fetch(`/api/recommendations/${reportingId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reportReason.trim() || null }),
    })
    setReportSubmitting(false)
    if (res.ok) {
      showToast('Signalement envoyé, on regarde ça.')
    } else {
      showToast('Impossible d\'envoyer le signalement.')
    }
    setReportingId(null)
    setReportReason('')
  }

  // ── Reply handler (organisatrice uniquement) ───────────────────────
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)

  const submitReply = async () => {
    if (!replyingId) return
    setReplySubmitting(true)
    const res = await fetch(`/api/recommendations/${replyingId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: replyText.trim() }),
    })
    const body = await res.json().catch(() => ({}))
    setReplySubmitting(false)
    if (res.ok) {
      setAvis((cur) =>
        cur.map((a) =>
          a.id === replyingId
            ? {
                ...a,
                reponse_pro: replyText.trim(),
                reponse_date: new Date().toISOString(),
              }
            : a,
        ),
      )
      showToast('Ta réponse est publiée.')
      setReplyingId(null)
      setReplyText('')
    } else {
      showToast(body.error ?? 'Erreur.')
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  const prenomPresta = profileNom.split(' ')[0] ?? profileNom

  return (
    <>
      {/* Form inline (cachée si owner, visible sinon — cliquable → redirect si non-auth) */}
      {!isOwner && (
        <div className="mt-6 rounded-sm border border-or/20 bg-creme-soft p-6 md:p-7">
          <div className="flex items-center gap-4">
            <GoldLine width={28} />
            <span className="overline text-or">Tu es passée chez {prenomPresta} ?</span>
          </div>
          <p className="mt-3 text-[13px] leading-[1.6] text-texte-sec">
            Laisse juste une note, juste un commentaire, ou les deux — comme tu
            préfères. Ton retour aide les copines qui hésitent.
          </p>

          <div
            className="mt-5 space-y-4"
            onClickCapture={(e) => {
              if (!isAuthenticated) {
                e.stopPropagation()
                e.preventDefault()
                redirectToSignup()
              }
            }}
          >
            <div>
              <p className="overline text-or">Note (optionnelle)</p>
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      isAuthenticated && setRating((r) => (r === n ? 0 : n))
                    }
                    aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                    className={`text-3xl transition-all ${
                      n <= rating ? 'text-or' : 'text-or/20 hover:text-or/50'
                    }`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-3 text-[12px] italic text-texte-sec">
                  {rating > 0 ? `${rating} / 5` : '— optionnel'}
                </span>
              </div>
            </div>

            <div>
              <p className="overline text-or">Commentaire (optionnel)</p>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) =>
                  isAuthenticated && setComment(e.target.value)
                }
                maxLength={800}
                placeholder={
                  isAuthenticated
                    ? 'Qu\'est-ce qui t\'a marquée ? Parle comme à une copine.'
                    : 'Connecte-toi pour laisser un commentaire.'
                }
                className="mt-2 w-full resize-none rounded-sm border border-or/20 bg-blanc px-4 py-3 font-serif text-[15px] italic leading-[1.6] text-vert focus:border-or focus:outline-none"
              />
              <p className="mt-1 text-right text-[11px] text-texte-sec">
                {comment.length > 0
                  ? `${comment.length} / min 50 · max 800`
                  : '50 caractères minimum si tu laisses un commentaire.'}
              </p>
            </div>

            {formError && (
              <p className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
                {formError}
              </p>
            )}

            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={submitAvis}
                disabled={isAuthenticated && !canSubmit}
                className="group inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Publication…'
                  : isAuthenticated
                    ? 'Je partage avec les filles'
                    : 'Connecte-toi pour partager'}
                <span
                  className="text-or-light transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  ✨
                </span>
              </button>
              {isAuthenticated && missingHint && (
                <p className="text-right text-[11px] italic text-texte-sec">
                  {missingHint}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Liste des avis */}
      {avis.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {avis.map((a) => {
            const avatar = a.user?.avatar_url
            const isUrl =
              !!avatar && (avatar.startsWith('http') || avatar.startsWith('/'))
            const dateFr = new Date(a.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            return (
              <li
                key={a.id}
                className="rounded-sm border border-or/15 bg-blanc p-6 md:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center ring-1 ring-or/30"
                      style={
                        isUrl
                          ? { backgroundImage: `url(${avatar})` }
                          : { backgroundColor: '#D4C5B0' }
                      }
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-[14px] font-medium text-vert">
                        {a.user?.prenom ?? 'Une copine'}
                      </p>
                      <p className="text-[11px] text-texte-sec">{dateFr}</p>
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

                {a.comment && (
                  <p className="mt-4 font-serif text-[15px] italic leading-[1.6] text-texte">
                    « {a.comment} »
                  </p>
                )}

                {/* Réponse pro (si existante) */}
                {a.reponse_pro && (
                  <div className="mt-4 rounded-sm border-l-2 border-or bg-creme-soft p-4">
                    <p className="overline text-or">
                      Réponse de {prenomPresta}
                    </p>
                    <p className="mt-2 text-[13px] leading-[1.6] text-texte">
                      {a.reponse_pro}
                    </p>
                    {a.reponse_date && (
                      <p className="mt-2 text-[10px] tracking-[0.18em] text-texte-sec/70 uppercase">
                        {new Date(a.reponse_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Footer actions : like, report, reply (owner) */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-or/10 pt-4 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleLike(a.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 tracking-[0.18em] uppercase transition-colors ${
                      a.liked_by_me
                        ? 'bg-or/15 text-or-deep'
                        : 'text-texte-sec hover:bg-creme-deep hover:text-or-deep'
                    }`}
                    aria-pressed={a.liked_by_me}
                  >
                    <span aria-hidden="true">{a.liked_by_me ? '❤️' : '♡'}</span>
                    {a.likes_count > 0
                      ? `${a.likes_count} like${a.likes_count > 1 ? 's' : ''}`
                      : 'Liker'}
                  </button>

                  <div className="flex items-center gap-3">
                    {isOwner && !a.reponse_pro && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingId(a.id)
                          setReplyText('')
                        }}
                        className="tracking-[0.18em] text-vert uppercase transition-colors hover:text-or"
                      >
                        Répondre
                      </button>
                    )}
                    {isOwner && a.reponse_pro && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingId(a.id)
                          setReplyText(a.reponse_pro ?? '')
                        }}
                        className="tracking-[0.18em] text-vert uppercase transition-colors hover:text-or"
                      >
                        Modifier ta réponse
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAuthenticated) {
                          redirectToSignup()
                          return
                        }
                        setReportingId(a.id)
                        setReportReason('')
                      }}
                      className="tracking-[0.18em] text-texte-sec uppercase transition-colors hover:text-red-900"
                      aria-label="Signaler cet avis"
                    >
                      Signaler
                    </button>
                  </div>
                </div>

                {/* Reply form (inline, owner only) */}
                <AnimatePresence>
                  {replyingId === a.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 rounded-sm bg-creme-soft p-4">
                        <p className="overline text-or">Ta réponse publique</p>
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          maxLength={800}
                          placeholder="Merci pour ton mot, ravie…"
                          className="mt-2 w-full resize-none rounded-sm border border-or/20 bg-blanc px-3 py-2 text-[13px] leading-[1.6] text-vert focus:border-or focus:outline-none"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingId(null)
                              setReplyText('')
                            }}
                            className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-vert"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={submitReply}
                            disabled={
                              replySubmitting || !replyText.trim()
                            }
                            className="inline-flex h-9 items-center rounded-full bg-vert px-5 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-vert-dark disabled:opacity-60"
                          >
                            {replySubmitting ? 'Envoi…' : 'Publier'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Report form (inline, tout user auth) */}
                <AnimatePresence>
                  {reportingId === a.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 rounded-sm border border-red-900/20 bg-red-900/5 p-4">
                        <p className="overline text-red-900">
                          Signaler cet avis
                        </p>
                        <p className="mt-1 text-[12px] text-texte-sec">
                          Si cet avis te semble injuste, haineux ou faux.
                          L&apos;équipe HILMY regarde.
                        </p>
                        <textarea
                          rows={2}
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          maxLength={500}
                          placeholder="Motif (optionnel)"
                          className="mt-2 w-full resize-none rounded-sm border border-red-900/20 bg-blanc px-3 py-2 text-[12px] text-vert focus:border-red-900 focus:outline-none"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReportingId(null)
                              setReportReason('')
                            }}
                            className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-vert"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={submitReport}
                            disabled={reportSubmitting}
                            className="inline-flex h-9 items-center rounded-full bg-red-900 px-5 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-red-900/90 disabled:opacity-60"
                          >
                            {reportSubmitting ? 'Envoi…' : 'Confirmer'}
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
      ) : (
        <div className="mt-6 rounded-sm border border-dashed border-or/30 bg-blanc py-12 text-center">
          <p className="font-serif text-xl italic text-vert">
            Pas encore d&apos;avis.
          </p>
          <p className="mt-2 text-[13px] text-texte-sec">
            {isOwner
              ? 'Les premiers avis arriveront dès que tes clientes partageront leur expérience.'
              : 'Sois la première à raconter ton expérience.'}
          </p>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-vert px-6 py-3 text-[13px] font-medium text-creme shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
