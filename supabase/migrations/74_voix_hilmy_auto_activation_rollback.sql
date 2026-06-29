-- =====================================================================
-- HILMY · 74 ROLLBACK — revenir au modèle opt-in (migration 73)
--
-- Restaure la contrainte de complétude stricte (slug + bio), retire la
-- RPC set_voix_optout et le helper de slug, et remet la fonction trigger
-- en mode « marquer éligible » (sans activer). NE retire PAS la colonne
-- voix_hilmy_opted_out ni les activations déjà faites (conservation).
--
-- NB : restaurer la contrainte stricte échouera s'il existe des Créatrices
-- actives sans bio (auto-activées). Le cas échéant, leur écrire une bio
-- avant rollback, ou retirer la clause bio ci-dessous.
-- =====================================================================

-- Trigger 73 (mark-eligible, sans activation)
create or replace function public.voix_hilmy_check_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold constant int := 5;
  v_count int;
  v_is_voix boolean;
  v_eligible timestamptz;
begin
  select is_voix_hilmy, voix_hilmy_eligible_at
    into v_is_voix, v_eligible
  from public.user_profiles
  where user_id = new.user_id;

  if coalesce(v_is_voix, false) or v_eligible is not null then
    return new;
  end if;

  select count(*) into v_count
  from public.recommendations r
  where r.user_id = new.user_id
    and r.status = 'published'
    and r.comment is not null
    and length(trim(r.comment)) > 0;

  if v_count >= v_threshold then
    update public.user_profiles
      set voix_hilmy_eligible_at = now()
    where user_id = new.user_id
      and voix_hilmy_eligible_at is null
      and is_voix_hilmy = false;

    insert into public.notifications (user_id, type, payload)
    values (new.user_id, 'voix_hilmy_eligible',
      jsonb_build_object('recos_count', v_count, 'threshold', v_threshold));
  end if;

  return new;
exception when others then
  raise notice '[voix_hilmy_check_eligibility] failed: %', sqlerrm;
  return new;
end;
$$;

drop function if exists public.set_voix_optout(boolean);
drop function if exists public.voix_hilmy_make_slug(text);

-- Contrainte stricte (slug + bio) — cf. NB ci-dessus.
alter table public.user_profiles drop constraint if exists user_profiles_voix_complete;
alter table public.user_profiles add constraint user_profiles_voix_complete
  check (
    is_voix_hilmy = false
    or (voix_hilmy_slug is not null and voix_hilmy_bio is not null)
  );
