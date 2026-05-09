'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  SEASONAL_BOOST_COUNT_MAX,
  canSelectSeasonalBoost,
  seasonalBoostCountLabel,
} from '@/lib/palier-limits'
import type { Palier } from '@/app/tarifs/_lib/pricing'
import type { SeasonalEventWindow } from '@/lib/supabase/types'

interface Props {
  /** UUID du profile prestataire (déjà chargé par la page dashboard). */
  profileId: string
  /** Palier effectif (founders mappés cercle_pro) — drive le cap + le copy. */
  palier: Palier
}

function dateRangeLabel(starts: string | null, ends: string | null): string {
  if (!starts || !ends) return ''
  const s = new Date(starts)
  const e = new Date(ends)
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
  return `${fmt.format(s)} → ${fmt.format(e)}`
}

/**
 * Section "Tes périodes" du dashboard prestataire fiche (PR-D mig 44).
 *
 * 3 modes selon palier :
 *  - standard   : upsell card (boost non inclus)
 *  - premium    : 1 fenêtre cochable maximum
 *  - cercle_pro : illimité
 *
 * Voix Sara : "On te met devant les copines pendant ces périodes-là."
 *
 * Persistence via API route /api/seasonal-boosts (POST = replace all).
 * Le cap palier est revalidé server-side dans l'API route — pas de
 * trigger BDD pour rester souple sur les changements de palier.
 */
export function SeasonalBoostsSection({ profileId, palier }: Props) {
  const [windows, setWindows] = useState<SeasonalEventWindow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const [winsRes, boostsRes] = await Promise.all([
        supabase
          .from('seasonal_event_windows')
          .select('id, slug, label, emoji, starts_at, ends_at, is_active, created_at, updated_at')
          .eq('is_active', true)
          .order('starts_at', { ascending: true, nullsFirst: false }),
        supabase
          .from('profile_seasonal_boosts')
          .select('window_id')
          .eq('profile_id', profileId),
      ])
      if (winsRes.error) {
        setError(winsRes.error.message)
        setLoading(false)
        return
      }
      setWindows((winsRes.data ?? []) as SeasonalEventWindow[])
      const ids = (boostsRes.data ?? []).map((r: { window_id: string }) => r.window_id)
      setSelectedIds(new Set(ids))
      setLoading(false)
    }
    run()
  }, [profileId])

  const cap = SEASONAL_BOOST_COUNT_MAX[palier]
  const isCercle = cap === null
  const isPremium = cap === 1
  const isStandard = cap === 0

  // Mode Standard : upsell card, pas de form
  if (isStandard) {
    return (
      <div className="rounded-sm border border-or/30 bg-creme-soft p-6 md:p-7">
        <p className="overline text-or">Boost saisonnier · disponible avec Premium</p>
        <p className="mt-2 font-serif text-[18px] italic leading-[1.4] text-vert md:text-[20px]">
          Pendant tes périodes clés, ta fiche remonte automatiquement en haut de l&apos;annuaire.
        </p>
        <p className="mt-2 max-w-2xl text-[13px] leading-[1.6] text-texte-sec">
          Ramadan, Saint-Valentin, saison mariage, rentrée… Tu coches une fois,
          ça tourne tout seul pendant la fenêtre. Disponible dès le palier Premium.
        </p>
        <a
          href="/dashboard/prestataire/abonnement"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
        >
          Passer Premium
          <span className="text-or-light" aria-hidden="true">→</span>
        </a>
      </div>
    )
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-sm bg-creme-deep" />
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        // Cap check côté UI (l'API route revalide server-side)
        if (!canSelectSeasonalBoost(palier, next.size)) {
          setError(
            `Avec ton palier ${isPremium ? 'Premium' : ''}, tu peux cocher 1 fenêtre. Décoche celle en cours pour en choisir une autre.`,
          )
          return prev
        }
        next.add(id)
      }
      setError(null)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setSavedAt(null)
    try {
      const res = await fetch('/api/seasonal-boosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          window_ids: Array.from(selectedIds),
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        setError(json?.error || 'Échec de la sauvegarde.')
        setSaving(false)
        return
      }
      setSavedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau.')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-serif text-[18px] italic leading-[1.4] text-vert md:text-[20px]">
          On te met devant les copines pendant ces périodes-là.
        </p>
        <p className="mt-2 max-w-2xl text-[13px] leading-[1.6] text-texte-sec">
          Tu paramètres une fois, ça tourne. Pendant chaque fenêtre cochée, ta
          fiche remonte automatiquement en haut de l&apos;annuaire avec un badge
          dédié.
        </p>
        <p className="mt-3 text-[12px] tracking-[0.22em] text-texte-sec uppercase">
          {seasonalBoostCountLabel(palier, selectedIds.size)}
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
          {error}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {windows.map((w) => {
          const checked = selectedIds.has(w.id)
          const disabled =
            !checked && !canSelectSeasonalBoost(palier, selectedIds.size)
          return (
            <li key={w.id}>
              <label
                className={`group flex cursor-pointer items-start gap-3 rounded-sm border bg-blanc p-4 transition-all ${
                  checked
                    ? 'border-or/60 shadow-[0_4px_16px_-8px_rgba(201,169,97,0.4)]'
                    : 'border-or/15 hover:border-or/40'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(w.id)}
                  className="mt-1 h-4 w-4 cursor-pointer accent-or disabled:cursor-not-allowed"
                  aria-label={`Boost ${w.label}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-[18px]">{w.emoji}</span>
                    <span className="font-serif text-[16px] text-vert">{w.label}</span>
                  </div>
                  {w.starts_at && w.ends_at && (
                    <p className="mt-1 text-[11px] tracking-[0.18em] text-texte-sec uppercase">
                      {dateRangeLabel(w.starts_at, w.ends_at)}
                    </p>
                  )}
                </div>
              </label>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer mes périodes'}
          <span className="text-or-light" aria-hidden="true">→</span>
        </button>
        {savedAt && Date.now() - savedAt < 5000 && (
          <span className="text-[11px] italic text-vert">Enregistré ✓</span>
        )}
      </div>

      {isCercle && (
        <p className="text-[11px] italic text-texte-sec">
          Avec Cercle Pro, tu peux cocher autant de périodes que tu veux.
        </p>
      )}
    </div>
  )
}
