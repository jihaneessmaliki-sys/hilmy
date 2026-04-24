'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'
import { REC_TAGS_MAP } from '@/lib/constants'

const TAGS = Object.entries(REC_TAGS_MAP) as [string, string][]
const MAX_TAGS = 5

interface Props {
  profileId: string
  /** Callback appelé après insert réussi (avec l'id du nouvel avis).
   *  - En contexte modal : ferme le modal + refresh parent
   *  - En contexte page : redirect vers la fiche avec ancre #avis
   */
  onSuccess: (recommendationId: string) => void
  /** Variant compact (modal) vs spacieux (page). */
  variant?: 'page' | 'modal'
}

export function AvisFormBody({ profileId, onSuccess, variant = 'page' }: Props) {
  const supabase = createClient()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missing = useMemo(() => {
    const errs: string[] = []
    if (rating === 0) errs.push('une note')
    if (comment.trim().length < 50)
      errs.push(`un commentaire (${comment.trim().length}/50)`)
    if (comment.trim().length > 800) errs.push('commentaire max 800')
    return errs
  }, [rating, comment])

  const canSubmit = missing.length === 0 && !submitting

  const toggleTag = (slug: string) => {
    setTags((cur) => {
      if (cur.includes(slug)) return cur.filter((t) => t !== slug)
      if (cur.length >= MAX_TAGS) return cur
      return [...cur, slug]
    })
  }

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Session expirée — reconnecte-toi.')
      setSubmitting(false)
      return
    }
    const { data: inserted, error: insErr } = await supabase
      .from('recommendations')
      .insert({
        user_id: user.id,
        type: 'prestataire',
        profile_id: profileId,
        rating,
        comment: comment.trim(),
        tags: tags.length ? tags : null,
        status: 'published',
      })
      .select('id')
      .single()
    if (insErr || !inserted) {
      setError(insErr?.message ?? 'Impossible de publier ton avis.')
      setSubmitting(false)
      return
    }
    // Best-effort notify
    try {
      await fetch('/api/recommendations/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: inserted.id }),
      })
    } catch {
      // silencieux — non bloquant
    }
    onSuccess(inserted.id)
  }

  const sectionClass =
    variant === 'modal'
      ? 'space-y-5'
      : 'space-y-8'
  const cardClass =
    variant === 'modal'
      ? 'rounded-sm border border-or/15 bg-creme-soft p-5'
      : 'rounded-sm border border-or/20 bg-blanc p-8 md:p-10'

  return (
    <div className={sectionClass}>
      {error && (
        <div className="rounded-sm border border-red-900/20 bg-red-900/5 px-4 py-3 text-[13px] text-red-900">
          {error}
        </div>
      )}

      {/* Note */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center gap-4">
          <GoldLine width={variant === 'modal' ? 24 : 32} />
          <span className="overline text-or">01 · Ta note</span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating((r) => (r === n ? 0 : n))}
              aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
              className={`text-${variant === 'modal' ? '3xl' : '4xl'} transition-all ${
                n <= rating ? 'text-or' : 'text-or/20 hover:text-or/50'
              }`}
            >
              ★
            </button>
          ))}
          <span className="ml-3 self-center text-[12px] italic text-texte-sec">
            {rating > 0 ? `${rating} / 5` : '— Clique pour noter'}
          </span>
        </div>
      </div>

      {/* Commentaire */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center gap-4">
          <GoldLine width={variant === 'modal' ? 24 : 32} />
          <span className="overline text-or">02 · Ton récit</span>
        </div>
        <label className="block">
          <textarea
            rows={variant === 'modal' ? 5 : 7}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            minLength={50}
            maxLength={800}
            placeholder="Pourquoi tu la recommandes, comment s'est passé ton passage, ce qui t'a marquée. Sois toi-même — c'est ça qu'on veut lire."
            className="w-full resize-none rounded-sm border border-or/20 bg-blanc px-4 py-3 font-serif text-[15px] italic leading-[1.6] text-vert focus:border-or focus:outline-none"
          />
          <span className="mt-1 block text-right text-[11px] text-texte-sec">
            {comment.length} / min 50 · max 800
          </span>
        </label>
      </div>

      {/* Tags */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center gap-4">
          <GoldLine width={variant === 'modal' ? 24 : 32} />
          <span className="overline text-or">03 · Contexte (optionnel)</span>
        </div>
        <p className="mb-3 text-[12px] italic text-texte-sec">
          Max {MAX_TAGS} tags.
        </p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(([slug, label]) => {
            const on = tags.includes(slug)
            const disabled = !on && tags.length >= MAX_TAGS
            return (
              <button
                key={slug}
                type="button"
                onClick={() => toggleTag(slug)}
                disabled={disabled}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase transition-all ${
                  on
                    ? 'border-vert bg-vert text-creme'
                    : 'border-or/30 bg-blanc text-texte-sec hover:border-or'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.2em] text-creme uppercase transition-all hover:bg-vert-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Publication…' : 'Je partage avec les filles'}
          <span
            className="text-or-light transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            ✨
          </span>
        </button>
        <AnimatePresence>
          {missing.length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-right text-[12px] italic text-texte-sec"
            >
              Pour partager :{' '}
              <span className="text-or-deep">{missing.join(', ')}</span>.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
