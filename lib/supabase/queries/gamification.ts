/**
 * Queries gamification (mig 16 + backfill mig 48 — Sprint U1.5).
 *
 * Sources de vérité côté BDD :
 *  - public.point_events    : log immuable des gains
 *  - public.user_gamification : vue (user_id, total_points, statut,
 *                              derniere_activite). Recalcule à chaque
 *                              SELECT — pas de cache.
 *
 * Niveaux hardcodés (alignés sur la vue SQL) :
 *   Nouvelle  0-19
 *   Copine   20-99
 *   Pilier  100-299
 *   Légende 300+
 *
 * RLS appliquée :
 *  - point_events    : authenticated read, write impossible (triggers only)
 *  - user_gamification : grant select to authenticated, anon
 */

import { createClient } from '@/lib/supabase/server'
import type {
  PointEvent,
  QueryResult,
  UserGamification,
} from '@/lib/supabase/types'

// Re-export des helpers purs depuis lib/gamification-helpers.ts pour
// que les call sites server puissent tout importer ici. Les call sites
// client doivent importer directement depuis lib/gamification-helpers
// pour éviter d'embarquer le client Supabase server (next/headers).
export {
  getAllLevels,
  getNextLevelInfo,
  pointEventLabel,
  type NextLevelInfo,
} from '@/lib/gamification-helpers'

const GAMIFICATION_SELECT = 'user_id, total_points, statut, derniere_activite'

const POINT_EVENT_SELECT =
  'id, user_id, source_id, event_type, points, created_at'

/** Stats gamif d'un user (1 row de la vue user_gamification). */
export async function getUserGamification(
  userId: string,
): Promise<QueryResult<UserGamification | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_gamification')
      .select(GAMIFICATION_SELECT)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data: (data as UserGamification | null) ?? null, error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

/**
 * Batch fetch — pour les listings où plusieurs auteurs apparaissent
 * (ex. /recommandation/[slug] qui agrège N recos de N copines).
 * Retourne une Map indexée par user_id pour lookup O(1) côté render.
 * Users sans rows (= 0 points, jamais publié) → absents de la Map →
 * statut "Nouvelle" à dériver côté UI si besoin.
 */
export async function getUserGamificationByUserIds(
  userIds: string[],
): Promise<Map<string, UserGamification>> {
  if (userIds.length === 0) return new Map()
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_gamification')
      .select(GAMIFICATION_SELECT)
      .in('user_id', userIds)
    if (error || !data) return new Map()
    const m = new Map<string, UserGamification>()
    for (const row of data as UserGamification[]) {
      m.set(row.user_id, row)
    }
    return m
  } catch {
    return new Map()
  }
}

/**
 * Derniers gains de points pour un user (chronologique DESC). Utilisé
 * par le bloc "Tes derniers points" sur le profil utilisatrice.
 * Le default 5 = ce qu'affiche la section ; passer 10+ pour une page
 * historique dédiée si elle est faite plus tard.
 */
export async function getRecentPointEvents(
  userId: string,
  limit = 5,
): Promise<QueryResult<PointEvent[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('point_events')
      .select(POINT_EVENT_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []) as unknown as PointEvent[], error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
