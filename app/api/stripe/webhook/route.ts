import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import {
  stripe,
  getPaliersAndInterval,
  isCopinePriceId,
  getCopinePlan,
} from '@/lib/stripe'
import {
  upsertSubscriptionAdmin,
  markSubscriptionCanceledAdmin,
  updateProfilePalierAdmin,
  getSubscriptionByStripeIdAdmin,
} from '@/lib/supabase/queries/subscriptions'
import {
  upsertCopineSubscriptionAdmin,
  markCopineSubscriptionCanceledAdmin,
  setUserProfileCopineActiveAdmin,
  setUserProfileCopineInactiveAdmin,
  setUserProfileCopineStripeCustomerIdAdmin,
  getCopineSubscriptionByStripeIdAdmin,
} from '@/lib/supabase/queries/copine-subscriptions'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendCopineWelcome } from '@/lib/email/transactional'
import type { SubscriptionStatus } from '@/lib/supabase/types'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/webhook
 *
 * ⚠️ Route publique (pas de session Supabase). Sécurité = signature
 * Stripe via stripe.webhooks.constructEvent(body, signature, secret).
 * Tout payload non signé est rejeté en 400.
 *
 * Events MVP (Sprint 7) :
 *   - checkout.session.completed     → activation initiale (palier+sub)
 *   - customer.subscription.updated  → renouvellement, change palier,
 *                                      cancel_at_period_end toggle
 *   - customer.subscription.deleted  → fin de l'abo (downgrade standard)
 *   - invoice.payment_failed         → status='past_due' (Stripe Smart
 *                                      Retries fait le job derrière)
 *
 * Dispatch interne Pass Copine (mig 50) :
 *   Chaque handler vérifie d'abord si l'event concerne un abo Copine
 *   (metadata.is_copine_sub === 'true' OU price_id ∈ COPINE_PRICE_ID_MAP).
 *   Si oui → branche Copine (user_profiles + copine_subscriptions).
 *   Sinon → branche prestataire historique (profiles + subscriptions).
 *   Le même endpoint webhook gère les deux flows — décision A6 Jiji.
 *
 * Idempotence : Stripe peut re-sender un event 3-7 jours après en cas
 * de timeout. upsertSubscriptionAdmin via ON CONFLICT (stripe_subscription
 * _id) absorbe les rejeux sans doublon. Les UPDATE profiles.palier sont
 * idempotentes par nature.
 *
 * Réponse : 200 le plus vite possible. Si erreur métier non-critique
 * (ex. profile_id metadata absent), log + 200 quand même pour ne pas
 * que Stripe retry à l'infini.
 */

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new NextResponse('Missing stripe-signature header', { status: 400 })
  }
  if (!WEBHOOK_SECRET) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET absent côté serveur')
    return new NextResponse('Webhook secret not configured', { status: 500 })
  }

  // ⚠️ stripe.webhooks.constructEvent attend le body BRUT (pas parsé).
  // Next 14 App Router : await request.text() preserve les bytes
  // exactement tels quels — pas de body-parser global qui casserait
  // la signature.
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return new NextResponse('Webhook signature verification failed', {
      status: 400,
    })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object)
        break
      }
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object)
        break
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object)
        break
      }
      case 'invoice.payment_failed': {
        await handleInvoicePaymentFailed(event.data.object)
        break
      }
      default:
        // Event hors scope — ack 200 pour Stripe ne re-tente pas.
        break
    }
  } catch (err) {
    // Erreur métier non-critique : log mais 200 pour stopper les retries
    // Stripe (sinon ils s'accumulent 3 jours). Les rows manquantes
    // pourront être réconciliées via un script admin si besoin.
    console.error(
      `[stripe/webhook] handler error for ${event.type}:`,
      err instanceof Error ? err.message : err,
    )
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

/* ─── Dispatch helpers (Copine vs Prestataire) ─────────────────────── */

/** Vrai si la Checkout Session correspond à un abo Pass Copine. */
function isCopineSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.is_copine_sub === 'true'
}

/**
 * Vrai si la Subscription correspond à un abo Pass Copine. Dispatch
 * primaire par metadata.is_copine_sub (posée à la création) ; fallback
 * par price_id si la metadata a été perdue côté Stripe.
 */
function isCopineSubscription(sub: Stripe.Subscription): boolean {
  if (sub.metadata?.is_copine_sub === 'true') return true
  const priceId = sub.items?.data?.[0]?.price?.id
  if (priceId && isCopinePriceId(priceId)) return true
  return false
}


