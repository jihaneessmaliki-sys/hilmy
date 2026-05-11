import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/supabase/bearer'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { extractTrackingMeta, isValidUuid } from '@/lib/tracking'

export const runtime = 'nodejs'

/**
 * POST /api/track/place-view
 * Body : { place_id: string (uuid) }
 * Réponse : 204 No Content si OK, 400 sinon.
 *
 * Mirror de /api/track/view (mig 15) pour les fiches lieux. Le tracking
 * est UNIVERSEL — toutes les places sont trackées peu importe leur palier.
 * Le gating affichage des stats côté dashboard est fait en lecture
 * (cf. PR-B2 qui ne montrera les stats qu'aux lieux palier='selection_hilmy').
 *
 * Endpoint sur le chemin critique de l'affichage d'une fiche → minimal :
 * pas de validation business lourde, pas de retour JSON.
 *
 * viewer_id est NULL pour les utilisateurs anonymes (la fiche peut être
 * visitée sans être connectée). Le client est responsable du debounce
 * 1/session/place via sessionStorage côté <TrackPlaceView />.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'track-place-view',
    max: 60,
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
  if (!isValidUuid(placeId)) {
    return NextResponse.json(
      { error: 'place_id requis (uuid).' },
      { status: 400 },
    )
  }

  // Récupère le user authentifié (peut être null pour anonyme).
  // Cookies (web) avec fallback Bearer (mobile RN). Cf. lib/supabase/bearer.ts.
  const { user } = await authenticateRequest(request)

  const meta = extractTrackingMeta(request)

  // INSERT via service-role pour bypass RLS (la policy autorise déjà les
  // inserts publics, mais cohérent avec /api/track/view).
  const admin = createAdminClient()
  const { error } = await admin.from('place_views').insert({
    place_id: placeId,
    viewer_id: user?.id ?? null,
    country: meta.country,
    region: meta.region,
    city: meta.city,
    referer: meta.referer,
    user_agent_hash: meta.userAgentHash,
  })

  if (error) {
    // place_id inexistant → 23503 (FK violation).
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'place_id introuvable.' },
        { status: 400 },
      )
    }
    console.error('[track/place-view] insert failed', error)
    return new NextResponse(null, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
