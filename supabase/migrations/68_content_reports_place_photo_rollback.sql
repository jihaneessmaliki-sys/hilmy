-- =====================================================================
-- HILMY · 68 ROLLBACK — revient au CHECK sans 'place_photo'.
-- ⚠️ À n'exécuter QUE si aucune ligne place_photo n'existe (sinon le ADD
--    échoue : des lignes violeraient la contrainte restaurée).
-- =====================================================================

alter table public.content_reports
  drop constraint if exists content_reports_target_type_check;

alter table public.content_reports
  add constraint content_reports_target_type_check
  check (target_type = any (array['place', 'event', 'recommendation']));
