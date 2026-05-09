-- =====================================================================
-- HILMY · 44 — Auto-boost saisonnier prestataires (PR-D Sprint 4)
--
-- Phase 2A · PR-D. Mécanique de boost calendrier pour Premium + Cercle Pro :
-- pendant des fenêtres saisonnières fixes (Ramadan, Aïd, Saint-Valentin,
-- Noël, etc.), les fiches des prestataires qui ont coché ces fenêtres
-- remontent en tête de l'annuaire avec un badge "🌙 Ramadan" sur la card.
--
-- Justifie 49€ (Premium = 1 fenêtre) et 99€ (Cercle Pro = illimité).
--
-- ⚠️ Système distinct du boost LIEU mig 41 (`events.boost_event_type`,
-- 25 slugs snake_case basés sur des events réels). Ici : 12 fenêtres
-- calendrier kebab-case basées sur dates fixes, sans event physique.
-- Les 2 systèmes coexistent — pas de couplage.
--
-- Tables créées :
--   1. seasonal_event_windows     — 12 fenêtres calendrier (admin CRUD)
--   2. profile_seasonal_boosts    — M:N profile ↔ window (owner CRUD)
--
-- Fonctions :
--   - is_profile_seasonally_boosted(uuid)        → boolean
--   - get_profile_active_seasonal_window(uuid)   → table(label, emoji)
--
-- Founder mapping : `is_founder = true` → considéré comme cercle_pro
-- pour le check palier, conformément à lib/permissions.ts. Centralisé
-- dans une CTE locale aux 2 fonctions pour éviter le double CASE.
--
-- Idempotente. Voir bas de fichier pour le rollback.
-- ⚠️ Application en prod : SUR DEMANDE EXPLICITE de Jiji uniquement.
-- =====================================================================


-- =====================================================================
-- 1. seasonal_event_windows  (ref data, 12 fenêtres calendrier)
-- =====================================================================

