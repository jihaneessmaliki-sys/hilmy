'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * SessionProvider — rend l'état auth disponible à tout le tree client
 * sans flicker au premier render.
 *
 * Pourquoi : la navbar V2 (composant client) n'a pas accès à
 * `supabase.auth.getUser()` côté serveur. En hydratant le contexte
 * avec `initialUser` résolu côté Server Component (app/layout.tsx),
 * le premier paint affiche déjà l'état correct (connectée / anonyme).
 *
 * `onAuthStateChange` garde le contexte à jour au runtime (login,
 * logout, token refresh).
 */

type SessionState = {
  user: User | null
}

const SessionContext = createContext<SessionState>({ user: null })

export function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: User | null
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(initialUser)

  useEffect(() => {
    const supabase = createClient()
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