/* ─── Handlers ─────────────────────────────────────────────────────── */

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Dispatch Copine
  if (isCopineSession(session)) {
    await handleCopineCheckoutCompleted(session)
    return
  }

  // ─── Flow prestataire (inchangé) ────────────────────────────────
  const subId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id
  if (!subId) {
    console.warn('[stripe/webhook] checkout.session.completed sans subscription id')
    return
  }

  const profileId = session.metadata?.profile_id
  if (!profileId) {
    console.warn(
      '[stripe/webhook] checkout.session.completed sans profile_id en metadata',
    )
    return
  }

  // Fetch full subscription pour avoir les périodes
  const sub = await stripe.subscriptions.retrieve(subId)
  await persistSubscription(sub, profileId)
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  // Dispatch Copine
  if (isCopineSubscription(sub)) {
    await handleCopineSubscriptionUpdated(sub)
    return
  }

  // ─── Flow prestataire (inchangé) ────────────────────────────────
  // metadata.profile_id posé à la création par /api/stripe/checkout dans
  // subscription_data. Si absent (souscription créée hors Hilmy ?), on
  // tente de retrouver via la row existante.
  const profileId = await resolveProfileId(sub)
  if (!profileId) return
  await persistSubscription(sub, profileId)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  // Dispatch Copine
  if (isCopineSubscription(sub)) {
    await handleCopineSubscriptionDeleted(sub)
    return
  }

  // ─── Flow prestataire (inchangé) ────────────────────────────────
  const profileId = await resolveProfileId(sub)
  if (!profileId) return

  // Marque cancelled + downgrade palier
  const canceledAt = sub.canceled_at
    ? new Date(sub.canceled_at * 1000).toISOString()
    : null
  await markSubscriptionCanceledAdmin(sub.id, canceledAt)
  await updateProfilePalierAdmin(profileId, 'standard')
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Stripe v2025-04+ : Invoice n'a plus de champ direct `subscription`,
  // c'est sous parent.subscription_details ou parent.invoice_item ou via
  // billing_reason. Pour rester compatible large : tenter via parent OU
  // re-fetch via lines.
  const sub = invoice.parent?.subscription_details?.subscription
  const subId = typeof sub === 'string' ? sub : sub?.id
  if (!subId) {
    // Pas une invoice d'abonnement — ignorer (one-shot invoices, etc.)
    return
  }

  // Dispatch : on tente d'abord côté Copine, puis côté prestataire.
  // Pas de risque de collision (stripe_subscription_id UNIQUE dans
  // chaque table, et une sub appartient à une seule des deux).
  const copineExisting = await getCopineSubscriptionByStripeIdAdmin(subId)
  if (copineExisting) {
    await upsertCopineSubscriptionAdmin({
      user_id: copineExisting.user_id,
      stripe_customer_id: copineExisting.stripe_customer_id,
      stripe_subscription_id: copineExisting.stripe_subscription_id,
      stripe_price_id: copineExisting.stripe_price_id,
      plan: copineExisting.plan,
      status: 'past_due',
      current_period_start: copineExisting.current_period_start,
      current_period_end: copineExisting.current_period_end,
      cancel_at_period_end: copineExisting.cancel_at_period_end,
      canceled_at: copineExisting.canceled_at,
      ended_at: copineExisting.ended_at,
    })
    // past_due : is_copine reste true (Smart Retries en cours). Pas de
    // setUserProfileCopineInactiveAdmin ici.
    return
  }

  const existing = await getSubscriptionByStripeIdAdmin(subId)
  if (!existing) {
    console.warn(
      `[stripe/webhook] invoice.payment_failed pour subscription inconnue: ${subId}`,
    )
    return
  }

  // Update statut à past_due (Stripe le fera aussi via subscription.updated
  // mais on est plus rapide ici). Pas de downgrade palier — Smart Retries
  // va retenter pendant ~3 semaines.
  await upsertSubscriptionAdmin({
    profile_id: existing.profile_id,
    stripe_customer_id: existing.stripe_customer_id,
    stripe_subscription_id: existing.stripe_subscription_id,
    stripe_price_id: existing.stripe_price_id,
    palier: existing.palier,
    duree_months: existing.duree_months,
    status: 'past_due',
    current_period_start: existing.current_period_start,
    current_period_end: existing.current_period_end,
    cancel_at_period_end: existing.cancel_at_period_end,
    canceled_at: existing.canceled_at,
    ended_at: existing.ended_at,
  })
}

/* ─── Utilitaires ─────────────────────────────────────────────────── */

async function resolveProfileId(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const meta = sub.metadata?.profile_id
  if (meta) return meta
  // Fallback : retrouver via la row existante en BDD
  const existing = await getSubscriptionByStripeIdAdmin(sub.id)
  return existing?.profile_id ?? null
}

