-- =====================================================================
-- HILMY · 45 — Rollback partiel mig 44 (PR-D abandonnée, pivot scope)
--
-- Contexte (2026-05-10) : la mécanique "auto-boost saisonnier prestataire"
-- introduite par mig 44 + PR-D était une mauvaise direction. Le vrai
-- besoin = filtres saisonniers sur la page /événements (à venir PR-F).
--
-- PR-D #86 fermée sans merge. Mig 44 reste en historique pour audit
-- trail (la table `seasonal_event_windows` existe en prod depuis le
-- 2026-05-09). Cette mig 45 rollback ce qui n'est plus utile et
-- renomme ce qu'on garde :
--
--   1. DROP table profile_seasonal_boosts (M:N inutile pour filtres)
--   2. DROP fonctions is_profile_seasonally_boosted +
--      get_profile_active_seasonal_window
--   3. RENAME seasonal_event_windows → event_seasonal_categories
--   4. RENAME trigger + function updated_at + policies + indexes
--   5. RESTORE dates Ramadan modifiées pendant tests prod
--
-- Idempotente. La table renommée + ses 12 rows seedées sont préservées,
-- réutilisables comme référentiel de filtres /événements (PR-F).
--
-- ⚠️ Application en prod : SUR DEMANDE EXPLICITE de Jiji, après backup
-- Supabase manuel.
-- =====================================================================


-- =====================================================================
-- 1. DROP fonctions devenues inutiles
-- =====================================================================
-- Aucun consumer en main (PR-D jamais mergée). Drop sans risque.

drop function if exists public.get_profile_active_seasonal_window(uuid);
drop function if exists public.is_profile_seasonally_boosted(uuid);


-- =====================================================================
-- 2. DROP table M:N profile_seasonal_boosts (CASCADE retire les FKs)
-- =====================================================================
-- Contient au moment de cette mig : 1 row de test (Jiji + Ramadan)
-- créée pour le smoke test du 2026-05-09. Pas de prod data.

drop table if exists public.profile_seasonal_boosts cascade;


-- =====================================================================
-- 3. Pré-rename : drop policies + trigger + function bump
-- =====================================================================
-- PostgreSQL ne RENAME pas les policies attachées automatiquement avec
-- la table. On les recréera proprement après le rename. Idem pour le
-- trigger updated_at et sa fonction qui portent l'ancien nom.

drop policy if exists "seasonal_event_windows_admin_write"
  on public.seasonal_event_windows;
drop policy if exists "seasonal_event_windows_public_read"
  on public.seasonal_event_windows;

drop trigger if exists seasonal_event_windows_updated_at_trg
  on public.seasonal_event_windows;
drop function if exists public.bump_seasonal_event_windows_updated_at();


-- =====================================================================
-- 4. RENAME table + index (idempotent via DO block)
-- =====================================================================

do $$
begin
  if exists (
    select 1 from pg_class
    where relname = 'seasonal_event_windows'
      and relnamespace = (select oid from pg_namespace where nspname = 'public')
  ) then
    alter table public.seasonal_event_windows rename to event_seasonal_categories;
  end if;

  if exists (
    select 1 from pg_class
    where relname = 'seasonal_event_windows_active_window_idx'
      and relnamespace = (select oid from pg_namespace where nspname = 'public')
  ) then
    alter index public.seasonal_event_windows_active_window_idx
      rename to event_seasonal_categories_active_window_idx;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'seasonal_event_windows_dates_order'
  ) then
    alter table public.event_seasonal_categories
      rename constraint seasonal_event_windows_dates_order
      to event_seasonal_categories_dates_order;
  end if;

  -- PRIMARY KEY + UNIQUE constraints sont auto-nommés par PostgreSQL
  -- (`<table>_pkey` / `<table>_<col>_key`) et le rename de la table
  -- ne les renomme pas. On les rebaptise pour cohérence — renommer la
  -- constraint renomme aussi son index sous-jacent.
  if exists (
    select 1 from pg_constraint where conname = 'seasonal_event_windows_pkey'
  ) then
    alter table public.event_seasonal_categories
      rename constraint seasonal_event_windows_pkey
      to event_seasonal_categories_pkey;
  end if;

  if exists (
    select 1 from pg_constraint where conname = 'seasonal_event_windows_slug_key'
  ) then
    alter table public.event_seasonal_categories
      rename constraint seasonal_event_windows_slug_key
      to event_seasonal_categories_slug_key;
  end if;
end $$;


-- =====================================================================
-- 5. Recréer trigger updated_at avec nouveau nom
-- =====================================================================

create or replace function public.bump_event_seasonal_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_seasonal_categories_updated_at_trg
  on public.event_seasonal_categories;
create trigger event_seasonal_categories_updated_at_trg
  before update on public.event_seasonal_categories
  for each row execute function public.bump_event_seasonal_categories_updated_at();


-- =====================================================================
-- 6. Recréer RLS + policies avec nouveaux noms
-- =====================================================================
-- Public read (filtres /événements seront publics) + admin write (panel
-- /admin/event-seasonal-categories). Pattern identique à mig 44.

alter table public.event_seasonal_categories enable row level security;

drop policy if exists "event_seasonal_categories_public_read"
  on public.event_seasonal_categories;
create policy "event_seasonal_categories_public_read"
  on public.event_seasonal_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "event_seasonal_categories_admin_write"
  on public.event_seasonal_categories;
create policy "event_seasonal_categories_admin_write"
  on public.event_seasonal_categories
  for all
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- =====================================================================
-- 7. Update commentaires de la table renommée
-- =====================================================================

comment on table public.event_seasonal_categories is
  'Catégories saisonnières d''événements (Ramadan, Aïd, Saint-Valentin, '
  'Saison mariage, Noël…). Alimente les filtres de la page /événements '
  '(PR-F). Renommée depuis seasonal_event_windows post-pivot scope PR-D.';

comment on column public.event_seasonal_categories.slug is
  'Identifiant kebab-case stable (ex: ramadan, saint-valentin). '
  'Distinct du snake_case des slugs events lieux (mig 41).';


-- =====================================================================
-- 8. Restaurer les dates Ramadan modifiées pendant les smoke tests
-- =====================================================================
-- Le 2026-05-09 on a UPDATE starts_at=now-1d, ends_at=now+7d sur la row
-- 'ramadan' pour valider la fonction is_profile_seasonally_boosted.
-- On restore aux dates seed originales (Ramadan 2026 : 17 fév → 19 mar).

update public.event_seasonal_categories
   set starts_at = '2026-02-17 00:00+00',
       ends_at   = '2026-03-19 23:59+00'
 where slug = 'ramadan';


-- =====================================================================
-- 9. NOTIFY PostgREST — recharger le schéma exposé par l'API
-- =====================================================================

notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK ROLLBACK (= revert mig 45 → revenir à l'état post-mig 44)
-- À exécuter en SQL si besoin
-- =====================================================================
-- alter table public.event_seasonal_categories rename to seasonal_event_windows;
-- alter index public.event_seasonal_categories_active_window_idx
--   rename to seasonal_event_windows_active_window_idx;
-- (recréer policies + trigger + function avec ancien nom)
-- (recréer profile_seasonal_boosts + ses 5 policies + 2 fonctions SQL)
-- → en pratique : ré-exécuter mig 44 dans son intégralité.
