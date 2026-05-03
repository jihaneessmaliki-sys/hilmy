'use server'

import { createClient } from '@/lib/supabase/server'
import type { NotificationPrefs } from '@/lib/supabase/types'

function isValidNotifPrefs(v: unknown): v is NotificationPrefs {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.emailWeekly === 'boolean' &&
    typeof o.emailEvenements === 'boolean' &&
    typeof o.emailNouvelles === 'boolean' &&
    typeof o.notifCommentaires === 'boolean'
  )
}

export async function updateNotificationPrefs(
  raw: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isValidNotifPrefs(raw)) return { success: false, error: 'Données invalides.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non connectée.' }

  const { data: existing, error: readError } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('user_id', user.id)
    .maybeSingle()

  if (readError) return { success: false, error: readError.message }

  const current = (existing?.preferences ?? {}) as Record<string, unknown>
  const merged = { ...current, notifications: raw }

  const { error } = await supabase
    .from('user_profiles')
    .update({ preferences: merged })
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
