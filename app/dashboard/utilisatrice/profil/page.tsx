'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'
import { villesSuggestions } from '@/lib/mock-data'
import {
  getAllLevels,
  getNextLevelInfo,
  pointEventLabel,
} from '@/lib/gamification-helpers'
import type {
  GamificationStatut,
  PointEvent,
  UserGamification,
} from '@/lib/supabase/types'

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

  // Gamification (Sprint U1.5 mig 16 + backfill mig 48)
  const [gamif, setGamif] = useState<UserGamification | null>(null)
  const [recentEvents, setRecentEvents] = useState<PointEvent[]>([])

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

      // Gamification — fetch parallèle (vue user_gamification + 5
      // derniers gains). RLS authenticated read OK, service_role inutile.
      const [gamifRes, eventsRes] = await Promise.all([
        supabase
          .from('user_gamification')
          .select('user_id, total_points, statut, derniere_activite')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('point_events')
          .select('id, user_id, source_id, event_type, points, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (gamifRes.data) setGamif(gamifRes.data as UserGamification)
      if (eventsRes.data) setRecentEvents(eventsRes.data as PointEvent[])

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
              {/* Mon niveau — Sprint U1.5 gamification UI */}
              <NiveauSection gamif={gamif} recentEvents={recentEvents} />

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

const STATUT_EMOJI: Record<GamificationStatut, string> = {
  Nouvelle: '🌱',
  Copine: '✨',
  Pilier: '🌟',
  Légende: '👑',
}

function NiveauSection({
  gamif,
  recentEvents,
}: {
  gamif: UserGamification | null
  recentEvents: PointEvent[]
}) {
  const totalPoints = gamif?.total_points ?? 0
  const statut = gamif?.statut ?? 'Nouvelle'
  const next = getNextLevelInfo(totalPoints)
  const allLevels = getAllLevels()

  return (
    <section className="rounded-sm border border-or/15 bg-creme-soft p-6 md:p-8">
      <div className="mb-5 flex items-center gap-4">
        <GoldLine width={40} />
        <span className="overline text-or">Mon niveau</span>
      </div>

      {/* Header niveau actuel + total points */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-serif text-[34px] leading-none font-light text-vert md:text-[40px]">
            <span aria-hidden="true" className="mr-2">
              {STATUT_EMOJI[statut]}
            </span>
            {statut}
          </p>
          <p className="mt-2 text-[13px] text-texte-sec">
            {totalPoints} pt{totalPoints > 1 ? 's' : ''} cumulé{totalPoints > 1 ? 's' : ''}
          </p>
        </div>
        {next.next_level && (
          <p className="font-serif text-[14px] italic text-or md:text-[15px]">
            Plus que <span className="font-medium">{next.points_to_next}</span> pts pour
            devenir <span className="font-medium">{next.next_level}</span>.
          </p>
        )}
        {!next.next_level && (
          <p className="font-serif text-[14px] italic text-or">
            Tu es au sommet. Continue, on est fières.
          </p>
        )}
      </div>

      {/* Barre de progression */}
      <div className="mt-5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-blanc">
          <div
            className="h-full rounded-full bg-or transition-all duration-700"
            style={{ width: `${next.percent_progress}%` }}
            aria-label={`Progression : ${next.percent_progress}%`}
          />
        </div>
      </div>

      {/* Accordion 4 paliers + avantages débloqués */}
      <div className="mt-6">
        <p className="overline text-or">Avantages par niveau</p>
        <LevelAccordion currentStatut={statut} totalPoints={totalPoints} />
      </div>

      {/* Comment gagner */}
      <div className="mt-7 grid gap-3 md:grid-cols-3">
        <HowToEarnTile
          points="+10"
          quoi="par recommandation publiée"
        />
        <HowToEarnTile
          points="+20"
          quoi="par événement créé"
        />
        <HowToEarnTile
          points="+5"
          quoi="quand une copine save ta reco"
          hint="max 50 pts par reco"
        />
      </div>

      {/* Derniers gains */}
      {recentEvents.length > 0 && (
        <div className="mt-7">
          <p className="overline text-or">Tes derniers points</p>
          <ul className="mt-3 divide-y divide-or/10">
            {recentEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
              >
                <span className="text-vert">
                  <span className="font-medium text-or">+{ev.points} pts</span>{' '}
                  <span className="italic text-texte-sec">
                    {pointEventLabel(ev.event_type)}
                  </span>
                </span>
                <span className="text-[11px] tracking-[0.16em] text-texte-sec uppercase">
                  {relativeFr(ev.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/**
 * Avantages par palier — voix Sara stricte.
 *
 * ⚠️ Plusieurs avantages listés ici sont des engagements à honorer côté
 * produit (codes promo, IRL, newsletter). Voir tech-debt.md section
 * "Engagements à honorer" pour le tracking par sprint.
 */
const LEVEL_ADVANTAGES: Record<GamificationStatut, string[]> = {
  Nouvelle: ["Tu viens d'arriver. Bienvenue parmi les copines."],
  Copine: [
    '🎁 1 code -10% chez 1 prestataire Cercle Pro au choix',
    '✨ Ton statut s\'affiche sur tes recos publiées',
  ],
  Pilier: [
    '🎁 1 code -10% chez 3 prestataires Cercle Pro au choix',
    '✨ Ta voix mise en avant sur la homepage Hilmy',
    '🌙 Invitée aux brunchs Hilmy IRL',
  ],
  Légende: [
    '🎁 1 code -10% chez 5 prestataires Cercle Pro au choix',
    '✨ Profil mis en avant dans l\'annuaire',
    '🌙 Accès prioritaire aux events VIP',
    '🎤 Possibilité d\'écrire dans la newsletter Hilmy',
  ],
}

function LevelAccordion({
  currentStatut,
  totalPoints,
}: {
  currentStatut: GamificationStatut
  totalPoints: number
}) {
  const allLevels = getAllLevels()
  // Default expanded = palier actuel uniquement, pour que la copine voie
  // immédiatement ses avantages déjà acquis sans avoir à dérouler.
  const [openSet, setOpenSet] = useState<Set<GamificationStatut>>(
    () => new Set([currentStatut]),
  )

  const toggle = (statut: GamificationStatut) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(statut)) next.delete(statut)
      else next.add(statut)
      return next
    })
  }

  return (
    <ul className="mt-3 space-y-2">
      {allLevels.map((l) => {
        const reached = totalPoints >= l.min
        const isCurrent = l.statut === currentStatut
        const isOpen = openSet.has(l.statut)
        const advantages = LEVEL_ADVANTAGES[l.statut]
        return (
          <li
            key={l.statut}
            className={`overflow-hidden rounded-sm border transition-colors ${
              isCurrent
                ? 'border-or/50 bg-blanc'
                : reached
                  ? 'border-or/20 bg-blanc/70'
                  : 'border-or/10 bg-blanc/40'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(l.statut)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-creme-deep/30"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="text-[20px]">
                  {STATUT_EMOJI[l.statut]}
                </span>
                <span className="flex flex-col">
                  <span
                    className={`font-serif text-[16px] leading-tight ${
                      reached ? 'text-vert' : 'text-texte-sec'
                    }`}
                  >
                    {l.statut}
                    <span className="ml-2 text-[11px] tracking-[0.18em] text-or uppercase">
                      {l.min}+ pts
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 text-[10px] tracking-[0.22em] uppercase ${
                      reached ? 'text-vert/60' : 'text-texte-sec/60'
                    }`}
                  >
                    {reached ? '✅ Débloqué' : '🔒 Verrouillé'}
                  </span>
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`shrink-0 text-or transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                }`}
              >
                ▾
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <ul
                  className={`space-y-1.5 px-4 pb-4 text-[13px] leading-[1.5] ${
                    reached ? 'text-vert' : 'text-texte-sec'
                  }`}
                >
                  {advantages.map((line, i) => (
                    <li key={i} className="list-none pl-7 -indent-7">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function HowToEarnTile({
  points,
  quoi,
  hint,
}: {
  points: string
  quoi: string
  hint?: string
}) {
  return (
    <div className="rounded-sm border border-or/15 bg-blanc p-4">
      <p className="font-serif text-2xl font-light text-or">{points} pts</p>
      <p className="mt-1 text-[12px] leading-[1.4] text-vert">{quoi}</p>
      {hint && (
        <p className="mt-1 text-[11px] italic text-texte-sec">{hint}</p>
      )}
    </div>
  )
}

function relativeFr(iso: string): string {
  const now = Date.now()
  const target = new Date(iso).getTime()
  const diffDays = Math.round((now - target) / 86400000)
  if (diffDays < 1) return "aujourd'hui"
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) return `il y a ${diffDays} j`
  if (diffDays < 30) return `il y a ${Math.round(diffDays / 7)} sem.`
  if (diffDays < 365) return `il y a ${Math.round(diffDays / 30)} mois`
  return `il y a ${Math.round(diffDays / 365)} an${Math.round(diffDays / 365) > 1 ? 's' : ''}`
}
