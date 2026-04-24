-- =====================================================================
-- HILMY · Stage 4 · 06 — CREATE event_inscriptions
-- RSVP aux événements. 1 inscription max par user par event.
-- RLS : l'utilisatrice voit sa propre, l'organisatrice voit toutes celles
-- de ses events, les admins (is_admin via JWT) voient tout.
-- =====================================================================

create table if not exists public.event_inscriptions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'inscrite',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_inscriptions_status_check
    check (status in ('inscrite', 'annulee', 'liste_attente')),
  unique (event_id, user_id)
);

-- Indexes
create index if not exists event_inscriptions_event_idx on public.event_inscriptions (event_id);
create index if not exists event_inscriptions_user_idx on public.event_inscriptions (user_id);
create index if not exists event_inscriptions_status_idx on public.event_inscriptions (status);

-- updated_at auto
create or replace function public.event_inscriptions_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_inscriptions_updated_at on public.event_inscriptions;
create trigger event_inscriptions_updated_at
  before update on public.event_inscriptions
  for each row execute function public.event_inscriptions_set_updated_at();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.event_inscriptions enable row level security;

-- SELECT : l'utilisatrice voit sa propre inscription
drop policy if exists "event_inscriptions_self_read" on public.event_inscriptions;
create policy "event_inscriptions_self_read"
  on public.event_inscriptions for select
  to authenticated
  using (user_id = auth.uid());

-- SELECT : l'organisatrice voit toutes les inscriptions de ses événements
drop policy if exists "event_inscriptions_organisateur_read" on public.event_inscriptions;
create policy "event_inscriptions_organisateur_read"
  on public.event_inscriptions for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_inscriptions.event_id
        and e.user_id = auth.uid()
    )
  );

-- SELECT : admins (via JWT user_metadata)
drop policy if exists "event_inscriptions_admin_read" on public.event_inscriptions;
create policy "event_inscriptions_admin_read"
  on public.event_inscriptions for select
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );

-- INSERT : l'utilisatrice s'inscrit elle-même à un event publié
drop policy if exists "event_inscriptions_self_insert" on public.event_inscriptions;
create policy "event_inscriptions_self_insert"
  on public.event_inscriptions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_inscriptions.event_id
        and e.status = 'published'
    )
  );

-- UPDATE : l'utilisatrice peut modifier son propre statut (annuler)
drop policy if exists "event_inscriptions_self_update" on public.event_inscriptions;
create policy "event_inscriptions_self_update"
  on public.event_inscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE : l'utilisatrice retire son inscription
drop policy if exists "event_inscriptions_self_delete" on public.event_inscriptions;
create policy "event_inscriptions_self_delete"
  on public.event_inscriptions for delete
  to authenticated
  using (
    user_id = auth.uid()
    or coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );

comment on table public.event_inscriptions is
  'RSVP aux événements. 1 inscription par user par event (unique). Status : inscrite / annulee / liste_attente.';
