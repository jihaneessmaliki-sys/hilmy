/** @type {import('next').NextConfig} */

// Content-Security-Policy en mode REPORT-ONLY pendant 24-48h.
// Une fois les violations observées via /api/csp-report, on bascule
// "Content-Security-Policy-Report-Only" -> "Content-Security-Policy".
//
// 'unsafe-inline' + 'unsafe-eval' restent nécessaires tant qu'on n'a pas
// migré le rendu vers des nonces (Next 16 supporte les nonces via proxy.ts,
// chantier ultérieur).
// Note ffmpeg.wasm (PR-3 vidéo) :
//   - script-src + connect-src incluent unpkg.com pour permettre le
//     chargement du core ffmpeg-core.js + ffmpeg-core.wasm.
//   - worker-src 'self' blob: pour le Web Worker créé par toBlobURL().
//   - L'exécution multi-thread (si crossOriginIsolated=true) requiert
//     COOP+COEP, ajoutés en headers SCOPÉS sur les routes dashboard
//     /dashboard/prestataire/fiche et /dashboard/lieu/[placeId] (cf
//     headers() ci-dessous), pas globalement (sinon casse Maps + iframes).
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://www.googletagmanager.com https://va.vercel-scripts.com https://unpkg.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://places.googleapis.com https://va.vercel-scripts.com https://unpkg.com",
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

/**
 * Headers COOP + COEP scopés (PR-3 vidéo) — activent crossOriginIsolated=true
 * uniquement sur les 2 routes où UploadVideo (ffmpeg.wasm) tourne. Permet
 * SharedArrayBuffer pour la compression multi-thread (3-5× plus rapide).
 *
 * COEP=credentialless (et NON require-corp) : require-corp bloquait les
 * workers internes Turbopack/Next.js qui ne renvoient pas le header
 * Cross-Origin-Resource-Policy. credentialless autorise les ressources
 * cross-origin sans credentials (cookies/auth) sans opt-in CORP, tout en
 * maintenant le cross-origin isolated state nécessaire pour SAB.
 * Compat 2026 : Chrome/Edge 96+, Firefox 119+, Safari 17.4+.
 *
 * NE PAS appliquer globalement : maintient l'isolement Stripe Checkout
 * futur, Google Maps embeds, YouTube iframes hors de ces routes.
 *
 * Vérifié à la création (sprint 3 PR-3 audit) : ces 2 routes n'utilisent
 * NI Maps NI Google Places NI iframes externes — safe.
 */
const crossOriginIsolatedHeaders = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
]

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async headers() {
    return [
      {
        // Routes dashboard avec UploadVideo : ajoute COOP/COEP en plus
        // des headers de sécurité globaux. Doit venir AVANT le bloc
        // global pour que Next.js merge les arrays correctement.
        source: '/dashboard/prestataire/fiche/:path*',
        headers: [...securityHeaders, ...crossOriginIsolatedHeaders],
      },
      {
        source: '/dashboard/lieu/:placeId/:path*',
        headers: [...securityHeaders, ...crossOriginIsolatedHeaders],
      },
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
      // Auth (Sprint 7bis — bookmark legacy)
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true,
      },
      // Dashboard prestataire — URLs intuitives Sprint 7bis
      {
        source: '/dashboard/prestataire/demandes',
        destination: '/dashboard/prestataire/devis',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
