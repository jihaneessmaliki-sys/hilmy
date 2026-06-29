-- =====================================================================
-- HILMY · 73 — Voix Hilmy : éligibilité automatique + activation opt-in
--
-- Récompense automatiquement les membres actives : dès qu'une membre
-- atteint 5 recommandations PUBLIÉES AVEC commentaire (exactement la
-- définition de recos_count de la vue voix_hilmy_public), elle devient
-- « éligible » Voix Hilmy. Un trigger pose voix_hilmy_eligible_at + une
-- notification. Elle reste maître de la suite : l'activation réelle
-- (profil + recos rendus publics) passe par un opt-in en 1 tap côté app,
-- via la RPC activate_voix_hilmy() — ce qui satisfait aussi la contrainte
-- user_profiles_voix_complete (slug + bio requis quand is_voix_hilmy).
--
-- Le trigger ne fait que PROMOUVOIR : supprimer une reco plus tard ne
-- déclasse jamais. Détection 100 % serveur (pas de cron), à toute épreuve
-- (exception capturée → ne casse jamais l'écriture de la reco).
--
-- Idempotent. Voir 73_voix_hilmy_auto_eligibility_rollback.sql.
-- =====================================================================

-- ─── 1. Colonne d'éligibilité ─────────────────────────────────────
alter table public.user_profiles
  add column if not exists voix_hilmy_eligible_at timestamptz;

comment on column public.user_profiles.voix_hilmy_eligible_at is
  'Date à laquelle la membre a franchi le seuil de recos pour devenir Voix Hilmy. NULL = pas encore éligible. Posé par le trigger trg_voix_hilmy_eligibility. N''implique PAS l''activation : is_voix_hilmy reste false jusqu''à l''opt-in via activate_voix_hilmy().';

-- ─── 2. Nouveau type de notification ──────────────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'palier_franchi',
    'reco_sauvegardee',
    'parrainage_inscrit',
    'top_recos_semaine',
    'voix_hilmy_eligible'
  ));

-- ─── 3. Trigger de détection sur recommendations ──────────────────
-- AFTER INSERT OR UPDATE OF status : recompte les recos publiées avec
-- commentaire de l'autrice ; au franchissement du seuil, pose
-- eligible_at + notifie. Early-return si déjà Voix ou déjà éligible
-- (la plupart des recos d'une créatrice existante ne déclenchent donc
-- aucun COUNT).
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

  -- Déjà Voix, déjà éligible, ou pas de profil membre → rien à faire.
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
    values (
      new.user_id,
      'voix_hilmy_eligible',
      jsonb_build_object('recos_count', v_count, 'threshold', v_threshold)
    );
  end if;

  return new;
exception when others then
  raise notice '[voix_hilmy_check_eligibility] failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_voix_hilmy_eligibility on public.recommendations;
create trigger trg_voix_hilmy_eligibility
  after insert or update of status on public.recommendations
  for each row execute function public.voix_hilmy_check_eligibility();

-- ─── 4. RPC d'activation (opt-in 1 tap) ───────────────────────────
-- La membre, une fois éligible ET sa présentation (voix_hilmy_bio)
-- renseignée, appelle cette RPC pour devenir Voix Hilmy. Génère un slug
-- propre depuis le prénom (accents repliés sans dépendance unaccent),
-- en évitant les routes web réservées et les collisions. Idempotente :
-- si déjà active, renvoie le slug existant.
create or replace function public.activate_voix_hilmy()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_prenom text;
  v_bio text;
  v_eligible timestamptz;
  v_is_voix boolean;
  v_existing text;
  v_base text;
  v_slug text;
  v_n int := 0;
  -- Routes web top-level : un slug Voix résout à hilmy.io/{slug} via
  -- app/[slug], il ne doit donc jamais entrer en collision.
  v_reserved constant text[] := array[
    'a-propos','accueil','admin','annuaire','api','auth','charte',
    'comment-ca-marche','connexion','contact','dashboard','evenement-v2',
    'evenements-v2','inscription','inscription-prestataire','je-cherche',
    'lieux','manifeste','mon-espace','mot-de-passe-oublie','onboarding',
    'pass-copine','prestataire-v2','prestataires','recommandation',
    'recommandations','reinitialiser-mot-de-passe','tarifs','hilmy'
  ];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select prenom, voix_hilmy_bio, voix_hilmy_eligible_at, is_voix_hilmy, voix_hilmy_slug
    into v_prenom, v_bio, v_eligible, v_is_voix, v_existing
  from public.user_profiles
  where user_id = v_uid;

  -- Déjà active → idempotent.
  if coalesce(v_is_voix, false) then
    return v_existing;
  end if;

  if v_eligible is null then
    raise exception 'not_eligible';
  end if;

  if v_bio is null or length(trim(v_bio)) = 0 then
    raise exception 'bio_required';
  end if;

  -- Slugify le prénom : repli d'accents (1:1) + multi-char + nettoyage.
  v_base := lower(coalesce(v_prenom, 'copine'));
  v_base := replace(replace(v_base, 'œ', 'oe'), 'æ', 'ae');
  v_base := translate(
    v_base,
    'àâäáãåçéèêëíìîïñóòôöõúùûü',
    'aaaaaaceeeeiiiinooooouuuu'
  );
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  if v_base = '' then
    v_base := 'copine';
  end if;

  -- Premier slug libre (non réservé + non pris).
  v_slug := v_base;
  loop
    if not (v_slug = any(v_reserved))
       and not exists (
         select 1 from public.user_profiles where voix_hilmy_slug = v_slug
       ) then
      exit;
    end if;
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  update public.user_profiles
    set is_voix_hilmy = true,
        voix_hilmy_slug = v_slug,
        voix_hilmy_activated_at = now()
  where user_id = v_uid;

  return v_slug;
end;
$$;

revoke all on function public.activate_voix_hilmy() from public;
grant execute on function public.activate_voix_hilmy() to authenticated;

comment on function public.activate_voix_hilmy() is
  'Opt-in Voix Hilmy : la membre éligible (voix_hilmy_eligible_at non NULL) avec une présentation (voix_hilmy_bio) renseignée devient Voix Hilmy. Génère le slug, pose is_voix_hilmy + activated_at. Idempotente. Erreurs : not_authenticated / not_eligible / bio_required.';

-- ─── 5. Backfill des membres déjà au-dessus du seuil ──────────────
-- One-shot idempotent : marque éligibles les membres existantes ayant
-- déjà ≥ 5 recos publiées avec commentaire, et les notifie. Re-jouer la
-- migration ne re-notifie pas (eligible_at déjà posé → 0 ligne).
with newly_eligible as (
  update public.user_profiles up
    set voix_hilmy_eligible_at = now()
  where up.is_voix_hilmy = false
    and up.voix_hilmy_eligible_at is null
    and (
      select count(*)
      from public.recommendations r
      where r.user_id = up.user_id
        and r.status = 'published'
        and r.comment is not null
        and length(trim(r.comment)) > 0
    ) >= 5
  returning up.user_id
)
insert into public.notifications (user_id, type, payload)
select user_id, 'voix_hilmy_eligible', jsonb_build_object('backfill', true, 'threshold', 5)
from newly_eligible;
