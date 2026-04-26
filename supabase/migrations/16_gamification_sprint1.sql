-- =====================================================================
-- HILMY · 16 — Gamification Sprint 1 : points & statuts
-- Idempotent : peut être rejoué sans erreur.
--
-- Décisions documentées (cf. docs/gamification-audit.md côté mobile) :
--
--   • Triggers fire sur status='published' (et pas 'approved') —
--     'approved' n'est valide que pour profiles, pas pour
--     recommendations / events qui utilisent l'enum
--     {published, flagged, removed[, past]}.
--
--   • Sauvegarde de reco par autre user → favoris.type_item =
--     'recommendation' (pas de table dédiée — extension du polymorphe
--     existant). Le trigger sur favoris filtre WHEN type_item =
--     'recommendation' pour ne PAS gamifier les saves de
--     prestataires/lieux/events.
--
--   • UNIQUE PARTIAL : le brief demande UNIQUE(user_id, source_id,
--     event_type) ET cap 50 pts/reco (10 saves × 5pts). Ces deux
--     contraintes sont incompatibles si le UNIQUE est global et
--     source_id=recommendation_id. Résolution : UNIQUE PARTIAL sur
--     les events one-shot uniquement (reco_published, event_published).
--     Les saves multi-rows ; cap géré dans la fonction trigger via
--     subquery SUM().
--
--   • Toutes les fonctions gamif sont SECURITY DEFINER + un
--     EXCEPTION WHEN OTHERS qui swallow les erreurs : la
--     gamification ne doit JAMAIS bloquer une publication ou un save.
-- =====================================================================

-- ─── point_events ────────────────────────────────────────────────────
create table if not exists public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null,
  event_type text not null,
  points int not null check (points > 0),
  created_at timestamptz not null default now()
);

create index if not exists point_events_user_idx
  on public.point_events (user_id);
create index if not exists point_events_source_type_idx
  on public.point_events (source_id, event_type);
create index if not exists point_events_user_created_idx
  on public.point_events (user_id, created_at desc);

-- UNIQUE partial : seuls les événements one-shot ne doivent pas
-- pouvoir compter 2x. Les saves multi-utilisateurs s'accumulent.
create unique index if not exists point_events_oneshot_unique
  on public.point_events (user_id, source_id, event_type)
  where event_type in ('reco_published', 'event_published');

-- ─── RLS : lecture pour authenticated, écriture interdite ──────────
alter table public.point_events enable row level security;

drop policy if exists "point_events_authenticated_read" on public.point_events;
create policy "point_events_authenticated_read"
  on public.point_events for select
  to authenticated
  using (true);

-- Pas de policy INSERT/UPDATE/DELETE → écriture impossible côté
-- client. Seules les fonctions SECURITY DEFINER (triggers) écrivent.

comment on table public.point_events is
  'Sprint 1 gamification — événements de gain de points. Lecture authenticated, écriture exclusive via triggers SECURITY DEFINER.';

-- ─── ALTER favoris : autoriser type_item = ''recommendation'' ─────
alter table public.favoris drop constraint if exists favoris_type_item_check;
alter table public.favoris add constraint favoris_type_item_check
  check (type_item in ('prestataire', 'lieu', 'evenement', 'recommendation'));

comment on column public.favoris.type_item is
  'Type d''item sauvegardé. Sprint 1 : ajout de ''recommendation'' pour la mécanique de save virale (auteur de la reco gagne 5 pts par save par autre user, cap 50 pts / reco).';

-- ─── Fonction : award sur publication d''une reco ──────────────────
create or replace function public.gamif_award_reco_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.point_events (user_id, source_id, event_type, points)
  values (new.user_id, new.id, 'reco_published', 10)
  on conflict (user_id, source_id, event_type) do nothing;
  return new;
exception when others then
  -- La gamification ne doit JAMAIS bloquer la publication
  raise notice '[gamif_award_reco_points] failed for reco %: %', new.id, sqlerrm;
  return new;
end;
$$;

revoke execute on function public.gamif_award_reco_points() from public;

-- ─── Fonction : award sur publication d''un event ─────────────────
create or replace function public.gamif_award_event_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.point_events (user_id, source_id, event_type, points)
  values (new.user_id, new.id, 'event_published', 20)
  on conflict (user_id, source_id, event_type) do nothing;
  return new;
exception when others then
  raise notice '[gamif_award_event_points] failed for event %: %', new.id, sqlerrm;
  return new;
end;
$$;

revoke execute on function public.gamif_award_event_points() from public;

