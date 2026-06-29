-- =====================================================================
-- HILMY · 74 — Voix Hilmy : activation AUTOMATIQUE + opt-out
--
-- Évolution de la migration 73 (qui ne faisait que marquer « éligible » +
-- attendre un opt-in). Désormais : dès 5 recos publiées avec commentaire,
-- la membre devient AUTOMATIQUEMENT Créatrice (profil public + suivable),
-- SAUF si elle s'est retirée (opt-out). Elle peut se retirer / revenir à
-- tout moment via set_voix_optout(). Cohérent avec le fait que recos +
-- prénom sont déjà publics dans le feed.
--
-- Changements vs 73 :
--   • colonne voix_hilmy_opted_out (retrait volontaire)
--   • contrainte de complétude assouplie : slug requis, bio OPTIONNELLE
--     (l'auto-activation ne fabrique pas de bio générique ; la membre
--     écrit la sienne quand elle veut via « Modifier mon profil »)
--   • helper voix_hilmy_make_slug() (génération de slug réutilisable)
--   • le trigger ACTIVE (is_voix_hilmy=true + slug) au lieu de juste
--     marquer éligible
--   • RPC set_voix_optout(bool) : se retirer / revenir
--   • activate_voix_hilmy() : plus de bio requise (aligné contrainte)
--   • backfill : active les membres déjà ≥ 5 recos (hors opt-out)
--
-- Idempotent. Voir 74_voix_hilmy_auto_activation_rollback.sql.
-- =====================================================================

-- ─── 1. Colonne opt-out ───────────────────────────────────────────
alter table public.user_profiles
  add column if not exists voix_hilmy_opted_out boolean not null default false;

comment on column public.user_profiles.voix_hilmy_opted_out is
  'La membre s''est retirée des Créatrices. true → exclue de l''auto-activation et du listing public, même au-dessus du seuil. Géré par set_voix_optout().';

-- ─── 2. Contrainte de complétude assouplie (slug requis, bio non) ──
alter table public.user_profiles drop constraint if exists user_profiles_voix_complete;
alter table public.user_profiles add constraint user_profiles_voix_complete
  check (
    is_voix_hilmy = false
    or voix_hilmy_slug is not null
  );

