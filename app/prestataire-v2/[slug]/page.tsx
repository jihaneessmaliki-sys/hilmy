import { permanentRedirect } from 'next/navigation'

/**
 * Legacy route — Sprint 7bis C2 : l'URL canonique a migré vers
 * /prestataires/{slug}. Ce redirect server-side double le redirect
 * Next.js déclaré dans next.config.js (defense in depth).
 *
 * Le sous-path /prestataire-v2/{slug}/avis/nouveau reste actif jusqu'à
 * portage Sprint 8 — il a son propre page.tsx non touché.
 */
export default async function LegacyPrestataireV2Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  permanentRedirect(`/prestataires/${slug}`)
}
