import { redirect } from 'next/navigation'

// Legacy /mot-de-passe-oublie → redirect vers /auth/mot-de-passe-oublie.
export default function MotDePasseOublieLegacyRedirect() {
  redirect('/auth/mot-de-passe-oublie')
}