-- ─── 3. Helper : génère un slug libre depuis le prénom ─────────────
-- Repli d'accents sans dépendance unaccent, évite les routes web
-- réservées + les collisions. Réutilisé par le trigger, la RPC et le
-- backfill (source unique de la logique de slug).
create or replace function public.voix_hilmy_make_slug(p_prenom text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_n int := 0;
  v_reserved constant text[] := array[
    'a-propos','accueil','admin','annuaire','api','auth','charte',
    'comment-ca-marche','connexion','contact','dashboard','evenement-v2',
    'evenements-v2','inscription','inscription-prestataire','je-cherche',
    'lieux','manifeste','mon-espace','mot-de-passe-oublie','onboarding',
    'pass-copine','prestataire-v2','prestataires','recommandation',
    'recommandations','reinitialiser-mot-de-passe','tarifs','hilmy'
  ];
begin
  v_base := lower(coalesce(p_prenom, 'copine'));
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
  return v_slug;
end;
$$;

-- ─── 4. Trigger : AUTO-ACTIVATION sur recommendations ─────────────
-- Remplace la fonction de 73 (même nom → le trigger existant reste lié).
-- Au franchissement du seuil : active is_voix_hilmy + slug + notifie.
-- Respecte l'opt-out. N'active jamais à rebours.
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
  v_opted_out boolean;
  v_prenom text;
begin
  select is_voix_hilmy, voix_hilmy_opted_out, prenom
    into v_is_voix, v_opted_out, v_prenom
  from public.user_profiles
  where user_id = new.user_id;

  -- Déjà Créatrice, retirée volontairement, ou pas de profil → on ne touche pas.
  if coalesce(v_is_voix, false) or coalesce(v_opted_out, false) then
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
      set is_voix_hilmy = true,
          voix_hilmy_slug = coalesce(voix_hilmy_slug, public.voix_hilmy_make_slug(v_prenom)),
          voix_hilmy_eligible_at = coalesce(voix_hilmy_eligible_at, now()),
          voix_hilmy_activated_at = coalesce(voix_hilmy_activated_at, now())
    where user_id = new.user_id
      and is_voix_hilmy = false
      and voix_hilmy_opted_out = false;

    insert into public.notifications (user_id, type, payload)
    values (
      new.user_id,
      'voix_hilmy_eligible',
      jsonb_build_object('recos_count', v_count, 'threshold', v_threshold, 'auto', true)
    );
  end if;

  return new;
exception when others then
  raise notice '[voix_hilmy_check_eligibility] failed: %', sqlerrm;
  return new;
end;
$$;

-- (le trigger trg_voix_hilmy_eligibility de la migration 73 reste en place)

-- ─── 5. RPC opt-out / opt-in (se retirer / revenir) ───────────────
create or replace function public.set_voix_optout(p_opt_out boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_prenom text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_opt_out then
    -- Se retirer : sort du listing (is_voix_hilmy=false) + mémorise le refus.
    -- On garde le slug pour le réutiliser si elle revient.
    update public.user_profiles
      set voix_hilmy_opted_out = true,
          is_voix_hilmy = false
    where user_id = v_uid;
  else
    -- Revenir : ré-active si toujours éligible (≥ seuil).
    select count(*) into v_count
    from public.recommendations r
    where r.user_id = v_uid
      and r.status = 'published'
      and r.comment is not null
      and length(trim(r.comment)) > 0;

    select prenom into v_prenom from public.user_profiles where user_id = v_uid;

    update public.user_profiles
      set voix_hilmy_opted_out = false,
          is_voix_hilmy = (v_count >= 5),
          voix_hilmy_slug = case
            when v_count >= 5 then coalesce(voix_hilmy_slug, public.voix_hilmy_make_slug(v_prenom))
            else voix_hilmy_slug end,
          voix_hilmy_eligible_at = case
            when v_count >= 5 then coalesce(voix_hilmy_eligible_at, now())
            else voix_hilmy_eligible_at end,
          voix_hilmy_activated_at = case
            when v_count >= 5 then coalesce(voix_hilmy_activated_at, now())
            else voix_hilmy_activated_at end
    where user_id = v_uid;
  end if;
end;
$$;

revoke all on function public.set_voix_optout(boolean) from public;
grant execute on function public.set_voix_optout(boolean) to authenticated;

comment on function public.set_voix_optout(boolean) is
  'Retrait/réintégration des Créatrices par la membre. true → is_voix_hilmy=false + opted_out=true. false → opted_out=false + ré-activation si ≥ 5 recos.';

-- ─── 6. activate_voix_hilmy() : plus de bio requise ───────────────
-- Aligné sur la contrainte assouplie. Reste utile comme activation
-- manuelle de secours (le trigger fait le gros du travail).
create or replace function public.activate_voix_hilmy()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_prenom text;
  v_eligible timestamptz;
  v_is_voix boolean;
  v_existing text;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select prenom, voix_hilmy_eligible_at, is_voix_hilmy, voix_hilmy_slug
    into v_prenom, v_eligible, v_is_voix, v_existing
  from public.user_profiles
  where user_id = v_uid;

  if coalesce(v_is_voix, false) then
    return v_existing;
  end if;
  if v_eligible is null then
    raise exception 'not_eligible';
  end if;

  v_slug := coalesce(v_existing, public.voix_hilmy_make_slug(v_prenom));

  update public.user_profiles
    set is_voix_hilmy = true,
        voix_hilmy_opted_out = false,
        voix_hilmy_slug = v_slug,
        voix_hilmy_activated_at = coalesce(voix_hilmy_activated_at, now())
  where user_id = v_uid;

  return v_slug;
end;
$$;

-- ─── 7. Backfill : active les membres déjà ≥ 5 recos (hors opt-out) ─
-- Boucle row-par-row (et non un UPDATE ensembliste) pour que
-- voix_hilmy_make_slug voie les slugs posés aux itérations précédentes
-- → pas de collision entre deux prénoms identiques. Idempotent (filtre
-- is_voix_hilmy=false → re-jouer ne re-traite personne).
do $$
declare
  r record;
begin
  for r in
    select up.user_id, up.prenom
    from public.user_profiles up
    where up.is_voix_hilmy = false
      and up.voix_hilmy_opted_out = false
      and (
        select count(*)
        from public.recommendations rr
        where rr.user_id = up.user_id
          and rr.status = 'published'
          and rr.comment is not null
          and length(trim(rr.comment)) > 0
      ) >= 5
  loop
    update public.user_profiles
      set is_voix_hilmy = true,
          voix_hilmy_slug = coalesce(voix_hilmy_slug, public.voix_hilmy_make_slug(r.prenom)),
          voix_hilmy_eligible_at = coalesce(voix_hilmy_eligible_at, now()),
          voix_hilmy_activated_at = coalesce(voix_hilmy_activated_at, now())
    where user_id = r.user_id;

    insert into public.notifications (user_id, type, payload)
    values (r.user_id, 'voix_hilmy_eligible', jsonb_build_object('auto', true, 'backfill', true));
  end loop;
end $$;
