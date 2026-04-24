import { redirect } from 'next/navigation'

// Legacy /reinitialiser-mot-de-passe → redirect vers /auth/reinitialiser-mot-de-passe.
// Les liens recovery dans les emails Brevo pointent historiquement vers cette route.
export default function ReinitialiserMotDePasseLegacyRedirect() {
  redirect('/auth/reinitialiser-mot-de-passe')
}
