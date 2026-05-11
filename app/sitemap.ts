import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const SITE_URL = 'https://www.hilmy.io'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/tarifs`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/annuaire`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/evenements-v2`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/confidentialite`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const dynamicRoutes: MetadataRoute.Sitemap = []

  try {
    const admin = createAdminClient()

    const { data: prestataires } = await admin
      .from('profiles')
      .select('slug, updated_at')
      .eq('status', 'approved')
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5000)

    if (prestataires) {
      for (const p of prestataires) {
        if (!p.slug) continue
        dynamicRoutes.push({
          url: `${SITE_URL}/prestataires/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : now,
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    }

    const { data: evenements } = await admin
      .from('events')
      .select('slug, updated_at')
      .eq('status', 'approved')
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (evenements) {
      for (const e of evenements) {
        if (!e.slug) continue
        dynamicRoutes.push({
          url: `${SITE_URL}/evenement-v2/${e.slug}`,
          lastModified: e.updated_at ? new Date(e.updated_at) : now,
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      }
    }
  } catch (err) {
    console.error('[sitemap] dynamic routes fetch failed:', err)
  }

  return [...staticRoutes, ...dynamicRoutes]
}
