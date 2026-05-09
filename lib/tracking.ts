import crypto from 'node:crypto'

/**
 * Métadonnées extraites de la requête HTTP pour le tracking.
 * Toutes les valeurs sont best-effort : si Vercel ne fournit pas
 * x-vercel-ip-* (ex: dev local), les champs restent à null.
 */
export type TrackingMeta = {
  country: string | null
  region: string | null
  city: string | null
  referer: string | null
  userAgentHash: string | null
}

/**
 * Tronque une string à `max` caractères. Évite les referer monstrueux
 * (URLs avec query params surchargés) qui ballonnent la DB.
 */
function truncate(s: string | null, max: number): string | null {
  if (!s) return null
  return s.length > max ? s.slice(0, max) : s
}

/**
 * Hash sha256 du User-Agent. Volontairement non-réversible : permet de
 * dédupliquer 2 vues consécutives du même device sans stocker une
 * empreinte exploitable.
 */
function hashUserAgent(ua: string | null): string | null {
  if (!ua) return null
  return crypto.createHash('sha256').update(ua).digest('hex')
}

export function extractTrackingMeta(request: Request): TrackingMeta {
  const headers = request.headers
  return {
    country: headers.get('x-vercel-ip-country'),
    region: headers.get('x-vercel-ip-country-region'),
    city: headers.get('x-vercel-ip-city')
      ? decodeURIComponent(headers.get('x-vercel-ip-city')!)
      : null,
    referer: truncate(headers.get('referer'), 512),
    userAgentHash: hashUserAgent(headers.get('user-agent')),
  }
}

/** UUID v4 strict (rejette les IDs farfelus côté API). */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUuid(s: unknown): s is string {
  return typeof s === 'string' && UUID_REGEX.test(s)
}

/** Whitelist des contact_type acceptés (CHECK constraint côté DB,
 *  table `profile_contacts`, mig 15). */
export const CONTACT_TYPES = [
  'whatsapp',
  'phone',
  'email',
  'website',
  'instagram',
  'tiktok',
  'linkedin',
  'facebook',
  'youtube',
] as const

export type ContactType = (typeof CONTACT_TYPES)[number]

export function isValidContactType(s: unknown): s is ContactType {
  return typeof s === 'string' && (CONTACT_TYPES as readonly string[]).includes(s)
}

/** Whitelist des contact_type acceptés pour la table `place_contacts`
 *  (CHECK constraint mig 41). Différent de CONTACT_TYPES :
 *   - pas de 'linkedin' (un café n'a pas de LinkedIn)
 *   - + 'google_maps' (canal natif des fiches places). */
export const PLACE_CONTACT_TYPES = [
  'phone',
  'website',
  'email',
  'instagram',
  'tiktok',
  'facebook',
  'youtube',
  'google_maps',
  'whatsapp',
] as const

export type PlaceContactType = (typeof PLACE_CONTACT_TYPES)[number]

export function isValidPlaceContactType(s: unknown): s is PlaceContactType {
  return (
    typeof s === 'string' &&
    (PLACE_CONTACT_TYPES as readonly string[]).includes(s)
  )
}
