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
  if (result.ok) {
    revalidatePath(`/je-cherche/${input.demande_id}`)
    revalidatePath('/je-cherche')
  }
  return result
}

export async function markResolvedAction(demandeId: string) {
  const result = await markResolvedHelper(demandeId)
  if (result.ok) {
    revalidatePath(`/je-cherche/${demandeId}`)
    revalidatePath('/je-cherche')
    revalidatePath('/')
  }
  return result
}

export async function signalDemandeAction(
  demandeId: string,
  reason: SignalementReason,
  comment?: string | null,
) {
  const result = await signalDemandeHelper(demandeId, reason, comment)
  if (result.ok) {
    revalidatePath(`/je-cherche/${demandeId}`)
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
  if (result.ok) {
    revalidatePath(`/je-cherche/${demandeId}`)
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