-- ─── Fonction : award sur save de reco par autre user ─────────────
create or replace function public.gamif_award_save_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_current_sum int;
begin
  -- Filtre stricte : seules les sauvegardes de recommendations comptent
  if new.type_item <> 'recommendation' then
    return new;
  end if;

  -- Trouve l''auteur de la reco
  select user_id into v_author_id
  from public.recommendations
  where id = new.item_id;

  if v_author_id is null then
    return new; -- reco supprimée ou item_id pointe ailleurs
  end if;

  -- Self-save : pas de points
  if v_author_id = new.user_id then
    return new;
  end if;

  -- Cap 50 pts / reco
  select coalesce(sum(points), 0) into v_current_sum
  from public.point_events
  where source_id = new.item_id
    and event_type = 'reco_saved_by_other';

  if v_current_sum >= 50 then
    return new; -- cap atteint
  end if;

  insert into public.point_events (user_id, source_id, event_type, points)
  values (v_author_id, new.item_id, 'reco_saved_by_other', 5);
  -- Pas de ON CONFLICT : pas de UNIQUE pour ce event_type, cap géré
  -- ci-dessus.

  return new;
exception when others then
  raise notice '[gamif_award_save_points] failed for favori %: %', new.id, sqlerrm;
  return new;
end;
$$;

revoke execute on function public.gamif_award_save_points() from public;

-- ─── Triggers recommendations ─────────────────────────────────────
drop trigger if exists gamif_reco_published_insert on public.recommendations;
create trigger gamif_reco_published_insert
  after insert on public.recommendations
  for each row
  when (new.status = 'published')
  execute function public.gamif_award_reco_points();

drop trigger if exists gamif_reco_published_update on public.recommendations;
create trigger gamif_reco_published_update
  after update of status on public.recommendations
  for each row
  when (new.status = 'published' and old.status is distinct from 'published')
  execute function public.gamif_award_reco_points();

-- ─── Triggers events ──────────────────────────────────────────────
drop trigger if exists gamif_event_published_insert on public.events;
create trigger gamif_event_published_insert
  after insert on public.events
  for each row
  when (new.status = 'published')
  execute function public.gamif_award_event_points();

drop trigger if exists gamif_event_published_update on public.events;
create trigger gamif_event_published_update
  after update of status on public.events
  for each row
  when (new.status = 'published' and old.status is distinct from 'published')
  execute function public.gamif_award_event_points();

-- ─── Trigger favoris (saves de recos uniquement) ──────────────────
drop trigger if exists gamif_favori_reco_saved on public.favoris;
create trigger gamif_favori_reco_saved
  after insert on public.favoris
  for each row
  when (new.type_item = 'recommendation')
  execute function public.gamif_award_save_points();

-- ─── Vue user_gamification ────────────────────────────────────────
-- NON matérialisée. Recalcule à chaque lecture.
-- Seuils Sprint 1 : Nouvelle (0-19) | Copine (20-99) | Pilier (100-299) | Légende (300+)
create or replace view public.user_gamification as
select
  user_id,
  coalesce(sum(points), 0)::int as total_points,
  case
    when coalesce(sum(points), 0) >= 300 then 'Légende'
    when coalesce(sum(points), 0) >= 100 then 'Pilier'
    when coalesce(sum(points), 0) >= 20  then 'Copine'
    else 'Nouvelle'
  end as statut,
  max(created_at) as derniere_activite
from public.point_events
group by user_id;

comment on view public.user_gamification is
  'Sprint 1 — statut + total points par user. Recalcule à chaque SELECT (acceptable au volume actuel, à matérialiser quand user_count > 50k).';

grant select on public.user_gamification to authenticated, anon;

-- =====================================================================
-- ROLLBACK (à exécuter en cas de besoin)
-- =====================================================================
-- drop view if exists public.user_gamification;
-- drop trigger if exists gamif_favori_reco_saved on public.favoris;
-- drop trigger if exists gamif_event_published_update on public.events;
-- drop trigger if exists gamif_event_published_insert on public.events;
-- drop trigger if exists gamif_reco_published_update on public.recommendations;
-- drop trigger if exists gamif_reco_published_insert on public.recommendations;
-- drop function if exists public.gamif_award_save_points();
-- drop function if exists public.gamif_award_event_points();
-- drop function if exists public.gamif_award_reco_points();
-- alter table public.favoris drop constraint if exists favoris_type_item_check;
-- alter table public.favoris add constraint favoris_type_item_check
--   check (type_item in ('prestataire', 'lieu', 'evenement'));
-- drop table if exists public.point_events cascade;
-- =====================================================================
