'use server'

/**
 * Server actions admin pour les catégories saisonnières (mig 44 + 45).
 *
 * Initialement créées par PR-D pour le boost prestataire (scope abandonné),
 * la table `seasonal_event_windows` a été renommée `event_seasonal_categories`
 * via mig 45 et sert désormais de référentiel pour les filtres saisonniers
 * de la page /événements.
 *
 * Toutes les actions :
 *  - vérifient is_admin via JWT (defense in depth — le layout admin gate déjà)
 *  - utilisent createAdminClient() pour bypass RLS
 *  - revalident la page admin après chaque mutation
 *  - retournent { ok: true } ou { ok: false, error: string }
 */

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/supabase/session'

type ActionResult = { ok: true } | { ok: false; error: string }

async function ensureAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  if (!user.user_metadata?.is_admin) {
    return { ok: false, error: 'Accès admin requis' }
  }
  return { ok: true }
}

function parseDateInput(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  return new Date(raw).toISOString()
}

function parseTextInput(raw: FormDataEntryValue | null, max = 200): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  return trimmed.slice(0, max)
}

export async function createSeasonalCategory(formData: FormData): Promise<ActionResult> {
  const auth = await ensureAdmin()
  if (!auth.ok) return auth

  const slug = parseTextInput(formData.get('slug'), 64)
  const label = parseTextInput(formData.get('label'), 120)
  const emoji = parseTextInput(formData.get('emoji'), 8) ?? '🎁'
  const starts_at = parseDateInput(formData.get('starts_at'))
  const ends_at = parseDateInput(formData.get('ends_at'))

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { ok: false, error: 'Slug requis (kebab-case, a-z 0-9 -)' }
  }
  if (!label) {
    return { ok: false, error: 'Label requis' }
  }
  if (starts_at && ends_at && starts_at > ends_at) {
    return { ok: false, error: 'starts_at doit être <= ends_at' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('event_seasonal_categories')
    .insert({ slug, label, emoji, starts_at, ends_at, is_active: true })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/event-seasonal-categories')
  return { ok: true }
}

export async function updateSeasonalCategory(formData: FormData): Promise<ActionResult> {
  const auth = await ensureAdmin()
  if (!auth.ok) return auth

  const id = parseTextInput(formData.get('id'), 64)
  if (!id) return { ok: false, error: 'ID manquant' }

  const label = parseTextInput(formData.get('label'), 120)
  const emoji = parseTextInput(formData.get('emoji'), 8) ?? '🎁'
  const starts_at = parseDateInput(formData.get('starts_at'))
  const ends_at = parseDateInput(formData.get('ends_at'))
  const is_active = formData.get('is_active') === 'on'

  if (!label) return { ok: false, error: 'Label requis' }
  if (starts_at && ends_at && starts_at > ends_at) {
    return { ok: false, error: 'starts_at doit être <= ends_at' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('event_seasonal_categories')
    .update({ label, emoji, starts_at, ends_at, is_active })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/event-seasonal-categories')
  return { ok: true }
}

export async function deleteSeasonalCategory(formData: FormData): Promise<ActionResult> {
  const auth = await ensureAdmin()
  if (!auth.ok) return auth

  const id = parseTextInput(formData.get('id'), 64)
  if (!id) return { ok: false, error: 'ID manquant' }

  // CASCADE supprime aussi les profile_seasonal_boosts liés (FK ON DELETE CASCADE).
  const admin = createAdminClient()
  const { error } = await admin
    .from('event_seasonal_categories')
    .delete()
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/event-seasonal-categories')
  return { ok: true }
}
