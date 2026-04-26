import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { extractTrackingMeta, isValidUuid } from '@/lib/tracking'

export const runtime = 'nodejs'

/**
 * POST /api/track/view
 * Body : { profile_id: string (uuid) }
 * Réponse : 204 No Content si OK, 400 sinon.
 *
 * Endpoint sur le chemin critique de l'affichage d'une fiche → on reste
 * minimal : pas de validation business lourde, pas de retour JSON.
 *
 * viewer_id est NULL pour les utilisateurs anonymes (la page peut un jour
 * être publique). Le client est responsable du debounce 1/session/profil
 * (sessionStorage côté <TrackPageView>).
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'track-view',
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

  const profileId = (body as { profile_id?: unknown })?.profile_id
  if (!isValidUuid(profileId)) {
    return NextResponse.json(
      { error: 'profile_id requis (uuid).' },
      { status: 400 },
    )
  }

  // Récupère le user authentifié (peut être null)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const meta = extractTrackingMeta(request)

  // INSERT via service-role pour bypass RLS (en pratique RLS autorise
  // déjà les inserts publics, mais on évite les surprises de schéma)
  const admin = createAdminClient()
  const { error } = await admin.from('profile_views').insert({
    profile_id: profileId,
    viewer_id: user?.id ?? null,
    country: meta.country,
    region: meta.region,
    city: meta.city,
    referer: meta.referer,
    user_agent_hash: meta.userAgentHash,
  })

  if (error) {
    // Profile inexistant → 23503 (FK violation). Sinon log et 500.
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'profile_id introuvable.' },
        { status: 400 },
      )
    }
    console.error('[track/view] insert failed', error)
    return new NextResponse(null, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
