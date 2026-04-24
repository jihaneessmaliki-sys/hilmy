'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AdminSignOut() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="mt-2 text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-or disabled:opacity-60"
    >
      {loading ? 'Déconnexion…' : 'Se déconnecter →'}
    </button>
  )
}
