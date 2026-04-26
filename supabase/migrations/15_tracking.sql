-- =====================================================================
-- HILMY · 15 — Tracking : pageviews + tap-to-contact
-- Idempotent : peut être rejoué sans erreur.
--
-- Objectif :
--   - profile_views   : 1 ligne / visite de fiche prestataire
--   - profile_contacts: 1 ligne / clic sur un canal de contact
--
-- Pattern admin : on lit `auth.jwt() -> 'user_metadata' ->> 'is_admin'`
-- (cohérent avec migration 06_create_event_inscriptions.sql, pas de
-- fonction is_admin() déployée en prod).
--
-- Déclencheur nb_vues : trigger AFTER INSERT bump profiles.nb_vues
-- (acceptable au volume actuel, à batcher si scale).
-- =====================================================================

-- ─── profile_views ────────────────────────────────────────────────────
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  viewed_at timestamptz not null default now(),
  country text,                 -- ISO-2 (FR, CH, …) depuis x-vercel-ip-country
  region text,                  -- ex: 'IDF', 'VD' depuis x-vercel-ip-region
  city text,                    -- ex: 'Paris' depuis x-vercel-ip-city
  referer text,                 -- URL referer brute, tronquée API-side (max 512)
  user_agent_hash text          -- sha256 du UA, anti-fingerprint mais utile dedupe
);

create index if not exists profile_views_profile_viewed_idx
  on public.profile_views (profile_id, viewed_at desc);
create index if not exists profile_views_viewer_idx
  on public.profile_views (viewer_id) where viewer_id is not null;
create index if not exists profile_views_viewed_at_idx
  on public.profile_views (viewed_at desc);

comment on table public.profile_views is
  'Une ligne = une visite de fiche prestataire. Anonyme OK (viewer_id null).';

-- ─── profile_contacts ─────────────────────────────────────────────────
create table if not exists public.profile_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  clicker_id uuid references auth.users(id) on delete set null,
  contact_type text not null,
  clicked_at timestamptz not null default now(),
  country text,
  region text,
  city text,
  referer text
);

alter table public.profile_contacts drop constraint if exists profile_contacts_type_check;
alter table public.profile_contacts add constraint profile_contacts_type_check
  check (contact_type in (
    'whatsapp', 'phone', 'email', 'website',
    'instagram', 'tiktok', 'linkedin', 'facebook', 'youtube'
  ));

create index if not exists profile_contacts_profile_clicked_idx
  on public.profile_contacts (profile_id, clicked_at desc);
create index if not exists profile_contacts_type_idx
  on public.profile_contacts (profile_id, contact_type);

comment on table public.profile_contacts is
  'Une ligne = un clic sur un canal de contact (CTA WhatsApp/IG/...).';

-- ─── Trigger : nb_vues++ après INSERT view ────────────────────────────
create or replace function public.bump_profile_nb_vues() returns trigger as $$
begin
  update public.profiles
     set nb_vues = coalesce(nb_vues, 0) + 1
   where id = new.profile_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profile_views_bump_nb_vues on public.profile_views;
create trigger profile_views_bump_nb_vues
  after insert on public.profile_views
  for each row execute function public.bump_profile_nb_vues();

-- ─── RLS ──────────────────────────────────────────────────────────────
alter table public.profile_views   enable row level security;
alter table public.profile_contacts enable row level security;

-- INSERT : public (anon + auth) — en pratique le client passe par
-- /api/track/* (service-role) qui pré-valide, mais on laisse aussi les
-- inserts client directs ouverts pour future flexibilité.
drop policy if exists "Anyone can insert a view" on public.profile_views;
create policy "Anyone can insert a view"
  on public.profile_views
  for insert
  with check (true);

drop policy if exists "Anyone can insert a contact click" on public.profile_contacts;
create policy "Anyone can insert a contact click"
  on public.profile_contacts
  for insert
  with check (true);

-- SELECT : seul l'owner du profile (via profiles.user_id) OU admin
drop policy if exists "Owner reads own profile views" on public.profile_views;
create policy "Owner reads own profile views"
  on public.profile_views
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_views.profile_id
        and p.user_id = auth.uid()
    )
    or coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );

drop policy if exists "Owner reads own profile contacts" on public.profile_contacts;
create policy "Owner reads own profile contacts"
  on public.profile_contacts
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_contacts.profile_id
        and p.user_id = auth.uid()
    )
    or coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );

-- Pas de policy UPDATE / DELETE : l'historique est immutable.

-- =====================================================================
-- ROLLBACK (à exécuter manuellement si besoin de revert)
-- =====================================================================
-- drop trigger if exists profile_views_bump_nb_vues on public.profile_views;
-- drop function if exists public.bump_profile_nb_vues();
-- drop table if exists public.profile_contacts;
-- drop table if exists public.profile_views;
-- -- profiles.nb_vues n'est PAS reset (les compteurs restent à leur valeur).
-- -- Pour reset : update public.profiles set nb_vues = 0;
-- =====================================================================
