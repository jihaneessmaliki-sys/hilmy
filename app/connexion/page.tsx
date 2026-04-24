import { redirect } from 'next/navigation'

// Legacy /connexion → redirect vers /auth/login.
export default function ConnexionLegacyRedirect() {
  redirect('/auth/login')
}
