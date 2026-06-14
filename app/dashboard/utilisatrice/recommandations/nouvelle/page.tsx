'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import {
  PlaceAutocomplete,
  type AutocompletePlace,
} from '@/components/google/PlaceAutocomplete'
import { RecoForm } from '@/components/v2/RecoForm'
import { createClient } from '@/lib/supabase/client'
import { PLACE_CATEGORIES_MAP } from '@/lib/constants'

type PlaceDetails = AutocompletePlace & {
  phone: string | null
  website: string | null
  opening_hours: string[] | null
  photos: string[]
}

const PLACE_CATS = Object.entries(PLACE_CATEGORIES_MAP) as [string, string][]

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

  const [userId, setUserId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [place, setPlace] = useState<PlaceDetails | null>(null)
  const [hilmyCategory, setHilmyCategory] = useState<string>('')

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

  // Résout l'id du lieu pour RecoForm : upsert places depuis les détails Google.
  // URL stable servie par le proxy /api/places/photo — sans clé Google
  // (cf. lib/google/places.ts placePhotoProxyUrl). Persistée telle quelle,
  // lue directement par le web et l'app mobile. www canonique = pas de hop.
  const resolvePlaceId = async (): Promise<string | null> => {
    if (!place) return null
    const photoProxyUrl = place.google_place_id
      ? `https://www.hilmy.io/api/places/photo?place_id=${encodeURIComponent(
          place.google_place_id,
        )}`
      : null
    let placeId: string | null = null
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('google_place_id', place.google_place_id)
      .maybeSingle()

    if (existing) {
      placeId = existing.id
      // Optionally patch main_photo_url if missing
      if (photoProxyUrl) {
        await supabase
          .from('places')
          .update({ main_photo_url: photoProxyUrl })
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
          main_photo_url: photoProxyUrl,
          photos: place.photos,
        })
        .select('id')
        .single()

      if (insErr) {
        setError(`Impossible d'ajouter le lieu : ${insErr.message}`)
        return null
      }
      placeId = inserted.id
    }

    if (!placeId) {
      setError('Lieu introuvable — réessaie.')
      return null
    }
    return placeId
  }

  if (checking || !userId) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-or border-t-transparent" />
      </section>
    )
  }

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

        {/* Step 2 + CTA : formulaire partagé */}
        <RecoForm
          userId={userId}
          hilmyCategory={hilmyCategory}
          placeReady={place !== null}
          resolvePlaceId={resolvePlaceId}
          onError={setError}
          onSuccess={() => router.push('/dashboard/utilisatrice/recommandations')}
          footer={
            <Link
              href="/dashboard/utilisatrice/recommandations"
              className="text-[12px] text-texte-sec hover:text-or"
            >
              ← Retour à mes recommandations
            </Link>
          }
        />
      </section>
    </>
  )
}
