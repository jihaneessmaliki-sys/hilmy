-- =====================================================================
-- HILMY · 24 — ROLLBACK migration Voix Hilmy
--
-- ⚠️ Pré-check avant toute action :
--   Vérifier qu'aucune utilisatrice n'a is_voix_hilmy = true. Si oui,
--   le rollback supprimera leurs pages publiques. Prévenir les copines
--   concernées + faire un export des slugs/bios avant.
--
--       SELECT id, prenom, voix_hilmy_slug, voix_hilmy_bio
--       FROM public.user_profiles
--       WHERE is_voix_hilmy = true;
--
-- ──────────────────────────────────────────────────────────────────
-- ORDRE D'EXÉCUTION (à respecter strictement) :
--
--   1. DROP VIEW IF EXISTS public.voix_hilmy_public;
--      (créée au commit 3, dépend des colonnes voix_hilmy_*)
--
--   2. Exécuter supabase/migrations/25_voix_hilmy_follows_rollback.sql
--      (table voix_hilmy_follows référence user_profiles via auth.users
--      mais la vue + le code applicatif dépendent du schéma 24)
--
--   3. Exécuter ce fichier (24_voix_hilmy_rollback.sql) — drop colonnes,
--      contraintes, index, fonction.
-- ──────────────────────────────────────────────────────────────────
-- =====================================================================

drop function if exists public.get_featured_voix();

drop index if exists public.idx_user_profiles_voix_slug;
drop index if exists public.user_profiles_voix_slug_unique_idx;

alter table public.user_profiles drop constraint if exists user_profiles_voix_complete;
alter table public.user_profiles drop constraint if exists user_profiles_voix_bio_length;

alter table public.user_profiles drop column if exists voix_hilmy_featured_until;
alter table public.user_profiles drop column if exists voix_hilmy_activated_at;
alter table public.user_profiles drop column if exists voix_hilmy_bio;
alter table public.user_profiles drop column if exists voix_hilmy_slug;
alter table public.user_profiles drop column if exists is_voix_hilmy;
