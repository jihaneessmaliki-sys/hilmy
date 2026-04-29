-- =====================================================================
-- HILMY · 25 — ROLLBACK migration voix_hilmy_follows
--
-- ⚠️ Pré-check avant toute action :
--   Vérifier le nombre de follows actifs. Le rollback détruit la table
--   (donc TOUS les follows). Si tu veux préserver l'historique, exporte
--   d'abord :
--
--       SELECT
--         f.id, f.created_at,
--         follower.prenom AS follower_prenom,
--         voix.prenom     AS voix_prenom,
--         voix.voix_hilmy_slug
--       FROM public.voix_hilmy_follows f
--       JOIN public.user_profiles follower
--         ON follower.user_id = f.follower_user_id
--       JOIN public.user_profiles voix
--         ON voix.user_id = f.voix_user_id;
--
-- ──────────────────────────────────────────────────────────────────
-- ORDRE D'EXÉCUTION (à respecter strictement) :
--
--   1. Si une vue ou fonction d'autre migration référence
--      voix_hilmy_follows ou get_voix_followers_count, la drop
--      AVANT (sinon DROP TABLE échouera sans CASCADE).
--      En Phase 1 : aucun consumer externe → rien à faire ici.
--
--   2. Exécuter ce fichier (25_voix_hilmy_follows_rollback.sql).
--
--   3. Si tu rollback aussi la 24, exécute ensuite
--      24_voix_hilmy_rollback.sql. La 25 ne dépend PAS du schéma
--      24 strictement parlant (FK vers auth.users), donc l'ordre
--      24/25 entre eux est libre. La 25 d'abord est plus safe car
--      elle a moins d'impact applicatif (juste les follows, pas
--      les pages publiques).
-- ──────────────────────────────────────────────────────────────────
-- =====================================================================

-- L'ordre suit le DAG inverse de la migration : fonction → policies
-- → indexes → contraintes → table. Note : DROP TABLE seul suffirait
-- (cascade implicite sur policies/indexes/contraintes), mais on
-- explicite pour lisibilité review et symétrie avec la migration.

drop function if exists public.get_voix_followers_count(uuid);

drop policy if exists "Users can delete own follows" on public.voix_hilmy_follows;
drop policy if exists "Users can create own follows" on public.voix_hilmy_follows;
drop policy if exists "Users can view own follows" on public.voix_hilmy_follows;

drop index if exists public.idx_voix_follows_voix;
drop index if exists public.idx_voix_follows_follower;

-- DROP TABLE supprime aussi l'index implicite de la contrainte UNIQUE
-- et les CHECK, donc pas besoin de les drop séparément.
drop table if exists public.voix_hilmy_follows;
