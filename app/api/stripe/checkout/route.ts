import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  stripe,
  isKnownPriceId,
  getPaliersAndInterval,
  STRIPE_SUCCESS_URL,
  STRIPE_CANCEL_URL,
} from '@/lib/stripe'
import { getActiveStripeDiscounts } from '@/lib/stripe-promo'
import { setProfileStripeCustomerIdAdmin } from '@/lib/supabase/queries/subscriptions'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/checkout
 *
 * Body : { price_id: string }
 *
 * Validations server-side (defense in depth) :
 *   1. Auth (session Supabase) — 401 sinon
 *   2. price_id référencé dans PRICE_ID_MAP — 422 sinon
 *   3. Profile existe pour ce user — 404 sinon
 *   4. Founder is_founder=true → 403 (déjà accès Cercle Pro à vie,
 *      pas de double abo possible — décision Q2=c)
 *   5. Crée Stripe Customer si pas déjà, stocke stripe_customer_id
 *      sur profiles (admin client)
 *   6. Crée Checkout Session avec metadata profile_id + palier + duree
 *      pour décodage rapide côté webhook
 *   7. Si NEXT_PUBLIC_PROMO_LANCEMENT=true → auto-applique LANCEMENT50
 *      via discounts (pas de stacking, cf AGENTS.md).
 *      Sinon → allow_promotion_codes: true pour permettre un code copine.
 *      Stripe API rejette si les 2 sont passés ensemble.
 *
 * Retourne { url } à utiliser pour window.location.href côté client.
 *
 * Rate-limit : 10/min/utilisatrice (cap modeste, click sur SubscribeButton).
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'stripe-checkout',
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const priceId = (body as { price_id?: unknown }).price_id
  if (typeof priceId !== 'string' || !priceId.startsWith('price_')) {
    return NextResponse.json({ error: 'price_id manquant' }, { status: 400 })
  }
  if (!isKnownPriceId(priceId)) {
    return NextResponse.json(
      { error: 'price_id non référencé côté serveur' },
      { status: 422 },
    )
  }
  const decoded = getPaliersAndInterval(priceId)
  if (!decoded) {
    return NextResponse.json(
      { error: 'price_id non référencé côté serveur' },
      { status: 422 },
    )
  }

  // Récupère profile + check ownership + check founder
  const admin = createAdminClient()
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, user_id, email, nom, palier, is_founder, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (profErr || !profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  }
  if (profile.is_founder === true) {
    return NextResponse.json(
      { error: 'Tu fais partie des fondatrices Hilmy, accès Cercle Pro à vie offert 💚' },
      { status: 403 },
    )
  }

  // Crée ou retrouve un customer Stripe.
  let stripeCustomerId = profile.stripe_customer_id as string | null
  if (!stripeCustomerId) {
    // Lookup par email pour éviter un doublon si la copine s'est déjà
    // abonnée puis a perdu le mapping local.
    const email = (profile.email as string | null) ?? user.email ?? undefined
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      if (existing.data[0]) {
        stripeCustomerId = existing.data[0].id
      }
    }
    if (!stripeCustomerId) {
      const created = await stripe.customers.create({
        email,
        name: (profile.nom as string | null) ?? undefined,
        metadata: { profile_id: profile.id as string, user_id: user.id },
      })
      stripeCustomerId = created.id
    }
    // Persist sur profiles pour les checkouts ultérieurs + portal
    const setRes = await setProfileStripeCustomerIdAdmin(
      profile.id as string,
      stripeCustomerId,
    )
    if (!setRes.ok) {
      // Non bloquant — on garde le customer pour le checkout, on
      // ré-essaie de stocker au prochain appel ou via le webhook.
      console.warn('[stripe/checkout] setProfileStripeCustomerIdAdmin failed:', setRes.error)
    }
  }

  // Crée la Checkout Session
  // Stripe API : allow_promotion_codes et discounts sont mutuellement exclusifs.
  const discounts = getActiveStripeDiscounts()
  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: STRIPE_SUCCESS_URL,
      cancel_url: STRIPE_CANCEL_URL,
      ...(discounts && discounts.length > 0
        ? { discounts }
        : { allow_promotion_codes: true }),
      metadata: {
        profile_id: profile.id as string,
        palier: decoded.palier,
        duree_months: String(decoded.duree_months),
      },
      subscription_data: {
        metadata: {
          profile_id: profile.id as string,
          palier: decoded.palier,
          duree_months: String(decoded.duree_months),
        },
      },
    })
  } catch (err) {
    console.error('[stripe/checkout] sessions.create failed:', err)
    return NextResponse.json(
      { error: 'Stripe Checkout indisponible. Réessaie dans une minute.' },
      { status: 502 },
    )
  }

  if (!session.url) {
    return NextResponse.json(
      { error: 'Stripe Checkout n\'a pas renvoyé d\'URL.' },
      { status: 502 },
    )
  }
  return NextResponse.json({ url: session.url })
}
