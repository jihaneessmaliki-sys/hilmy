'use server'

import { revalidatePath } from 'next/cache'
import {
  createDemande as createDemandeHelper,
  createResponse as createResponseHelper,
  markResolved as markResolvedHelper,
  signalDemande as signalDemandeHelper,
  signalResponse as signalResponseHelper,
  toggleThanks as toggleThanksHelper,
  type CreateDemandeInput,
  type CreateResponseInput,
} from '@/lib/supabase/je-cherche'
import type { SignalementReason } from '@/lib/types/je-cherche'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendNewResponseToDemandeuse,
  sendDemandeResolvedToFounders,
  sendSignalementToFounders,
} from '@/lib/email/transactional'

/**
 * Server actions pour le module Je cherche.
 * Toutes délèguent à lib/supabase/je-cherche.ts (validation Zod + RLS).
 * Revalident les paths concernés pour rafraîchir SSR.
 */

export async function createDemandeAction(input: CreateDemandeInput) {
  const result = await createDemandeHelper(input)
  if (result.ok) {
    revalidatePath('/je-cherche')
    revalidatePath('/')
  }
  return result
}

export async function createResponseAction(input: CreateResponseInput) {
  const result = await createResponseHelper(input)
  if (!result.ok) return result

  revalidatePath(`/je-cherche/${input.demande_id}`)
  revalidatePath('/je-cherche')

  // Email best-effort à la demandeuse (si différente du répondeur).
  try {
    const admin = createAdminClient()
    const [demandeRes, responderProfileRes, prestaRes] = await Promise.all([
      admin
        .from('demandes')
        .select('user_id, title')
        .eq('id', input.demande_id)
        .maybeSingle(),
      admin
        .from('user_profiles')
        .select('prenom')
        .eq('user_id', result.data.user_id)
        .maybeSingle(),
      input.prestataire_id
        ? admin
            .from('profiles')
            .select('nom')
            .eq('id', input.prestataire_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    const demande = demandeRes.data
    if (demande && demande.user_id !== result.data.user_id) {
      const [demandeAuthRes, demandeProfileRes] = await Promise.all([
        admin.auth.admin.getUserById(demande.user_id as string),
        admin
          .from('user_profiles')
          .select('prenom')
          .eq('user_id', demande.user_id as string)
          .maybeSingle(),
      ])
      const demandeEmail = demandeAuthRes.data?.user?.email
      if (demandeEmail) {
        await sendNewResponseToDemandeuse({
          to: demandeEmail,
          prenom: (demandeProfileRes.data?.prenom as string | null) ?? 'Toi',
          demandeTitle: demande.title as string,
          demandeId: input.demande_id,
          responderPrenom:
            (responderProfileRes.data?.prenom as string | null) ?? 'Une copine',
          responseExcerpt: result.data.content,
          prestataireNom: (prestaRes.data as { nom?: string } | null)?.nom ?? null,
        })
      }
    }
  } catch {
    // Best-effort : on ne fail pas l'action si l'email rate
  }

  return result
}

export async function markResolvedAction(demandeId: string) {
  const result = await markResolvedHelper(demandeId)
  if (!result.ok) return result

  revalidatePath(`/je-cherche/${demandeId}`)
  revalidatePath('/je-cherche')
  revalidatePath('/')

  // Email best-effort à la team (stats interne)
  try {
    await sendDemandeResolvedToFounders({
      demandeTitle: result.data.title,
      demandeId,
      responseCount: result.data.response_count,
      resolvedAt: new Date().toISOString(),
    })
  } catch {
    // ignore
  }

  return result
}

async function notifyFoundersOfSignalement(
  reporterId: string,
  reason: SignalementReason,
  comment: string | null | undefined,
  targetType: 'demande' | 'response',
  targetId: string,
) {
  try {
    const admin = createAdminClient()
    const reporterProfileRes = await admin
      .from('user_profiles')
      .select('prenom')
      .eq('user_id', reporterId)
      .maybeSingle()

    let targetExcerpt = ''
    if (targetType === 'demande') {
      const { data } = await admin
        .from('demandes')
        .select('title, content')
        .eq('id', targetId)
        .maybeSingle()
      targetExcerpt = data
        ? `${data.title as string}\n\n${data.content as string}`
        : ''
    } else {
      const { data } = await admin
        .from('demande_responses')
        .select('content')
        .eq('id', targetId)
        .maybeSingle()
      targetExcerpt = (data?.content as string | null) ?? ''
    }

    await sendSignalementToFounders({
      reason,
      comment: comment ?? null,
      targetType,
      targetId,
      targetExcerpt,
      reporterPrenom: (reporterProfileRes.data?.prenom as string | null) ?? null,
    })
  } catch {
    // best-effort
  }
}

export async function signalDemandeAction(
  demandeId: string,
  reason: SignalementReason,
  comment?: string | null,
) {
  const result = await signalDemandeHelper(demandeId, reason, comment)
  if (!result.ok) return result
  revalidatePath(`/je-cherche/${demandeId}`)

  // Récupère reporter_id pour le mail (depuis la session)
  try {
    const admin = createAdminClient()
    const { data: signalement } = await admin
      .from('demande_signalements')
      .select('reporter_id')
      .eq('id', result.data.signalementId)
      .maybeSingle()
    if (signalement?.reporter_id) {
      await notifyFoundersOfSignalement(
        signalement.reporter_id as string,
        reason,
        comment,
        'demande',
        demandeId,
      )
    }
  } catch {
    // ignore
  }

  return result
}

export async function signalResponseAction(
  responseId: string,
  demandeId: string,
  reason: SignalementReason,
  comment?: string | null,
) {
  const result = await signalResponseHelper(responseId, reason, comment)
  if (!result.ok) return result
  revalidatePath(`/je-cherche/${demandeId}`)

  try {
    const admin = createAdminClient()
    const { data: signalement } = await admin
      .from('demande_signalements')
      .select('reporter_id')
      .eq('id', result.data.signalementId)
      .maybeSingle()
    if (signalement?.reporter_id) {
      await notifyFoundersOfSignalement(
        signalement.reporter_id as string,
        reason,
        comment,
        'response',
        responseId,
      )
    }
  } catch {
    // ignore
  }

  return result
}

export async function toggleThanksAction(responseId: string, demandeId: string) {
  const result = await toggleThanksHelper(responseId)
  if (result.ok) {
    revalidatePath(`/je-cherche/${demandeId}`)
  }
  return result
}
