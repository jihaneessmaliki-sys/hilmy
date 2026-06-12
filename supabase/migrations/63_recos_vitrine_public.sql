-- =====================================================================
-- HILMY · 63 — recos_vitrine_public : couche publique anon-safe des
--                                     recommandations de lieux
--
-- POURQUOI UNE VUE SECURITY DEFINER
-- RLS de recommendations exige auth.uid() IS NOT NULL → anon lit 0 ligne
-- (vérifié prod : recommendations=0, places=0 en clé anon). Impossible de
-- lire la table côté public. Cette vue tourne avec les droits du
-- propriétaire (bypass RLS) et n'expose QUE des colonnes non-perso.
--
-- ⚠️ VUE EXPOSÉE À ANON — toute colonne du SELECT devient publique.
-- Interdits : user_id, comment, photo_urls, email, address, admin_notes,
-- et le nom de batch BRUT (source_import). On expose à la place un
-- booléen dérivé is_user_reco.
--
-- Idempotent (CREATE OR REPLACE). Rollback : 63_recos_vitrine_public_rollback.sql.
-- =====================================================================

create or replace view public.recos_vitrine_public
with (security_invoker = false) as
select
  p.slug           as place_slug,
  p.name           as place_name,
  p.city           as place_city,
  p.hilmy_category as place_hilmy_category,
  r.rating         as rating,
  r.created_at     as created_at,
  (r.source_import = 'user') as is_user_reco
from public.recommendations r
join public.places p on p.id = r.place_id
where r.status = 'published'
  and r.type   = 'place'
  and r.rating is not null;

-- ─── Grants : strictement SELECT à anon, authenticated, service_role ──
-- ⚠️ On révoque aussi explicitement de anon/authenticated : Supabase leur
-- accorde TOUS les droits par défaut (ALTER DEFAULT PRIVILEGES) sur les
-- nouveaux objets du schéma public. `revoke … from public` ne suffit pas
-- (droits accordés directement aux rôles, pas via public). La vue est de
-- toute façon non-modifiable (JOIN + colonne calculée), mais on durcit
-- pour garantir : anon ne peut QUE lire cette vue, rien d'écrire.
revoke all on public.recos_vitrine_public from public, anon, authenticated;
grant select on public.recos_vitrine_public to anon, authenticated, service_role;

-- ─── Comment (visible dans pg_views.viewdef) ─────────────────────────
comment on view public.recos_vitrine_public is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée à anon (SSR landing « Les copines recommandent » + couche publique réutilisable). Recos de lieux publiées jointes à places. Colonnes 100% non-perso : place_slug/name/city/hilmy_category, rating, created_at, is_user_reco (booléen dérivé). Filtres : status=published, type=place, rating non-null. is_user_reco=true ⇒ « Une copine recommande » ; false ⇒ seed éditorial « Sélection Hilmy ». Ne JAMAIS ajouter user_id, comment, photo_urls, address, admin_notes, ni source_import brut (nom de batch interne).';

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/63_recos_vitrine_public_rollback.sql
-- =====================================================================
