'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import {
  PlaceAutocomplete,
  type AutocompletePlace,
} from '@/components/google/PlaceAutocomplete'
import { createClient } from '@/lib/supabase/client'
import {
  DIET_CATEGORIES,
  DIET_TAGS_MAP,
  PLACE_CATEGORIES_MAP,
  REC_TAGS_MAP,
} from '@/lib/constants'

type PlaceDetails = AutocompletePlace & {
  phone: string | null
  website: string | null
  opening_hours: string[] | null
  photos: string[]
}

const PLACE_CATS = Object.entries(PLACE_CATEGORIES_MAP) as [string, string][]
const TAGS = Object.entries(REC_TAGS_MAP) as [string, string][]
const DIETS = Object.entries(DIET_TAGS_MAP) as [string, string][]

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

function guessPlaceCategory(googleType: string | null): string {
  if (!googleType) return 'restos-cafes'
  const t = googleType.toLowerCase()
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('food')) return 'restos-cafes'
  if (t.includes('tea') || t.includes('coffee_shop') || t.includes('bakery')) return 'salons-the'
  if (t.includes('spa') || t.includes('wellness') || t.includes('massage')) return 'bien-etre'
  if (t.includes('store') || t.includes('clothing') || t.includes('boutique')) return 'boutiques'
  if (t.includes('school') || t.includes('child') || t.includes('family')) return 'enfants'
  if (t.includes('lodging') || t.includes('hotel')) return 'hebergements'
  if (t.includes('hospital') || t.includes('doctor') || t.includes('pharmacy')) return 'sante'
  if (t.includes('museum') || t.includes('library') || t.includes('culture')) return 'culturel'
  if (t.includes('park') || t.includes('gym') || t.includes('nature')) return 'sport-nature'
  return 'restos-cafes'
}