create table if not exists public.seasonal_event_windows (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  emoji text not null default '🎁',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasonal_event_windows_dates_order
    check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create index if not exists seasonal_event_windows_active_window_idx
  on public.seasonal_event_windows (is_active, starts_at, ends_at);

comment on table public.seasonal_event_windows is
  'Fenêtres calendrier pour le boost saisonnier prestataires (PR-D mig 44). '
  'Distinct de events.boost_event_type qui drive le boost lieu via events réels.';

comment on column public.seasonal_event_windows.slug is
  'Identifiant kebab-case stable (ex: ramadan, aid-fitr, saint-valentin). '
  'Distinct du snake_case des slugs events lieux.';


-- ─── Trigger updated_at ──────────────────────────────────────────────

create or replace function public.bump_seasonal_event_windows_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists seasonal_event_windows_updated_at_trg
  on public.seasonal_event_windows;
create trigger seasonal_event_windows_updated_at_trg
  before update on public.seasonal_event_windows
  for each row execute function public.bump_seasonal_event_windows_updated_at();


-- ─── RLS seasonal_event_windows ──────────────────────────────────────
-- Public read (anon + auth) : alimente le form prestataire dashboard
-- + le badge card annuaire. Aucune donnée sensible.
-- Admin write (insert/update/delete) via JWT user_metadata.is_admin
-- (pattern aligné mig 41).

alter table public.seasonal_event_windows enable row level security;

drop policy if exists "seasonal_event_windows_public_read"
  on public.seasonal_event_windows;
create policy "seasonal_event_windows_public_read"
  on public.seasonal_event_windows
  for select
  to anon, authenticated
  using (true);

drop policy if exists "seasonal_event_windows_admin_write"
  on public.seasonal_event_windows;
create policy "seasonal_event_windows_admin_write"
  on public.seasonal_event_windows
  for all
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- =====================================================================
-- 2. Seed initial — 12 fenêtres 2026-2027
-- =====================================================================
-- Dates indicatives, ajustables via /admin/seasonal-windows.
-- ON CONFLICT DO NOTHING : si la mig est ré-appliquée, on ne touche pas
-- aux modifs admin déjà faites en prod.

insert into public.seasonal_event_windows (slug, label, emoji, starts_at, ends_at) values
  ('ramadan',        'Ramadan',         '🌙', '2026-02-17 00:00+00', '2026-03-19 23:59+00'),
  ('aid-fitr',       'Aïd al-Fitr',     '✨', '2026-03-20 00:00+00', '2026-03-22 23:59+00'),
  ('aid-adha',       'Aïd al-Adha',     '🐑', '2026-05-26 00:00+00', '2026-05-28 23:59+00'),
  ('fete-meres',     'Fête des mères',  '🌸', '2026-05-25 00:00+00', '2026-05-31 23:59+00'),
  ('fete-peres',     'Fête des pères',  '👔', '2026-06-15 00:00+00', '2026-06-21 23:59+00'),
  ('mariage-saison', 'Saison mariage',  '💍', '2026-05-01 00:00+00', '2026-09-30 23:59+00'),
  ('rentree',        'Rentrée',         '📚', '2026-08-15 00:00+00', '2026-09-15 23:59+00'),
  ('halloween',      'Halloween',       '🎃', '2026-10-25 00:00+00', '2026-10-31 23:59+00'),
  ('noel',           'Noël',            '🎄', '2026-12-01 00:00+00', '2026-12-26 23:59+00'),
  ('nouvel-an',      'Nouvel an',       '🥂', '2026-12-27 00:00+00', '2027-01-02 23:59+00'),
  ('saint-valentin', 'Saint-Valentin',  '💕', '2027-02-07 00:00+00', '2027-02-14 23:59+00'),
  ('paques',         'Pâques',          '🐰', '2027-03-28 00:00+00', '2027-04-04 23:59+00')
on conflict (slug) do nothing;


-- =====================================================================
-- 3. profile_seasonal_boosts  (M:N profile ↔ window, owner CRUD)
-- =====================================================================

create table if not exists public.profile_seasonal_boosts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  window_id uuid not null references public.seasonal_event_windows(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, window_id)
);

create index if not exists profile_seasonal_boosts_profile_idx
  on public.profile_seasonal_boosts (profile_id);

create index if not exists profile_seasonal_boosts_window_idx
  on public.profile_seasonal_boosts (window_id);

comment on table public.profile_seasonal_boosts is
  'Sélections boost saisonnier par prestataire. Standard = 0 row, Premium '
  '= max 1 row, Cercle Pro/founder = illimité. Cap appliqué côté client + '
  'API route — pas de trigger BDD pour rester souple sur les changements '
  'de palier (downgrade Premium→Standard ne supprime pas les rows).';


-- ─── RLS profile_seasonal_boosts ─────────────────────────────────────
-- Public read : alimente le tri annuaire + badge card.
-- Owner write : un user ne peut écrire que sur ses propres profile_id.
-- Admin write : pour debug/cleanup éventuel.

alter table public.profile_seasonal_boosts enable row level security;

drop policy if exists "profile_seasonal_boosts_public_read"
  on public.profile_seasonal_boosts;
create policy "profile_seasonal_boosts_public_read"
  on public.profile_seasonal_boosts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "profile_seasonal_boosts_owner_write"
  on public.profile_seasonal_boosts;
create policy "profile_seasonal_boosts_owner_write"
  on public.profile_seasonal_boosts
  for all
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where user_id = auth.uid()
    )
  )
  with check (
    profile_id in (
      select id from public.profiles where user_id = auth.uid()
    )
  );

drop policy if exists "profile_seasonal_boosts_admin_all"
  on public.profile_seasonal_boosts;
