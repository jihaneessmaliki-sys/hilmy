'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Garde admin : doit être appelée au début de chaque server action admin.
 * Vérifie auth + user_metadata.is_admin (cohérent avec /admin/layout).
 */
async function requireAdmin(): Promise<AdminActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifiée' }
  if (!user.user_metadata?.is_admin) return { ok: false, error: 'Non autorisée' }
  return { ok: true }
}

/**
 * Restaure une demande masquée auto : status='open' + flag_count=0.
 * Service-role pour bypass RLS owner-only sur UPDATE.
 */
export async function restoreDemandeAction(
  demandeId: string,
): Promise<AdminActionResult> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('demandes')
      .update({ status: 'open', flag_count: 0 })
      .eq('id', demandeId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/admin/je-cherche-signalements')
    revalidatePath(`/je-cherche/${demandeId}`)
    revalidatePath('/je-cherche')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Restaure une réponse masquée auto : is_hidden=false + flag_count=0.
 * Service-role pour bypass RLS owner-only sur UPDATE.
 */
export async function restoreResponseAction(
  responseId: string,
): Promise<AdminActionResult> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard

  try {
    const admin = createAdminClient()
    // Récupère le demande_id pour revalidate la page detail
    const { data: response } = await admin
      .from('demande_responses')
      .select('demande_id')
      .eq('id', responseId)
      .maybeSingle()

    const { error } = await admin
      .from('demande_responses')
      .update({ is_hidden: false, flag_count: 0 })
      .eq('id', responseId)
    if (error) return { ok: false, error: error.message }

    revalidatePath('/admin/je-cherche-signalements')
    if (response?.demande_id) {
      revalidatePath(`/je-cherche/${response.demande_id}`)
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
