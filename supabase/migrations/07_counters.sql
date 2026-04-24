-- =====================================================================
-- HILMY · Stage 4 · 07 — Triggers de compteurs auto
-- Maintient à jour les stats dénormalisées (note_moyenne, nb_avis,
-- inscrites_count) et approved_at.
-- =====================================================================

-- =====================================================================
-- 1) profiles.note_moyenne + nb_avis
--    Alimentés par les recommendations où type='prestataire' et status='published'
-- =====================================================================

create or replace function public.refresh_prestataire_stats(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    note_moyenne = coalesce((
      select round(avg(rating)::numeric, 1)
      from public.recommendations
      where profile_id = p_profile_id
        and type = 'prestataire'
        and status = 'published'
        and rating is not null
    ), 0),
    nb_avis = (
      select count(*)
      from public.recommendations
      where profile_id = p_profile_id
        and type = 'prestataire'
        and status = 'published'
    )
  where id = p_profile_id;
end;
$$;

create or replace function public.trigger_refresh_prestataire_stats()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.profile_id is not null and old.type = 'prestataire' then
      perform public.refresh_prestataire_stats(old.profile_id);
    end if;
    return old;
  else
    if new.profile_id is not null and new.type = 'prestataire' then
      perform public.refresh_prestataire_stats(new.profile_id);
    end if;
    -- edge case : changement de profile_id ou type
    if tg_op = 'UPDATE'
       and old.profile_id is not null
       and old.type = 'prestataire'
       and (old.profile_id <> new.profile_id or old.type <> new.type)
    then
      perform public.refresh_prestataire_stats(old.profile_id);
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists recommendations_refresh_prestataire_stats on public.recommendations;
create trigger recommendations_refresh_prestataire_stats
  after insert or update or delete on public.recommendations
  for each row execute function public.trigger_refresh_prestataire_stats();

-- =====================================================================
-- 2) events.inscrites_count
--    Alimenté par event_inscriptions où status='inscrite'
-- =====================================================================

create or replace function public.refresh_inscrites_count(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
  set inscrites_count = (
    select count(*)
    from public.event_inscriptions
    where event_id = p_event_id
      and status = 'inscrite'
  )
  where id = p_event_id;
end;
$$;

create or replace function public.trigger_refresh_inscrites_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_inscrites_count(old.event_id);
    return old;
  else
    perform public.refresh_inscrites_count(new.event_id);
    if tg_op = 'UPDATE' and old.event_id <> new.event_id then
      perform public.refresh_inscrites_count(old.event_id);
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists event_inscriptions_refresh_count on public.event_inscriptions;
create trigger event_inscriptions_refresh_count
  after insert or update or delete on public.event_inscriptions
  for each row execute function public.trigger_refresh_inscrites_count();

-- =====================================================================
-- 3) profiles.approved_at
--    Auto-set à now() quand status passe à 'approved'.
-- =====================================================================

create or replace function public.profiles_set_approved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved'
     and (old is null or old.status is distinct from 'approved')
  then
    new.approved_at = coalesce(new.approved_at, now());
  elsif new.status <> 'approved' then
    -- optionnel : reset si retiré. Commenté pour conserver l'historique.
    -- new.approved_at = null;
    null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_approved_at_trigger on public.profiles;
create trigger profiles_approved_at_trigger
  before insert or update of status on public.profiles
  for each row execute function public.profiles_set_approved_at();

-- =====================================================================
-- 4) profiles.updated_at (générique — créé seulement si pas déjà là)
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- On ne force pas les triggers updated_at sur profiles/events/places s'ils
-- existent déjà — Supabase a souvent son propre système. À activer si besoin.

comment on function public.refresh_prestataire_stats(uuid) is
  'Recalcule note_moyenne + nb_avis d''un profile depuis recommendations(type=prestataire, status=published).';
comment on function public.refresh_inscrites_count(uuid) is
  'Recalcule inscrites_count d''un event depuis event_inscriptions(status=inscrite).';
comment on function public.profiles_set_approved_at() is
  'Set approved_at = now() la première fois que status passe à approved.';
