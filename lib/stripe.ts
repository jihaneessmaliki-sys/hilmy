/**
 * Stripe SDK central (Sprint 7 mig 49).
 *
 * Singleton + helpers de mapping price ID ↔ (palier, duree_months).
 *
 * ⚠️ Server-only. Ne JAMAIS importer depuis un client component — la
 * STRIPE_SECRET_KEY ne doit pas atterrir dans le bundle browser. Pour
 * les besoins client (publishable key, price IDs), passer par les
 * NEXT_PUBLIC_STRIPE_* ou via une API route.
 */

import Stripe from 'stripe'
import type { Palier, Duree } from '@/app/tarifs/_lib/pricing'
import type { CopinePlan } from '@/lib/supabase/types'

/**
 * Lazy singleton — initialise Stripe au 1er appel uniquement.
 *
 * Pourquoi pas un instantiate au top-level ? Le Stripe SDK valide
 * apiKey === non-empty-string au constructor. En build Next.js sans
 * .env.local Stripe (cas dev local + CI Vercel build phase), le
 * module se charge → throw "Neither apiKey nor config.authenticator
 * provided" → Failed to collect page data → build red.
 *
 * Avec lazy init, le module se charge sans toucher à Stripe. Au runtime
 * (route handler exécutée), process.env.STRIPE_SECRET_KEY est défini
 * sur Vercel et l'instance se crée. Build local sans clé reste vert.
 */
let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error(
        'STRIPE_SECRET_KEY absent. Configurer la var Vercel + redeploy.',
      )
    }
    stripeSingleton = new Stripe(key, {
      apiVersion: '2025-04-30.basil',
      typescript: true,
      appInfo: {
        name: 'Hilmy',
        version: '1.0.0',
        url: 'https://www.hilmy.io',
      },
    })
  }
  return stripeSingleton
}

/** Proxy export pour back-compat — `stripe.xxx()` route via getStripe(). */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const value = getStripe()[prop as keyof Stripe]
    return typeof value === 'function' ? value.bind(getStripe()) : value
  },
})

/* ──────────────────────────────────────────────────────────────────
   PRICE_ID_MAP — décodage Stripe priceId → palier + durée
   ────────────────────────────────────────────────────────────────── */

interface PriceMapEntry {
  palier: Palier
  duree_months: Duree
}

/**
 * Mapping priceId → palier + duree_months. Construit côté serveur
 * uniquement (pas de NEXT_PUBLIC_).
 *
 * Note : Sélection Hilmy lieu (39€/mois) est délibérément absente —
 * Sprint 7 prestataires only (cf décision Q1=c). La var Vercel
 * STRIPE_PRICE_SELECTION_HILMY_MONTHLY existe mais n'est pas branchée
 * ici. Sera ajoutée au Sprint 7bis avec sa propre table de mapping.
 */
function buildPriceIdMap(): Map<string, PriceMapEntry> {
  const m = new Map<string, PriceMapEntry>()
  const add = (envKey: string, palier: Palier, duree: Duree) => {
    const id = process.env[envKey]
    if (id && id.startsWith('price_')) m.set(id, { palier, duree_months: duree })
  }
  add('STRIPE_PRICE_STANDARD_MONTHLY', 'standard', 1)
  add('STRIPE_PRICE_STANDARD_3M', 'standard', 3)
  add('STRIPE_PRICE_STANDARD_6M', 'standard', 6)
  add('STRIPE_PRICE_STANDARD_1Y', 'standard', 12)
  add('STRIPE_PRICE_PREMIUM_MONTHLY', 'premium', 1)
  add('STRIPE_PRICE_PREMIUM_3M', 'premium', 3)
  add('STRIPE_PRICE_PREMIUM_6M', 'premium', 6)
  add('STRIPE_PRICE_PREMIUM_1Y', 'premium', 12)
  add('STRIPE_PRICE_CERCLE_PRO_MONTHLY', 'cercle_pro', 1)
  add('STRIPE_PRICE_CERCLE_PRO_3M', 'cercle_pro', 3)
  add('STRIPE_PRICE_CERCLE_PRO_6M', 'cercle_pro', 6)
  add('STRIPE_PRICE_CERCLE_PRO_1Y', 'cercle_pro', 12)
  return m
}

const PRICE_ID_MAP = buildPriceIdMap()

/** Décode un priceId Stripe en palier + durée. Null si inconnu. */
export function getPaliersAndInterval(
  priceId: string,
): PriceMapEntry | null {
  return PRICE_ID_MAP.get(priceId) ?? null
}

/**
 * Résout un combo (palier, duree_months) en priceId Stripe.
 * Utilisé par SubscribeButton pour passer le bon ID au checkout.
 * Retourne null si la var d'env correspondante est absente —
 * dans ce cas le UI doit fallback sur le mailto legacy.
 */
export function getPriceIdForCombo(
  palier: Palier,
  duree: Duree,
): string | null {
  for (const [priceId, entry] of PRICE_ID_MAP) {
    if (entry.palier === palier && entry.duree_months === duree) {
      return priceId
    }
  }
  return null
}

