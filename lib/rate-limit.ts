import { LRUCache } from 'lru-cache'
import { NextResponse } from 'next/server'

/**
 * Rate limiter en mémoire (LRU) keyed par `tag:ip`.
 *
 * Limites :
 *  - état non partagé entre instances Vercel serverless → en cas de scale-out,
 *    chaque conteneur a son propre cache. Acceptable pour un anti-spam basique
 *    (un attaquant déterminé peut frapper plusieurs warm starts), pas pour
 *    une protection bancaire.
 *  - reset automatique au cold start. Pas grave : le but est de bloquer les
 *    bursts depuis une même IP, pas de garder un compteur 24h.
 *
 * Si on veut du strict cross-instance plus tard, swap pour Upstash Redis
 * (même signature côté caller).
 */

type Bucket = { count: number; resetAt: number }

// Un seul cache global, partagé entre toutes les routes. Chaque entrée
// est keyed `tag:ip` donc pas de collision entre routes.
// max=10000 entrées = ~10000 IPs uniques actives simultanément, largement
// suffisant pour Hilmy.
const cache = new LRUCache<string, Bucket>({
  max: 10000,
  ttl: 60 * 60 * 1000, // 1h, sécurité au cas où le bucket n'est pas nettoyé
})

export type RateLimitOptions = {
  /** Identifiant logique de la limite (ex: "auth-signup"). Évite les
   *  collisions de compteur entre routes. */
  tag: string
  /** Nombre max de requêtes autorisées dans la fenêtre. */
  max: number
  /** Fenêtre glissante en millisecondes. */
  windowMs: number
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number }

function getClientIp(request: Request): string {
  // Vercel met l'IP réelle dans x-forwarded-for (premier élément).
  // x-real-ip en fallback. Sinon "unknown" (= toutes les requêtes
  // sans IP partagent le même bucket → fail-closed).
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = request.headers.get('x-real-ip')
  if (xri) return xri.trim()
  return 'unknown'
}

export function rateLimit(
  request: Request,
  options: RateLimitOptions,
): RateLimitResult {
  const ip = getClientIp(request)
  const key = `${options.tag}:${ip}`
  const now = Date.now()

  const existing = cache.get(key)

  if (!existing || existing.resetAt <= now) {
    cache.set(
      key,
      { count: 1, resetAt: now + options.windowMs },
      { ttl: options.windowMs },
    )
    return { ok: true, remaining: options.max - 1 }
  }

  if (existing.count >= options.max) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    }
  }

  existing.count += 1
  cache.set(key, existing, { ttl: existing.resetAt - now })
  return { ok: true, remaining: options.max - existing.count }
}

/**
 * Helper : si la limite est atteinte, renvoie une 429 prête à retourner.
 * Sinon renvoie null (le caller continue son traitement).
 *
 * Usage :
 *   const limited = enforceRateLimit(request, { tag: "auth-signup", max: 5, windowMs: 15 * 60 * 1000 })
 *   if (limited) return limited
 */
export function enforceRateLimit(
  request: Request,
  options: RateLimitOptions,
): NextResponse | null {
  const result = rateLimit(request, options)
  if (result.ok) return null

  return NextResponse.json(
    {
      error:
        'Trop de tentatives. Patiente quelques instants avant de réessayer.',
    },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    },
  )
}
