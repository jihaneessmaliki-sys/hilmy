-- =====================================================================
-- HILMY · Stage 4 · 05 — CREATE favoris
-- Table polymorphique : une utilisatrice sauvegarde n'importe quel item
-- (prestataire = profiles.id, lieu = places.id, événement = events.id).
-- RLS strictement owner-only.
-- =====================================================================

create table if not exists public.favoris (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type_item text not null,
  item_id uuid not null,
  note_perso text,
  created_at timestamptz not null default now(),

  constraint favoris_type_item_check check (type_item in ('prestataire', 'lieu', 'evenement')),
  unique (user_id, type_item, item_id)
);

-- Indexes
create index if not exists favoris_user_idx on public.favoris (user_id);
create index if not exists favoris_item_idx on public.favoris (type_item, item_id);

-- =====================================================================
-- RLS — strictement owner-only
-- =====================================================================
alter table public.favoris enable row level security;

drop policy if exists "favoris_self_read" on public.favoris;
create policy "favoris_self_read"
  on public.favoris for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "favoris_self_insert" on public.favoris;
create policy "favoris_self_insert"
  on public.favoris for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "favoris_self_update" on public.favoris;
create policy "favoris_self_update"
  on public.favoris for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "favoris_self_delete" on public.favoris;
create policy "favoris_self_delete"
  on public.favoris for delete
  to authenticated
  using (user_id = auth.uid());

comment on table public.favoris is
  'Favoris polymorphiques (prestataire / lieu / evenement). RLS owner-only.';
comment on column public.favoris.note_perso is
  'Note privée libre pour l''utilisatrice ("pour l''anniv de Julie"). Jamais exposée à d''autres.';
