import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { hasCerclePro } from '@/lib/permissions'
import { sendPerkPendingReview } from '@/lib/email/transactional'
import type { Palier } from '@/app/tarifs/_lib/pricing'

export const runtime = 'nodejs'

/**
 * POST /api/pro-perks
 *
 * Création d'une offre Pro Perk par un prestataire Cercle Pro.
 *
 * Gating defense-in-depth (Phase 5 D5) :
 *   1. Auth (cookie session) — 401 sinon
 *   2. Profile présent — 404 sinon
 *   3. hasCerclePro(profile) (palier='cercle_pro' OR is_founder=true)
 *      AND status='approved' — 403 sinon
 *   4. Validation Zod du payload (titre 1-80, description ≤300, etc.)
 *
 * Insert avec status='pending_review' obligatoire — l'admin doit
 * modérer avant que le perk soit visible aux Copines.
 *
 * Email notification founders/admins via sendPerkPendingReview
 * (best-effort, ne bloque pas la réponse 200).
 *
 * Rate-limit : 5/min/IP (création modeste, anti-spam).
 */

const PerkInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().nullable(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  conditions: z.string().trim().max(500).optional().nullable(),
  max_uses: z.number().int().positive().optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
})

function buildAdminUrl(request: Request): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    new URL(request.url).origin
  return `${origin}/admin/pro-perks`
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'pro-perks-create',
    max: 5,
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

  // Gating prestataire Cercle Pro + status approved (admin lookup
  // pour défensif — RLS pourrait filtrer)
  const admin = createAdminClient()
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, user_id, nom, palier, is_founder, status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (profErr || !profile) {
    return NextResponse.json({ error: 'Profil prestataire introuvable' }, { status: 404 })
  }
  if (profile.status !== 'approved') {
    return NextResponse.json(
      { error: 'Ta fiche doit être validée avant de créer une offre.' },
      { status: 403 },
    )
  }
  if (
    !hasCerclePro({
      palier: profile.palier as Palier | null,
      is_founder: profile.is_founder as boolean | null,
    })
  ) {
    return NextResponse.json(
      { error: 'Les offres Copines sont réservées au Cercle Pro.' },
      { status: 403 },
    )
  }

  // Parse + validate payload
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  const parsed = PerkInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', issues: parsed.error.issues },
      { status: 422 },
    )
  }
  const input = parsed.data

  // Coherence check fenêtre temporelle (la DB CHECK le fait aussi)
  if (input.starts_at && input.ends_at) {
    if (new Date(input.ends_at) <= new Date(input.starts_at)) {
      return NextResponse.json(
        { error: "ends_at doit être postérieur à starts_at." },
        { status: 422 },
      )
    }
  }

  // Insert — RLS owner_all autorise puisque prestataire_profile_id
  // pointe sur profile.id de l'auth.uid().
  const { data: inserted, error: insertErr } = await supabase
    .from('pro_perks')
    .insert({
      prestataire_profile_id: profile.id,
      title: input.title,
      description: input.description ?? null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      conditions: input.conditions ?? null,
      max_uses: input.max_uses ?? null,
      starts_at: input.starts_at ?? new Date().toISOString(),
      ends_at: input.ends_at ?? null,
      status: 'pending_review',
    })
    .select('id, title, discount_type, discount_value')
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'Impossible de créer le perk' },
      { status: 500 },
    )
  }

  // Notification founders/admins — best-effort, log mais ne bloque pas.
  try {
    const discountLabel =
      inserted.discount_type === 'percentage'
        ? `${inserted.discount_value} % de réduction`
        : `${inserted.discount_value} € de réduction`
    await sendPerkPendingReview({
      perkTitle: inserted.title,
      prestaNom: (profile.nom as string) ?? 'Une prestataire',
      discountLabel,
      adminUrl: buildAdminUrl(request),
    })
  } catch (err) {
    console.warn('[pro-perks] sendPerkPendingReview failed:', err)
  }

  return NextResponse.json({ ok: true, id: inserted.id })
}
