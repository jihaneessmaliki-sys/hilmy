-- =====================================================================
-- HILMY · 23 — Suppression contrainte max 3 univers
--
-- Décision UX 27/04/2026 (onboarding mobile refondu Batch B) : min 1
-- univers sélectionné, pas de plafond — l'utilisatrice peut tout cocher
-- si elle veut. La contrainte CHECK array_length <= 3 héritée de
-- migration 17 devient obsolète.
--
-- Idempotent. Voir bas de fichier pour rollback.
-- =====================================================================

alter table public.user_profiles
  drop constraint if exists user_profiles_univers_max3_check;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- ⚠️ Avant rollback : check si des lignes ont array_length(univers_choisis, 1) > 3
-- (tronquer ou exclure ces lignes avant de re-add la contrainte).
--
-- alter table public.user_profiles add constraint user_profiles_univers_max3_check
--   check (univers_choisis is null or array_length(univers_choisis, 1) <= 3);
-- =====================================================================
