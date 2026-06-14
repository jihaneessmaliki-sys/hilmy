-- =====================================================================
-- HILMY · 67 — PR-c : photos des copines en PUBLIC (« robinet RGPD »).
--               Vue anon-safe dédiée pour exposer les photos membres aux
--               visiteurs anonymes (fiche /recommandation/[slug], SEO).
--
-- POURQUOI UNE VUE DÉDIÉE SECURITY DEFINER (security_invoker=false)
-- `place_user_photos` n'a AUCUNE policy RLS pour anon → anon lit 0 ligne en
-- direct (vérifié prod). Cette vue tourne avec les droits du propriétaire
-- (bypass RLS) et n'expose QUE des colonnes non-identitaires.
--
-- ⚠️ VUE EXPOSÉE À ANON — toute colonne du SELECT devient PUBLIQUE et
-- indexable Google. Interdits ABSOLUS (réidentifient une photographe) :
--   user_id, recommendation_id (corrèle à une reco anonymisée → réidentif),
--   moderation_motif, moderated_at, prenom, avatar.
-- photo_id = id de la LIGNE photo (clé React + cible du signalement),
--   PAS une identité — même statut public que reco_id (vue 64).
--
-- VERROUS :
--   * status = 'published' UNIQUEMENT  → flagged / removed JAMAIS publics.
--   * Source = place_user_photos UNIQUEMENT → JAMAIS l'array legacy
--     recommendations.photo_urls (règle d'or du chantier photos).
--   * Clé publique = slug, jamais d'uuid de lieu.
--
-- Idempotent (CREATE OR REPLACE). Rollback : 67_..._rollback.sql.
-- =====================================================================

-- ─── Vue : photos publiées d'un lieu (1 ligne / photo published) ──────────
-- Galerie agrégée par lieu, DÉTACHÉE des commentaires (pas de
-- recommendation_id) → casse toute corrélation photo↔texte→identité.
create or replace view public.place_public_photos
with (security_invoker = false) as
select
  pup.id           as photo_id,      -- clé React + cible signalement (non-perso)
  p.slug           as place_slug,    -- jointure publique, aucun uuid de lieu
  pup.storage_path as storage_path,  -- chemin SANS user_id (PR-b) ; URL calculée serveur
  pup.created_at   as created_at     -- tri (plus récentes d'abord)
from public.place_user_photos pup
join public.places p on p.id = pup.place_id
where pup.status = 'published'       -- flagged / removed exclus structurellement
  and p.slug is not null;

-- ─── Grants : strictement SELECT (Supabase accorde tout par défaut) ───────
revoke all on public.place_public_photos from public, anon, authenticated;
grant select on public.place_public_photos to anon, authenticated, service_role;

-- ─── Comment de garde (visible dans pg_views.viewdef) ─────────────────────
comment on view public.place_public_photos is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée à anon (galerie photos communauté de la fiche publique, SEO). 1 ligne par photo place_user_photos status=published. Colonnes : photo_id (clé React + cible signalement), place_slug (jointure), storage_path (chemin sans user_id, URL calculée serveur), created_at. Source = place_user_photos UNIQUEMENT (jamais recommendations.photo_urls legacy). Ne JAMAIS ajouter user_id, recommendation_id, moderation_motif, moderated_at, prenom, avatar. Seules les published sortent.';

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/67_place_public_photos_rollback.sql
-- =====================================================================
