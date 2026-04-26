'use client'

import { useEffect } from 'react'

interface Props {
  profileId: string
}

/**
 * Composant invisible qui POST /api/track/view une seule fois par session
 * navigateur et par profileId (debounce via sessionStorage).
 *
 * sessionStorage est volontaire :
 *  - reset à la fermeture du tab → un retour le lendemain compte comme une
 *    nouvelle vue (utile pour les analytics)
 *  - 5 onglets ouverts en parallèle = 1 vue (pas du spam)
 *
 * keepalive: true permet d'envoyer la requête même si la page est fermée
 * juste après (≈ navigator.sendBeacon mais avec headers JSON).
 */
export function TrackPageView({ profileId }: Props) {
  useEffect(() => {
    if (!profileId) return
    if (typeof window === 'undefined') return

    const key = `hilmy_view_${profileId}`
    if (sessionStorage.getItem(key)) return

    sessionStorage.setItem(key, String(Date.now()))

    fetch('/api/track/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId }),
      keepalive: true,
    }).catch(() => {
      // Silencieux : le tracking ne doit jamais casser la nav.
    })
  }, [profileId])

  return null
}
