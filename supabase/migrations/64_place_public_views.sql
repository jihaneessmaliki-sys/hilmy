-- =====================================================================
-- HILMY · 64 — Fiche reco PUBLIQUE : deux vues anon-safe pour ouvrir la
--               page /recommandation/[slug] aux visiteurs anonymes (SEO).
--
-- POURQUOI DEUX VUES SECURITY DEFINER (security_invoker=false)
-- RLS de places + recommendations exige auth.uid() IS NOT NULL → anon lit
-- 0 ligne (vérifié prod). Ces vues tournent avec les droits du propriétaire
-- (bypass RLS) et n'exposent QUE des colonnes Hilmy-natives non-perso.
--
-- ⚠️ VUES EXPOSÉES À ANON — toute colonne du SELECT devient publique.
-- Interdits ABSOLUS (réidentifient une autrice) : user_id, prenom, avatar,
-- is_copine, copine_since, gamif, created_by_user_id. L'avatar de l'app est
-- DÉRIVÉ du user_id → ne jamais sortir user_id. nb_copines compte des
-- user_id DISTINCTS sans jamais les exposer.
--
-- Périmètre PR1 : on ouvre le contenu Hilmy DÉJÀ en base. Pas de Google live
-- (horaires/tél = PR membre), pas de photos copines (photo_urls = PR
-- modération). La cover Google (main_photo_url) est conservée telle quelle.
--
-- Idempotent (CREATE OR REPLACE). Rollback : 64_place_public_views_rollback.sql.
-- =====================================================================

-- ─── Vue A : détail public d'un lieu (1 ligne / lieu ayant ≥1 reco publiée)
-- Agrège la note + le prix NATIFS Hilmy (depuis recommendations), jamais
-- Google. N'expose AUCUN uuid de lieu : la clé publique est le slug.
create or replace view public.place_public_detail
with (security_invoker = false) as
select
  p.slug                                            as place_slug,
  p.name                                            as name,
  p.hilmy_category                                  as hilmy_category,
  p.google_category                                 as google_category,
  p.city                                            as city,
  p.country                                         as country,
  p.address                                         as address,
  p.latitude                                        as latitude,
  p.longitude                                       as longitude,
  p.description                                     as description,
  p.main_photo_url                                  as main_photo_url,
  p.photos                                          as photos,
  p.palier                                          as palier,
  p.google_place_id                                 as google_place_id,
  round(avg(r.rating) filter (where r.rating is not null), 1) as avg_rating,
  count(r.rating) filter (where r.rating is not null)        as nb_avis,
  count(distinct r.user_id)                                   as nb_copines,
  mode() within group (order by r.price_indicator)
    filter (where r.price_indicator is not null)             as price_mode
from public.places p
join public.recommendations r
  on r.place_id = p.id
 and r.status = 'published'
 and r.type   = 'place'
where p.slug is not null
group by
  p.slug, p.name, p.hilmy_category, p.google_category, p.city, p.country,
  p.address, p.latitude, p.longitude, p.description, p.main_photo_url,
  p.photos, p.palier, p.google_place_id;

-- ─── Vue B : commentaires publics ANONYMISÉS (1 ligne / reco publiée)
-- AUCUNE colonne identitaire. reco_id = clé React uniquement (la table base
-- reste inaccessible à anon). On joint par slug pour ne sortir aucun uuid de
-- lieu non plus.
create or replace view public.place_public_recos
with (security_invoker = false) as
select
  r.id              as reco_id,
  p.slug            as place_slug,
  r.comment         as comment,
  r.rating          as rating,
  r.tags            as tags,
  r.price_indicator as price_indicator,
  r.created_at      as created_at
from public.recommendations r
join public.places p on p.id = r.place_id
where r.status = 'published'
  and r.type   = 'place'
  and p.slug is not null;

-- ─── Grants : strictement SELECT à anon, authenticated, service_role ──────
-- Supabase accorde TOUS les droits par défaut aux rôles sur les nouveaux
-- objets du schéma public → on révoque puis on n'accorde QUE select.
revoke all on public.place_public_detail from public, anon, authenticated;
revoke all on public.place_public_recos  from public, anon, authenticated;
grant select on public.place_public_detail to anon, authenticated, service_role;
grant select on public.place_public_recos  to anon, authenticated, service_role;

-- ─── Comments de garde (visibles dans pg_views.viewdef) ──────────────────
comment on view public.place_public_detail is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée à anon (fiche publique /recommandation/[slug], SEO). 1 ligne par lieu ayant ≥1 reco publiée. Note + prix NATIFS Hilmy (avg rating, nb_avis, nb_copines=count distinct user_id NON exposé, price_mode). Clé publique = slug, AUCUN uuid de lieu. Ne JAMAIS ajouter user_id, prenom, avatar, is_copine, copine_since, gamif, created_by_user_id.';
comment on view public.place_public_recos is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée à anon (commentaires publics ANONYMISÉS de la fiche). 1 ligne par reco publiée (status=published, type=place). Colonnes : reco_id (clé React), place_slug (jointure), comment (texte tel quel, PR1 sans modération), rating, tags, price_indicator, created_at. Ne JAMAIS ajouter user_id ni photo_urls (PR photos/modération).';

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/64_place_public_views_rollback.sql
-- =====================================================================
