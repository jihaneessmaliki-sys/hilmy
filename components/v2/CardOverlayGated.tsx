import type { ReactNode } from 'react'
import Link from 'next/link'

interface CardOverlayGatedProps {
  /** Placeholder content (lorem ipsum, faux numéros, faux avis) à flouter. NE PAS passer le vrai contenu privé ici — il atterrirait dans le HTML anonyme. */
  children: ReactNode
  /** Nom de la prestataire pour personnaliser le wording overlay. */
  prestataireNom?: string
  /** Variante UX pour adapter le texte CTA. */
  variant?: 'avis' | 'contact' | 'rdv'
  /** Override complet du texte overlay (sinon construit depuis variant + prestataireNom). */
  ctaText?: string
}

function defaultCtaText(variant: CardOverlayGatedProps['variant'], nom?: string) {
  const cible = nom ?? 'cette adresse'
  switch (variant) {
    case 'avis':
      return `Inscris-toi gratuitement pour lire les avis sur ${cible} et plein d'autres adresses sur Hilmy`
    case 'rdv':
      return `Inscris-toi gratuitement pour prendre rendez-vous avec ${cible} et plein d'autres adresses sur Hilmy`
    case 'contact':
    default:
      return `Inscris-toi gratuitement pour contacter ${cible} et plein d'autres adresses sur Hilmy`
  }
}

/**
 * Card-overlay gating pour le contenu privé des fiches prestataires
 * (avis détaillés, contacts whatsapp/email/téléphone, lien RDV).
 *
 * SÉCURITÉ — Le contenu privé n'arrive JAMAIS jusqu'à ce composant pour
 * un visiteur anonyme : le fetch côté server (getPublicPrestataire)
 * exclut whatsapp/email/phone_public/prendre_rdv_url du SELECT. Les
 * `children` ici sont des PLACEHOLDERS visuels (lorem ipsum, faux
 * numéros), pas du vrai contenu floutté en CSS.
 */
export function CardOverlayGated({
  children,
  prestataireNom,
  variant = 'contact',
  ctaText,
}: CardOverlayGatedProps) {
  const text = ctaText ?? defaultCtaText(variant, prestataireNom)

  return (
    <div className="relative overflow-hidden rounded-sm border border-or/15 bg-blanc">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none blur-md"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-creme/90 p-6 md:p-10">
        <div className="max-w-md text-center">
          <p className="font-serif text-[clamp(1.15rem,2.5vw,1.5rem)] font-light leading-snug text-vert">
            {text}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-block rounded-full bg-or px-10 py-3 text-[14px] font-semibold text-vert transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)]"
            >
              S&apos;inscrire gratuitement
            </Link>
            <Link
              href="/auth/login"
              className="text-[12px] text-texte-sec transition-colors hover:text-or"
            >
              Déjà membre&nbsp;? Connecte-toi
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
