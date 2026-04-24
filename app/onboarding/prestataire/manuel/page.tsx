'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  OnboardingShell,
  OnboardingHeader,
} from '@/components/onboarding/OnboardingShell'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES_MAP } from '@/lib/constants'
import { villesSuggestions } from '@/lib/mock-data'
import { formatVilleDisplay } from '@/lib/geo/city-centroids'

type Etape = 0 | 1 | 2 | 3

const CATEGORIES = Object.entries(CATEGORIES_MAP) as [string, string][]

const steps = [
  {
    num: '01',
    kicker: 'QUI TU ES',
    titre: 'Commençons par les bases.',
    soustitre: 'Ton nom pro, ta catégorie, ton pays et ta ville.',
  },
  {
    num: '02',
    kicker: 'OÙ TE JOINDRE',
    titre: 'Comment les copines te contactent.',
    soustitre:
      'WhatsApp c\'est obligatoire — c\'est le canal principal. Le reste, tu choisis.',
  },
  {
    num: '03',
    kicker: 'TON HISTOIRE',
    titre: 'Raconte-nous ce que tu fais.',
    soustitre:
      "En quelques lignes, comme à une copine que tu retrouves autour d'un café.",
  },
  {
    num: '04',
    kicker: 'TES PHOTOS',
    titre: 'Trois photos, c\'est le minimum chaleureux.',
    soustitre:
      'La première devient la couverture. Tu peux en ajouter d\'autres plus tard.',
  },
] as const

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

type Service = { nom: string; prix: string; duree: string }

