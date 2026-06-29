-- =====================================================================
-- HILMY · 73 ROLLBACK — Voix Hilmy éligibilité automatique
--
-- Retire le trigger, la fonction de détection, la RPC d'activation et
-- restaure le CHECK type des notifications à ses 4 valeurs d'origine.
-- NE retire PAS la colonne voix_hilmy_eligible_at ni les éligibilités
-- déjà posées (conservation des données ; ALTER COLUMN > DROP COLUMN).
-- =====================================================================

drop trigger if exists trg_voix_hilmy_eligibility on public.recommendations;
drop function if exists public.voix_hilmy_check_eligibility();
drop function if exists public.activate_voix_hilmy();

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'palier_franchi',
    'reco_sauvegardee',
    'parrainage_inscrit',
    'top_recos_semaine'
  ));

-- Pour repartir totalement de zéro (optionnel, destructif) :
-- alter table public.user_profiles drop column if exists voix_hilmy_eligible_at;
