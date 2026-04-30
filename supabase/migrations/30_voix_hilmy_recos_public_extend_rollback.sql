-- =====================================================================
-- HILMY · 30 — ROLLBACK extend voix_hilmy_recos_public
--
-- Restaure la vue à son état mig 27 (13 colonnes au lieu de 17).
-- Auto-suffisant : SQL recopié inline depuis mig 27, pas d'INCLUDE.
--
-- ⚠️ Pré-check :
--   - Vérifier qu'aucun code applicatif (Next.js, Expo) ne lit les 4
--     colonnes ajoutées : place_main_photo_url, place_hilmy_category,
--     profile_photo_url, profile_categorie. Un grep dans hilmy-muslim
--     et hilmy-mobile suffit. Si du code en dépend, le rollback
--     plantera côté front (column does not exist).
--
-- ──────────────────────────────────────────────────────────────────
-- ORDRE D'EXÉCUTION :
--   Ce fichier seul. La vue n'a pas de dépendances inverses (rien
--   ne pointe vers elle au niveau DB).
-- ──────────────────────────────────────────────────────────────────
-- =====================================================================

create or replace view public.voix_hilmy_recos_public
with (security_invoker = false) as
select
  r.id,
  r.user_id as voix_user_id,
  r.type,
  r.comment,
  r.created_at,
  -- place data : NULL si type='prestataire' ou si place supprimé
  p.id as place_id,
  p.name as place_name,
  p.city as place_city,
  p.slug as place_slug,
  -- profile data : NULL si type='place' ou si profile.status != 'approved'
  pr.id as profile_id,
  pr.nom as profile_nom,
  pr.ville as profile_ville,
  pr.slug as profile_slug
from public.recommendations r
left join public.places p
  on p.id = r.place_id
left join public.profiles pr
  on pr.id = r.profile_id
  and pr.status = 'approved'
where r.status = 'published'
  and r.comment is not null
  and length(trim(r.comment)) > 0
  and r.user_id in (
    select up.user_id
    from public.user_profiles up
    where up.is_voix_hilmy = true
      and up.voix_hilmy_slug is not null
  );

revoke all on public.voix_hilmy_recos_public from public;
grant select on public.voix_hilmy_recos_public to anon, authenticated, service_role;

comment on view public.voix_hilmy_recos_public is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée publiquement à anon (SSR site + app mobile). Liste des recos publiées par les Voix Hilmy actives, joint avec places ou profiles selon type. Filtres : status=published, comment non-vide, auteur=Voix avec slug. profile filtré sur status=approved (LEFT JOIN, NULL si non-approved → frontend skip). place sans filtre (la table n''a pas de colonne status). Le frontend doit gérer place_slug/profile_slug NULL. Ne JAMAIS ajouter user_id de l''auteur, admin_notes, source_import, ou toute donnée privée.';
