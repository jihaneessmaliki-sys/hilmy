import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  extractTrackingMeta,
  isValidContactType,
  isValidUuid,
} from '@/lib/tracking'

export const runtime = 'nodejs'

/**
 * POST /api/track/contact
 * Body : { profile_id: uuid, contact_type: ContactType }
 * Réponse : 204 No Content si OK, 400 sinon.
 *
 * Appelé en pré-clic depuis <SocialChannelLink> sur la fiche prestataire.
 * Le clic ouvre le lien sans attendre la réponse (keepalive: true).
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: 'track-contact',
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

  const profileId = (body as { profile_id?: unknown })?.profile_id
  const contactType = (body as { contact_type?: unknown })?.contact_type

  if (!isValidUuid(profileId)) {
    return NextResponse.json(
      { error: 'profile_id requis (uuid).' },
      { status: 400 },
    )
  }
  if (!isValidContactType(contactType)) {
    return NextResponse.json(
      { error: 'contact_type invalide.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const meta = extractTrackingMeta(request)

  const admin = createAdminClient()
  const { error } = await admin.from('profile_contacts').insert({
    profile_id: profileId,
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
        { error: 'profile_id introuvable.' },
        { status: 400 },
      )
    }
    console.error('[track/contact] insert failed', error)
    return new NextResponse(null, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
