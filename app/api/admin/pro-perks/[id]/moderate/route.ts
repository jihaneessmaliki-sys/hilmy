import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  getPerkByIdAdmin,
  setPerkStatusAdmin,
} from '@/lib/supabase/queries/pro-perks'
import {
  sendPerkApproved,
  sendPerkRejected,
} from '@/lib/email/transactional'

export const runtime = 'nodejs'

/**
 * POST /api/admin/pro-perks/[id]/moderate
 *
 * Modération admin d'un perk en pending_review.
 * Body :
 *   { action: 'approve' }              → status='active'
 *   { action: 'reject', reason: text } → status='rejected', stores reason
 *
 * Gating defense-in-depth :
 *   1. Auth — 401 sinon
 *   2. user_metadata.is_admin = true — 403 sinon
 *      (RLS admin_all gate aussi côté DB — defense-in-depth)
 *   3. Action ∈ {approve, reject} — 400 sinon
 *   4. reject : reason non vide (l'email au presta l'inclut)
 *
 * Email best-effort post-décision (approved ou rejected).
 *
 * Rate-limit : 30/min/IP (modération en série côté admin).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(request, {
    tag: 'admin-pro-perks-moderate',
    max: 30,
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
  if (!user.user_metadata?.is_admin) {
    return NextResponse.json({ error: 'Réservé admin' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  const action = (body as { action?: unknown }).action
  const reason = (body as { reason?: unknown }).reason

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { error: "action doit être 'approve' ou 'reject'" },
      { status: 400 },
    )
  }
  if (action === 'reject') {
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Une raison de refus est obligatoire.' },
        { status: 422 },
      )
    }
    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'Raison trop longue (max 500 caractères).' },
        { status: 422 },
      )
    }
  }

  // Fetch perk + presta pour l'email post-décision.
  const perk = await getPerkByIdAdmin(perkId)
  if (!perk) {
    return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })
  }
  if (perk.status !== 'pending_review') {
    return NextResponse.json(
      { error: 'Cette offre a déjà été modérée.' },
      { status: 409 },
    )
  }

  const admin = createAdminClient()
  const { data: presta } = await admin
    .from('profiles')
    .select('id, nom, email')
    .eq('id', perk.prestataire_profile_id)
    .maybeSingle()

  // Update status. RLS admin_all autorise. setPerkStatusAdmin gère
  // aussi rejection_reason (null si approve).
  const nextStatus = action === 'approve' ? 'active' : 'rejected'
  const updateRes = await setPerkStatusAdmin(
    perkId,
    nextStatus,
    action === 'reject' ? (reason as string).trim() : null,
  )
  if (!updateRes.ok) {
    return NextResponse.json({ error: updateRes.error }, { status: 500 })
  }

  // Email post-décision — best-effort.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    new URL(request.url).origin
  const dashboardUrl = `${origin}/dashboard/prestataire/avantages`

  try {
    const prestaEmail = (presta as { email?: string | null } | null)?.email
    const prestaNom = (presta as { nom?: string | null } | null)?.nom ?? ''
    if (prestaEmail) {
      if (action === 'approve') {
        await sendPerkApproved({
          to: prestaEmail,
          prestaPrenom: prestaNom || 'la team',
          perkTitle: perk.title,
          dashboardUrl,
        })
      } else {
        await sendPerkRejected({
          to: prestaEmail,
          prestaPrenom: prestaNom || 'la team',
          perkTitle: perk.title,
          rejectionReason: (reason as string).trim(),
          dashboardUrl,
        })
      }
    }
  } catch (err) {
    console.warn('[admin/pro-perks/moderate] email failed:', err)
  }

  return NextResponse.json({ ok: true, status: nextStatus })
}
