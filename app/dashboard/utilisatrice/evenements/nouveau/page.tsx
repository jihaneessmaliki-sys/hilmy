'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'
import { EVENT_TYPES_MAP } from '@/lib/constants'
import { villesSuggestions } from '@/lib/mock-data'

const TYPES = Object.entries(EVENT_TYPES_MAP) as [string, string][]

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

type Format = 'presentiel' | 'en_ligne'
type PriceType = 'gratuit' | 'payant'
type Currency = 'CHF' | 'EUR'

export default function NouveauEvenementPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Champs requis
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('')
  const [startDate, setStartDate] = useState('') // YYYY-MM-DD
  const [startTime, setStartTime] = useState('') // HH:MM
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')

  // Champs optionnels
  const [format, setFormat] = useState<Format>('presentiel')
  const [onlineLink, setOnlineLink] = useState('')
  const [priceType, setPriceType] = useState<PriceType>('gratuit')
  const [priceAmount, setPriceAmount] = useState('')
  const [priceCurrency, setPriceCurrency] = useState<Currency>('CHF')
  const [externalSignupUrl, setExternalSignupUrl] = useState('')
  const [placesMax, setPlacesMax] = useState('')
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null)
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?next=/dashboard/utilisatrice/evenements/nouveau')
        return
      }
      setUserId(user.id)
      setChecking(false)
    }
    run()
  }, [router, supabase])

  const handleFlyer = async (file: File) => {
    if (!userId) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Le flyer doit faire moins de 5 Mo.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format non supporté. JPG, PNG ou WebP uniquement.')
      return
    }
    setUploading(true)
    setError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('event-flyers')
      .upload(path, file, { cacheControl: '3600' })
    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from('event-flyers').getPublicUrl(path)
    setFlyerUrl(publicUrl)
    setUploading(false)
  }

  // ── Validation live ────────────────────────────────────────────────
  const missing = useMemo(() => {
    const errs: string[] = []
    if (title.trim().length < 3) errs.push('un titre (3 caractères min)')
    if (!eventType) errs.push('un type')
    if (!startDate) errs.push('une date')
    else {
      const startISO = `${startDate}T${startTime || '00:00'}:00`
      if (new Date(startISO).getTime() <= Date.now()) {
        errs.push('une date future')
      }
    }
    if (!startTime) errs.push('une heure')
    if (description.trim().length < 50)
      errs.push(`une description (${description.trim().length}/50)`)
    if (description.trim().length > 2000) errs.push('description max 2000')
    if (!city.trim()) errs.push('une ville')
    if (!address.trim()) errs.push('une adresse précise')
    if (priceType === 'payant' && !priceAmount) errs.push('un montant')
    return errs
  }, [
    title,
    eventType,
    startDate,
    startTime,
    description,
    city,
    address,
    priceType,
    priceAmount,
  ])

  const canSubmit = missing.length === 0 && !submitting

  const submit = async () => {
    if (!userId || !canSubmit) return
    setSubmitting(true)
    setError(null)

    const startISO = new Date(`${startDate}T${startTime}:00`).toISOString()
    const endISO =
      endDate && endTime
        ? new Date(`${endDate}T${endTime}:00`).toISOString()
        : null

    const baseSlug = slugify(title) || `evenement-${Date.now()}`
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

    const payload = {
      user_id: userId,
      title: title.trim(),
      slug,
      description: description.trim(),
      event_type: eventType,
      format,
      visibility: 'public' as const,
      start_date: startISO,
      end_date: endISO,
      city: city.trim(),
      address: address.trim(),
      online_link: format === 'en_ligne' ? onlineLink.trim() || null : null,
      flyer_url: flyerUrl,
      external_signup_url: externalSignupUrl.trim() || null,
      price_type: priceType,
      price_amount: priceType === 'payant' ? Number(priceAmount) : null,
      price_currency: priceType === 'payant' ? priceCurrency : null,
      places_max:
        placesMax && Number(placesMax) > 0 ? Number(placesMax) : null,
      status: 'published' as const,
      // quartier non stocké en DB pour Stage 2A — privacy gérée côté UI :
      // l'adresse précise est masquée publiquement, on n'affiche que ville
      // (+ quartier si on l'ajoute plus tard via une colonne dédiée).
    }

    const { data: inserted, error: insErr } = await supabase
      .from('events')
      .insert(payload)
      .select('id, slug, title, start_date, city')
      .single()

    if (insErr || !inserted) {
      setError(insErr?.message ?? 'Impossible de publier l\'événement.')
      setSubmitting(false)
      return
    }

    // Notification founder (best-effort, n'empêche pas la création)
    try {
      await fetch('/api/events/notify-founder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: inserted.id }),
      })
    } catch {
      // silencieux : notification non critique
    }

    router.push('/dashboard/utilisatrice/evenements')
  }

  if (checking) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-or border-t-transparent" />
      </section>
    )
  }

  return (
    <>
      <DashboardHeader
        kicker="Organiser un événement"
        titre={
          <>
            Un moment à
            <br />
            <em className="font-serif italic text-or">
              partager avec les copines.
            </em>
          </>
        }
        lead="Brunch, atelier, book club, retraite, masterclass… Raconte ton événement, on s'occupe de le diffuser."
      />

      <section className="px-6 py-10 md:px-12 md:py-14">
        {error && (
          <div className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-4 py-3 text-[13px] text-red-900">
            {error}
          </div>
        )}

        {/* Identité */}
        <div className="rounded-sm border border-or/20 bg-blanc p-8 md:p-10">
          <div className="mb-6 flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">01 · L&apos;essentiel</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Titre de l'événement">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brunch entre copines au jardin"
                className="line"
                autoFocus
              />
            </Field>
            <Field label="Type d'événement">
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="line"
              >
                <option value="">Choisir…</option>
                {TYPES.map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-6">
            <p className="overline text-or">Format</p>
            <div className="mt-3 flex gap-3">
              {(
                [
                  { id: 'presentiel', label: 'En présentiel' },
                  { id: 'en_ligne', label: 'En ligne' },
                ] as const
              ).map((opt) => {
                const active = format === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormat(opt.id)}
                    className={`rounded-full border px-5 py-2 text-[12px] font-medium tracking-[0.18em] uppercase transition-all ${
                      active
                        ? 'border-vert bg-vert text-creme'
                        : 'border-or/30 bg-blanc text-texte-sec hover:border-or'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Date & Lieu */}
        <div className="mt-8 rounded-sm border border-or/20 bg-blanc p-8 md:p-10">
          <div className="mb-6 flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">02 · Quand &amp; où</span>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr_auto]">
            <Field label="Date de début">
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setStartDate(e.target.value)}
                className="line"
              />
            </Field>
            <Field label="Heure">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="line w-28"
              />
            </Field>
            <Field label="Date de fin (optionnel)">
              <input
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().slice(0, 10)}
                onChange={(e) => setEndDate(e.target.value)}
                className="line"
              />
            </Field>
            <Field label="Heure">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="line w-28"
              />
            </Field>
          </div>

          <div className="mt-6">
            <Field label="Ville" hint="Suisse, France, Belgique, Luxembourg ou Monaco.">
              <input
                type="text"
                list="villes-event"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Genève, Paris, Bruxelles…"
                className="line"
                autoComplete="off"
              />
              <datalist id="villes-event">
                {villesSuggestions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field
            label="Adresse précise"
            hint="Rue + numéro. Visible uniquement par les inscrites + dans l'email de confirmation. La ville reste publique."
          >
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="12 rue des Bains, 1205 Genève"
              className="line"
            />
          </Field>

          {format === 'en_ligne' && (
            <Field
              label="Lien de connexion (optionnel)"
              hint="Zoom, Meet, Whereby, autre."
            >
              <input
                type="url"
                value={onlineLink}
                onChange={(e) => setOnlineLink(e.target.value)}
                placeholder="https://meet.google.com/…"
                className="line"
              />
            </Field>
          )}
        </div>

        {/* Description */}
        <div className="mt-8 rounded-sm border border-or/20 bg-blanc p-8 md:p-10">
          <div className="mb-6 flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">03 · Ton récit</span>
          </div>

          <Field
            label="Description"
            hint="Raconte comme à une copine. Pour qui, pourquoi, ce qu'on en retire."
          >
            <textarea
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minLength={50}
              maxLength={2000}
              placeholder="On se retrouve un dimanche matin autour d'une grande table…"
              className="line resize-none"
            />
            <span className="text-right text-[11px] text-texte-sec">
              {description.length} / min 50 · max 2000
            </span>
          </Field>
        </div>

        {/* Détails pratiques */}
        <div className="mt-8 rounded-sm border border-or/20 bg-blanc p-8 md:p-10">
          <div className="mb-6 flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">04 · Détails pratiques</span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="overline text-or">Prix</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {(
                  [
                    { id: 'gratuit', label: 'Gratuit' },
                    { id: 'payant', label: 'Payant' },
                  ] as const
                ).map((opt) => {
                  const active = priceType === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPriceType(opt.id)}
                      className={`rounded-full border px-5 py-2 text-[12px] font-medium tracking-[0.18em] uppercase transition-all ${
                        active
                          ? 'border-vert bg-vert text-creme'
                          : 'border-or/30 bg-blanc text-texte-sec hover:border-or'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {priceType === 'payant' && (
                <div className="mt-4 flex items-end gap-3">
                  <Field label="Montant">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      placeholder="20"
                      className="line w-32"
                    />
                  </Field>
                  <Field label="Devise">
                    <select
                      value={priceCurrency}
                      onChange={(e) =>
                        setPriceCurrency(e.target.value as Currency)
                      }
                      className="line w-24"
                    >
                      <option>CHF</option>
                      <option>EUR</option>
                    </select>
                  </Field>
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Field
                label="Places max (optionnel)"
                hint="Vide ou 0 = illimité."
              >
                <input
                  type="number"
                  min="0"
                  value={placesMax}
                  onChange={(e) => setPlacesMax(e.target.value)}
                  placeholder="20"
                  className="line"
                />
              </Field>
              <Field
                label="Lien d'inscription externe (optionnel)"
                hint="Eventbrite, Billetweb, ton site…"
              >
                <input
                  type="url"
                  value={externalSignupUrl}
                  onChange={(e) => setExternalSignupUrl(e.target.value)}
                  placeholder="https://…"
                  className="line"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Flyer */}
        <div className="mt-8 rounded-sm border border-or/20 bg-blanc p-8 md:p-10">
          <div className="mb-6 flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">05 · Le visuel</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFlyer(f)
              if (e.target) e.target.value = ''
            }}
          />
          {flyerUrl ? (
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={flyerUrl}
                alt="Flyer"
                className="h-48 w-36 rounded-sm object-cover"
              />
              <div className="space-y-2">
                <p className="text-[13px] text-vert">Flyer prêt ✨</p>
                <button
                  type="button"
                  onClick={() => setFlyerUrl(null)}
                  className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-red-900"
                >
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-or/40 bg-creme-soft p-10 transition-colors hover:border-or hover:bg-blanc disabled:opacity-60"
            >
              <span className="font-serif text-3xl text-or">+</span>
              <p className="text-[13px] text-vert">
                {uploading ? 'Envoi…' : 'Ajouter un flyer (optionnel)'}
              </p>
              <p className="text-[11px] text-texte-sec">
                JPG, PNG ou WebP — max 5 Mo
              </p>
            </button>
          )}
        </div>

        {/* CTA + validation hint */}
        <div className="mt-10 flex flex-col items-end gap-4">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.2em] text-creme uppercase transition-all hover:bg-vert-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? 'Publication…'
              : 'Je partage avec les filles'}
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
                className="max-w-md text-right text-[12px] italic text-texte-sec"
              >
                Pour partager : <span className="text-or-deep">{missing.join(', ')}</span>.
              </motion.p>
            )}
          </AnimatePresence>

          <Link
            href="/dashboard/utilisatrice/evenements"
            className="text-[12px] text-texte-sec hover:text-or"
          >
            ← Retour à mes événements
          </Link>
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
    </>
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
