-- =====================================================================
-- HILMY · 68 — PR-c : autorise le signalement des photos communauté.
--
-- La table générique `content_reports` portait un CHECK qui n'acceptait
-- que target_type ∈ {place, event, recommendation}. PR-c ajoute le
-- signalement des photos membres (route /api/place-photos/[id]/report,
-- target_type='place_photo') → on étend le CHECK, sans rien casser des
-- valeurs existantes.
--
-- AUCUNE donnée touchée : on remplace seulement la contrainte. Les lignes
-- existantes (place/event/recommendation) restent valides.
-- Idempotent : DROP IF EXISTS puis ADD. Rollback : 68_..._rollback.sql.
-- =====================================================================

alter table public.content_reports
  drop constraint if exists content_reports_target_type_check;

alter table public.content_reports
  add constraint content_reports_target_type_check
  check (target_type = any (array['place', 'event', 'recommendation', 'place_photo']));

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/68_content_reports_place_photo_rollback.sql
-- =====================================================================
