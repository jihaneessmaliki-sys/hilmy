'use client'

import { useEffect } from 'react'

interface Props {
  placeId: string
}

/**
 * Composant invisible qui POST /api/track/place-view une seule fois par
 * session navigateur et par placeId (debounce via sessionStorage).
 *
 * Mirror de <TrackPageView /> côté prestataires.
 *
 * sessionStorage est volontaire :
 *  - reset à la fermeture du tab → un retour le lendemain compte comme une
 *    nouvelle vue (utile pour les analytics)
 *  - 5 onglets ouverts en parallèle = 1 vue (pas du spam)
 *
 * keepalive: true permet d'envoyer la requête même si la page est fermée
 * juste après (≈ navigator.sendBeacon mais avec headers JSON).
 */
export function TrackPlaceView({ placeId }: Props) {
  useEffect(() => {
    if (!placeId) return
    if (typeof window === 'undefined') return

    const key = `hilmy_place_view_${placeId}`
    if (sessionStorage.getItem(key)) return

    sessionStorage.setItem(key, String(Date.now()))

    fetch('/api/track/place-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: placeId }),
      keepalive: true,
    }).catch(() => {
      // Silencieux : le tracking ne doit jamais casser la nav.
    })
  }, [placeId])

  return null
}
