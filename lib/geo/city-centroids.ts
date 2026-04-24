/**
 * Centroïdes des villes cibles Hilmy (5 pays francophones).
 *
 * Utilisé par la home connectée pour positionner la map au-dessus de
 * la ville de l'utilisatrice, et pour placer les pins des prestataires
 * et events (qui n'ont pas de lat/lng en DB — seulement leur `ville`).
 *
 * Note : on ne "clustere" pas ici. Si plusieurs items partagent la
 * même ville, ils reçoivent le même centre ; l'UI les dispersera
 * légèrement (offset déterministe côté composant).
 */

export type Centroid = {
  lat: number
  lng: number
  /** Zoom recommandé pour cette échelle (11-13 pour une ville). */
  zoom: number
}

/** Normalise pour la lookup : minuscule, accents retirés, espaces trim. */
export function normalizeVille(v: string | null | undefined): string {
  if (!v) return ''
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Forme d'affichage canonique (accents restaurés, capitalisation propre)
 * pour les villes stockées en DB dans des casses hétérogènes ("geneve",
 * "GENEVE", "Genève"). Retourne null si la ville est vide.
 */
const CANONICAL_LABELS: Record<string, string> = {
  geneve: 'Genève',
  lausanne: 'Lausanne',
  zurich: 'Zurich',
  berne: 'Berne',
  bale: 'Bâle',
  fribourg: 'Fribourg',
  neuchatel: 'Neuchâtel',
  sion: 'Sion',
  montreux: 'Montreux',
  nyon: 'Nyon',
  paris: 'Paris',
  lyon: 'Lyon',
  marseille: 'Marseille',
  bordeaux: 'Bordeaux',
  toulouse: 'Toulouse',
  nantes: 'Nantes',
  lille: 'Lille',
  strasbourg: 'Strasbourg',
  bruxelles: 'Bruxelles',
  luxembourg: 'Luxembourg',
  monaco: 'Monaco',
}

export function formatVilleDisplay(
  v: string | null | undefined,
): string | null {
  if (!v) return null
  const key = normalizeVille(v)
  if (!key) return null
  if (CANONICAL_LABELS[key]) return CANONICAL_LABELS[key]
  return v
    .trim()
    .split(/([\s-])/)
    .map((part) =>
      part.length > 1 ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part,
    )
    .join('')
}

const CENTROIDS: Record<string, Centroid> = {
  // Suisse
  geneve: { lat: 46.2044, lng: 6.1432, zoom: 12 },
  lausanne: { lat: 46.5197, lng: 6.6323, zoom: 12 },
  zurich: { lat: 47.3769, lng: 8.5417, zoom: 12 },
  berne: { lat: 46.9481, lng: 7.4474, zoom: 12 },
  bale: { lat: 47.5596, lng: 7.5886, zoom: 12 },
  fribourg: { lat: 46.8065, lng: 7.1618, zoom: 12 },
  neuchatel: { lat: 46.992, lng: 6.931, zoom: 12 },
  sion: { lat: 46.2276, lng: 7.3594, zoom: 12 },
  montreux: { lat: 46.4312, lng: 6.9107, zoom: 13 },
  nyon: { lat: 46.3833, lng: 6.2395, zoom: 13 },
  // France
  paris: { lat: 48.8566, lng: 2.3522, zoom: 12 },
  lyon: { lat: 45.764, lng: 4.8357, zoom: 12 },
  marseille: { lat: 43.2965, lng: 5.3698, zoom: 11 },
  bordeaux: { lat: 44.8378, lng: -0.5792, zoom: 12 },
  toulouse: { lat: 43.6047, lng: 1.4442, zoom: 12 },
  nantes: { lat: 47.2184, lng: -1.5536, zoom: 12 },
  lille: { lat: 50.6292, lng: 3.0573, zoom: 12 },
  strasbourg: { lat: 48.5734, lng: 7.7521, zoom: 12 },
  // Belgique
  bruxelles: { lat: 50.8503, lng: 4.3517, zoom: 12 },
  // Luxembourg
  luxembourg: { lat: 49.6117, lng: 6.13, zoom: 13 },
  // Monaco
  monaco: { lat: 43.7384, lng: 7.4246, zoom: 14 },
}

export const DEFAULT_CENTROID: Centroid = CENTROIDS.geneve

export function getCentroid(ville: string | null | undefined): Centroid {
  const k = normalizeVille(ville)
  return CENTROIDS[k] ?? DEFAULT_CENTROID
}

/**
 * Offset déterministe autour d'un centre (quelques mètres) pour
 * éviter que plusieurs pins même-ville se superposent exactement.
 * Basé sur un hash simple de `seed` pour stabilité au render.
 */
export function offsetPoint(
  center: Centroid,
  seed: string,
  radiusDeg = 0.008,
): { lat: number; lng: number } {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const angle = ((h % 360) * Math.PI) / 180
  const r = radiusDeg * (0.3 + ((Math.abs(h) % 100) / 100) * 0.7)
  return {
    lat: center.lat + r * Math.cos(angle),
    lng: center.lng + r * Math.sin(angle),
  }
}
