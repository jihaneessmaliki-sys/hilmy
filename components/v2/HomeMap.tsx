'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export type MapPoint = {
  id: string
  type: 'prestataire' | 'lieu' | 'evenement'
  nom: string
  sousTitre?: string | null
  href: string
  lat: number
  lng: number
}

interface Props {
  center: { lat: number; lng: number; zoom: number }
  points: MapPoint[]
  villeLabel: string
}

/**
 * Charte V2 — couleurs par type :
 *  - prestataire  → vert #0F3D2E
 *  - lieu         → or  #C9A961
 *  - evenement    → dark brun #2C2416
 */
const COLORS: Record<MapPoint['type'], string> = {
  prestataire: '#0F3D2E',
  lieu: '#C9A961',
  evenement: '#2C2416',
}

const LABEL: Record<MapPoint['type'], string> = {
  prestataire: 'Prestataire',
  lieu: 'Lieu',
  evenement: 'Événement',
}

/**
 * Map silver/retro adaptée charte crème.
 * Ref : Google Maps style reference (JS API MapStyle).
 */
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f0e6' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#2c2416' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0e6' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#c9a961' }, { visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#eae0cc' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5b5445' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e5dac0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#d9c9a6' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c6d6d3' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a6a63' }] },
]

let loaderPromise: Promise<typeof google> | null = null

