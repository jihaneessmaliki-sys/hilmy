import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  incrementPerkUsedCountAdmin,
  getPerkByIdAdmin,
} from '@/lib/supabase/queries/pro-perks'

export const runtime = 'nodejs'

/**
 * POST /api/pro-perks/[id]/claim
 *
 * Une Copine claim une offre Pro Perk. Retourne le code unique
 * HILMY-XXXX-YYYY à afficher.
 *
 * Gating defense-in-depth (Phase 5 D5) :
 *   1. Auth — 401 sinon
 *   2. user_profiles.is_copine = true — 403 sinon
 *      (DB-side : RLS INSERT gated by is_user_copine() — double rideau)
 *   3. Perk existe, status='active', fenêtre OK — 404/410 sinon
 *   4. Race-safe max_uses check via UPDATE conditionné
 *      (incrementPerkUsedCountAdmin) — si dépassement, rollback claim
 *
 * Idempotence : la contrainte UNIQUE(perk_id, user_id) garantit qu'un
 * 2e claim sur le même perk retourne le code DÉJÀ généré (on lit
 * d'abord pro_perk_claims avant d'insérer).
 *
 * Rate-limit : 10/min/IP.
 */

function generateClaimCode(): string {
  // 2 segments de 4 hex chars majuscules (regex DB ^HILMY-[A-F0-9]{4}-[A-F0-9]{4}$).
  const segment = () => randomBytes(2).toString('hex').toUpperCase()
  return `HILMY-${segment()}-${segment()}`
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(request, {
    tag: 'pro-perks-claim',
    max: 10,
    windowMs: 60 * 1000,
  })
  if (limited) return limited

  const { id: perkId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifiée' }, { status: 401 })
  }

  // Gate is_copine (defense-in-depth — RLS DB-side gate aussi via
  // is_user_copine()).
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_copine')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_copine) {
    return NextResponse.json(
      { error: 'COPINE_REQUIRED', message: 'Réservé aux Copines.' },
      { status: 403 },
    )
  }

  // Fetch perk pour vérifier qu'il est claimable (active + fenêtre OK).
  const perk = await getPerkByIdAdmin(perkId)
  if (!perk) {
    return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })
  }
  if (perk.status !== 'active') {
    return NextResponse.json(
      { error: "Cette offre n'est plus active." },
      { status: 410 },
    )
  }
  const now = Date.now()
  if (new Date(perk.starts_at).getTime() > now) {
    return NextResponse.json(
      { error: "Cette offre n'est pas encore ouverte." },
      { status: 410 },
    )
  }
  if (perk.ends_at && new Date(perk.ends_at).getTime() <= now) {
    return NextResponse.json(
      { error: 'Cette offre est terminée.' },
      { status: 410 },
    )
  }

  // Idempotence : si la Copine a déjà claim ce perk, on lui renvoie son code.
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('pro_perk_claims')
    .select('id, code_displayed, marked_used_at, created_at')
    .eq('perk_id', perkId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({
      ok: true,
      already_claimed: true,
      code: (existing as { code_displayed: string }).code_displayed,
      claim_id: (existing as { id: string }).id,
    })
  }

  // Génère le code et insère le claim (RLS pro_perk_claims_copine_insert
  // re-vérifie is_user_copine — defense-in-depth DB).
  const code = generateClaimCode()
  const { data: claim, error: claimErr } = await supabase
    .from('pro_perk_claims')
    .insert({
      perk_id: perkId,
      user_id: user.id,
      code_displayed: code,
    })
    .select('id, code_displayed')
    .single()

  if (claimErr || !claim) {
    return NextResponse.json(
      { error: claimErr?.message ?? 'Impossible de générer ton code.' },
      { status: 500 },
    )
  }

  // Incrément atomique used_count avec garde max_uses (race-safe).
  // Si la garde DB filtre (perk au max entre fetch et insert), on
  // rollback le claim pour éviter d'avoir un code orphelin.
  const incr = await incrementPerkUsedCountAdmin(perkId)
  if (!incr.ok) {
    await admin.from('pro_perk_claims').delete().eq('id', claim.id)
    return NextResponse.json(
      { error: 'Cette offre n\'a plus de places disponibles.' },
      { status: 409 },
    )
  }

  return NextResponse.json({
    ok: true,
    already_claimed: false,
    code: claim.code_displayed,
    claim_id: claim.id,
  })
}

/**
 * PATCH /api/pro-perks/[id]/claim — marque le claim comme utilisé.
 *
 * RLS pro_perk_claims_self_update autorise la Copine à patcher son
 * propre claim (user_id = auth.uid()). Pas de gating supplémentaire
 * côté API au-delà de l'auth.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(request, {
    tag: 'pro-perks-mark-used',
    max: 10,
    windowMs: 60 * 1000,
  })
  if (limited) return limited

  const { id: perkId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifiée' }, { status: 401 })
  }

  const { error } = await supabase
    .from('pro_perk_claims')
    .update({ marked_used_at: new Date().toISOString() })
    .eq('perk_id', perkId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
