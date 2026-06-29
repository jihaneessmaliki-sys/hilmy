-- =====================================================================
-- HILMY · 77 — Notifs du follow (étape B)
--
-- Quand un compte suivi publie quelque chose, ses abonnées sont notifiées :
--   • une COPINE suivie publie une reco de lieu  → 'followed_new_reco'
--   • une PRESTATAIRE suivie poste une promo      → 'followed_new_promo'
--
-- Fan-out : une notification par abonnée (INSERT ... SELECT sur
-- voix_hilmy_follows, le graphe de follow unifié). Triggers SECURITY
-- DEFINER + exception capturée (ne cassent jamais l'écriture source).
--
-- Idempotent. Rollback : 77_follow_notifications_rollback.sql.
-- =====================================================================

-- ─── 1. Nouveaux types de notification ────────────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'palier_franchi',
    'reco_sauvegardee',
    'parrainage_inscrit',
    'top_recos_semaine',
    'voix_hilmy_eligible',
    'followed_new_reco',
    'followed_new_promo'
  ));

-- ─── 2. Reco d'une copine suivie ──────────────────────────────────
-- AFTER INSERT OR UPDATE OF status sur recommendations. Ne notifie qu'au
-- moment de la PUBLICATION d'une reco de lieu commentée (pas sur les
-- éditions ultérieures). Fan-out vers les abonnées de l'autrice.
create or replace function public.notify_followers_new_reco()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prenom text;
  v_place_name text;
  v_place_slug text;
begin
  -- Uniquement recos de lieu publiées avec commentaire.
  if new.status <> 'published'
     or new.type <> 'place'
     or new.comment is null
     or length(trim(new.comment)) = 0 then
    return new;
  end if;

  -- Sur UPDATE : ne notifier que si on passe À published (sinon une
  -- simple édition de commentaire re-notifierait tout le monde).
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  select prenom into v_prenom from public.user_profiles where user_id = new.user_id;
  select name, slug into v_place_name, v_place_slug from public.places where id = new.place_id;

  insert into public.notifications (user_id, type, payload)
  select
    f.follower_user_id,
    'followed_new_reco',
    jsonb_build_object(
      'author_user_id', new.user_id,
      'author_prenom', v_prenom,
      'place_slug', v_place_slug,
      'place_name', v_place_name,
      'reco_id', new.id
    )
  from public.voix_hilmy_follows f
  where f.voix_user_id = new.user_id;

  return new;
exception when others then
  raise notice '[notify_followers_new_reco] failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_notify_followers_new_reco on public.recommendations;
create trigger trg_notify_followers_new_reco
  after insert or update of status on public.recommendations
  for each row
  when (new.status = 'published')
  execute function public.notify_followers_new_reco();

-- ─── 3. Promo d'une prestataire suivie ────────────────────────────
-- AFTER INSERT sur profile_promos. Notifie les abonnées du compte
-- propriétaire de la fiche.
create or replace function public.notify_followers_new_promo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_nom text;
  v_slug text;
begin
  select user_id, nom, slug into v_owner, v_nom, v_slug
  from public.profiles where id = new.profile_id;

  if v_owner is null then
    return new;
  end if;

  insert into public.notifications (user_id, type, payload)
  select
    f.follower_user_id,
    'followed_new_promo',
    jsonb_build_object(
      'prestataire_user_id', v_owner,
      'prestataire_nom', v_nom,
      'prestataire_slug', v_slug,
      'promo_title', new.title,
      'promo_id', new.id
    )
  from public.voix_hilmy_follows f
  where f.voix_user_id = v_owner;

  return new;
exception when others then
  raise notice '[notify_followers_new_promo] failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_notify_followers_new_promo on public.profile_promos;
create trigger trg_notify_followers_new_promo
  after insert on public.profile_promos
  for each row
  execute function public.notify_followers_new_promo();
