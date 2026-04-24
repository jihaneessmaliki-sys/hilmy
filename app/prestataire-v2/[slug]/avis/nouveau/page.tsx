import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPrestataireBySlug } from '@/lib/supabase/queries/prestataires'
import { AvisForm } from './AvisForm'

export default async function AvisNouveauPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: presta, error } = await getPrestataireBySlug(slug)
  if (error || !presta) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Non connectée : redirect signup avec retour
  if (!user) {
    const redirectTo = `/prestataire-v2/${slug}/avis/nouveau`
    redirect(`/auth/signup?redirect=${encodeURIComponent(redirectTo)}`)
  }

  // Créatrice de la fiche : interdit de s'auto-aviser
  const isOwner = user.id === presta.user_id
  if (isOwner) {
    redirect(`/prestataire-v2/${slug}`)
  }

  return (
    <AvisForm
      profileId={presta.id}
      profileSlug={presta.slug}
      profileNom={presta.nom}
    />
  )
}
