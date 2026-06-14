'use client'

import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'
import { DIET_CATEGORIES, DIET_TAGS_MAP, REC_TAGS_MAP } from '@/lib/constants'

const TAGS = Object.entries(REC_TAGS_MAP) as [string, string][]
const DIETS = Object.entries(DIET_TAGS_MAP) as [string, string][]

/** Reco existante à éditer (préremplissage + UPDATE par id). */
export type ExistingReco = {
  id: string
  comment: string | null
  rating: number | null
  tags: string[] | null
  price_indicator: string | null
  photo_urls: string[] | null
}

/**
 * Champs partagés d'une recommandation (note, commentaire, tags, régimes, prix,
 * photos) + soumission de la ligne `recommendations`. Extrait de la page
 * /dashboard/utilisatrice/recommandations/nouvelle pour être réutilisé tel quel
 * dans la modale d'ajout depuis une fiche (composant client island).
 *
 * Le lieu est résolu par le parent via `resolvePlaceId` : la page fait son
 * upsert Google ; la modale renvoie simplement l'id du lieu déjà en base. Une
 * seule source de vérité pour la validation, l'upload photo et l'insert/update.
 *
 * Édition : si `existingReco` est fourni, le formulaire prérempli et la
 * soumission fait un UPDATE ciblé sur `id`. Le verrou owner-only est garanti
 * par la RLS UPDATE de `recommendations` (using/with check user_id = auth.uid()),
 * pas seulement par l'UI.
 */
