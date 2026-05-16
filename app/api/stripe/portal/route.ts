import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { stripe } from '@/lib/stripe'
import { getUserProfileCopineByUserIdAdmin } from '@/lib/supabase/queries/copine-subscriptions'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/portal[?type=copine]
 *
 * Génère une URL Stripe Billing Portal pour gérer un abo (annuler,
 * changer plan, voir factures, mettre à jour la carte).
 *
 * Dispatch par query param :
 *   • default (sans ?type) → flow prestataire (Cercle Pro / Premium /
 *     Standard) : lookup profiles.stripe_customer_id, return_url vers
 *     /dashboard/prestataire/fiche
 *   • ?type=copine → flow Pass Copine : lookup
 *     user_profiles.copine_stripe_customer_id, return_url vers
 *     /dashboard/utilisatrice/copine
 *
 * Validations :
 *   1. Auth Supabase — 401 sinon
 *   2. Customer Stripe existe sur la bonne table — 400 sinon (= pas
 *      encore souscrit)
 *
 * Rate-limit : 10/min/IP.
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

  const url = new URL(request.url)
  const flowType = url.searchParams.get('type')
  const isCopineFlow = flowType === 'copine'

  // Lookup customer_id selon le flow
  let customerId: string | null
  if (isCopineFlow) {
    const userProfile = await getUserProfileCopineByUserIdAdmin(user.id)
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Profil utilisatrice introuvable' },
        { status: 404 },
      )
    }
    customerId = userProfile.copine_stripe_customer_id
  } else {
    const admin = createAdminClient()
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id, user_id, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profErr || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }
    customerId = profile.stripe_customer_id as string | null
  }

  if (!customerId) {
    return NextResponse.json(
      { error: "Pas encore d'abonnement actif" },
      { status: 400 },
    )
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.hilmy.io'
  const returnUrl = isCopineFlow
    ? `${siteUrl}/dashboard/utilisatrice/copine`
    : `${siteUrl}/dashboard/prestataire/fiche`

  let session
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
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
