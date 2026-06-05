import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  stripe,
  isKnownPriceId,
  isCopinePriceId,
  getPaliersAndInterval,
  getCopinePlan,
  getCopinePriceIdForPlan,
  buildStripeSuccessUrl,
  buildStripeCancelUrl,
  buildCopineSuccessUrl,
  buildCopineCancelUrl,
} from '@/lib/stripe'
import { getActiveStripeDiscounts } from '@/lib/stripe-promo'
import { setProfileStripeCustomerIdAdmin } from '@/lib/supabase/queries/subscriptions'
import {
  getUserProfileCopineByUserIdAdmin,
  setUserProfileCopineStripeCustomerIdAdmin,
} from '@/lib/supabase/queries/copine-subscriptions'
import type { CopinePlan } from '@/lib/supabase/types'
import type { User } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/checkout
 *
 * Body accepte 2 shapes :
 *   1. { price_id: string } — flow legacy prestataire ou Copine direct
 *   2. { plan: 'monthly' | 'annual' } — flow Pass Copine (le price_id
 *      est résolu server-side via STRIPE_PRICE_COPINE_*, ces env vars
 *      sont volontairement server-only — décision A5)
 *
 * Dispatch interne : si le price_id résolu est Copine
 * (isCopinePriceId), le flow saute le check founder, lookup
 * user_profiles au lieu de profiles, et stocke le customer sur
 * copine_stripe_customer_id (décision A6).
 *
 * Validations server-side (defense in depth) :
 *   1. Auth (session Supabase) — 401 sinon
 *   2. Flow prestataire : price_id référencé dans PRICE_ID_MAP — 422 sinon
 *      Flow Copine : plan ∈ {monthly, annual} ET price Stripe configuré
 *   3. Flow prestataire : Profile existe — 404 sinon
 *      Flow Copine : user_profile existe — 404 sinon
 *   4. Flow prestataire : Founder is_founder=true → 403 (Cercle Pro à vie)
 *      Flow Copine : founders PEUVENT être Copines (deux abos distincts)
 *   5. Crée/réutilise Stripe Customer (lookup par email), stocke l'ID
 *      sur la bonne table (profiles ou user_profiles selon flow)
 *   6. Crée Checkout Session avec metadata distinctes selon flow :
 *      - Prestataire : { profile_id, palier, duree_months }
 *      - Copine     : { user_id, plan, is_copine_sub: 'true' }
 *   7. Promo LANCEMENT50 : appliquée UNIQUEMENT au flow prestataire
 *      (décision Jiji 2026-05-13 : Pass Copine hors périmètre promo).
 *
 * Retourne { url } à utiliser pour window.location.href côté client.
 *
 * Rate-limit : 10/min/IP (cap partagé entre les deux flows — cap
 * modeste, click sur SubscribeButton).
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

  // ─── Résolution du priceId + détection du flow ────────────────────
  // Body shape 1 : { plan: 'monthly' | 'annual' } → résolution Copine
  // Body shape 2 : { price_id } → flow Copine si isCopinePriceId, sinon
  //                prestataire si isKnownPriceId, sinon 422.
  const bodyObj = body as {
    price_id?: unknown
    plan?: unknown
    context?: unknown
  }
  let priceId: string
  let isCopineFlow = false
  // Contexte funnel d'inscription : si présent, le retour de paiement
  // pointe vers /onboarding/prestataire/publiee au lieu du dashboard
  // fiche. N'affecte que le flow prestataire (le Pass Copine a ses
  // propres URLs). Toute autre valeur est ignorée (= checkout dashboard).
  const isOnboarding = bodyObj.context === 'onboarding'

  if (typeof bodyObj.plan === 'string') {
    if (bodyObj.plan !== 'monthly' && bodyObj.plan !== 'annual') {
      return NextResponse.json(
        { error: 'plan doit être "monthly" ou "annual"' },
        { status: 400 },
      )
    }
    const resolved = getCopinePriceIdForPlan(bodyObj.plan as CopinePlan)
    if (!resolved) {
      console.error(
        '[stripe/checkout] STRIPE_PRICE_COPINE_* absent côté serveur',
      )
      return NextResponse.json(
        { error: 'Pass Copine indisponible côté serveur' },
        { status: 503 },
      )
    }
    priceId = resolved
    isCopineFlow = true
  } else if (
    typeof bodyObj.price_id === 'string' &&
    bodyObj.price_id.startsWith('price_')
  ) {
    priceId = bodyObj.price_id
    if (isCopinePriceId(priceId)) {
      isCopineFlow = true
    } else if (!isKnownPriceId(priceId)) {
      return NextResponse.json(
        { error: 'price_id non référencé côté serveur' },
        { status: 422 },
      )
    }
  } else {
    return NextResponse.json(
      { error: 'price_id ou plan requis' },
      { status: 400 },
    )
  }

  // ─── Dispatch flow Copine ─────────────────────────────────────────
  if (isCopineFlow) {
    return createCopineCheckoutSession(request, user, priceId)
  }

  // ─── Flow prestataire (existant, inchangé en comportement) ────────
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
  const origin = new URL(request.url).origin
  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: buildStripeSuccessUrl(
        origin,
        profile.id as string,
        isOnboarding ? 'onboarding' : undefined,
      ),
      cancel_url: buildStripeCancelUrl(
        origin,
        isOnboarding ? 'onboarding' : undefined,
      ),
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