export default function RecommandationNouvellePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [place, setPlace] = useState<PlaceDetails | null>(null)
  const [hilmyCategory, setHilmyCategory] = useState<string>('')
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [tags, setTags] = useState<string[]>([])
  const [dietTags, setDietTags] = useState<string[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [priceIndicator, setPriceIndicator] = useState('')

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?next=/dashboard/utilisatrice/recommandations/nouvelle')
        return
      }
      setUserId(user.id)
      setChecking(false)
    }
    run()
  }, [router, supabase])

  const handleSelect = async (p: AutocompletePlace) => {
    setError(null)
    try {
      const res = await fetch(
        `/api/places/details?place_id=${encodeURIComponent(p.google_place_id)}`,
      )
      if (!res.ok) {
        setError('Impossible de récupérer ce lieu.')
        return
      }
      const { place: full } = (await res.json()) as { place: PlaceDetails }
      setPlace(full)
      setHilmyCategory(guessPlaceCategory(full.google_category))
    } catch {
      setError('Erreur réseau — réessaie.')
    }
  }

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const toggleDiet = (t: string) =>
    setDietTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const handlePhoto = async (file: File) => {
    if (!userId) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Chaque photo doit faire moins de 5 Mo.')
      return
    }
    setUploading(true)
    setError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('recommendation-photos')
      .upload(path, file, { cacheControl: '3600' })
    if (upErr) {
      setError(upErr.message)
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
    if (!userId || !place) return
    if (comment.trim().length < 50) {
      setError('Ton commentaire doit faire au moins 50 caractères.')
      return
    }
    setSubmitting(true)
    setError(null)

    // Upsert place
    let placeId: string | null = null
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('google_place_id', place.google_place_id)
      .maybeSingle()

    if (existing) {
      placeId = existing.id
      // Optionally patch main_photo_url if missing
      if (place.photos[0]) {
        await supabase
          .from('places')
          .update({ main_photo_url: place.photos[0] })
          .eq('id', existing.id)
          .is('main_photo_url', null)
      }
    } else {
      const slug = `${slugify(place.name)}-${Math.random().toString(36).slice(2, 6)}`
      const { data: inserted, error: insErr } = await supabase
        .from('places')
        .insert({
          google_place_id: place.google_place_id,
          name: place.name,
          slug,
          address: place.address,
          city: place.city,
          region: place.region || null,
          country: place.country || 'France',
          latitude: place.latitude,
          longitude: place.longitude,
          google_category: place.google_category,
          hilmy_category: hilmyCategory || null,
          main_photo_url: place.photos[0] ?? null,
          photos: place.photos,
        })
        .select('id')
        .single()

      if (insErr) {
        setError(`Impossible d'ajouter le lieu : ${insErr.message}`)
        setSubmitting(false)
        return
      }
      placeId = inserted.id
    }

    if (!placeId) {
      setError('Lieu introuvable — réessaie.')
      setSubmitting(false)
      return
    }

    const mergedTags = DIET_CATEGORIES.has(hilmyCategory)
      ? [...tags, ...dietTags]
      : tags
    const { error: recoErr } = await supabase.from('recommendations').insert({
      user_id: userId,
      type: 'place',
      place_id: placeId,
      comment: comment.trim(),
      rating: rating || null,
      tags: mergedTags.length ? mergedTags : null,
      price_indicator: priceIndicator || null,
      photo_urls: photos.length ? photos : null,
      status: 'published',
    })

    setSubmitting(false)
    if (recoErr) {
      setError(recoErr.message)
      return
    }
    router.push('/dashboard/utilisatrice/recommandations')
  }

  if (checking) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-or border-t-transparent" />
      </section>
    )
  }

  const canSubmit =
    place && comment.trim().length >= 50 && comment.trim().length <= 800 && hilmyCategory

  return (
    <>
      <DashboardHeader
        kicker="Recommander un lieu"
        titre={
          <>
            Une adresse qui
            <br />
            <em className="font-serif italic text-or">mérite le bouche-à-oreille.</em>
          </>
        }
        lead="Partage une découverte, un coup de cœur, un lieu qui t'a fait du bien. Les copines te diront merci."
      />

      <section className="px-6 py-10 md:px-12 md:py-14">
        {error && (
          <div className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-4 py-3 text-[13px] text-red-900">
            {error}
          </div>
        )}

        {/* Step 1 : search */}
        <div className="rounded-sm border border-or/20 bg-blanc p-8 md:p-10">
          <div className="mb-6 flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">01 · Le lieu</span>
          </div>
          <PlaceAutocomplete
            placeholder="Café Lomi Paris, Studio Oïko Genève, restaurant Bocca Milano…"
            onSelect={handleSelect}
          />

          <AnimatePresence>
            {place && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 overflow-hidden rounded-sm border border-or/15 bg-creme-soft"
              >
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                  {place.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={place.photos[0]}
                      alt={place.name}
                      className="h-24 w-24 rounded-sm object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-sm bg-creme-deep" />
                  )}
                  <div className="flex-1">
                    <p className="font-serif text-xl font-light text-vert">
                      {place.name}
                    </p>
                    <p className="text-[12px] text-texte-sec">{place.address}</p>
                    {place.rating !== null && (
                      <p className="mt-1 text-[11px] tracking-[0.22em] text-or uppercase">
                        ★ {place.rating.toFixed(1)} · {place.user_rating_count}{' '}
                        avis Google
                      </p>
                    )}
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="overline text-or">Catégorie HILMY</span>
                    <select
                      value={hilmyCategory}
                      onChange={(e) => setHilmyCategory(e.target.value)}
                      className="rounded-sm border border-or/20 bg-blanc px-3 py-2 text-[13px] text-vert"
                    >
                      {PLACE_CATS.map(([slug, label]) => (
                        <option key={slug} value={slug}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 2 : reco */}
        {place && (
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
                        onClick={() =>
                          setPhotos((p) => p.filter((u) => u !== url))
                        }
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
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <div className="mt-10 flex flex-col items-end gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.2em] text-creme uppercase transition-all hover:bg-vert-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Publication…' : 'Publier ma recommandation'}
            <span
              className="text-or-light transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </button>
          <Link
            href="/dashboard/utilisatrice/recommandations"
            className="text-[12px] text-texte-sec hover:text-or"
          >
            ← Retour à mes recommandations
          </Link>
        </div>
      </section>
    </>
  )
}
