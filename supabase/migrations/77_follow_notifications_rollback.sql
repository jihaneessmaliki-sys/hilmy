-- =====================================================================
-- HILMY · 77 ROLLBACK — retire les notifs du follow
-- Restaure le CHECK type des notifications aux 6 valeurs antérieures.
-- =====================================================================

drop trigger if exists trg_notify_followers_new_reco on public.recommendations;
drop trigger if exists trg_notify_followers_new_promo on public.profile_promos;
drop function if exists public.notify_followers_new_reco();
drop function if exists public.notify_followers_new_promo();

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'palier_franchi',
    'reco_sauvegardee',
    'parrainage_inscrit',
    'top_recos_semaine',
    'voix_hilmy_eligible'
  ));
