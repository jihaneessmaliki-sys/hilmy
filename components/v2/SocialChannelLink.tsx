'use client'

import type { ReactNode } from 'react'
import type { SocialKey } from '@/lib/social-channels'

/**
 * Mapping SocialKey (front) → contact_type (DB / API).
 * Doit rester aligné avec lib/tracking.ts CONTACT_TYPES et la
 * contrainte CHECK de profile_contacts.contact_type.
 */
const TRACK_TYPE_BY_KEY: Record<SocialKey, string> = {
  whatsapp: 'whatsapp',
  phone_public: 'phone',
  email: 'email',
  instagram: 'instagram',
  tiktok: 'tiktok',
  linkedin: 'linkedin',
  facebook: 'facebook',
  youtube: 'youtube',
  site_web: 'website',
}

interface Props {
  href: string
  channelKey: SocialKey
  profileId: string | null
  isExternal: boolean
  className?: string
  children: ReactNode
}

/**
 * Wrapper client autour d'un <a> de SocialChannelsButtons. Lance un POST
 * /api/track/contact en pré-clic (fire-and-forget) puis laisse le navigateur
 * suivre le lien normalement.
 *
 * Si profileId est null (mode preview / mock), on skip le tracking.
 */
export function SocialChannelLink({
  href,
  channelKey,
  profileId,
  isExternal,
  className,
  children,
}: Props) {
  const handleClick = () => {
    if (!profileId) return
    const contactType = TRACK_TYPE_BY_KEY[channelKey]
    if (!contactType) return

    fetch('/api/track/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_id: profileId,
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
    >
      {children}
    </a>
  )
}
