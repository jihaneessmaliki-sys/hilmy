import { redirect } from 'next/navigation'

// Legacy /inscription → redirect vers la version V2 /auth/signup.
// Préserve les anciens liens (newsletters, bookmarks, emails transactionnels).
export default function InscriptionLegacyRedirect() {
  redirect('/auth/signup')
}
