'use client'

import type { ReactNode } from 'react'
import type { PlaceContactType } from '@/lib/tracking'

interface Props {
  /** URL de destination du clic (ex. https://maps.google.com/?q=…). */
  href: string
  /** UUID du lieu pour le tracking. Si null, le clic n'est pas tracké
   *  (mode preview / mock). */
  placeId: string | null
  /** Canal cliqué — doit matcher un slug PLACE_CONTACT_TYPES (mig 41). */
  contactType: PlaceContactType
  /** Cible externe (target=_blank) ou interne. */
  isExternal?: boolean
  className?: string
  ariaLabel?: string
  children: ReactNode
}

/**
 * Wrapper client autour d'un <a> sur la fiche lieu publique. Lance un POST
 * /api/track/place-contact en pré-clic (fire-and-forget) puis laisse le
 * navigateur suivre le lien normalement.
 *
 * Mirror de <SocialChannelLink /> côté prestataires.
 *
 * Si placeId est null (mode preview / mock), on skip le tracking.
 */
export function PlaceContactLink({
  href,
  placeId,
  contactType,
  isExternal = true,
  className,
  ariaLabel,
  children,
}: Props) {
  const handleClick = () => {
    if (!placeId) return

    fetch('/api/track/place-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place_id: placeId,
        contact_type: contactType,
      }),
      keepalive: true,
    }).catch(() => {
      // Silencieux : le tracking ne doit jamais bloquer un clic.
    })
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  )
}
