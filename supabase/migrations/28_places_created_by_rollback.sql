-- =====================================================================
-- HILMY · 28 — ROLLBACK migration places.created_by_user_id + RLS DELETE
--
-- ⚠️ Pré-checks :
--   1. Compter les places avec created_by_user_id renseigné — le
--      rollback drop la colonne, l'info est perdue. Si tu veux
--      préserver le tracking, exporte d'abord :
--          SELECT id, name, slug, google_place_id, created_by_user_id
--          FROM public.places
--          WHERE created_by_user_id IS NOT NULL;
--   2. Vérifier qu'aucun code applicatif (Next.js, Expo) ne dépend
--      ni de la colonne ni de la policy DELETE — un grep dans
--      hilmy-muslim et hilmy-mobile sur 'created_by_user_id' et
--      'places_delete_own_if_no_other_recos' suffit.
-- =====================================================================

-- ─── Étape 1 : drop policy DELETE ────────────────────────────────
drop policy if exists "places_delete_own_if_no_other_recos"
  on public.places;

-- ─── Étape 2 : drop index partiel ────────────────────────────────
drop index if exists public.idx_places_created_by;

-- ─── Étape 3 : drop colonne ──────────────────────────────────────
alter table public.places drop column if exists created_by_user_id;
