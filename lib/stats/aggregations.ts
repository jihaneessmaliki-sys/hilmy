/**
 * Agrégations stats avancées Cercle Pro.
 * Pures fonctions JS sur des arrays de timestamps / villes / lignes.
 *
 * Volume cible : un Cercle Pro très visible peut atteindre quelques k vues
 * sur 30 jours → agrégation client-side acceptable. Si on dépasse 50k, on
 * passera en RPC SQL.
 */

export interface VueRow {
  viewed_at: string
  city: string | null
}

/**
 * Top N villes par nombre de vues sur la fenêtre fournie.
 * Filtre les city null/empty. Tri DESC par compteur.
 */
export function aggregateByVille(
  rows: VueRow[],
  topN: number = 8,
): { ville: string; vues: number }[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const city = r.city?.trim()
    if (!city) continue
    counts.set(city, (counts.get(city) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([ville, vues]) => ({ ville, vues }))
    .sort((a, b) => b.vues - a.vues)
    .slice(0, topN)
}

/**
 * Pics horaires : 24 buckets (00h → 23h) sur la fenêtre.
 * Heure dérivée du timestamp viewed_at en local time UTC (Vercel server).
 * Convention : 00h = minuit, 12h = midi.
 */
export function aggregateByHeure(
  rows: VueRow[],
): { heure: string; vues: number }[] {
  const buckets: number[] = new Array(24).fill(0)
  for (const r of rows) {
    const d = new Date(r.viewed_at)
    if (Number.isNaN(d.getTime())) continue
    const h = d.getUTCHours() // UTC -> simple, agrégat statistique
    buckets[h]++
  }
  return buckets.map((vues, h) => ({
    heure: `${h.toString().padStart(2, '0')}h`,
    vues,
  }))
}

/**
 * Benchmark catégorie : retourne le percentile dans lequel se situe
 * le prestataire par rapport à ses pairs (autres Premium/Cercle Pro
 * de la même catégorie sur la même fenêtre).
 *
 * Exemple : percentile=80 → "tu es dans le top 20%".
 *
 * @param myViews Nombre de vues du prestataire sur la fenêtre
 * @param peerViews Liste des vues de chaque pair (un nombre par pair)
 * @returns null si pas assez de pairs pour calculer un benchmark fiable
 */
export function computeCategoryPercentile(
  myViews: number,
  peerViews: number[],
): number | null {
  if (peerViews.length < 3) return null // pas assez de signal
  const all = [...peerViews, myViews].sort((a, b) => a - b)
  // Position du prestataire (index dernière occurrence pour gérer ex-aequo)
  let pos = -1
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i] === myViews) {
      pos = i
      break
    }
  }
  if (pos === -1) return null
  // Percentile = % de pairs en dessous (inclus le prestataire lui-même)
  return Math.round(((pos + 1) / all.length) * 100)
}

/**
 * Wording UX du benchmark selon le percentile.
 * Voix Sara : tutoiement, encourageant, jamais culpabilisant.
 */
export function benchmarkWording(percentile: number | null): string {
  if (percentile === null) {
    return "Pas encore assez de prestataires comparables dans ta catégorie pour te situer. Reviens dans quelques semaines."
  }
  if (percentile >= 80) {
    return `Tu es dans le top ${100 - percentile}% de ta catégorie. Tu rayonnes — continue comme ça.`
  }
  if (percentile >= 50) {
    return `Tu es au-dessus de la moyenne de ta catégorie (top ${100 - percentile}%). Tu construis quelque chose de solide.`
  }
  if (percentile >= 25) {
    return `Tu es dans la moyenne basse de ta catégorie. Quelques boosts ou un événement bien placé peuvent t'aider à monter.`
  }
  return `Ta visibilité est plus discrète que celle de la majorité de ta catégorie. C'est normal au début — pousse ta fiche, demande des avis aux premières clientes, propose un événement.`
}
