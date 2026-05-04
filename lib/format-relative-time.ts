/**
 * Mini formatter "il y a X" en français, sans dépendance.
 * Suffisant pour le module Je cherche (granularité minute → mois).
 *
 * Exemples :
 *   formatRelativeTime("2026-05-04T16:00:00Z") avec now=16:05 → "il y a 5 min"
 *   formatRelativeTime("2026-05-03...") avec now=2026-05-04 → "il y a 1 jour"
 *   formatRelativeTime("2025-11-...") → "il y a 6 mois"
 */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const ms = nowMs - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return "à l'instant"

  const sec = Math.floor(ms / 1000)
  if (sec < 60) return "à l'instant"

  const min = Math.floor(sec / 60)
  if (min < 60) return `il y a ${min} min`

  const hr = Math.floor(min / 60)
  if (hr < 24) return `il y a ${hr} h`

  const day = Math.floor(hr / 24)
  if (day === 1) return 'hier'
  if (day < 7) return `il y a ${day} jours`

  const week = Math.floor(day / 7)
  if (week < 5) return `il y a ${week} sem.`

  const month = Math.floor(day / 30)
  if (month < 12) return `il y a ${month} mois`

  const year = Math.floor(day / 365)
  return year === 1 ? 'il y a 1 an' : `il y a ${year} ans`
}
