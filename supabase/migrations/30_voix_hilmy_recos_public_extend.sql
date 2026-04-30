-- =====================================================================
-- HILMY · 30 — voix_hilmy_recos_public : ajout 4 colonnes pour rendu
--                                        UI page perso créatrice
--
-- Étend la vue voix_hilmy_recos_public (mig 27) avec 4 nouvelles
-- colonnes nécessaires au rendu de la page perso créatrice mobile
-- (commit 7a du brief Voix Hilmy) :
--
--   • place_main_photo_url   — image hero de la card reco type='place'
--   • place_hilmy_category   — badge catégorie sur la card reco type='place'
--   • profile_photo_url      — image hero de la card reco type='prestataire'
--                              (extraite de profiles.galerie[0] qui est
--                              un array jsonb de URLs strings, format
--                              audité 30/04/2026)
--   • profile_categorie      — badge catégorie sur la card reco type='prestataire'
--
-- Auditer pré-mig confirmé :
--   - profiles.galerie est jsonb array de strings (URLs directes)
--   - galerie->>0 retourne la 1ʳᵉ URL en text, ou NULL si array vide/null
--   - Pas besoin de COALESCE explicite (NULL->>0 = NULL nativement)
--
-- ╔════════════════════════════════════════════════════════════════╗
-- ║ ⚠️ AVERTISSEMENT — VUE EXPOSÉE PUBLIQUEMENT À ANON ⚠️           ║
-- ║                                                                ║
-- ║ Vue SECURITY DEFINER (security_invoker = false). Toute colonne ║
-- ║ ajoutée au SELECT devient publique. Les 4 nouvelles colonnes   ║
-- ║ sont déjà publiques par design :                               ║
-- ║   - main_photo_url : URL Supabase Storage public bucket        ║
-- ║   - hilmy_category : slug catégorie public                     ║
-- ║   - galerie[0] : URL Supabase Storage public bucket            ║
-- ║   - categorie : slug catégorie public                          ║
-- ║                                                                ║
-- ║ ⚠️ Le linter 0010_security_definer_view va flagger cette vue   ║
-- ║ comme déjà au commit 26/27 — volontaire (cf. doc admin).       ║
-- ╚════════════════════════════════════════════════════════════════╝
--
-- Filtres existants PRÉSERVÉS à l'identique (mig 27) :
--   - r.status = 'published'
--   - r.comment is not null AND length(trim(r.comment)) > 0
--   - r.user_id IN voix actives avec slug
--   - LEFT JOIN profiles AND pr.status = 'approved'
--   - LEFT JOIN places sans filtre additionnel (pas de status sur places)
--
-- Idempotent (CREATE OR REPLACE). Rollback dédié recopie l'état mig 27
-- inline.
-- =====================================================================

-- ⚠️ Contrainte PG : CREATE OR REPLACE VIEW autorise uniquement
-- l'ajout de colonnes À LA FIN de la liste existante (mig 27).
-- Insérer une colonne au milieu → erreur 42P16. C'est pourquoi
-- les 4 nouvelles colonnes (place_main_photo_url, place_hilmy_category,
-- profile_photo_url, profile_categorie) sont en positions 14-17 et
-- non groupées avec leurs cousines place_*/profile_* respectives.
-- Tradeoff lisibilité < garantie atomique (grants préservés via REPLACE).

create or replace view public.voix_hilmy_recos_public
with (security_invoker = false) as
select
  -- Colonnes mig 27 (positions 1-13, ordre figé par PG)
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
  pr.slug as profile_slug,
  -- Colonnes mig 30 (positions 14-17, ajoutées en fin obligatoire)
  p.main_photo_url as place_main_photo_url,
  p.hilmy_category as place_hilmy_category,
  pr.galerie ->> 0 as profile_photo_url,
  pr.categorie as profile_categorie
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

-- ─── Grants : strictement SELECT à anon, authenticated, service_role
-- CREATE OR REPLACE VIEW préserve les grants existants en théorie,
-- mais on les repose explicitement pour idempotence et rejouabilité.
revoke all on public.voix_hilmy_recos_public from public;
grant select on public.voix_hilmy_recos_public to anon, authenticated, service_role;

-- ─── Comment (visible dans pg_views.viewdef) ────────────────────
comment on view public.voix_hilmy_recos_public is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée publiquement à anon (SSR site + app mobile). Liste des recos publiées par les Voix Hilmy actives, joint avec places ou profiles selon type. Filtres : status=published, comment non-vide, auteur=Voix avec slug. profile filtré sur status=approved (LEFT JOIN, NULL si non-approved → frontend skip). place sans filtre (la table n''a pas de colonne status). Le frontend doit gérer place_slug/profile_slug NULL. 17 colonnes (mig 30) — étendu vs mig 27 avec place_main_photo_url, place_hilmy_category, profile_photo_url (galerie->>0), profile_categorie. Ne JAMAIS ajouter user_id de l''auteur, admin_notes, source_import, ou toute donnée privée de recommendations / places / profiles.';

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/30_voix_hilmy_recos_public_extend_rollback.sql
-- =====================================================================