/* ────────────────────────────────────────────────────────────────────
   Flow Pass Copine (mig 50) — créé en dispatch depuis POST ci-dessus.

   Différences clés avec le flow prestataire :
     • Lookup user_profiles au lieu de profiles
     • Pas de check is_founder (les founders peuvent être Copines —
       deux abos distincts pour deux rôles distincts)
     • Customer Stripe stocké sur user_profiles.copine_stripe_customer_id
       (peut être identique à profiles.stripe_customer_id si l'email
       Stripe est le même — Stripe dédoublonne par email)
     • Defense in depth : si user_profile.is_copine = true → 409 (déjà
       Copine, pas de double abo). Le UI redirect aussi vers la page
       gestion avant d'arriver ici.
     • Metadata Stripe : is_copine_sub = 'true' pour dispatch webhook
     • PROMO_LANCEMENT50 N'EST PAS appliquée — Pass Copine hors périmètre
   ──────────────────────────────────────────────────────────────────── */

async function createCopineCheckoutSession(
  request: Request,
  user: User,
  priceId: string,
): Promise<NextResponse> {
  const plan = getCopinePlan(priceId)
  if (!plan) {
    // Ne devrait jamais arriver — isCopinePriceId a déjà filtré.
    return NextResponse.json(
      { error: 'price_id Copine non décodable' },
      { status: 500 },
    )
  }

  // Lookup user_profile (admin client : besoin de lire copine_* qui
  // pourraient ne pas être exposées via RLS UPDATE — défense en
  // profondeur). Le user_profile est créé à l'onboarding ; absence =
  // onboarding incomplet → 404 explicite.
  const userProfile = await getUserProfileCopineByUserIdAdmin(user.id)
  if (!userProfile) {
    return NextResponse.json(
      { error: 'Profil utilisatrice introuvable — onboarding requis' },
      { status: 404 },
    )
  }

  if (userProfile.is_copine) {
    return NextResponse.json(
      {
        error: 'Tu es déjà Copine. File sur ton espace pour gérer ton abo.',
        redirect: '/dashboard/utilisatrice/copine',
      },
      { status: 409 },
    )
  }

  // Crée ou retrouve un Stripe customer. Si la personne est aussi
  // prestataire avec le même email, Stripe nous retournera le même
  // customer.id que profiles.stripe_customer_id — c'est attendu et OK
  // (1 customer = 1 email côté Stripe, 2 subscriptions distinctes côté
  // Hilmy).
  let stripeCustomerId = userProfile.copine_stripe_customer_id
  if (!stripeCustomerId) {
    const email = user.email ?? undefined
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      if (existing.data[0]) {
        stripeCustomerId = existing.data[0].id
      }
    }
    if (!stripeCustomerId) {
      const created = await stripe.customers.create({
        email,
        name: userProfile.prenom ?? undefined,
        metadata: { user_id: user.id, source: 'pass_copine' },
      })
      stripeCustomerId = created.id
    }
    // Persist sur user_profiles pour les checkouts/portal ultérieurs.
    const setRes = await setUserProfileCopineStripeCustomerIdAdmin(
      user.id,
      stripeCustomerId,
    )
    if (!setRes.ok) {
      // Non bloquant — le webhook ré-essaiera de stocker si l'event
      // checkout.session.completed arrive avant cette fin de fonction.
      console.warn(
        '[stripe/checkout] setUserProfileCopineStripeCustomerIdAdmin failed:',
        setRes.error,
      )
    }
  }

  const origin = new URL(request.url).origin
  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: buildCopineSuccessUrl(origin),
      cancel_url: buildCopineCancelUrl(origin),
      // PROMO_LANCEMENT50 volontairement absente du flow Copine.
      allow_promotion_codes: false,
      metadata: {
        user_id: user.id,
        plan,
        is_copine_sub: 'true',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
          is_copine_sub: 'true',
        },
      },
    })
  } catch (err) {
    console.error('[stripe/checkout] copine sessions.create failed:', err)
    return NextResponse.json(
      { error: 'Stripe Checkout indisponible. Réessaie dans une minute.' },
      { status: 502 },
    )
  }

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe Checkout n'a pas renvoyé d'URL." },
      { status: 502 },
    )
  }
  return NextResponse.json({ url: session.url })
}
