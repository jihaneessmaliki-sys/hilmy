'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  OnboardingShell,
  OnboardingHeader,
} from '@/components/onboarding/OnboardingShell'
import {
  PlaceAutocomplete,
  type AutocompletePlace,
} from '@/components/google/PlaceAutocomplete'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES_MAP } from '@/lib/constants'
import { formatVilleDisplay } from '@/lib/geo/city-centroids'

type PlaceDetails = AutocompletePlace & {
  phone: string | null
  website: string | null
  opening_hours: string[] | null
  photos: string[]
}

const CATEGORIES = Object.entries(CATEGORIES_MAP) as [string, string][]

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

function guessCategorie(googleType: string | null): string {
  if (!googleType) return 'beaute'
  const t = googleType.toLowerCase()
  if (t.includes('beauty') || t.includes('hair') || t.includes('nail')) return 'beaute'
  if (t.includes('spa') || t.includes('massage') || t.includes('wellness')) return 'bien-etre'
  if (t.includes('gym') || t.includes('yoga') || t.includes('pilates') || t.includes('fitness')) return 'sport-nutrition'
  if (t.includes('child') || t.includes('family') || t.includes('school')) return 'enfants-famille'
  if (t.includes('clothing') || t.includes('jewelry') || t.includes('boutique')) return 'mode-style'
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('caterer')) return 'cuisine'
  if (t.includes('lawyer') || t.includes('accountant') || t.includes('consultant')) return 'business-juridique'
  return 'beaute'
}

