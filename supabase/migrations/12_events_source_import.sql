-- =====================================================================
-- HILMY · 12 — events.source_import (traçabilité curation events)
-- Même logique que recommendations.source_import (migration 11).
-- =====================================================================

alter table public.events
  add column if not exists source_import text not null default 'user';

create index if not exists events_source_import_idx
  on public.events (source_import) where source_import <> 'user';

comment on column public.events.source_import is
  'Provenance : "user" (défaut, event créé par utilisatrice réelle) ou "hilmy_curation_batch_N_events" (seed éditorial par Équipe Hilmy).';
