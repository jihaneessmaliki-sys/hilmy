/**
 * Canaux de contact prestataire.
 * - `key` correspond à la colonne DB de `public.profiles`.
 * - `toUrl(value)` convertit le contenu stocké (username, URL ou numéro)
 *   en URL cliquable (avec pattern approprié par plateforme).
 * - `label` affiché côté UI + CTA public ("Lui écrire sur Instagram").
 */
export type SocialKey =
  | 'whatsapp'
  | 'phone_public'
  | 'email'
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'facebook'
  | 'youtube'
  | 'site_web'

export interface SocialChannel {
  key: SocialKey
  label: string
  ctaLabel: string
  /** Placeholder affiché dans le form */
  placeholder: string
  /** Hint affiché sous le champ */
  hint?: string
  /** Construit l'URL cliquable à partir de la valeur stockée */
  toUrl: (value: string) => string
  /** Affiché comme "handle" dans le bouton public (optionnel) */
  displayValue?: (value: string) => string
}

function stripLeadingAt(s: string) {
  return s.replace(/^@/, '').trim()
}

function ensureHttp(s: string) {
  const trimmed = s.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function stripUrlPrefix(s: string, domains: string[]) {
  let out = s.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  for (const d of domains) {
    if (out.toLowerCase().startsWith(d)) {
      out = out.slice(d.length)
      break
    }
  }
  return stripLeadingAt(out).replace(/\/$/, '')
}

export const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    ctaLabel: 'Lui écrire sur WhatsApp',
    placeholder: '+41 79 123 45 67',
    hint: 'Format international avec l\'indicatif pays (+41, +33, …).',
    toUrl: (v) => {
      const digits = v.replace(/[^\d]/g, '')
      return `https://wa.me/${digits}`
    },
    displayValue: (v) => v,
  },
  {
    key: 'phone_public',
    label: 'Téléphone',
    ctaLabel: 'L\'appeler',
    placeholder: '+41 22 123 45 67',
    hint: 'Uniquement si différent de ton WhatsApp.',
    toUrl: (v) => `tel:${v.replace(/\s/g, '')}`,
    displayValue: (v) => v,
  },
  {
    key: 'email',
    label: 'Email',
    ctaLabel: 'Lui écrire un email',
    placeholder: 'toi@exemple.com',
    toUrl: (v) => `mailto:${v.trim()}`,
    displayValue: (v) => v,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    ctaLabel: 'La suivre sur Instagram',
    placeholder: 'claire.martin  ou  https://instagram.com/claire.martin',
    hint: 'Username sans le @.',
    toUrl: (v) => `https://instagram.com/${stripUrlPrefix(v, ['instagram.com/', 'instagram.com'])}`,
    displayValue: (v) => `@${stripUrlPrefix(v, ['instagram.com/', 'instagram.com'])}`,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    ctaLabel: 'La suivre sur TikTok',
    placeholder: 'claire.martin  ou  https://tiktok.com/@claire.martin',
    toUrl: (v) => {
      const handle = stripUrlPrefix(v, ['tiktok.com/@', 'tiktok.com/', 'tiktok.com'])
      return `https://tiktok.com/@${handle}`
    },
    displayValue: (v) =>
      `@${stripUrlPrefix(v, ['tiktok.com/@', 'tiktok.com/', 'tiktok.com'])}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    ctaLabel: 'Découvrir son profil LinkedIn',
    placeholder: 'https://linkedin.com/in/claire-martin',
    toUrl: (v) => ensureHttp(v),
  },
  {
    key: 'facebook',
    label: 'Facebook',
    ctaLabel: 'Sa page Facebook',
    placeholder: 'https://facebook.com/claire.martin',
    toUrl: (v) => ensureHttp(v),
  },
  {
    key: 'youtube',
    label: 'YouTube',
    ctaLabel: 'Sa chaîne YouTube',
    placeholder: 'https://youtube.com/@clairemartin',
    toUrl: (v) => ensureHttp(v),
  },
  {
    key: 'site_web',
    label: 'Site web',
    ctaLabel: 'Visiter son site',
    placeholder: 'https://www.claremartin.ch',
    toUrl: (v) => ensureHttp(v),
    displayValue: (v) =>
      v.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''),
  },
]

export const SOCIAL_BY_KEY: Record<SocialKey, SocialChannel> =
  Object.fromEntries(SOCIAL_CHANNELS.map((c) => [c.key, c])) as Record<
    SocialKey,
    SocialChannel
  >
