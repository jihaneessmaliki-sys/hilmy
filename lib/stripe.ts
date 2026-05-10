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
   URLs success / cancel post-checkout
   ────────────────────────────────────────────────────────────────── */

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'https://www.hilmy.io'
  )
}

export const STRIPE_SUCCESS_URL = `${siteUrl()}/dashboard/prestataire/fiche?stripe_success=1`
export const STRIPE_CANCEL_URL = `${siteUrl()}/tarifs?stripe_canceled=1`

/** Map status Stripe → "abo actif" boolean. Active + trialing = palier
 *  appliqué côté UI. past_due = palier maintenu mais warning. */
export function isStripeStatusEntitling(status: string): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}
