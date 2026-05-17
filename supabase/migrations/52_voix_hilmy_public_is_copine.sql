CREATE OR REPLACE VIEW voix_hilmy_public AS
 SELECT user_id, prenom, voix_hilmy_slug AS slug, voix_hilmy_bio AS bio,
    voix_hilmy_activated_at AS activated_at,
    ( SELECT count(*) AS count
           FROM recommendations r
          WHERE r.user_id = up.user_id AND r.status = 'published'::text
            AND r.comment IS NOT NULL
            AND length(TRIM(BOTH FROM r.comment)) > 0) AS recos_count,
    get_voix_followers_count(user_id) AS followers_count,
    is_copine
   FROM user_profiles up
  WHERE is_voix_hilmy = true AND voix_hilmy_slug IS NOT NULL;
