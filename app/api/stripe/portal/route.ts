import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/portal
 *
 * Génère une URL Stripe Billing Portal pour gérer son abo (annuler,
 * changer palier/durée, voir factures, mettre à jour la carte).
 *
 * Validations :
 *   1. Auth Supabase
 *   2. profile.stripe_customer_id existe (sinon : pas encore souscrit)
 *
 * Retourne { url } à utiliser pour window.location.href.
 *
 * Rate-limit : 10/min/utilisatrice.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'stripe-portal',
    max: 10,
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

  const admin = createAdminClient()
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, user_id, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (profErr || !profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  }
  const customerId = profile.stripe_customer_id as string | null
  if (!customerId) {
    return NextResponse.json(
      { error: 'Pas encore d\'abonnement actif' },
      { status: 400 },
    )
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.hilmy.io'

  let session
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/dashboard/prestataire/fiche`,
    })
  } catch (err) {
    console.error('[stripe/portal] sessions.create failed:', err)
    return NextResponse.json(
      { error: 'Stripe Portal indisponible. Réessaie dans une minute.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ url: session.url })
}
