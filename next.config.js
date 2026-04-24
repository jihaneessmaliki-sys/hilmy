/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
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
