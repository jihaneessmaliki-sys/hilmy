-- =====================================================================
-- HILMY · 11 — recommendations.source_import (traçabilité curation)
-- Permet filtrer/purger les batchs de contenus éditoriaux postés par
-- "Équipe Hilmy" (hilmy.io@hotmail.com) vs les recos utilisatrices réelles.
-- =====================================================================

alter table public.recommendations
  add column if not exists source_import text not null default 'user';

create index if not exists recommendations_source_import_idx
  on public.recommendations (source_import) where source_import <> 'user';

comment on column public.recommendations.source_import is
  'Provenance : "user" (défaut, reco utilisatrice réelle) ou "hilmy_curation_batch_N" (seed éditorial par Équipe Hilmy).';
