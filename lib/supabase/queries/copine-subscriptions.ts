/**
 * Queries Pass Copine (mig 50).
 *
 * Lecture : RLS owner_read autorise authenticated à lire son propre abo
 * Copine via createClient() (cookie session Supabase). Voir aussi
 * user_profiles.is_copine pour le fast-path gating (mirror denormalisé
 * mis à jour par le webhook).
 *
 * Écriture : exclusivement via createAdminClient() depuis le webhook
 * /api/stripe/webhook (service_role bypass RLS). Tous les helpers
 * d'écriture sont préfixés `Admin` pour empêcher un appel accidentel
 * depuis un contexte non admin.
 *
 * Parallèle stricte à lib/supabase/queries/subscriptions.ts qui couvre
 * les paliers prestataires (mig 49). Pas de fusion polymorphique : les
 * deux flows restent indépendants pour éviter de toucher au code
 * prestataire en production.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  CopinePlan,
  CopineSubscription,
  QueryResult,
  SubscriptionStatus,
} from '@/lib/supabase/types'

const COPINE_SUBSCRIPTION_SELECT = `
  id,
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_price_id,
  plan,
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
 * Abo Copine actif d'un user (status='active' OR 'trialing' OR
 * 'past_due'). Past_due = Stripe Smart Retries en cours, on garde
 * is_copine appliqué jusqu'à confirmation d'échec final.
 *
 * Utilise createClient (RLS owner_read filtre déjà sur user_id =
 * auth.uid()), pas besoin de passer user_id en arg côté caller.
 */
export async function getActiveCopineSubscription(): Promise<
  QueryResult<CopineSubscription | null>
> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('copine_subscriptions')
      .select(COPINE_SUBSCRIPTION_SELECT)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data: (data as CopineSubscription | null) ?? null, error: null }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
  }
}

/**
 * Lookup d'une row Copine par stripe_subscription_id. Utilisé par les
 * handlers webhook (subscription.updated/deleted) pour retrouver le
 * user_id quand la metadata n'est plus présente (resync à postériori).
 */
export async function getCopineSubscriptionByStripeIdAdmin(
  stripeSubId: string,
): Promise<CopineSubscription | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('copine_subscriptions')
      .select(COPINE_SUBSCRIPTION_SELECT)
      .eq('stripe_subscription_id', stripeSubId)
      .maybeSingle()
    if (error || !data) return null
    return data as CopineSubscription
  } catch {
    return null
  }
}

export interface UpsertCopineSubscriptionInput {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  plan: CopinePlan
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at?: string | null
  ended_at?: string | null
}

/**
 * Upsert idempotent (ON CONFLICT stripe_subscription_id). Stripe peut
 * re-sender un event 3-7 jours après en cas de timeout — le UNIQUE
 * absorbe les rejeux sans doublon.
 */
export async function upsertCopineSubscriptionAdmin(
  input: UpsertCopineSubscriptionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('copine_subscriptions')
      .upsert(
        {
          user_id: input.user_id,
          stripe_customer_id: input.stripe_customer_id,
          stripe_subscription_id: input.stripe_subscription_id,
          stripe_price_id: input.stripe_price_id,
          plan: input.plan,
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
 * Marque un abo Copine comme canceled (event customer.subscription.
 * deleted). Le webhook appellera aussi setUserProfileCopineInactiveAdmin
 * pour repasser is_copine=false côté fast-path.
 */
export async function markCopineSubscriptionCanceledAdmin(
  stripeSubId: string,
  canceledAt?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()
    const { error } = await admin
      .from('copine_subscriptions')
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

/**
 * Set copine_stripe_customer_id sur user_profiles à la 1ère
 * souscription Copine. Utilise admin client (la policy update sur
 * user_profiles peut bloquer ces colonnes pour authenticated).
 */
export async function setUserProfileCopineStripeCustomerIdAdmin(
  userId: string,
  stripeCustomerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('user_profiles')
      .update({ copine_stripe_customer_id: stripeCustomerId })
      .eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/**
 * Active le flag fast-path is_copine + set copine_since (jamais
 * écrasé : coalesce avec la valeur existante). Appelé par le webhook
 * sur status entitling (active/trialing/past_due).
 *
 * Implémentation : on lit d'abord copine_since pour ne le set que si
 * NULL — plus simple que coalesce SQL côté Supabase JS client.
 */
export async function setUserProfileCopineActiveAdmin(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const { data: existing, error: readErr } = await admin
      .from('user_profiles')
      .select('copine_since')
      .eq('user_id', userId)
      .maybeSingle()
    if (readErr) return { ok: false, error: readErr.message }

    const patch: { is_copine: boolean; copine_since?: string } = {
      is_copine: true,
    }
    if (!existing?.copine_since) {
      patch.copine_since = new Date().toISOString()
    }

    const { error } = await admin
      .from('user_profiles')
      .update(patch)
      .eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/**
 * Désactive le flag fast-path is_copine. copine_since est préservé
 * intentionnellement pour analytics fidélité (durée totale en tant
 * que Copine, taux de réabonnement).
 */
export async function setUserProfileCopineInactiveAdmin(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('user_profiles')
      .update({ is_copine: false })
      .eq('user_id', userId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/**
 * Lookup user_profiles par user_id (admin) avec colonnes Copine.
 * Utilisé par le checkout (avant création Stripe customer) et le
 * portal (lookup customer_id).
 */
export async function getUserProfileCopineByUserIdAdmin(
  userId: string,
): Promise<{
  id: string
  user_id: string
  prenom: string | null
  is_copine: boolean
  copine_since: string | null
  copine_stripe_customer_id: string | null
} | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_profiles')
      .select('id, user_id, prenom, is_copine, copine_since, copine_stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return null
    return data as {
      id: string
      user_id: string
      prenom: string | null
      is_copine: boolean
      copine_since: string | null
      copine_stripe_customer_id: string | null
    }
  } catch {
    return null
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
