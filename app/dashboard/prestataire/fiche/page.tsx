'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES_MAP } from '@/lib/constants'

type Service = { nom: string; prix: string; duree: string }

type Draft = {
  nom: string
  slug: string
  categorie: string
  ville: string
  tagline: string
  description: string
  whatsapp: string
  phone_public: string
  instagram: string
  tiktok: string
  linkedin: string
  facebook: string
  youtube: string
  email: string
  site_web: string
  prix_from: string
  devise: 'CHF' | 'EUR'
  services: Service[]
  galerie: string[]
}

const CATEGORIES = Object.entries(CATEGORIES_MAP) as [string, string][]

export default function MaFichePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('pending')
  const [noteMoy, setNoteMoy] = useState(0)
  const [nbAvis, setNbAvis] = useState(0)
  const [editing, setEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [draft, setDraft] = useState<Draft>({
    nom: '',
    slug: '',
    categorie: 'beaute',
    ville: '',
    tagline: '',
    description: '',
    whatsapp: '',
    phone_public: '',
    instagram: '',
    tiktok: '',
    linkedin: '',
    facebook: '',
    youtube: '',
    email: '',
    site_web: '',
    prix_from: '',
    devise: 'CHF',
    services: [],
    galerie: [],
  })

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
      setUserId(user.id)

      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchErr) {
        setError(fetchErr.message)
        setLoading(false)
        return
      }
      if (!data) {
        setError('Fiche introuvable — redirige-toi vers l\'onboarding prestataire.')
        setLoading(false)
        return
      }

      setProfileId(data.id)
      setStatus(data.status)
      setNoteMoy(data.note_moyenne ?? 0)
      setNbAvis(data.nb_avis ?? 0)
      setDraft({
        nom: data.nom ?? '',
        slug: data.slug ?? '',
        categorie: data.categorie ?? 'beaute',
        ville: data.ville ?? '',
        tagline: data.tagline ?? '',
        description: data.description ?? '',
        whatsapp: data.whatsapp ?? '',
        phone_public: data.phone_public ?? '',
        instagram: data.instagram ?? '',
        tiktok: data.tiktok ?? '',
        linkedin: data.linkedin ?? '',
        facebook: data.facebook ?? '',
        youtube: data.youtube ?? '',
        email: data.email ?? '',
        site_web: data.site_web ?? '',
        prix_from: data.prix_from !== null ? String(data.prix_from) : '',
        devise: data.devise ?? 'CHF',
        services: (data.services ?? []) as Service[],
        galerie: (data.galerie ?? []) as string[],
      })
      setLoading(false)
    }
    run()
  }, [])

  const handleSave = async () => {
    if (!profileId) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const payload: Record<string, unknown> = {
      nom: draft.nom.trim(),
      categorie: draft.categorie,
      ville: draft.ville.trim(),
      tagline: draft.tagline.trim() || null,
      description: draft.description.trim() || null,
      whatsapp: draft.whatsapp.trim(),
      phone_public: draft.phone_public.trim() || null,
      instagram: draft.instagram.trim() || null,
      tiktok: draft.tiktok.trim() || null,
      linkedin: draft.linkedin.trim() || null,
      facebook: draft.facebook.trim() || null,
      youtube: draft.youtube.trim() || null,
      email: draft.email.trim() || null,
      site_web: draft.site_web.trim() || null,
      prix_from: draft.prix_from ? Number(draft.prix_from) : null,
      devise: draft.devise,
      services: draft.services,
      galerie: draft.galerie,
    }
    const { error: updErr } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profileId)

    setSaving(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const handlePhoto = async (file: File) => {
    if (!userId || !profileId) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Chaque photo doit faire moins de 5 Mo.')
      return
    }
    setUploading(true)
    setError(null)
    const supabase = createClient()
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

    setDraft((d) => ({ ...d, galerie: [...d.galerie, publicUrl] }))
    setUploading(false)
  }

  const removePhoto = (url: string) => {
    setDraft((d) => ({ ...d, galerie: d.galerie.filter((u) => u !== url) }))
  }

  const addService = () =>
    setDraft((d) => ({
      ...d,
      services: [...d.services, { nom: '', prix: '', duree: '' }],
    }))
  const updateService = (i: number, patch: Partial<Service>) =>
    setDraft((d) => ({
      ...d,
      services: d.services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }))
  const removeService = (i: number) =>
    setDraft((d) => ({
      ...d,
      services: d.services.filter((_, idx) => idx !== i),
    }))

  const cover =
    draft.galerie[0] ??
    (status === 'approved' ? '#D4C5B0' : '#EEE6D8')

  const coverIsUrl = cover.startsWith('http') || cover.startsWith('/')
  const categorieLabel = CATEGORIES_MAP[draft.categorie] ?? draft.categorie

  return (
    <>
      <DashboardHeader
        kicker="Ma fiche"
        titre={
          <>
            Ta vitrine,{' '}
            <em className="font-serif italic text-or">à jour.</em>
          </>
        }
        lead="Modifie ce qui doit l'être. Tes changements sont immédiatement visibles sur la fiche publique."
        actions={
          <div className="flex items-center gap-3">
            {draft.slug && (
              <Link
                href={`/prestataire-v2/${draft.slug}`}
                target="_blank"
                className="group inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
              >
                Voir la version publique
                <span
                  className="text-or transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => (editing ? handleSave() : setEditing(true))}
              disabled={saving || loading}
              className="group inline-flex h-11 items-center gap-2 rounded-full bg-or px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light disabled:opacity-60"
            >
              {editing
                ? saving
                  ? 'Enregistrement…'
                  : 'Enregistrer'
                : 'Modifier'}
              <span
                className="transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </button>
          </div>
        }
      />

      <section className="px-6 py-10 md:px-12 md:py-14">
        {error && (
          <p className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="mb-6 rounded-sm border border-or/30 bg-or/10 px-3 py-2 text-[12px] text-vert">
            Fiche mise à jour. C&apos;est en ligne.
          </p>
        )}

        {loading ? (
          <div className="h-[600px] animate-pulse rounded-sm bg-creme-deep" />
        ) : (
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-12"
              >
                {/* Identité */}
                <Group kicker="Identité">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="Nom affiché">
                      <input
                        type="text"
                        value={draft.nom}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, nom: e.target.value }))
                        }
                        className="input-line"
                      />
                    </Field>
                    <Field label="Catégorie">
                      <select
                        value={draft.categorie}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, categorie: e.target.value }))
                        }
                        className="input-line"
                      >
                        {CATEGORIES.map(([slug, label]) => (
                          <option key={slug} value={slug}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Ville">
                      <input
                        type="text"
                        value={draft.ville}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, ville: e.target.value }))
                        }
                        className="input-line"
                      />
                    </Field>
                    <Field label="Devise">
                      <select
                        value={draft.devise}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            devise: e.target.value as 'CHF' | 'EUR',
                          }))
                        }
                        className="input-line"
                      >
                        <option value="CHF">CHF</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </Field>
                  </div>
                </Group>

                <Group kicker="Ton discours">
                  <Field label="Phrase d'accroche" hint="Max 120 caractères">
                    <input
                      type="text"
                      maxLength={120}
                      value={draft.tagline}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, tagline: e.target.value }))
                      }
                      className="input-line font-serif italic text-lg"
                    />
                  </Field>
                  <Field label="Description" hint="5-8 lignes, voix chaleureuse">
                    <textarea
                      value={draft.description}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          description: e.target.value,
                        }))
                      }
                      rows={7}
                      className="input-line resize-none"
                    />
                  </Field>
                </Group>

                <Group kicker="Contact">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="WhatsApp" hint="Format international +41…">
                      <input
                        type="tel"
                        value={draft.whatsapp}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, whatsapp: e.target.value }))
                        }
                        className="input-line"
                      />
                    </Field>
                    <Field label="Téléphone (optionnel)">
                      <input
                        type="tel"
                        value={draft.phone_public}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, phone_public: e.target.value }))
                        }
                        className="input-line"
                      />
                    </Field>
                    <Field label="Email pro">
                      <input
                        type="email"
                        value={draft.email}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, email: e.target.value }))
                        }
                        className="input-line"
                      />
                    </Field>
                    <Field label="Site web">
                      <input
                        type="url"
                        value={draft.site_web}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, site_web: e.target.value }))
                        }
                        className="input-line"
                      />
                    </Field>
                  </div>
                </Group>

                <Group kicker="Réseaux sociaux">
                  <p className="text-[12px] italic text-texte-sec">
                    Tous les liens cliquables apparaîtront sur ta fiche publique.
                  </p>
                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="Instagram" hint="Username sans le @.">
                      <input
                        type="text"
                        value={draft.instagram}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, instagram: e.target.value }))
                        }
                        placeholder="claire.martin"
                        className="input-line"
                      />
                    </Field>
                    <Field label="TikTok" hint="Username sans le @.">
                      <input
                        type="text"
                        value={draft.tiktok}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, tiktok: e.target.value }))
                        }
                        placeholder="claire.martin"
                        className="input-line"
                      />
                    </Field>
                    <Field label="LinkedIn (URL)">
                      <input
                        type="url"
                        value={draft.linkedin}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, linkedin: e.target.value }))
                        }
                        placeholder="https://linkedin.com/in/…"
                        className="input-line"
                      />
                    </Field>
                    <Field label="Facebook (URL)">
                      <input
                        type="url"
                        value={draft.facebook}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, facebook: e.target.value }))
                        }
                        placeholder="https://facebook.com/…"
                        className="input-line"
                      />
                    </Field>
                    <Field label="YouTube (URL)">
                      <input
                        type="url"
                        value={draft.youtube}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, youtube: e.target.value }))
                        }
                        placeholder="https://youtube.com/@…"
                        className="input-line"
                      />
                    </Field>
                  </div>
                </Group>

                <Group kicker="Tarifs">
                  <Field label="À partir de" hint="Ex : 80">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={draft.prix_from}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            prix_from: e.target.value,
                          }))
                        }
                        className="input-line w-32"
                      />
                      <span className="text-[13px] text-texte-sec">
                        {draft.devise}
                      </span>
                    </div>
                  </Field>
                </Group>

                <Group
                  kicker="Services"
                  action={
                    <button
                      type="button"
                      onClick={addService}
                      className="text-[11px] tracking-[0.22em] text-or uppercase hover:text-or-deep"
                    >
                      + Ajouter
                    </button>
                  }
                >
                  {draft.services.length === 0 ? (
                    <p className="text-[13px] italic text-texte-sec">
                      Pas encore de service. Ajoute-en un pour donner envie.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {draft.services.map((s, i) => (
                        <li
                          key={i}
                          className="grid gap-3 rounded-sm border border-or/15 bg-creme-soft p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
                        >
                          <input
                            placeholder="Nom du service"
                            value={s.nom}
                            onChange={(e) =>
                              updateService(i, { nom: e.target.value })
                            }
                            className="input-line"
                          />
                          <input
                            placeholder="Prix"
                            value={s.prix}
                            onChange={(e) =>
                              updateService(i, { prix: e.target.value })
                            }
                            className="input-line"
                          />
                          <input
                            placeholder="Durée"
                            value={s.duree}
                            onChange={(e) =>
                              updateService(i, { duree: e.target.value })
                            }
                            className="input-line"
                          />
                          <button
                            type="button"
                            onClick={() => removeService(i)}
                            className="text-[11px] text-texte-sec hover:text-red-900"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Group>

                <Group
                  kicker="Galerie"
                  action={
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-[11px] tracking-[0.22em] text-or uppercase hover:text-or-deep disabled:opacity-60"
                    >
                      {uploading ? 'Envoi…' : '+ Ajouter'}
                    </button>
                  }
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handlePhoto(f)
                    }}
                  />
                  {draft.galerie.length === 0 ? (
                    <p className="text-[13px] italic text-texte-sec">
                      La première photo devient la couverture publique de ta fiche.
                    </p>
                  ) : (
                    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {draft.galerie.map((url, i) => (
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
                    </ul>
                  )}
                </Group>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-vert px-7 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark disabled:opacity-60"
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer la fiche'}
                    <span className="text-or-light" aria-hidden="true">
                      →
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-vert"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden rounded-sm border border-or/20 bg-blanc"
              >
                <div
                  className="p-10 md:p-14"
                  style={
                    coverIsUrl
                      ? {
                          backgroundImage: `linear-gradient(165deg, rgba(15,61,46,0.75) 0%, rgba(15,61,46,0.3) 100%), url(${cover})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {
                          background: `linear-gradient(165deg, ${cover} 0%, #F5F0E6 100%)`,
                        }
                  }
                >
                  <div className="flex items-center gap-4">
                    <GoldLine width={40} />
                    <span
                      className={`overline ${
                        coverIsUrl ? 'text-or-light' : 'text-or-deep'
                      }`}
                    >
                      {categorieLabel} · {draft.ville}
                    </span>
                  </div>
                  <h2
                    className={`mt-4 font-serif text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1] ${
                      coverIsUrl ? 'text-creme' : 'text-vert'
                    }`}
                  >
                    {draft.nom}
                  </h2>
                  {draft.tagline && (
                    <p
                      className={`mt-5 max-w-xl font-serif text-[18px] italic leading-[1.4] md:text-[20px] ${
                        coverIsUrl ? 'text-creme/90' : 'text-texte'
                      }`}
                    >
                      « {draft.tagline} »
                    </p>
                  )}
                  <p
                    className={`mt-5 text-[13px] ${
                      coverIsUrl ? 'text-creme/80' : 'text-texte-sec'
                    }`}
                  >
                    <span className="text-or">★</span> {noteMoy.toFixed(1)} ·{' '}
                    {nbAvis} avis
                    {draft.prix_from && ` · Dès ${draft.prix_from} ${draft.devise}`}
                  </p>
                </div>
                <div className="grid gap-10 p-10 md:grid-cols-[2fr_1fr] md:p-14">
                  <div>
                    <div className="flex items-center gap-4">
                      <GoldLine width={40} />
                      <span className="overline text-or">À propos</span>
                    </div>
                    <p className="mt-5 font-serif text-[17px] italic leading-[1.65] text-texte">
                      {draft.description ||
                        'Ta description apparaîtra ici. Clique sur Modifier pour la rédiger.'}
                    </p>
                  </div>
                  <div className="rounded-sm bg-creme-deep p-6">
                    <p className="overline text-or">Services</p>
                    {draft.services.length === 0 ? (
                      <p className="mt-4 text-[12px] italic text-texte-sec">
                        Aucun service ajouté.
                      </p>
                    ) : (
                      <ul className="mt-4 divide-y divide-or/10 text-[13px]">
                        {draft.services.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between py-2"
                          >
                            <span className="text-vert">{s.nom}</span>
                            <span className="font-serif italic text-or-deep">
                              {s.prix}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </section>

      <style jsx>{`
        :global(.input-line) {
          width: 100%;
          border-bottom: 1px solid rgba(201, 169, 97, 0.2);
          background: transparent;
          padding: 0.5rem 0;
          font-size: 15px;
          color: #0f3d2e;
          outline: none;
        }
        :global(.input-line:focus) {
          border-color: #c9a961;
        }
      `}</style>
    </>
  )
}

function Group({
  kicker,
  action,
  children,
}: {
  kicker: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-sm border border-or/15 bg-blanc p-8 md:p-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">{kicker}</span>
        </div>
        {action}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
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
