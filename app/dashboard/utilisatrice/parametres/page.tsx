import { getNotificationPrefs } from '@/lib/supabase/queries/notification-preferences'
import { DEFAULT_NOTIFICATION_PREFS } from '@/lib/supabase/types'
import ParametresClient from './ParametresClient'

export default async function ParametresUserPage() {
  const { data } = await getNotificationPrefs()
  return <ParametresClient initialPrefs={data ?? DEFAULT_NOTIFICATION_PREFS} />
}
