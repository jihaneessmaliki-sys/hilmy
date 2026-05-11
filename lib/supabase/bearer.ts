/**
 * Authentification cookies + fallback Bearer (mobile RN/Expo).
 *
 * Les routes API Hilmy sont consommées par 2 clients :
 *   - le web (browser, cookies Supabase posés par le middleware SSR)
 *   - l'app mobile Expo (JWT Bearer en AsyncStorage, sans cookies)
 *
 * Priorité (zéro régression web) :
 *   1. On tente d'abord l'auth via cookies (createClient server.ts).
 *      Si un user est résolu → on l'utilise, on s'arrête là.
 *   2. Sinon, si `Authorization: Bearer <jwt>` est présent → on crée un
 *      client Supabase configuré avec ce header et on retourne le user
 *      qu'il résout.
 *   3. Sinon → user = null (la route renvoie 401 selon sa convention).
 *
 * Le client retourné est le client "qui a réussi l'auth" — toutes les
 * queries `.from(...).select(...)` qui dépendent de RLS owner doivent
 * passer par lui (pas par un autre instance). Les opérations en
 * service-role (admin client) restent inchangées dans les routes.
 *
 * Note : avec le Bearer header on désactive volontairement
 * `persistSession` + `autoRefreshToken`. L'app mobile gère son propre
 * refresh côté client ; on ne veut pas que le serveur tente de
 * rafraîchir un token qu'il n'a pas le droit de stocker.
 */

import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient as createCookieClient } from './server'

export type AuthenticatedRequestContext = {
  supabase: SupabaseClient
  user: User | null
}

export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedRequestContext> {
  // 1. Cookies first (web standard, zéro régression).
  const cookieClient = await createCookieClient()
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser()
  if (cookieUser) {
    return { supabase: cookieClient, user: cookieUser }
  }

  // 2. Fallback Bearer (mobile RN/Expo, AsyncStorage).
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerClient = createSupabaseJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    )
    const {
      data: { user: bearerUser },
    } = await bearerClient.auth.getUser()
    if (bearerUser) {
      return { supabase: bearerClient, user: bearerUser }
    }
  }

  // 3. Anonyme.
  return { supabase: cookieClient, user: null }
}