/** Vérifie qu'un priceId est référencé — gating server-side. */
export function isKnownPriceId(priceId: string): boolean {
  return PRICE_ID_MAP.has(priceId)
}

/* ──────────────────────────────────────────────────────────────────
   COPINE_PRICE_ID_MAP — décodage Stripe priceId → plan Pass Copine

   Map distinct du PRICE_ID_MAP prestataire ci-dessus pour deux raisons :
   (1) éviter qu'un priceId Copine soit accepté par isKnownPriceId()
   côté flow prestataire (qui ferait crasher decodage palier/duree) ;
   (2) garder les deux flows découplés — toute modif côté prestataire
   ne touche pas le flow Copine et vice-versa.

   Pricing Pass Copine (mig 50) :
     • monthly : 4,99€/mois
     • annual  : 49€/an (2 mois offerts vs monthly)
   ────────────────────────────────────────────────────────────────── */

function buildCopinePriceIdMap(): Map<string, CopinePlan> {
  const m = new Map<string, CopinePlan>()
  const add = (envKey: string, plan: CopinePlan) => {
    const id = process.env[envKey]
    if (id && id.startsWith('price_')) m.set(id, plan)
  }
  add('STRIPE_PRICE_COPINE_MONTHLY', 'monthly')
  add('STRIPE_PRICE_COPINE_ANNUAL', 'annual')
  return m
}

const COPINE_PRICE_ID_MAP = buildCopinePriceIdMap()

/** Vrai si le priceId correspond à un price Pass Copine. */
export function isCopinePriceId(priceId: string): boolean {
  return COPINE_PRICE_ID_MAP.has(priceId)
}

/** Décode un priceId Copine en plan. Null si inconnu. */
export function getCopinePlan(priceId: string): CopinePlan | null {
  return COPINE_PRICE_ID_MAP.get(priceId) ?? null
}

/**
 * Résout un plan Copine en priceId. Utilisé par /api/stripe/checkout
 * quand le body contient { plan } au lieu de { price_id } — flow Pass
 * Copine où le client n'a pas accès aux env vars STRIPE_PRICE_COPINE_*
 * (server-only par décision A5).
 *
 * Retourne null si la var d'env correspondante est absente côté
 * runtime — le caller doit retourner 503/server-config error.
 */
export function getCopinePriceIdForPlan(plan: CopinePlan): string | null {
  for (const [priceId, p] of COPINE_PRICE_ID_MAP) {
    if (p === plan) return priceId
  }
  return null
}

/* ──────────────────────────────────────────────────────────────────
   URLs success / cancel Pass Copine

   Origin dynamique depuis request.url côté handler. Le user_id est
   redondant ici (cookie session Supabase suffit pour identifier la
   user dans /dashboard/utilisatrice/copine), mais on garde
   stripe_success=1 pour distinguer le retour Stripe d'une visite
   directe (UX message "Bienvenue dans la team Copines").
   ────────────────────────────────────────────────────────────────── */

export function buildCopineSuccessUrl(origin: string): string {
  return `${origin}/dashboard/utilisatrice/copine?stripe_success=1`
}

export function buildCopineCancelUrl(origin: string): string {
  return `${origin}/pass-copine?stripe_canceled=1`
}

/* ──────────────────────────────────────────────────────────────────
   URLs success / cancel post-checkout

   Origin dynamique calculé depuis request.url côté handler (pas via
   NEXT_PUBLIC_SITE_URL qui peut diverger entre Preview/Prod). Le
   profile_id est injecté en query param pour détecter côté client si
   le user actuel matche celui qui a payé (cas multi-comptes browser).

   `context` distingue le retour de paiement :
     • undefined (défaut) — checkout depuis le dashboard d'une fiche
       existante → retour sur la fiche.
     • 'onboarding' — checkout branché à la fin du funnel d'inscription
       (manuel/google → /tarifs?from=onboarding → Stripe). Le paiement
       rend la fiche visible (Modèle B : abo actif = visible via RLS),
       on atterrit sur l'écran de confirmation d'inscription /publiee.
   ────────────────────────────────────────────────────────────────── */

export function buildStripeSuccessUrl(
  origin: string,
  profileId: string,
  context?: 'onboarding',
): string {
  if (context === 'onboarding') {
    return `${origin}/onboarding/prestataire/publiee?stripe_success=1`
  }
  return `${origin}/dashboard/prestataire/fiche?stripe_success=1&profile_id=${encodeURIComponent(profileId)}`
}

export function buildStripeCancelUrl(
  origin: string,
  context?: 'onboarding',
): string {
  if (context === 'onboarding') {
    // Abandon au checkout pendant l'inscription : la fiche reste en
    // 'pending' invisible (voulu). On ramène la prestataire sur le
    // choix de formule pour réessayer, sans perdre le contexte.
    return `${origin}/tarifs?from=onboarding&stripe_canceled=1`
  }
  return `${origin}/tarifs?stripe_canceled=1`
}

/** Map status Stripe → "abo actif" boolean. Active + trialing = palier
 *  appliqué côté UI. past_due = palier maintenu mais warning. */
export function isStripeStatusEntitling(status: string): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}
