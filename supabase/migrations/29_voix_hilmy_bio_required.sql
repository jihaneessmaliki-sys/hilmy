-- =====================================================================
-- HILMY · 29 — Voix Hilmy : bio NOT NULL et non-vide forcée (Option γ)
--
-- Étend le CHECK constraint user_profiles_voix_complete (mig 24) pour
-- garantir que toute Voix Hilmy active a bio renseignée ET non-vide
-- après trim. Phase 1 commit 7a du brief Voix Hilmy.
--
-- Avant (mig 24) :
--   CHECK (
--     is_voix_hilmy = false
--     OR (is_voix_hilmy = true
--         AND voix_hilmy_slug IS NOT NULL
--         AND voix_hilmy_bio IS NOT NULL)
--   )
--
-- Après (mig 29) :
--   CHECK (
--     is_voix_hilmy = false
--     OR (is_voix_hilmy = true
--         AND voix_hilmy_slug IS NOT NULL
--         AND voix_hilmy_bio IS NOT NULL
--         AND length(trim(voix_hilmy_bio)) > 0)
--   )
--
-- Pourquoi : la page perso créatrice (commit 7a) affiche la bio dans
-- le hero. Sans bio non-vide, l'UI casse silencieusement (italique vide).
-- Le filtre length(trim(...)) > 0 protège aussi contre les bios "   "
-- (whitespace seul) qui passaient le NOT NULL existant.
--
-- Pré-check baseline (run avant cette migration) confirmé : 0 Voix
-- active n'a bio NULL/vide à la date d'application. Pas de migration
-- de données nécessaire.
--
-- Idempotent (drop policy + recreate). Voir 29_..._rollback.sql.
-- =====================================================================

-- ─── Drop ancien CHECK + recreate étendu ─────────────────────────
alter table public.user_profiles
  drop constraint if exists user_profiles_voix_complete;

alter table public.user_profiles
  add constraint user_profiles_voix_complete
  check (
    is_voix_hilmy = false
    or (
      is_voix_hilmy = true
      and voix_hilmy_slug is not null
      and voix_hilmy_bio is not null
      and length(trim(voix_hilmy_bio)) > 0
    )
  );

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/29_voix_hilmy_bio_required_rollback.sql
-- =====================================================================
