/**
 * Helpers gamification PURS — pas d'imports Supabase, utilisable depuis
 * client + server components sans accrocher next/headers.
 *
 * Sources de vérité (synchro à maintenir) :
 *  - Seuils alignés sur la vue SQL `user_gamification` (mig 16)
 *  - Labels alignés sur les event_type des triggers SECURITY DEFINER
 *
 * Le helper async (queries vers la BDD) reste dans
 * lib/supabase/queries/gamification.ts.
 */

import type { GamificationStatut } from '@/lib/supabase/types'

const LEVEL_THRESHOLDS: { statut: GamificationStatut; min: number }[] = [
  { statut: 'Nouvelle', min: 0 },
  { statut: 'Copine', min: 20 },
  { statut: 'Pilier', min: 100 },
  { statut: 'Légende', min: 300 },
]

export interface NextLevelInfo {
  current_level: GamificationStatut
  next_level: GamificationStatut | null
  next_level_threshold: number | null
  current_threshold: number
  points_to_next: number
  /** Progression dans le palier actuel (0-100). 100 si Légende atteinte. */
  percent_progress: number
}

/**
 * Drive la barre de progression sur le profil et le copy "Plus que X
 * points pour devenir {next_level}". Pas de query, calcul client-side.
 */
export function getNextLevelInfo(currentPoints: number): NextLevelInfo {
  const safe = Math.max(0, Math.floor(currentPoints))
  let currentIdx = 0
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (safe >= LEVEL_THRESHOLDS[i].min) currentIdx = i
  }
  const current = LEVEL_THRESHOLDS[currentIdx]
  const next = LEVEL_THRESHOLDS[currentIdx + 1] ?? null

  if (!next) {
    return {
      current_level: current.statut,
      next_level: null,
      next_level_threshold: null,
      current_threshold: current.min,
      points_to_next: 0,
      percent_progress: 100,
    }
  }

  const points_to_next = Math.max(0, next.min - safe)
  const palier_size = next.min - current.min
  const palier_progress = safe - current.min
  const percent_progress =
    palier_size <= 0
      ? 100
      : Math.min(100, Math.max(0, Math.round((palier_progress / palier_size) * 100)))

  return {
    current_level: current.statut,
    next_level: next.statut,
    next_level_threshold: next.min,
    current_threshold: current.min,
    points_to_next,
    percent_progress,
  }
}

/** Liste des 4 paliers — utile pour afficher l'échelle complète. */
export function getAllLevels(): { statut: GamificationStatut; min: number }[] {
  return [...LEVEL_THRESHOLDS]
}

/** Label voix Sara pour un event_type donné. */
export function pointEventLabel(eventType: string): string {
  switch (eventType) {
    case 'reco_published':
      return 'pour ta recommandation'
    case 'event_published':
      return "pour ton événement"
    case 'reco_saved_by_other':
      return 'une copine a sauvegardé ta reco'
    default:
      return ''
  }
}
