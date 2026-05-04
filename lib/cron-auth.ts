/**
 * Auth helper pour les routes /api/cron/*.
 *
 * Vercel Cron envoie automatiquement le header `Authorization: Bearer ${CRON_SECRET}`
 * où CRON_SECRET est une env var configurée côté Vercel (cf docs Vercel Cron).
 *
 * En l'absence de header valide, retourne `false` -> la route doit
 * répondre 401 sans rien faire.
 */

export function isAuthorizedCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected) {
    // Pas de CRON_SECRET configuré -> on refuse par sécurité
    return false
  }
  const header = request.headers.get('authorization')
  if (!header) return false
  const expectedHeader = `Bearer ${expected}`
  // Comparaison stricte (timing attack résistance non critique pour un cron interne)
  return header === expectedHeader
}
