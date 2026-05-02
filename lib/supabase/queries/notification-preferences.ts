import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
  type QueryResult,
} from '@/lib/supabase/types';

/** Récupère les préférences de notifications de l'utilisatrice connectée (server-side). */
export async function getNotificationPrefs(): Promise<
  QueryResult<NotificationPrefs>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Non connectée' };

    const { data, error } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return { data: null, error: error.message };

    const stored = (data?.preferences as { notifications?: Partial<NotificationPrefs> } | null)
      ?.notifications ?? {};

    return {
      data: { ...DEFAULT_NOTIFICATION_PREFS, ...stored },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}
