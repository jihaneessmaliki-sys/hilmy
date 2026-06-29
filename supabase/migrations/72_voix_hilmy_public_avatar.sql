-- =====================================================================
-- HILMY · 72 — avatar_url sur la vue voix_hilmy_public
--
-- Expose la photo de profil (user_profiles.avatar_url) sur la vue publique
-- des Créatrices, pour l'afficher sur leur profil créatrice + les cartes.
-- CREATE OR REPLACE en AJOUTANT la colonne EN FIN de SELECT (ordre des
-- colonnes existantes inchangé → remplacement de vue autorisé). Idempotent.
-- Reprend exactement la def de la migration 52 + avatar_url.
-- =====================================================================

CREATE OR REPLACE VIEW voix_hilmy_public AS
 SELECT user_id, prenom, voix_hilmy_slug AS slug, voix_hilmy_bio AS bio,
    voix_hilmy_activated_at AS activated_at,
    ( SELECT count(*) AS count
           FROM recommendations r
          WHERE r.user_id = up.user_id AND r.status = 'published'::text
            AND r.comment IS NOT NULL
            AND length(TRIM(BOTH FROM r.comment)) > 0) AS recos_count,
    get_voix_followers_count(user_id) AS followers_count,
    is_copine,
    avatar_url
   FROM user_profiles up
  WHERE is_voix_hilmy = true AND voix_hilmy_slug IS NOT NULL;
