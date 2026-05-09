import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isValidUuid } from '@/lib/tracking'
import { getEffectivePalier } from '@/lib/permissions'
import {
  SEASONAL_BOOST_COUNT_MAX,
  canSelectSeasonalBoost,
} from '@/lib/palier-limits'

export const runtime = 'nodejs'

/**
 * POST /api/seasonal-boosts
 *
 * Body: {
 *   profile_id: string (uuid),
 *   window_ids: string[] (uuid[])  // sélection complète, replace mode
 * }
 *
 * Replace-all : on supprime toutes les rows existantes pour ce profile
 * et on insère les nouvelles. Plus simple qu'un diff côté client.
 *
 * Validations server-side (defense in depth — le client a son propre cap) :
 *   1. Auth (session Supabase)
 *   2. Ownership : auth.uid() === profile.user_id
 *   3. Palier check : standard refusé, premium <= 1, cercle_pro illimité
 *      (founder mappé cercle_pro via getEffectivePalier)
 *   4. Window IDs valides (existent + is_active)
 *
 * Rate-limit : 20 calls / minute / utilisateur (cap modeste, save = bouton).
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'seasonal-boosts',
    max: 20,
    windowMs: 60 * 1000,
  })
  if (limited) return limited

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifiée' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const b = body as { profile_id?: unknown; window_ids?: unknown }
  const profileId = b.profile_id
  const windowIds = b.window_ids

  if (!isValidUuid(profileId)) {
    return NextResponse.json({ error: 'profile_id invalide' }, { status: 400 })
  }
  if (!Array.isArray(windowIds)) {
    return NextResponse.json({ error: 'window_ids doit être un tableau' }, { status: 400 })
  }
  if (windowIds.some((id) => !isValidUuid(id))) {
    return NextResponse.json({ error: 'window_ids contient un UUID invalide' }, { status: 400 })
  }
  // Dédup (sécurité)
  const uniqueIds = Array.from(new Set(windowIds as string[]))

  // 1. Récupérer profile + check ownership + palier
  const admin = createAdminClient()
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, user_id, palier, is_founder')
    .eq('id', profileId as string)
    .maybeSingle()
  if (profErr || !profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  }
  if (profile.user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const eff = getEffectivePalier({
    palier: profile.palier as 'standard' | 'premium' | 'cercle_pro' | null,
    is_founder: profile.is_founder as boolean | null,
  })

  if (uniqueIds.length > 0) {
    const max = SEASONAL_BOOST_COUNT_MAX[eff]
    if (max === 0) {
      return NextResponse.json(
        { error: 'Le boost saisonnier nécessite Premium ou Cercle Pro.' },
        { status: 403 },
      )
    }
    if (max !== null && uniqueIds.length > max) {
      return NextResponse.json(
        {
          error: `Avec ${eff === 'premium' ? 'Premium' : 'ton palier'}, tu peux cocher ${max} fenêtre${max > 1 ? 's' : ''} maximum.`,
        },
        { status: 400 },
      )
    }
  }

  // 2. Valider que les window_ids existent et sont actives
  if (uniqueIds.length > 0) {
    const { data: wins, error: winErr } = await admin
      .from('seasonal_event_windows')
      .select('id')
      .in('id', uniqueIds)
      .eq('is_active', true)
    if (winErr) {
      return NextResponse.json({ error: winErr.message }, { status: 500 })
    }
    if ((wins?.length ?? 0) !== uniqueIds.length) {
      return NextResponse.json(
        { error: 'Certaines fenêtres sont inactives ou inexistantes.' },
        { status: 400 },
      )
    }
  }

  // 3. Replace-all : DELETE existing puis INSERT new
  // (pas de transaction explicite côté Supabase JS — risque limité car le
  // worst case est "DELETE OK + INSERT fail" = 0 boost actif, juste à
  // re-cocher. Pas de corruption data.)
  const { error: delErr } = await admin
    .from('profile_seasonal_boosts')
    .delete()
    .eq('profile_id', profileId as string)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  if (uniqueIds.length > 0) {
    const rows = uniqueIds.map((wid) => ({
      profile_id: profileId as string,
      window_id: wid,
    }))
    const { error: insErr } = await admin
      .from('profile_seasonal_boosts')
      .insert(rows)
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, count: uniqueIds.length }, { status: 200 })
}
