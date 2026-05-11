/**
 * Queries subscriptions Stripe (Sprint 7 mig 49).
 *
 * Lecture : RLS owner_read autorise authenticated à lire son propre
 * abo via le createClient server (cookie session Supabase).
 *
 * Écriture : exclusivement via createAdminClient() depuis le webhook
 * /api/stripe/webhook (service_role bypass RLS). Les helpers d'écriture
 * sont préfixés `Admin` pour éviter qu'un caller server normal les
 * appelle par erreur sans avoir une session admin.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  QueryResult,
  Subscription,
  SubscriptionPalier,
  SubscriptionStatus,
  SubscriptionDureeMonths,
} from '@/lib/supabase/types'

const SUBSCRIPTION_SELECT = `
  id,
  profile_id,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_price_id,
  palier,
  duree_months,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  canceled_at,
  ended_at,
  created_at,
  updated_at
`

/**
 * Abo actif d'un prestataire (status='active' OR 'trialing' OR 'past_due').
 * "Past_due" = retry Stripe en cours, on garde le palier appliqué jusqu'à
 * confirmation d'échec final. Renvoie null si jamais souscrit ou abo
 * complètement terminé.
 */
export async function getActiveSubscription(
  profileId: string,
): Promise<QueryResult<Subscription | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('subscriptions')
      .select(SUBSCRIPTION_SELECT)
      .eq('profile_id', profileId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data: (data as Subscription | null) ?? null, error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

/**
 * Lookup d'une row par stripe_subscription_id (clé business des
 * webhooks). Utilise l'admin client car les webhooks tournent sans
 * session Supabase.
 */
export async function getSubscriptionByStripeIdAdmin(
  stripeSubId: string,
): Promise<Subscription | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('subscriptions')
      .select(SUBSCRIPTION_SELECT)
      .eq('stripe_subscription_id', stripeSubId)
      .maybeSingle()
    if (error || !data) return null
    return data as Subscription
  } catch {
    return null
  }
}

export interface UpsertSubscriptionInput {
  profile_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  palier: SubscriptionPalier
  duree_months: SubscriptionDureeMonths
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at?: string | null
  ended_at?: string | null
}

/**
 * Upsert (INSERT ou UPDATE selon stripe_subscription_id UNIQUE) — pattern
 * idempotent pour les webhooks. Stripe peut re-sender un event 3-7 jours
 * après en cas de timeout, on doit accepter le re-traitement sans
 * doublon.
 */
export async function upsertSubscriptionAdmin(
  input: UpsertSubscriptionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('subscriptions')
      .upsert(
        {
          profile_id: input.profile_id,
          stripe_customer_id: input.stripe_customer_id,
          stripe_subscription_id: input.stripe_subscription_id,
          stripe_price_id: input.stripe_price_id,
          palier: input.palier,
          duree_months: input.duree_months,
          status: input.status,
          current_period_start: input.current_period_start,
          current_period_end: input.current_period_end,
          cancel_at_period_end: input.cancel_at_period_end,
          canceled_at: input.canceled_at ?? null,
          ended_at: input.ended_at ?? null,
        },
        { onConflict: 'stripe_subscription_id' },
      )
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/**
 * Marque un abo comme canceled (event customer.subscription.deleted).
 * Le webhook appellera ça + UPDATE profiles.palier='standard'.
 */
export async function markSubscriptionCanceledAdmin(
  stripeSubId: string,
  canceledAt?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()
    const { error } = await admin
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: canceledAt ?? nowIso,
        ended_at: nowIso,
      })
      .eq('stripe_subscription_id', stripeSubId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/** Update profile palier depuis le webhook. */
export async function updateProfilePalierAdmin(
  profileId: string,
  palier: SubscriptionPalier,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({ palier })
      .eq('id', profileId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/** Set stripe_customer_id sur profiles à la 1ère souscription. */
export async function setProfileStripeCustomerIdAdmin(
  profileId: string,
  stripeCustomerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', profileId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