function loadMaps(apiKey: string): Promise<typeof google> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if ((window as unknown as { google?: typeof google }).google?.maps) {
    return Promise.resolve((window as unknown as { google: typeof google }).google)
  }
  if (loaderPromise) return loaderPromise
  loaderPromise = new Promise((resolve, reject) => {
    const cbName = `__hilmyGmapsReady_${Date.now()}`
    ;(window as unknown as Record<string, unknown>)[cbName] = () => {
      delete (window as unknown as Record<string, unknown>)[cbName]
      resolve((window as unknown as { google: typeof google }).google)
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&callback=${cbName}&v=weekly&libraries=marker`
    s.async = true
    s.defer = true
    s.onerror = () => {
      loaderPromise = null
      reject(new Error('Google Maps JS failed to load'))
    }
    document.head.appendChild(s)
  })
  return loaderPromise
}

export function HomeMap({ center, points, villeLabel }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [authFailed, setAuthFailed] = useState(false)

  /**
   * Google Maps JS expose une fonction globale non-documentée
   * `window.gm_authFailure` appelée quand l'API refuse la requête
   * pour raison d'autorisation : clé invalide, domaine HTTP referrer
   * non whitelisté, API JavaScript pas activée, quota/facturation
   * manquants. Si on ne l'écoute pas, Google affiche un overlay
   * natif gris ("Petit problème... Une erreur s'est produite") qui
   * casse la charte V2.
   *
   * On la wire pour basculer sur notre MapFallback stylé crème/or.
   * Enregistrée une seule fois au mount, nettoyée au unmount.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as { gm_authFailure?: () => void }
    const handler = () => setAuthFailed(true)
    w.gm_authFailure = handler
    return () => {
      // Ne supprime que si c'est toujours notre handler (évite de
      // zapper un handler posé par un autre composant qui aurait
      // monté après nous).
      if (w.gm_authFailure === handler) {
        delete w.gm_authFailure
      }
    }
  }, [])

  useEffect(() => {
    if (!apiKey) return
    if (!containerRef.current) return
    let cancelled = false
    let map: google.maps.Map | null = null
    let infoWindow: google.maps.InfoWindow | null = null
    const markers: google.maps.Marker[] = []

    loadMaps(apiKey)
      .then((g) => {
        if (cancelled || !containerRef.current) return
        map = new g.maps.Map(containerRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: center.zoom,
          styles: MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          backgroundColor: '#f5f0e6',
        })
        infoWindow = new g.maps.InfoWindow({ maxWidth: 260 })

        for (const p of points) {
          const marker = new g.maps.Marker({
            position: { lat: p.lat, lng: p.lng },
            map,
            title: p.nom,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: COLORS[p.type],
              fillOpacity: 1,
              strokeColor: '#f5f0e6',
              strokeWeight: 2.5,
            },
          })
          marker.addListener('click', () => {
            if (!infoWindow || !map) return
            const sub = p.sousTitre ? `<div style="font-size:11px;color:#5b5445;margin-top:2px">${escapeHtml(p.sousTitre)}</div>` : ''
            infoWindow.setContent(`
              <div style="font-family:'DM Sans',sans-serif;padding:4px 2px 2px;min-width:180px">
                <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS[p.type]};margin-bottom:4px">${LABEL[p.type]}</div>
                <div style="font-family:'Fraunces',serif;font-weight:300;font-size:16px;color:#0f3d2e;line-height:1.25">${escapeHtml(p.nom)}</div>
                ${sub}
                <a href="${escapeAttr(p.href)}" style="display:inline-block;margin-top:10px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#0f3d2e;border-bottom:1px solid #c9a961;padding-bottom:2px;text-decoration:none">Voir la fiche →</a>
              </div>
            `)
            infoWindow.open({ map, anchor: marker })
          })
          markers.push(marker)
        }

        setReady(true)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })

    return () => {
      cancelled = true
      markers.forEach((m) => m.setMap(null))
      infoWindow?.close()
    }
  }, [apiKey, center.lat, center.lng, center.zoom, points])

  // Fallback quand la clé publique Maps n'est pas configurée.
  if (!apiKey) {
    return <MapFallback villeLabel={villeLabel} points={points} reason="missing-key" />
  }
  if (authFailed) {
    return <MapFallback villeLabel={villeLabel} points={points} reason="auth-error" />
  }
  if (error) {
    return <MapFallback villeLabel={villeLabel} points={points} reason="load-error" />
  }

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-sm border border-or/20 bg-creme">
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-creme-soft">
          <span className="text-[11px] tracking-[0.22em] text-or-deep uppercase">
            Chargement de la carte…
          </span>
        </div>
      )}
      <Legend />
    </div>
  )
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-5 left-5 z-10 inline-flex items-center gap-4 rounded-full bg-blanc/90 px-4 py-2 text-[10px] tracking-[0.18em] text-vert uppercase backdrop-blur">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS.prestataire }} />
        Prestataires
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS.lieu }} />
        Lieux
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS.evenement }} />
        Événements
      </span>
    </div>
  )
}

function MapFallback({
  villeLabel,
  points,
  reason,
}: {
  villeLabel: string
  points: MapPoint[]
  reason: 'missing-key' | 'load-error' | 'auth-error'
}) {
  const counts = points.reduce(
    (acc, p) => {
      acc[p.type] += 1
      return acc
    },
    { prestataire: 0, lieu: 0, evenement: 0 } as Record<MapPoint['type'], number>,
  )
  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-sm border border-or/20 bg-gradient-to-br from-creme-soft via-creme to-creme-deep">
      <div className="absolute inset-0 bg-grain opacity-[0.12]" />
      <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
        <p className="overline text-or">Carte interactive — {villeLabel}</p>
        <h3 className="mt-4 max-w-md font-serif text-3xl font-light leading-tight text-vert">
          {reason === 'missing-key'
            ? 'La carte sera bientôt là.'
            : 'Carte temporairement indisponible.'}
        </h3>
        <p className="mt-3 max-w-sm text-[13px] leading-[1.65] text-texte-sec">
          {reason === 'missing-key'
            ? 'En attendant, on a déjà '
            : 'Réessaie dans un moment. On a déjà '}
          <strong className="text-vert">{counts.prestataire}</strong> prestataire
          {counts.prestataire > 1 ? 's' : ''},{' '}
          <strong className="text-or-deep">{counts.lieu}</strong> lieu
          {counts.lieu > 1 ? 'x' : ''} et{' '}
          <strong className="text-texte">{counts.evenement}</strong> événement
          {counts.evenement > 1 ? 's' : ''} à découvrir dans ta zone.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/annuaire"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-vert px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:bg-vert hover:text-creme"
          >
            L&apos;annuaire →
          </Link>
          <Link
            href="/recommandations"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-or px-5 text-[11px] font-medium tracking-[0.22em] text-or-deep uppercase transition-colors hover:bg-or hover:text-vert"
          >
            Les lieux →
          </Link>
        </div>
      </div>
    </div>
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function escapeAttr(s: string) {
  return escapeHtml(s)
}