export function RecoForm({
  userId,
  hilmyCategory,
  placeReady,
  resolvePlaceId,
  existingReco = null,
  onError,
  onSuccess,
  footer,
}: {
  userId: string
  hilmyCategory: string
  placeReady: boolean
  resolvePlaceId: () => Promise<string | null>
  existingReco?: ExistingReco | null
  onError: (msg: string | null) => void
  onSuccess: () => void
  footer?: ReactNode
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isEdit = existingReco !== null
  const initialTags = (existingReco?.tags ?? []).filter((t) => !(t in DIET_TAGS_MAP))
  const initialDiets = (existingReco?.tags ?? []).filter((t) => t in DIET_TAGS_MAP)

  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [comment, setComment] = useState(existingReco?.comment ?? '')
  const [rating, setRating] = useState<number>(existingReco?.rating ?? 0)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [dietTags, setDietTags] = useState<string[]>(initialDiets)
  const [photos, setPhotos] = useState<string[]>(existingReco?.photo_urls ?? [])
  const [priceIndicator, setPriceIndicator] = useState(existingReco?.price_indicator ?? '')
  // Consentement frais demandé à CHAQUE enregistrement (jamais pré-coché, même
  // en édition) → preuve éclairée renouvelée. Bloquant uniquement si des photos
  // sont attachées (la certification porte sur les photos).
  const [consent, setConsent] = useState(false)
  const needsConsent = photos.length > 0

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const toggleDiet = (t: string) =>
    setDietTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const handlePhoto = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      onError('Chaque photo doit faire moins de 5 Mo.')
      return
    }
    setUploading(true)
    onError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('recommendation-photos')
      .upload(path, file, { cacheControl: '3600' })
    if (upErr) {
      onError(upErr.message)
      setUploading(false)
      return
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from('recommendation-photos').getPublicUrl(path)
    setPhotos((p) => [...p, publicUrl])
    setUploading(false)
  }

  const submit = async () => {
    if (comment.trim().length < 50) {
      onError('Ton commentaire doit faire au moins 50 caractères.')
      return
    }
    if (needsConsent && !consent) {
      onError('Tu dois cocher la case pour valider ta photo — sans ça, on ne peut pas la publier.')
      return
    }
    setSubmitting(true)
    onError(null)

    const mergedTags = DIET_CATEGORIES.has(hilmyCategory)
      ? [...tags, ...dietTags]
      : tags
    // Horodaté seulement si des photos sont présentes ET la case cochée.
    // Pas de photos → null (rien à certifier).
    const photoConsentAt = needsConsent && consent ? new Date().toISOString() : null

    if (isEdit && existingReco) {
      // UPDATE ciblé sur SA reco — la RLS (user_id = auth.uid()) verrouille.
      const { error: updErr } = await supabase
        .from('recommendations')
        .update({
          comment: comment.trim(),
          rating: rating || null,
          tags: mergedTags.length ? mergedTags : null,
          price_indicator: priceIndicator || null,
          photo_urls: photos.length ? photos : null,
          photo_consent_at: photoConsentAt,
        })
        .eq('id', existingReco.id)
      setSubmitting(false)
      if (updErr) {
        onError(updErr.message)
        return
      }
      toast.success('Reco mise à jour', { duration: 4000 })
      onSuccess()
      return
    }

    const placeId = await resolvePlaceId()
    if (!placeId) {
      // resolvePlaceId a déjà signalé l'erreur via onError.
      setSubmitting(false)
      return
    }

    const { error: recoErr } = await supabase.from('recommendations').insert({
      user_id: userId,
      type: 'place',
      place_id: placeId,
      comment: comment.trim(),
      rating: rating || null,
      tags: mergedTags.length ? mergedTags : null,
      price_indicator: priceIndicator || null,
      photo_urls: photos.length ? photos : null,
      photo_consent_at: photoConsentAt,
      status: 'published',
    })

    setSubmitting(false)
    if (recoErr) {
      onError(recoErr.message)
      return
    }
    // Toast voix Sara — gamification mig 16 award +10 pts via trigger
    // SECURITY DEFINER, on est optimiste côté client (best-effort).
    toast.success('+10 pts · Tu fais grandir Hilmy', { duration: 4000 })
    onSuccess()
  }

  // NB : le consentement n'est volontairement PAS dans canSubmit. Si une photo
  // est présente sans la coche, le bouton reste CLIQUABLE → submit() lève un
  // message explicite (« Tu dois cocher… »), pour qu'elle comprenne POURQUOI,
  // plutôt qu'un bouton grisé muet.
  const canSubmit =
    placeReady &&
    comment.trim().length >= 50 &&
    comment.trim().length <= 800 &&
    !!hilmyCategory

  return (
    <>
      {placeReady && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-sm border border-or/20 bg-blanc p-8 md:p-10"
        >
          <div className="mb-6 flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">02 · Ta recommandation</span>
          </div>

          <div className="space-y-6">
            <div>
              <span className="overline text-or">Ta note</span>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating((r) => (r === n ? 0 : n))}
                    className={`text-3xl transition-colors ${
                      n <= rating ? 'text-or' : 'text-or/20 hover:text-or/50'
                    }`}
                    aria-label={`${n} étoiles`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-3 self-end text-[11px] italic text-texte-sec">
                  {rating > 0 ? `${rating} / 5` : 'Facultatif'}
                </span>
              </div>
            </div>

            <label className="block">
              <span className="overline text-or">Ton commentaire</span>
              <textarea
                rows={6}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                minLength={50}
                maxLength={800}
                placeholder="Pourquoi on y va, quand, avec qui, ce qu'on commande. Sois toi-même — c'est ça qu'on veut lire."
                className="mt-2 w-full resize-none rounded-sm border border-or/20 bg-creme-soft px-4 py-3 font-serif text-[15px] italic leading-[1.6] text-vert focus:border-or focus:outline-none"
              />
              <span className="mt-1 block text-right text-[11px] text-texte-sec">
                {comment.length} / min 50 · max 800
              </span>
            </label>

            <div>
              <span className="overline text-or">Contexte (optionnel)</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {TAGS.map(([slug, label]) => {
                  const on = tags.includes(slug)
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleTag(slug)}
                      className={`rounded-full border px-4 py-2 text-[11px] font-medium tracking-[0.18em] uppercase transition-all ${
                        on
                          ? 'border-vert bg-vert text-creme'
                          : 'border-or/30 bg-blanc text-texte-sec hover:border-or'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {DIET_CATEGORIES.has(hilmyCategory) && (
              <div>
                <span className="overline text-or">Régime alimentaire (optionnel)</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DIETS.map(([slug, label]) => {
                    const on = dietTags.includes(slug)
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => toggleDiet(slug)}
                        className={`rounded-full border px-4 py-2 text-[11px] font-medium tracking-[0.18em] uppercase transition-all ${
                          on
                            ? 'border-or bg-or text-vert'
                            : 'border-or/30 bg-blanc text-texte-sec hover:border-or'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <span className="overline text-or">Indicateur de prix (optionnel)</span>
              <div className="mt-2 flex gap-2">
                {['€', '€€', '€€€'].map((p) => {
                  const on = priceIndicator === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriceIndicator(on ? '' : p)}
                      className={`rounded-full border px-5 py-2 font-serif text-lg transition-all ${
                        on
                          ? 'border-or bg-or text-vert'
                          : 'border-or/30 bg-blanc text-texte-sec hover:border-or'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="overline text-or">Tes photos (optionnel)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handlePhoto(f)
                  if (e.target) e.target.value = ''
                }}
              />
              <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-6">
                {photos.map((url, i) => (
                  <div
                    key={url}
                    className="group relative aspect-square overflow-hidden rounded-sm bg-creme-deep"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                      className="absolute top-1 right-1 rounded-full bg-blanc/90 px-2 py-0.5 text-[10px] text-red-900 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      ×
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded-full bg-or/90 px-2 py-0.5 text-[8px] tracking-[0.18em] text-vert uppercase">
                        Couverture
                      </span>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || photos.length >= 6}
                  className="flex aspect-square items-center justify-center rounded-sm border-2 border-dashed border-or/40 bg-creme-soft text-2xl text-or transition-colors hover:border-or hover:bg-blanc disabled:opacity-40"
                >
                  {uploading ? '…' : '+'}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-texte-sec">
                Jusqu&apos;à 6 photos, 5 Mo chacune.
              </p>
            </div>

            {needsConsent && (
              <div className="rounded-sm border border-or/25 bg-creme-soft p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-vert"
                  />
                  <span className="text-[13px] leading-[1.55] text-vert">
                    Je certifie avoir le droit de publier ces photos et qu&apos;aucune
                    personne identifiable n&apos;y figure sans son accord.
                  </span>
                </label>
                <p className="mt-2 pl-7 text-[12px] font-medium leading-[1.5] text-vert">
                  Coche cette case pour que ta photo soit publiée. Sans la coche,
                  elle n&apos;est pas validée — on ne la met pas en ligne.
                </p>
                <p className="mt-2 pl-7 text-[11px] leading-[1.5] text-texte-sec">
                  Tu restes responsable des images que tu partages. Une photo
                  pourra être retirée sur signalement. Pas de visage de tiers ni
                  d&apos;enfant sans le consentement des personnes concernées.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="mt-10 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.2em] text-creme uppercase transition-all hover:bg-vert-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? isEdit
              ? 'Enregistrement…'
              : 'Publication…'
            : isEdit
              ? 'Enregistrer les modifications'
              : 'Publier ma recommandation'}
          <span
            className="text-or-light transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </button>
        {footer}
      </div>
    </>
  )
}
