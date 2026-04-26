import { redirect } from 'next/navigation'

/**
 * Alias public marketing-friendly du dashboard prestataire.
 * /mon-espace → /dashboard/prestataire
 *
 * La page cible est elle-même auth-guardée via requirePrestataire :
 *  - pas connecté → /auth/login
 *  - connecté mais pas de fiche → /onboarding/prestataire
 *  - connecté + fiche → dashboard rendu
 */
export default function MonEspaceRedirect() {
  redirect('/dashboard/prestataire')
}
