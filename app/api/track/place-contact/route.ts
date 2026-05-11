import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/supabase/bearer'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  extractTrackingMeta,
  isValidPlaceContactType,
  isValidUuid,
} from '@/lib/tracking'

export const runtime = 'nodejs'

/**
 * POST /api/track/place-contact
 * Body : { place_id: uuid, contact_type: PlaceContactType }
 * Réponse : 204 No Content si OK, 400 sinon.
 *
 * Mirror de /api/track/contact pour les fiches lieux. Tracking universel
 * (toutes les places, peu importe le palier). L'affichage gated palier
 * 'selection_hilmy' se fait côté dashboard owner (PR-B2).
 *
 * Appelé en pré-clic depuis <PlaceContactLink> sur la fiche lieu publique.
 * Le clic ouvre le lien sans attendre la réponse (keepalive: true).
 *
 * NOTE — différence avec /api/track/contact :
 *  - whitelist contact_type différente (cf. PLACE_CONTACT_TYPES dans
 *    lib/tracking.ts) : 'google_maps' au lieu de 'linkedin'.
 *  - cible place_contacts au lieu de profile_contacts.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'track-place-contact',
    max: 30,
    windowMs: 60 * 1000,
  })
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body invalide.' }, { status: 400 })
  }

  const placeId = (body as { place_id?: unknown })?.place_id
  const contactType = (body as { contact_type?: unknown })?.contact_type

  if (!isValidUuid(placeId)) {
    return NextResponse.json(
      { error: 'place_id requis (uuid).' },
      { status: 400 },
    )
  }
  if (!isValidPlaceContactType(contactType)) {
    return NextResponse.json(
      { error: 'contact_type invalide.' },
      { status: 400 },
    )
  }

  // Récupère le user authentifié (peut être null pour anonyme).
  // Cookies (web) avec fallback Bearer (mobile RN). Cf. lib/supabase/bearer.ts.
  const { user } = await authenticateRequest(request)

  const meta = extractTrackingMeta(request)

  const admin = createAdminClient()
  const { error } = await admin.from('place_contacts').insert({
    place_id: placeId,
    clicker_id: user?.id ?? null,
    contact_type: contactType,
    country: meta.country,
    region: meta.region,
    city: meta.city,
    referer: meta.referer,
  })

  if (error) {
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'place_id introuvable.' },
        { status: 400 },
      )
    }
    console.error('[track/place-contact] insert failed', error)
    return new NextResponse(null, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