export default function ManuelOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [etape, setEtape] = useState<Etape>(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Step 1 - identité
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState('')
  const [pays, setPays] = useState('')
  const [ville, setVille] = useState('')

  // Step 2 - contact + canaux
  const [whatsapp, setWhatsapp] = useState('')
  const [phonePublic, setPhonePublic] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [facebook, setFacebook] = useState('')
  const [youtube, setYoutube] = useState('')
  const [siteWeb, setSiteWeb] = useState('')

  // Step 3 - présentation
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [devise, setDevise] = useState<'CHF' | 'EUR'>('CHF')
  const [prixFrom, setPrixFrom] = useState('')
  const [services, setServices] = useState<Service[]>([
    { nom: '', prix: '', duree: '' },
  ])

  // Step 4 - photos
  const [galerie, setGalerie] = useState<string[]>([])

  // Check auth + profile existence
  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?next=/onboarding/prestataire/manuel')
        return
      }
      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        router.push('/dashboard/prestataire')
        return
      }

      // Default pays from user_profiles if set
      const { data: up } = await supabase
        .from('user_profiles')
        .select('pays, ville')
        .eq('user_id', user.id)
        .maybeSingle()
      if (up) {
        if (up.pays) setPays(up.pays)
        if (up.ville) setVille(up.ville)
      }
      setChecking(false)
    }
    run()
  }, [router, supabase])

  const canContinue = () => {
    if (etape === 0) return nom && categorie && pays && ville
    if (etape === 1) return whatsapp.trim().length >= 6
    if (etape === 2) return description.trim().length >= 30
    if (etape === 3) return galerie.length >= 1
    return false
  }

  const next = () => {
    if (etape < 3) setEtape(((etape + 1) as Etape))
    else submit()
  }
  const prev = () => etape > 0 && setEtape(((etape - 1) as Etape))

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
      .from('prestataire-photos')
      .upload(path, file, { cacheControl: '3600' })
    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from('prestataire-photos').getPublicUrl(path)
    setGalerie((g) => [...g, publicUrl])
    setUploading(false)
  }

  const removePhoto = (url: string) =>
    setGalerie((g) => g.filter((u) => u !== url))

  const submit = async () => {
    if (!userId) return
    setSubmitting(true)
    setError(null)

    const baseSlug = slugify(nom) || `prestataire-${Date.now()}`
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

    const cleanServices = services
      .filter((s) => s.nom.trim())
      .map((s) => ({ nom: s.nom.trim(), prix: s.prix.trim(), duree: s.duree.trim() }))

    const { error: insErr } = await supabase.from('profiles').insert({
      user_id: userId,
      nom: nom.trim(),
      slug,
      categorie,
      ville: formatVilleDisplay(ville.trim()) ?? ville.trim(),
      whatsapp: whatsapp.trim(),
      phone_public: phonePublic.trim() || null,
      email: email.trim() || null,
      instagram: instagram.trim() || null,
      tiktok: tiktok.trim() || null,
      linkedin: linkedin.trim() || null,
      facebook: facebook.trim() || null,
      youtube: youtube.trim() || null,
      site_web: siteWeb.trim() || null,
      tagline: tagline.trim() || null,
      description: description.trim(),
      prix_from: prixFrom ? Number(prixFrom) : null,
      devise,
      services: cleanServices,
      galerie,
      photos: galerie,
      status: 'pending',
      source_import: 'manuel',
    })

    setSubmitting(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    router.push('/onboarding/prestataire/publiee')
  }

  const current = steps[etape]

  if (checking) {
    return (
      <OnboardingShell step={1} totalSteps={4}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-or border-t-transparent" />
        </div>
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell step={etape + 1} totalSteps={4}>
      <section className="bg-creme pt-16 pb-8 md:pt-24">
        <div className="mx-auto max-w-3xl px-6 md:px-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={etape}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <OnboardingHeader
                number={current.num}
                kicker={current.kicker}
                title={current.titre}
                subtitle={current.soustitre}
              />
            </motion.div>
          </AnimatePresence>
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
            <motion.div
              key={etape}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 rounded-sm border border-or/15 bg-blanc p-8 md:p-10"
            >
              {etape === 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Ton nom pro ou marque">
                    <input
                      type="text"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Claire Martin, Studio Oïko…"
                      className="line"
                      autoFocus
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
                  <Field label="Pays">
                    <select
                      value={pays}
                      onChange={(e) => setPays(e.target.value)}
                      className="line"
                    >
                      <option value="">Choisir…</option>
                      {['Suisse', 'France', 'Belgique', 'Luxembourg', 'Monaco'].map(
                        (p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>
                  <Field
                    label="Ville principale"
                    hint="Celle où tu reçois ou où tu interviens le plus souvent."
                  >
                    <input
                      type="text"
                      list="villes-onboarding"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      placeholder="Genève, Nyon, Paris, Bruxelles…"
                      className="line"
                      autoComplete="off"
                    />
                    <datalist id="villes-onboarding">
                      {villesSuggestions.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  </Field>
                </div>
              )}

              {etape === 1 && (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Field
                      label="WhatsApp (obligatoire)"
                      hint="Format international : +41 79 123 45 67 — ce sera le CTA principal de ta fiche."
                    >
                      <input
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="+41 79 123 45 67"
                        className="line"
                        autoFocus
                      />
                    </Field>
                    <Field
                      label="Téléphone (optionnel)"
                      hint="Si différent de ton WhatsApp."
                    >
                      <input
                        type="tel"
                        value={phonePublic}
                        onChange={(e) => setPhonePublic(e.target.value)}
                        placeholder="+41 22 123 45 67"
                        className="line"
                      />
                    </Field>
                    <Field
                      label="Email pro"
                      hint="Pour les clientes qui préfèrent écrire."
                    >
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="toi@exemple.com"
                        className="line"
                      />
                    </Field>
                    <Field label="Site web (optionnel)">
                      <input
                        type="url"
                        value={siteWeb}
                        onChange={(e) => setSiteWeb(e.target.value)}
                        placeholder="https://www.tonsite.com"
                        className="line"
                      />
                    </Field>
                  </div>

                  <div>
                    <p className="overline text-or">Tes réseaux (optionnel)</p>
                    <p className="mt-1 text-[12px] italic text-texte-sec">
                      Tous les liens cliquables apparaîtront sur ta fiche.
                    </p>
                    <div className="mt-4 grid gap-6 md:grid-cols-2">
                      <Field label="Instagram" hint="Username sans le @.">
                        <input
                          type="text"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          placeholder="claire.martin"
                          className="line"
                        />
                      </Field>
                      <Field label="TikTok" hint="Username sans le @.">
                        <input
                          type="text"
                          value={tiktok}
                          onChange={(e) => setTiktok(e.target.value)}
                          placeholder="claire.martin"
                          className="line"
                        />
                      </Field>
                      <Field label="LinkedIn">
                        <input
                          type="url"
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          placeholder="https://linkedin.com/in/claire-martin"
                          className="line"
                        />
                      </Field>
                      <Field label="Facebook">
                        <input
                          type="url"
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          placeholder="https://facebook.com/claire.martin"
                          className="line"
                        />
                      </Field>
                      <Field label="YouTube">
                        <input
                          type="url"
                          value={youtube}
                          onChange={(e) => setYoutube(e.target.value)}
                          placeholder="https://youtube.com/@clairemartin"
                          className="line"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {etape === 2 && (
                <div className="space-y-6">
                  <Field
                    label="Phrase d'accroche"
                    hint="Celle qu'on met en gros. Tu as droit à du style. Max 120 caractères."
                  >
                    <input
                      type="text"
                      maxLength={120}
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Remettre de la clarté là où tu en as besoin."
                      className="line font-serif text-xl italic"
                    />
                  </Field>

                  <Field
                    label="Ta description"
                    hint="5 à 8 lignes. Raconte qui tu es, pour qui, comment."
                  >
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={7}
                      minLength={30}
                      placeholder="Coach certifiée ICF, j'accompagne depuis 8 ans les femmes qui..."
                      className="line resize-none"
                    />
                    <span className="text-[11px] text-texte-sec">
                      {description.length} / min 30 caractères
                    </span>
                  </Field>

                  <div className="grid gap-6 md:grid-cols-[1fr_auto]">
                    <Field label="Tarif à partir de (optionnel)" hint="Laisse vide si tu préfères discuter.">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={prixFrom}
                          onChange={(e) => setPrixFrom(e.target.value)}
                          placeholder="80"
                          className="line w-32"
                        />
                        <select
                          value={devise}
                          onChange={(e) =>
                            setDevise(e.target.value as 'CHF' | 'EUR')
                          }
                          className="line w-20"
                        >
                          <option>CHF</option>
                          <option>EUR</option>
                        </select>
                      </div>
                    </Field>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="overline text-or">Tes services (optionnel)</p>
                      <button
                        type="button"
                        onClick={() =>
                          setServices((s) => [
                            ...s,
                            { nom: '', prix: '', duree: '' },
                          ])
                        }
                        className="text-[11px] tracking-[0.22em] text-or uppercase hover:text-or-deep"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {services.map((s, i) => (
                        <li
                          key={i}
                          className="grid gap-3 rounded-sm border border-or/15 bg-creme-soft p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
                        >
                          <input
                            placeholder="Nom du service"
                            value={s.nom}
                            onChange={(e) =>
                              setServices((cur) =>
                                cur.map((x, idx) =>
                                  idx === i
                                    ? { ...x, nom: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className="line"
                          />
                          <input
                            placeholder="Prix"
                            value={s.prix}
                            onChange={(e) =>
                              setServices((cur) =>
                                cur.map((x, idx) =>
                                  idx === i
                                    ? { ...x, prix: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className="line"
                          />
                          <input
                            placeholder="Durée"
                            value={s.duree}
                            onChange={(e) =>
                              setServices((cur) =>
                                cur.map((x, idx) =>
                                  idx === i
                                    ? { ...x, duree: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className="line"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setServices((cur) =>
                                cur.filter((_, idx) => idx !== i),
                              )
                            }
                            className="text-[11px] text-texte-sec hover:text-red-900"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {etape === 3 && (
                <div className="space-y-6">
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

                  {galerie.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex w-full flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed border-or/40 bg-creme-soft p-14 transition-colors hover:border-or hover:bg-blanc disabled:opacity-60"
                    >
                      <span className="font-serif text-4xl text-or">+</span>
                      <p className="text-[14px] text-vert">
                        {uploading ? 'Envoi…' : 'Ajouter ta première photo'}
                      </p>
                      <p className="text-[11px] text-texte-sec">
                        Format JPG ou PNG, max 5 Mo. Cette photo sera ta couverture.
                      </p>
                    </button>
                  ) : (
                    <>
                      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {galerie.map((url, i) => (
                          <li
                            key={url}
                            className="group relative aspect-square overflow-hidden rounded-sm bg-creme-deep"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Photo ${i + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(url)}
                              className="absolute top-2 right-2 rounded-full bg-blanc/90 px-2 py-0.5 text-[10px] text-red-900 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              Retirer
                            </button>
                            {i === 0 && (
                              <span className="absolute bottom-2 left-2 rounded-full bg-or/90 px-2 py-0.5 text-[9px] tracking-[0.22em] text-vert uppercase">
                                Couverture
                              </span>
                            )}
                          </li>
                        ))}
                        <li>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex aspect-square w-full items-center justify-center rounded-sm border-2 border-dashed border-or/40 bg-creme-soft text-3xl text-or transition-colors hover:border-or hover:bg-blanc disabled:opacity-60"
                          >
                            {uploading ? '…' : '+'}
                          </button>
                        </li>
                      </ul>
                      <p className="text-[11px] text-texte-sec">
                        {galerie.length} photo{galerie.length > 1 ? 's' : ''} ·{' '}
                        {galerie.length < 3
                          ? 'On conseille au moins 3 photos pour une fiche qui respire.'
                          : 'Parfait, ta galerie est chaleureuse.'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              disabled={etape === 0 || submitting}
              className="group inline-flex items-center gap-2 text-[12px] font-medium text-texte-sec transition-colors hover:text-or disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                className="text-or transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              >
                ←
              </span>
              Précédent
            </button>

            <div className="flex items-center gap-3">
              <span className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">
                Étape {etape + 1} / 4
              </span>
              <button
                type="button"
                onClick={next}
                disabled={!canContinue() || submitting}
                className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-6 text-[12px] font-medium tracking-[0.2em] text-creme uppercase transition-all hover:bg-vert-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Envoi…'
                  : etape < 3
                    ? 'Continuer'
                    : 'Envoyer ma fiche'}
                <span
                  className="text-or-light transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-[12px] text-texte-sec">
            Déjà une fiche ?{' '}
            <Link
              href="/dashboard/prestataire"
              className="font-medium text-vert hover:text-or"
            >
              Aller à mon dashboard
            </Link>
          </p>
        </div>
      </section>

      <style jsx>{`
        :global(.line) {
          width: 100%;
          border: 0;
          border-bottom: 1px solid rgba(201, 169, 97, 0.2);
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