/**
 * Persiste un Stripe.Subscription complet en BDD + propage le palier
 * sur profiles si le statut entitle (active/trialing).
 *
 * past_due : on UPSERT avec palier maintenu, pas de change profiles.
 * canceled / incomplete_expired : palier='standard' downgrade.
 */
async function persistSubscription(
  sub: Stripe.Subscription,
  profileId: string,
): Promise<void> {
  const item = sub.items?.data?.[0]
  if (!item?.price?.id) {
    console.warn(`[stripe/webhook] subscription ${sub.id} sans price line item`)
    return
  }
  const decoded = getPaliersAndInterval(item.price.id)
  if (!decoded) {
    console.warn(
      `[stripe/webhook] price_id non référencé côté serveur: ${item.price.id}`,
    )
    return
  }

  // current_period_start/end : Stripe v2025+ a déplacé ces champs sur
  // l'item, plus sur la subscription elle-même. On lit avec fallback.
  const startTs =
    item.current_period_start ?? (sub as unknown as { current_period_start?: number }).current_period_start ?? null
  const endTs =
    item.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end ?? null
  if (startTs == null || endTs == null) {
    console.warn(`[stripe/webhook] subscription ${sub.id} sans period bounds`)
    return
  }

  const status = sub.status as SubscriptionStatus
  await upsertSubscriptionAdmin({
    profile_id: profileId,
    stripe_customer_id:
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    stripe_price_id: item.price.id,
    palier: decoded.palier,
    duree_months: decoded.duree_months,
    status,
    current_period_start: new Date(startTs * 1000).toISOString(),
    current_period_end: new Date(endTs * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    canceled_at: sub.canceled_at
      ? new Date(sub.canceled_at * 1000).toISOString()
      : null,
    ended_at: sub.ended_at ? new Date(sub.ended_at * 1000).toISOString() : null,
  })

  // Propage le palier sur profiles selon le statut
  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    await updateProfilePalierAdmin(profileId, decoded.palier)
  } else if (
    status === 'canceled' ||
    status === 'incomplete_expired' ||
    status === 'unpaid'
  ) {
    await updateProfilePalierAdmin(profileId, 'standard')
  }
  // 'incomplete' : pas de change palier — l'utilisatrice doit finaliser
  // le payment authorize. Stripe re-trigger à completion.
}


/* ────────────────────────────────────────────────────────────────────
   Handlers Pass Copine (mig 50)

   Mirror du flow prestataire, mais :
     • Persiste dans copine_subscriptions (pas subscriptions)
     • Met à jour user_profiles.is_copine + copine_since (pas
       profiles.palier)
     • metadata clé = user_id (pas profile_id)
   ──────────────────────────────────────────────────────────────────── */

async function handleCopineCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const subId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id
  if (!subId) {
    console.warn(
      '[stripe/webhook] copine checkout.session.completed sans subscription id',
    )
    return
  }

  const userId = session.metadata?.user_id
  if (!userId) {
    console.warn(
      '[stripe/webhook] copine checkout.session.completed sans user_id en metadata',
    )
    return
  }

  // Persiste copine_stripe_customer_id si le checkout a créé un
  // nouveau customer côté Stripe et que /api/stripe/checkout n'a pas
  // réussi à le stocker en BDD (race condition rare). Le call est
  // idempotent.
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (customerId) {
    const setRes = await setUserProfileCopineStripeCustomerIdAdmin(
      userId,
      customerId,
    )
    if (!setRes.ok) {
      console.warn(
        '[stripe/webhook] copine setUserProfileCopineStripeCustomerIdAdmin failed:',
        setRes.error,
      )
    }
  }

  const sub = await stripe.subscriptions.retrieve(subId)
  await persistCopineSubscription(sub, userId)
}

async function handleCopineSubscriptionUpdated(
  sub: Stripe.Subscription,
): Promise<void> {
  const userId = await resolveCopineUserId(sub)
  if (!userId) return
  await persistCopineSubscription(sub, userId)
}

async function handleCopineSubscriptionDeleted(
  sub: Stripe.Subscription,
): Promise<void> {
  const userId = await resolveCopineUserId(sub)
  if (!userId) return

  const canceledAt = sub.canceled_at
    ? new Date(sub.canceled_at * 1000).toISOString()
    : null
  await markCopineSubscriptionCanceledAdmin(sub.id, canceledAt)
  // Désactive is_copine. copine_since reste préservé (analytics).
  await setUserProfileCopineInactiveAdmin(userId)
}


/* ─── Utilitaires Copine ────────────────────────────────────────────── */

