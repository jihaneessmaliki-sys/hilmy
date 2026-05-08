import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDevisExpressEmail } from '@/lib/email/transactional'
import { enforceRateLimit } from '@/lib/rate-limit'
import { hasCerclePro } from '@/lib/permissions'

export const runtime = 'nodejs'

/**
 * POST /api/devis-requests
 *
 * Body : { prestataire_id, prenom, email, telephone?, message }
 *
 * Soumission d'une demande de devis par une utilisatrice authentifiée
 * vers une prestataire Cercle Pro.
 *
 * Validations :
 *  - Auth utilisatrice obligatoire
 *  - prestataire_id existe ET palier effectif === 'cercle_pro' (incluant
 *    les founders) ET status === 'approved'
 *  - prenom 1-80 / email format simple / message 5-2000 chars
 *  - Rate limit : max 3 soumissions / 5 min / utilisatrice (anti spam)
 *
 * Insertion via client RLS (la policy devis_requests_user_insert exige
 * user_id = auth.uid()).
 *
 * Email best-effort : on stocke email_sent_at / email_error mais on ne
 * fail pas la requête si l'envoi rate.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'devis-requests',
    max: 3,
    windowMs: 5 * 60 * 1000,
  })
  if (limited) return limited

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifiée' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 })
  }

  const {
    prestataire_id,
    prenom,
    email,
    telephone,
    message,
  } = body as Record<string, unknown>

  // ─── Validation des champs ────────────────────────────────────────
  if (typeof prestataire_id !== 'string' || prestataire_id.length < 8) {
    return NextResponse.json({ error: 'prestataire_id manquant' }, { status: 400 })
  }
  if (typeof prenom !== 'string' || prenom.trim().length < 1 || prenom.length > 80) {
    return NextResponse.json({ error: 'Prénom invalide.' }, { status: 400 })
  }
  if (
    typeof email !== 'string' ||
    !email.includes('@') ||
    email.length > 200
  ) {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
  }
  if (
    typeof message !== 'string' ||
    message.trim().length < 5 ||
    message.length > 2000
  ) {
    return NextResponse.json(
      { error: 'Message trop court ou trop long (5-2000 caractères).' },
      { status: 400 },
    )
  }
  const tel =
    typeof telephone === 'string' && telephone.trim().length > 0
      ? telephone.trim().slice(0, 50)
      : null

  // ─── Vérifie que la prestataire est bien Cercle Pro & approuvée ───
  const { data: presta, error: pErr } = await supabase
    .from('profiles')
    .select('id, user_id, nom, palier, is_founder, status')
    .eq('id', prestataire_id)
    .maybeSingle()

  if (pErr || !presta) {
    return NextResponse.json(
      { error: 'Prestataire introuvable' },
      { status: 404 },
    )
  }
  if (!hasCerclePro(presta)) {
    return NextResponse.json(
      { error: 'Devis express réservé aux fiches Cercle Pro.' },
      { status: 403 },
    )
  }
  if (presta.status !== 'approved') {
    return NextResponse.json(
      { error: 'Cette fiche n\'est pas active.' },
      { status: 403 },
    )
  }

  // ─── Insert via RLS (user_id = auth.uid() check par policy) ──────
  const { data: inserted, error: insErr } = await supabase
    .from('devis_requests')
    .insert({
      prestataire_id,
      user_id: user.id,
      prenom: prenom.trim().slice(0, 80),
      email: email.trim().toLowerCase().slice(0, 200),
      telephone: tel,
      message: message.trim().slice(0, 2000),
      status: 'pending',
    })
    .select('id')
    .single()

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message || 'Insertion échouée' },
      { status: 500 },
    )
  }

  // ─── Email best-effort à la prestataire ──────────────────────────
  // Service-role pour récupérer l'email auth de la prestataire (pas de
  // table user_profiles email — on lit dans auth.users via admin).
  let emailSent = false
  let emailError: string | null = null

  try {
    const admin = createAdminClient()
    const [{ data: prestaAuth }, { data: prestaUserProfile }] = await Promise.all([
      admin.auth.admin.getUserById(presta.user_id),
      admin
        .from('user_profiles')
        .select('prenom')
        .eq('user_id', presta.user_id)
        .maybeSingle(),
    ])
    const prestaEmail = prestaAuth?.user?.email
    if (prestaEmail) {
      const prestaPrenom =
        (prestaUserProfile?.prenom as string | undefined) ??
        presta.nom.split(' ')[0] ??
        'Toi'
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SITE_URL ||
        'https://hilmy.io'
      await sendDevisExpressEmail({
        to: prestaEmail,
        prestaPrenom,
        ficheNom: presta.nom,
        utilisatricePrenom: prenom.trim().slice(0, 80),
        utilisatriceEmail: email.trim().toLowerCase(),
        utilisatriceTelephone: tel,
        message: message.trim(),
        dashboardUrl: `${siteUrl}/dashboard/prestataire/devis`,
      })
      emailSent = true
    } else {
      emailError = 'no_email_on_prestataire_account'
    }
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err)
  }

  // Update best-effort de email_sent_at / email_error (admin pour bypass RLS update)
  try {
    const admin = createAdminClient()
    await admin
      .from('devis_requests')
      .update({
        email_sent_at: emailSent ? new Date().toISOString() : null,
        email_error: emailError,
      })
      .eq('id', inserted.id)
  } catch {
    // Best-effort, on ne fail pas
  }

  return NextResponse.json({ ok: true, id: inserted.id, email_sent: emailSent })
}
