-- =====================================================================
-- HILMY · 18 — Notifications in-app (Sprint 1)
-- Idempotent.
--
-- 4 types câblés/préparés Sprint 1 :
--   • palier_franchi     — câblé : trigger sur point_events
--   • reco_sauvegardee   — câblé : trigger sur favoris (type='recommendation')
--   • parrainage_inscrit — pas câblé (Sprint 2+, structure prête)
--   • top_recos_semaine  — pas câblé (Sprint 2+, structure prête)
--
-- Décisions :
--   • RLS owner-only en SELECT + UPDATE (pour passer read_at).
--   • Pas de policy INSERT/DELETE → écriture exclusive via triggers
--     SECURITY DEFINER.
--   • Trigger palier : compare le total avant/après l''insert d''un
--     point_event pour détecter un franchissement de seuil.
-- =====================================================================

-- ─── Table notifications ──────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'palier_franchi',
    'reco_sauvegardee',
    'parrainage_inscrit',
    'top_recos_semaine'
  ));

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists notifications_user_all_idx
  on public.notifications (user_id, created_at desc);

-- ─── RLS owner-only ───────────────────────────────────────────────
alter table public.notifications enable row level security;

drop policy if exists "notifications_self_read" on public.notifications;
create policy "notifications_self_read"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_self_mark_read" on public.notifications;
create policy "notifications_self_mark_read"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Pas de policy INSERT/DELETE : seules les fonctions SECURITY DEFINER
-- (triggers) peuvent insérer.

comment on table public.notifications is
  'Sprint 1 — notifications in-app. Lecture+update read_at owner-only, écriture via triggers SECURITY DEFINER.';

-- ─── Fonction : palier franchi ────────────────────────────────────
-- Trigger AFTER INSERT sur point_events.
-- Compare le total avant/après l''insert et notifie si franchissement.
create or replace function public.gamif_check_palier_crossed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_total int;
  v_old_total int;
  v_old_statut text;
  v_new_statut text;
begin
  select coalesce(sum(points), 0) into v_new_total
  from public.point_events
  where user_id = new.user_id;

  v_old_total := v_new_total - new.points;

  v_old_statut := case
    when v_old_total >= 300 then 'Légende'
    when v_old_total >= 100 then 'Pilier'
    when v_old_total >= 20  then 'Copine'
    else 'Nouvelle'
  end;

  v_new_statut := case
    when v_new_total >= 300 then 'Légende'
    when v_new_total >= 100 then 'Pilier'
    when v_new_total >= 20  then 'Copine'
    else 'Nouvelle'
  end;

  if v_old_statut <> v_new_statut then
    insert into public.notifications (user_id, type, payload)
    values (
      new.user_id,
      'palier_franchi',
      jsonb_build_object(
        'new_status', v_new_statut,
        'old_status', v_old_statut,
        'total_points', v_new_total
      )
    );
  end if;

  return new;
exception when others then
  raise notice '[gamif_check_palier_crossed] failed: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.gamif_check_palier_crossed() from public;

drop trigger if exists gamif_palier_check on public.point_events;
create trigger gamif_palier_check
  after insert on public.point_events
  for each row execute function public.gamif_check_palier_crossed();

-- ─── Fonction : notif reco sauvegardée ─────────────────────────────
-- Trigger AFTER INSERT sur favoris WHEN type_item='recommendation'.
-- Notifie l''auteur de la reco (sauf self-save).
create or replace function public.gamif_notify_reco_saved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_saver_name text;
begin
  if new.type_item <> 'recommendation' then
    return new;
  end if;

  select user_id into v_author_id
  from public.recommendations
  where id = new.item_id;

  if v_author_id is null or v_author_id = new.user_id then
    return new; -- reco supprimée ou self-save
  end if;

  select prenom into v_saver_name
  from public.user_profiles
  where user_id = new.user_id;

  insert into public.notifications (user_id, type, payload)
  values (
    v_author_id,
    'reco_sauvegardee',
    jsonb_build_object(
      'reco_id', new.item_id,
      'saver_name', coalesce(v_saver_name, 'une copine')
    )
  );

  return new;
exception when others then
  raise notice '[gamif_notify_reco_saved] failed: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.gamif_notify_reco_saved() from public;

drop trigger if exists gamif_notify_save on public.favoris;
create trigger gamif_notify_save
  after insert on public.favoris
  for each row
  when (new.type_item = 'recommendation')
  execute function public.gamif_notify_reco_saved();

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- drop trigger if exists gamif_notify_save on public.favoris;
-- drop trigger if exists gamif_palier_check on public.point_events;
-- drop function if exists public.gamif_notify_reco_saved();
-- drop function if exists public.gamif_check_palier_crossed();
-- drop table if exists public.notifications cascade;
-- =====================================================================
