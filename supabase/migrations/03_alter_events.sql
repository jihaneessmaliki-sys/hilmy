-- =====================================================================
-- HILMY · Stage 4 · 03 — ALTER events (non-destructif)
-- Enrichit la table events pour la V2 (slug, visibilité, capacité, RSVP).
-- =====================================================================

alter table public.events add column if not exists slug text;
alter table public.events add column if not exists visibility text not null default 'public';
alter table public.events add column if not exists places_max integer;
alter table public.events add column if not exists inscrites_count integer not null default 0;
alter table public.events add column if not exists prestataire_id uuid;

-- FK prestataire_id → profiles(id) (optionnelle, set null si suppression du prestataire)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_prestataire_id_fkey'
  ) then
    alter table public.events
      add constraint events_prestataire_id_fkey
      foreign key (prestataire_id) references public.profiles(id) on delete set null;
  end if;
end $$;

-- Slug unique (tolère nulls)
create unique index if not exists events_slug_unique_idx
  on public.events (slug) where slug is not null;

-- CHECK visibility
alter table public.events drop constraint if exists events_visibility_check;
alter table public.events add constraint events_visibility_check
  check (visibility in ('public', 'members_only'));

-- CHECK places_max cohérente
alter table public.events drop constraint if exists events_places_max_positive;
alter table public.events add constraint events_places_max_positive
  check (places_max is null or places_max >= 1);

alter table public.events drop constraint if exists events_inscrites_count_positive;
alter table public.events add constraint events_inscrites_count_positive
  check (inscrites_count >= 0);

-- Indexes
create index if not exists events_prestataire_id_idx on public.events (prestataire_id);
create index if not exists events_status_start_idx on public.events (status, start_date);
create index if not exists events_visibility_status_idx
  on public.events (status) where visibility = 'public';

comment on column public.events.slug is 'URL-friendly identifier, unique quand présent.';
comment on column public.events.visibility is 'public = tout le monde voit | members_only = connectée uniquement.';
comment on column public.events.places_max is 'Capacité maximum (null = illimité).';
comment on column public.events.inscrites_count is 'Maintenu par trigger sur event_inscriptions.';
comment on column public.events.prestataire_id is 'Optionnel : lien vers profiles(id) si organisé par une prestataire pro.';