export default function GoogleOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [step, setStep] = useState<'search' | 'loading' | 'preview'>('search')
  const [details, setDetails] = useState<PlaceDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Overrides éditables par l'utilisatrice
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?next=/onboarding/prestataire/google')
        return
      }
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profile) {
        router.push('/dashboard/prestataire')
        return
      }
      setChecking(false)
    }
    run()
  }, [router, supabase])

  const handleSelect = async (place: AutocompletePlace) => {
    setStep('loading')
    setError(null)
    try {
      const res = await fetch(
        `/api/places/details?place_id=${encodeURIComponent(place.google_place_id)}`,
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Impossible de récupérer les détails.')
        setStep('search')
        return
      }
      const { place: full } = (await res.json()) as { place: PlaceDetails }
      setDetails(full)
      setNom(full.name)
      setCategorie(guessCategorie(full.google_category))
      setTagline('')
      setDescription('')
      setStep('preview')
    } catch {
      setError('Erreur réseau. Réessaie.')
      setStep('search')
    }
  }

  const reset = () => {
    setStep('search')
    setDetails(null)
    setNom('')
    setCategorie('')
    setTagline('')
    setDescription('')
    setError(null)
  }

  const submit = async () => {
    if (!userId || !details) return
    if (!nom.trim() || !categorie || !whatsapp.trim()) {
      setError('Il manque le nom, la catégorie ou un numéro WhatsApp.')
      return
    }
    setSubmitting(true)
    setError(null)

    const baseSlug = slugify(nom) || `prestataire-${Date.now()}`
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

    const { error: insErr } = await supabase.from('profiles').insert({
      user_id: userId,
      nom: nom.trim(),
      slug,
      categorie,
      pays: details.country || null,
      ville: formatVilleDisplay(details.city) ?? details.city ?? '',
      whatsapp: whatsapp.trim(),
      email: userEmail || null,
      instagram: instagram.trim() || null,
      site_web: details.website,
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      galerie: details.photos,
      photos: details.photos,
      services: [],
      status: 'pending',
      source_import: 'google_places',
    })

    setSubmitting(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    router.push('/onboarding/prestataire/publiee')
  }

  if (checking) {
    return (
      <OnboardingShell step={2} totalSteps={3}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-or border-t-transparent" />
        </div>
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell step={2} totalSteps={3} backLabel="Changer de méthode">
      <section className="bg-creme pt-16 pb-8 md:pt-24">
        <div className="mx-auto max-w-3xl px-6 md:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <OnboardingHeader
              number="02"
              kicker="DEPUIS GOOGLE PLACES"
              title={
                <>
                  Trouve ton lieu,{' '}
                  <em className="font-serif italic text-or">on récupère le reste.</em>
                </>
              }
              subtitle={
                <>
                  Cherche ton adresse dans Google Maps. On importe le nom,
                  l&apos;adresse, les photos, les horaires — tu n&apos;as plus
                  qu&apos;à ajouter ton WhatsApp et ton histoire.
                </>
              }
            />
          </motion.div>
        </div>
      </section>

      <section className="pb-28">
        <div className="mx-auto max-w-3xl px-6 md:px-20">
          {error && (
            <div className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-4 py-3 text-[13px] text-red-900">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="rounded-sm border border-or/20 bg-blanc p-8 md:p-10">
                  <label className="mb-3 block">
                    <span className="overline text-or">
                      Nom du lieu ou adresse
                    </span>
                  </label>
                  <PlaceAutocomplete
                    placeholder="Studio Oïko Genève, Café Lomi Paris…"
                    onSelect={handleSelect}
                  />
                  <p className="mt-4 text-[12px] italic text-texte-sec">
                    Astuce : précise ta ville pour de meilleurs résultats.
                  </p>
                </div>
                <p className="text-center text-[12px] text-texte-sec">
                  Ton lieu n&apos;apparaît pas ?{' '}
                  <Link
                    href="/onboarding/prestataire/manuel"
                    className="font-medium text-vert hover:text-or"
                  >
                    Remplis ta fiche manuellement →
                  </Link>
                </p>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-sm border border-or/20 bg-blanc p-12 text-center"
              >
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-or border-t-transparent" />
                <p className="font-serif text-xl italic text-vert">
                  On récupère tes infos…
                </p>
                <p className="mt-3 text-[13px] text-texte-sec">
                  Photos, adresse, horaires — ça prend 2-3 secondes.
                </p>
              </motion.div>
            )}

            {step === 'preview' && details && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="overflow-hidden rounded-sm border border-or/20 bg-blanc">
                  {details.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={details.photos[0]}
                      alt={details.name}
                      className="h-60 w-full object-cover"
                    />
                  )}
                  <div className="p-8 md:p-10">
                    <div className="flex items-center gap-4">
                      <span className="overline text-or">
                        Voici ce qu&apos;on a récupéré
                      </span>
                    </div>
                    <h2 className="mt-3 font-serif text-3xl font-light text-vert">
                      {details.name}
                    </h2>
                    <p className="mt-2 text-[13px] text-texte-sec">
                      {details.address}
                    </p>
                    {details.rating !== null && details.user_rating_count ? (
                      <p className="mt-2 text-[12px] tracking-[0.22em] text-or uppercase">
                        ★ {details.rating.toFixed(1)} · {details.user_rating_count} avis Google
                      </p>
                    ) : null}
                    {details.photos.length > 0 && (
                      <div className="mt-5 grid grid-cols-3 gap-2">
                        {details.photos.slice(0, 6).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="aspect-square w-full rounded-sm object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6 rounded-sm border border-or/15 bg-creme-soft p-8 md:p-10">
                  <div className="flex items-center gap-4">
                    <span className="overline text-or">
                      Complète ta fiche
                    </span>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Nom affiché">
                      <input
                        type="text"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        className="line"
                      />
                    </Field>
                    <Field label="Catégorie HILMY">
                      <select
                        value={categorie}
                        onChange={(e) => setCategorie(e.target.value)}
                        className="line"
                      >
                        <option value="">Choisir…</option>
                        {CATEGORIES.map(([slug, label]) => (
                          <option key={slug} value={slug}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="WhatsApp (obligatoire)" hint="Format +41 79 123 45 67">
                      <input
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="+41 79 123 45 67"
                        className="line"
                      />
                    </Field>
                    <Field label="Instagram (optionnel)">
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="claire.martin"
                        className="line"
                      />
                    </Field>
                  </div>

                  <Field label="Phrase d'accroche" hint="Celle qu'on met en gros sur ta fiche.">
                    <input
                      type="text"
                      maxLength={120}
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Une phrase qui te ressemble."
                      className="line font-serif text-xl italic"
                    />
                  </Field>

                  <Field label="Description" hint="En quelques lignes, ton histoire. On prend ta description Google comme base si tu veux.">
                    <textarea
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="line resize-none"
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[12px] font-medium text-texte-sec hover:text-or"
                  >
                    ← Choisir un autre lieu
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-6 text-[12px] font-medium tracking-[0.2em] text-creme uppercase transition-all hover:bg-vert-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Envoi…' : 'Valider ma fiche'}
                    <span
                      className="text-or-light transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <style jsx>{`
        :global(.line) {
          width: 100%;
          border: 0;
          border-bottom: 1px solid rgba(201, 169, 97, 0.25);
          background: transparent;
          padding: 0.5rem 0;
          font-size: 15px;
          color: #0f3d2e;
          outline: none;
        }
        :global(.line::placeholder) {
          color: rgba(107, 107, 107, 0.5);
        }
        :global(.line:focus) {
          border-color: #c9a961;
        }
      `}</style>
    </OnboardingShell>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="overline text-or">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-texte-sec/80">{hint}</span>}
    </label>
  )
}
