/** @type {import('next').NextConfig} */

// Content-Security-Policy en mode REPORT-ONLY pendant 24-48h.
// Une fois les violations observées via /api/csp-report, on bascule
// "Content-Security-Policy-Report-Only" -> "Content-Security-Policy".
//
// 'unsafe-inline' + 'unsafe-eval' restent nécessaires tant qu'on n'a pas
// migré le rendu vers des nonces (Next 16 supporte les nonces via proxy.ts,
// chantier ultérieur).
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://www.googletagmanager.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://places.googleapis.com https://va.vercel-scripts.com",
  "frame-src 'self' https://www.google.com https://www.youtube.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
].join('; ')

const reportToHeader = JSON.stringify({
  group: 'csp-endpoint',
  max_age: 10886400,
  endpoints: [{ url: '/api/csp-report' }],
})

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  { key: 'Report-To', value: reportToHeader },
  { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
]

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },

  /**
   * Redirects V1 → V2 (Stage 9 · chantier 1B).
   * permanent: true = HTTP 308 (équivalent moderne de 301 — préserve la
   * méthode HTTP, même sémantique de permanence pour le SEO et le cache).
   * NE PAS ajouter /proposer-un-evenement ici — traité dans le chantier 2A.
   */
  async redirects() {
    return [
      // Annuaire prestataires
      { source: '/prestataires', destination: '/annuaire', permanent: true },
      {
        source: '/prestataire/:slug',
        destination: '/prestataire-v2/:slug',
        permanent: true,
      },
      // Lieux recommandés
      {
        source: '/bonnes-adresses',
        destination: '/recommandations',
        permanent: true,
      },
      {
        source: '/lieu/:id',
        destination: '/recommandation/:id',
        permanent: true,
      },
      // Événements
      { source: '/evenements', destination: '/evenements-v2', permanent: true },
      {
        source: '/evenement/:id',
        destination: '/evenement-v2/:id',
        permanent: true,
      },
      // Dashboards
      {
        source: '/mon-compte',
        destination: '/dashboard/utilisatrice',
        permanent: true,
      },
      {
        source: '/mon-profil-prestataire',
        destination: '/dashboard/prestataire',
        permanent: true,
      },
      // Flows utilisatrice
      {
        source: '/recommander',
        destination: '/dashboard/utilisatrice/recommandations/nouvelle',
        permanent: true,
      },
      {
        source: '/proposer-un-evenement',
        destination: '/dashboard/utilisatrice/evenements/nouveau',
        permanent: true,
      },
      // Catégories : variable → query param
      {
        source: '/categorie/:slug',
        destination: '/annuaire?categorie=:slug',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
