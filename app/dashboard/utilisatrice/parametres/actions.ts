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

  const { error } = await supabase
    .from('user_profiles')
    .update({ preferences: { notifications: raw } })
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
