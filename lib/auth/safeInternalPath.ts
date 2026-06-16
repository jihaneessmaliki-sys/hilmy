// =====================================================================
// HILMY · safeInternalPath — garde-fou anti open-redirect
//
// Revue hilmy-security 2026-06-16 (🔴 bloquant) : /auth/callback
// interpolait `next` brut dans NextResponse.redirect → open-redirect,
// vecteur de phishing une fois couplé au magic-link (session établie
// puis renvoi sur un domaine attaquant).
//
// Cette fonction n'accepte QUE des chemins internes "propres" :
//   • doit commencer par un seul "/"
//   • refuse "//" et "/\" (protocol-relative / backslash bypass)
//   • refuse tout ":" (schémas "https:", "javascript:", "data:"…)
//   • refuse tout "\" (backslash)
//   • allowlist de préfixes attendus
// Toute valeur non conforme → `fallback`.
//
// À appliquer sur TOUT param de redirection consommé par le callback
// (`next` ET `redirect`). Ne JAMAIS interpoler un param brut.
// =====================================================================

/** Préfixes de chemins internes autorisés en redirection post-auth. */
export const ALLOWED_REDIRECT_PREFIXES = [
  '/tarifs',
  '/onboarding',
  '/mon-compte',
  '/mon-profil-prestataire',
  '/dashboard',
  '/reinitialiser-mot-de-passe',
  '/connexion',
] as const

/**
 * Retourne `raw` s'il s'agit d'un chemin interne sûr et autorisé,
 * sinon `fallback`.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) return fallback
  // 1. Chemin relatif (un seul "/" en tête).
  if (!raw.startsWith('/')) return fallback
  // 2. Pas de protocol-relative ni de backslash bypass.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  // 3. Aucun schéma absolu (javascript:, data:, https:…).
  if (raw.includes(':')) return fallback
  // 4. Aucun backslash (normalisé en "/" par certains navigateurs).
  if (raw.includes('\\')) return fallback
  // 5. Doit matcher un préfixe autorisé (chemin exact, ?query ou /sous-chemin).
  const ok = ALLOWED_REDIRECT_PREFIXES.some(
    (p) => raw === p || raw.startsWith(p + '?') || raw.startsWith(p + '/'),
  )
  return ok ? raw : fallback
}