create policy "profile_seasonal_boosts_admin_all"
  on public.profile_seasonal_boosts
  for all
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- =====================================================================
-- 4. Fonction is_profile_seasonally_boosted(uuid)
-- =====================================================================
-- Retourne true ssi :
--   - le profile a au moins 1 boost saisonnier
--   - dont la window est is_active = true
--   - dont la fenêtre [starts_at, ends_at] englobe now()
--   - ET le palier effectif du profile est premium ou cercle_pro
--     (founders mappés cercle_pro via la même règle que lib/permissions.ts)
--
-- STABLE : permet aux planners PostgREST/SQL de cacher le résultat dans
-- le scope de la requête (1 call par profile par requête, pas par row).

create or replace function public.is_profile_seasonally_boosted(p_profile_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profile_seasonal_boosts pb
    join public.seasonal_event_windows w on w.id = pb.window_id
    join public.profiles p on p.id = pb.profile_id
    where pb.profile_id = p_profile_id
      and w.is_active = true
      and w.starts_at is not null
      and w.ends_at is not null
      and now() between w.starts_at and w.ends_at
      and (case when p.is_founder = true then 'cercle_pro'
                else p.palier
           end) in ('premium', 'cercle_pro')
  );
$$;

comment on function public.is_profile_seasonally_boosted is
  'PR-D mig 44 — true ssi le prestataire a un boost saisonnier actif et '
  'son palier effectif est premium/cercle_pro (founders inclus).';


-- =====================================================================
-- 5. Fonction get_profile_active_seasonal_window(uuid)
-- =====================================================================
-- Retourne label + emoji de la 1ère fenêtre active du profile (ordre
-- starts_at ASC). NULL si aucun boost actif ou palier insuffisant.
-- Utilisé par le badge card annuaire.

create or replace function public.get_profile_active_seasonal_window(p_profile_id uuid)
returns table (window_label text, window_emoji text)
language sql
stable
as $$
  select w.label, w.emoji
  from public.profile_seasonal_boosts pb
  join public.seasonal_event_windows w on w.id = pb.window_id
  join public.profiles p on p.id = pb.profile_id
  where pb.profile_id = p_profile_id
    and w.is_active = true
    and w.starts_at is not null
    and w.ends_at is not null
    and now() between w.starts_at and w.ends_at
    and (case when p.is_founder = true then 'cercle_pro'
              else p.palier
         end) in ('premium', 'cercle_pro')
  order by w.starts_at asc
  limit 1;
$$;

comment on function public.get_profile_active_seasonal_window is
  'PR-D mig 44 — label+emoji de la fenêtre saisonnière active (1ère par '
  'starts_at ASC). NULL si pas de boost ou palier insuffisant.';


-- =====================================================================
-- 6. NOTIFY PostgREST — recharger le schéma exposé par l''API
-- =====================================================================

notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK (à exécuter en SQL si besoin de défaire la mig 44)
-- =====================================================================
-- drop function if exists public.get_profile_active_seasonal_window(uuid);
-- drop function if exists public.is_profile_seasonally_boosted(uuid);
--
-- drop policy if exists "profile_seasonal_boosts_admin_all"
--   on public.profile_seasonal_boosts;
-- drop policy if exists "profile_seasonal_boosts_owner_write"
--   on public.profile_seasonal_boosts;
-- drop policy if exists "profile_seasonal_boosts_public_read"
--   on public.profile_seasonal_boosts;
-- drop table if exists public.profile_seasonal_boosts;
--
-- drop policy if exists "seasonal_event_windows_admin_write"
--   on public.seasonal_event_windows;
-- drop policy if exists "seasonal_event_windows_public_read"
--   on public.seasonal_event_windows;
-- drop trigger if exists seasonal_event_windows_updated_at_trg
--   on public.seasonal_event_windows;
-- drop function if exists public.bump_seasonal_event_windows_updated_at();
-- drop table if exists public.seasonal_event_windows;
--
-- notify pgrst, 'reload schema';
