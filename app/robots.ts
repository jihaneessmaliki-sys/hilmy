import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.hilmy.io'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/auth/',
          '/api/',
          '/admin/',
          '/onboarding/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
