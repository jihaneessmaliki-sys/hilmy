import { redirect } from 'next/navigation'

// Legacy /inscription-prestataire → redirect vers /auth/signup?role=prestataire.
// Le toggle V2 détecte ?role=prestataire et pré-sélectionne automatiquement.
export default function InscriptionPrestataireLegacyRedirect() {
  redirect('/auth/signup?role=prestataire')
}
