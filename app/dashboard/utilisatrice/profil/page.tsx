'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'
import { villesSuggestions } from '@/lib/mock-data'

type Draft = {
  prenom: string
  pays: string
  ville: string
  bio: string
  avatar_url: string | null
}

const PAYS = ['Suisse', 'France', 'Belgique', 'Luxembourg', 'Monaco']

export default function MonProfilPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [draft, setDraft] = useState<Draft>({
    prenom: '',
    pays: '',
    ville: '',
    bio: '',
    avatar_url: null,
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
      setEmail(user.email ?? '')

      const { data, error: fetchErr } = await supabase
        .from('user_profiles')
        .select(
          'id, prenom, pays, ville, bio, avatar_url, created_at',
        )
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchErr) setError(fetchErr.message)
      if (data) {
        setDraft({
          prenom: data.prenom ?? '',
          pays: data.pays ?? '',
          ville: data.ville ?? '',
          bio: data.bio ?? '',
          avatar_url: data.avatar_url ?? null,
        })
        setCreatedAt(data.created_at ?? null)
      }
      setLoading(false)
    }
    run()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: updErr } = await supabase
      .from('user_profiles')
      .update({
        prenom: draft.prenom.trim(),
        pays: draft.pays.trim(),
        ville: draft.ville.trim(),
        bio: draft.bio.trim(),
        avatar_url: draft.avatar_url,
      })
      .eq('user_id', userId)

    setSaving(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleFile = async (file: File) => {
    if (!userId) return
    if (file.size > 3 * 1024 * 1024) {
      setError('L\'image doit faire moins de 3 Mo.')
      return
    }
    setUploading(true)
    setError(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/avatar-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('user-avatars')
      .upload(path, file, { cacheControl: '3600', upsert: true })

    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('user-avatars').getPublicUrl(path)

    setDraft((d) => ({ ...d, avatar_url: publicUrl }))
    setUploading(false)
  }

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const avatarIsUrl =
    draft.avatar_url?.startsWith('http') || draft.avatar_url?.startsWith('/')

  return (
    <>
      <DashboardHeader
        kicker="Mon profil"
        titre={
          <>
            Ton image,
            <br />
            <em className="font-serif italic text-or">telle que tu choisis.</em>
          </>
        }
        lead="Ton profil reste privé. Seul ton prénom apparaît quand tu recommandes ou que tu commentes une fiche."
      />

      <section className="px-6 py-10 md:px-12 md:py-14">
        {error && (
          <p className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
            {error}
          </p>
        )}

        {loading ? (
          <div className="h-96 animate-pulse rounded-sm bg-creme-deep" />
        ) : (
          <form
            onSubmit={handleSave}
            className="grid gap-12 md:grid-cols-[320px_1fr] md:gap-16"
          >
            <div className="flex flex-col items-center gap-5 rounded-sm border border-or/15 bg-blanc p-8 text-center">
              <span
                className="h-32 w-32 rounded-full bg-cover bg-center ring-2 ring-or/30"
                style={
                  avatarIsUrl
                    ? { backgroundImage: `url(${draft.avatar_url})` }
                    : { backgroundColor: '#D4C5B0' }
                }
                aria-label="Avatar"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[11px] tracking-[0.22em] text-vert uppercase underline-offset-4 hover:text-or hover:underline disabled:opacity-60"
              >
                {uploading ? 'Envoi…' : 'Changer la photo'}
              </button>
              {draft.avatar_url && (
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, avatar_url: null }))}
                  className="text-[10px] tracking-[0.22em] text-texte-sec uppercase hover:text-red-900"
                >
                  Retirer
                </button>
              )}
              <div className="mt-2 h-px w-full bg-or/20" />
              <div className="w-full text-left">
                <p className="overline text-or">Membre depuis</p>
                <p className="mt-2 font-serif text-lg text-vert">
                  {memberSince}
                </p>
              </div>
              <div className="w-full text-left">
                <p className="overline text-or">Email</p>
                <p className="mt-2 break-all text-[13px] text-vert">{email}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <GoldLine width={40} />
                <span className="overline text-or">À propos de toi</span>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Prénom">
                  <input
                    type="text"
                    required
                    value={draft.prenom}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, prenom: e.target.value }))
                    }
                    className="w-full border-b border-or/20 bg-transparent py-2 text-[15px] text-vert focus:border-or focus:outline-none"
                  />
                </Field>
                <Field label="Pays">
                  <select
                    value={draft.pays}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, pays: e.target.value }))
                    }
                    className="w-full border-b border-or/20 bg-transparent py-2 text-[15px] text-vert focus:border-or focus:outline-none"
                  >
                    <option value="">Choisis…</option>
                    {PAYS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Ville"
                  hint="Suisse, France, Belgique, Luxembourg, Monaco"
                >
                  <input
                    type="text"
                    list="villes-profil"
                    value={draft.ville}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, ville: e.target.value }))
                    }
                    className="w-full border-b border-or/20 bg-transparent py-2 text-[15px] text-vert focus:border-or focus:outline-none"
                  />
                  <datalist id="villes-profil">
                    {villesSuggestions.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </Field>
              </div>

              <Field
                label="Une phrase sur toi"
                hint="Elle s'affichera à côté de tes recommandations. Reste toi-même."
              >
                <textarea
                  value={draft.bio}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, bio: e.target.value }))
                  }
                  rows={4}
                  maxLength={300}
                  className="w-full resize-none border-b border-or/20 bg-transparent py-2 font-serif text-[16px] italic text-vert focus:border-or focus:outline-none"
                />
              </Field>

              <div className="flex items-center gap-6 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-vert px-7 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark disabled:opacity-60"
                >
                  {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer'}
                  <span
                    className="text-or-light transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[12px] text-or"
                  >
                    C&apos;est noté.
                  </motion.span>
                )}
              </div>
            </div>
          </form>
        )}
      </section>
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
