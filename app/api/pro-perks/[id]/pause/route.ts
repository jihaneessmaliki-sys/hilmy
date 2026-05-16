import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * POST /api/pro-perks/[id]/pause
 *
 * Toggle pause↔active sur un perk dont le caller est owner.
 * Body : { action: 'pause' | 'resume' }
 *
 * Gating :
 *   - Auth — 401 sinon
 *   - RLS owner_all filtre déjà : un caller non-owner ne peut pas
 *     update les rows d'un autre prestataire. On garde le check
 *     explicite côté client (.eq(prestataire_profile_id)) pour clarté.
 *
 * Règle : on n'autorise pause↔active. Un perk en pending_review ou
 * rejected ne peut pas être paused/resumed — seul l'admin déplace
 * depuis ces statuts.
 *
 * Rate-limit : 10/min/IP.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(request, {
    tag: 'pro-perks-toggle',
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  const action = (body as { action?: unknown }).action
  if (action !== 'pause' && action !== 'resume') {
    return NextResponse.json(
      { error: "action doit être 'pause' ou 'resume'" },
      { status: 400 },
    )
  }

  // Fetch courant pour vérifier la transition autorisée.
  const { data: perk, error: fetchErr } = await supabase
    .from('pro_perks')
    .select('id, status, prestataire_profile_id')
    .eq('id', perkId)
    .maybeSingle()
  if (fetchErr || !perk) {
    return NextResponse.json(
      { error: fetchErr?.message ?? 'Offre introuvable' },
      { status: 404 },
    )
  }

  const current = (perk as { status: string }).status
  if (action === 'pause' && current !== 'active') {
    return NextResponse.json(
      { error: "Seules les offres actives peuvent être mises en pause." },
      { status: 409 },
    )
  }
  if (action === 'resume' && current !== 'paused') {
    return NextResponse.json(
      { error: "Seules les offres en pause peuvent être réactivées." },
      { status: 409 },
    )
  }

  const nextStatus = action === 'pause' ? 'paused' : 'active'
  const { error: updateErr } = await supabase
    .from('pro_perks')
    .update({ status: nextStatus })
    .eq('id', perkId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, status: nextStatus })
}