async function resolveCopineUserId(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const meta = sub.metadata?.user_id
  if (meta) return meta
  // Fallback : retrouver via la row existante en BDD
  const existing = await getCopineSubscriptionByStripeIdAdmin(sub.id)
  return existing?.user_id ?? null
}

/**
 * Persiste une Stripe.Subscription Copine en BDD + propage le flag
 * is_copine sur user_profiles selon le statut.
 *
 * active / trialing / past_due → is_copine = true
 * canceled / incomplete_expired / unpaid → is_copine = false
 * incomplete → pas de change (paiement à finaliser)
 */
async function persistCopineSubscription(
  sub: Stripe.Subscription,
  userId: string,
): Promise<void> {
  const item = sub.items?.data?.[0]
  if (!item?.price?.id) {
    console.warn(
      `[stripe/webhook] copine subscription ${sub.id} sans price line item`,
    )
    return
  }
  const plan = getCopinePlan(item.price.id)
  if (!plan) {
    console.warn(
      `[stripe/webhook] copine price_id non référencé côté serveur: ${item.price.id}`,
    )
    return
  }

  // Stripe v2025+ : current_period_* sur l'item, fallback sub level.
  const startTs =
    item.current_period_start ??
    (sub as unknown as { current_period_start?: number }).current_period_start ??
    null
  const endTs =
    item.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    null
  if (startTs == null || endTs == null) {
    console.warn(
      `[stripe/webhook] copine subscription ${sub.id} sans period bounds`,
    )
    return
  }

  const status = sub.status as SubscriptionStatus
  await upsertCopineSubscriptionAdmin({
    user_id: userId,
    stripe_customer_id:
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    stripe_price_id: item.price.id,
    plan,
    status,
    current_period_start: new Date(startTs * 1000).toISOString(),
    current_period_end: new Date(endTs * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    canceled_at: sub.canceled_at
      ? new Date(sub.canceled_at * 1000).toISOString()
      : null,
    ended_at: sub.ended_at ? new Date(sub.ended_at * 1000).toISOString() : null,
  })

  // Propage le flag is_copine sur user_profiles selon le statut.
  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    // Détection "premier abo" pour le welcome email (Phase 6) : on lit
    // copine_since AVANT l'update. Si null → c'est la première
    // activation → on enverra le welcome après setUserProfileCopineActiveAdmin.
    // (cf décision D2 Phase 6 : check simple, pas de table dédiée).
    const isFirstActivation = await wasNeverActivatedBefore(userId)
    await setUserProfileCopineActiveAdmin(userId)
    if (isFirstActivation) {
      await maybeSendCopineWelcome(userId)
    }
  } else if (
    status === 'canceled' ||
    status === 'incomplete_expired' ||
    status === 'unpaid'
  ) {
    await setUserProfileCopineInactiveAdmin(userId)
  }
  // 'incomplete' : pas de change — paiement à finaliser. Stripe
  // re-trigger à completion.
}

/**
 * Helper Phase 6 : true si l'utilisatrice n'a JAMAIS été Copine
 * (copine_since est NULL avant l'UPDATE qui va le set). Sert à gater
 * l'envoi du welcome email au PREMIER abo uniquement.
 *
 * Race condition résiduelle : si Stripe re-trigger l'event en
 * parallèle, 2 lectures peuvent toutes deux voir NULL et déclencher
 * 2 emails. À l'échelle actuelle (72 utilisatrices) c'est acceptable
 * (cf décision D2 Phase 6).
 */
async function wasNeverActivatedBefore(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_profiles')
      .select('copine_since')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return false
    return (data as { copine_since: string | null }).copine_since === null
  } catch {
    return false
  }
}

/**
 * Envoie le welcome Copine. Best-effort : log + swallow en cas
 * d'erreur réseau pour ne pas faire échouer le webhook (Stripe
 * re-trigger 3-7 jours, ce qui re-déclencherait l'email — pas
 * souhaitable).
 *
 * Récupère email + prénom via admin client (auth.users + user_profiles).
 */
async function maybeSendCopineWelcome(userId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles')
      .select('prenom')
      .eq('user_id', userId)
      .maybeSingle()
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    const email = authUser?.user?.email ?? null
    if (!email) {
      console.warn('[stripe/webhook] welcome Copine : pas d\'email pour', userId)
      return
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
      'https://www.hilmy.io'
    await sendCopineWelcome({
      to: email,
      prenom: (profile as { prenom: string | null } | null)?.prenom ?? null,
      dashboardUrl: `${siteUrl}/dashboard/utilisatrice/avantages`,
    })
  } catch (err) {
    console.warn('[stripe/webhook] sendCopineWelcome failed:', err)
  }
}
