-- =====================================================================
-- HILMY · Stage 4 · 04 — ALTER recommendations (non-destructif)
-- La table recommendations est déjà polymorphique (type=place | prestataire).
-- Quand type=prestataire → elle sert de "avis". On ajoute juste la réponse pro.
-- =====================================================================

alter table public.recommendations add column if not exists reponse_pro text;
alter table public.recommendations add column if not exists reponse_date timestamptz;

-- Contrainte : reponse_date cohérente avec reponse_pro
alter table public.recommendations drop constraint if exists recommendations_reponse_coherent;
alter table public.recommendations add constraint recommendations_reponse_coherent
  check (
    (reponse_pro is null and reponse_date is null)
    or (reponse_pro is not null and reponse_date is not null)
  );

-- Contrainte : type cohérent avec place_id / profile_id (XOR)
alter table public.recommendations drop constraint if exists recommendations_type_coherent;
alter table public.recommendations add constraint recommendations_type_coherent
  check (
    (type = 'place' and place_id is not null and profile_id is null)
    or
    (type = 'prestataire' and profile_id is not null and place_id is null)
  );

-- Indexes utiles pour les queries V2
create index if not exists recommendations_profile_status_idx
  on public.recommendations (profile_id) where status = 'published' and type = 'prestataire';
create index if not exists recommendations_place_status_idx
  on public.recommendations (place_id) where status = 'published' and type = 'place';
create index if not exists recommendations_user_idx on public.recommendations (user_id);

-- Trigger : met à jour reponse_date quand reponse_pro change
create or replace function public.recommendations_set_reponse_date()
returns trigger language plpgsql as $$
begin
  if new.reponse_pro is not null
     and new.reponse_pro <> ''
     and (old is null or old.reponse_pro is distinct from new.reponse_pro)
  then
    new.reponse_date = now();
  elsif new.reponse_pro is null or new.reponse_pro = '' then
    new.reponse_date = null;
    new.reponse_pro = null;
  end if;
  return new;
end;
$$;

drop trigger if exists recommendations_reponse_date on public.recommendations;
create trigger recommendations_reponse_date
  before insert or update of reponse_pro on public.recommendations
  for each row execute function public.recommendations_set_reponse_date();

comment on column public.recommendations.reponse_pro is
  'Réponse publique de la prestataire à un avis (type=prestataire). Max 1 réponse par avis.';
comment on column public.recommendations.reponse_date is
  'Auto-set par trigger quand reponse_pro est renseignée.';
