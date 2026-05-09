-- =====================================================================
-- HILMY · 42 — Photos gating server-side (Phase 3 · PR-1)
--
-- Trigger BEFORE UPDATE on profiles.galerie qui REJETTE l'UPDATE si
-- jsonb_array_length(NEW.galerie) > cap selon palier+is_founder ET si
-- la nouvelle galerie est PLUS LONGUE que l'ancienne (downgrade gracieux).
--
-- Trigger BEFORE UPDATE on places.photos avec même logique selon
-- places.palier ('aucun'=8, 'selection_hilmy'=illimité).
--
-- Caps DOIVENT rester alignés avec lib/palier-limits.ts (PHOTO_LIMIT +
-- PLACE_PHOTO_LIMIT). Si tu changes les valeurs ici, change aussi le TS
-- — sinon UI ment au user (côté client il pense pouvoir, côté serveur
-- le trigger rejette).
--
-- Idempotente. Voir bas de fichier pour rollback.
-- ⚠️ Application en prod : SUR DEMANDE EXPLICITE de Jiji uniquement,
--    après backup Supabase manuel.
-- =====================================================================


-- =====================================================================
-- 1. Trigger profiles.galerie cap
-- =====================================================================

create or replace function public.enforce_profiles_galerie_cap()
returns trigger
language plpgsql
as $$
declare
  v_old_count int;
  v_new_count int;
  v_cap int;
begin
  -- Skip si galerie n'a pas changé (UPDATE d'autres colonnes)
  if old.galerie is not distinct from new.galerie then
    return new;
  end if;

  -- Cap selon palier effectif. Founder = cercle_pro effectif = illimité,
  -- aligné avec getEffectivePalier() côté TS (lib/permissions.ts).
  v_cap := case
    when new.is_founder = true then null
    when new.palier = 'cercle_pro' then null
    when new.palier = 'premium' then 20
    when new.palier = 'standard' then 5
    else 5  -- défaut conservateur (palier inconnu / null)
  end;

  -- null = illimité → skip
  if v_cap is null then
    return new;
  end if;

  v_old_count := coalesce(jsonb_array_length(coalesce(old.galerie, '[]'::jsonb)), 0);
  v_new_count := coalesce(jsonb_array_length(coalesce(new.galerie, '[]'::jsonb)), 0);

  -- Reject seulement si NEW > cap ET NEW augmente vs OLD.
  -- Permet le "downgrade gracieux" : un Premium qui passe en Standard
  -- avec 18 photos peut les conserver et les réduire, juste pas en
  -- ajouter au-delà du nouveau cap (5).
  if v_new_count > v_cap and v_new_count > v_old_count then
    raise exception
      'Photo cap exceeded for palier %: % photos > % max (was %)',
      new.palier, v_new_count, v_cap, v_old_count
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_galerie_cap on public.profiles;
create trigger profiles_enforce_galerie_cap
  before update of galerie on public.profiles
  for each row execute function public.enforce_profiles_galerie_cap();


-- =====================================================================
-- 2. Trigger places.photos cap
-- =====================================================================

create or replace function public.enforce_places_photos_cap()
returns trigger
language plpgsql
as $$
declare
  v_old_count int;
  v_new_count int;
  v_cap int;
begin
  if old.photos is not distinct from new.photos then
    return new;
  end if;

  v_cap := case
    when new.palier = 'selection_hilmy' then null  -- illimité
    else 8  -- 'aucun' (default mig 41) = 8 photos max
  end;

  if v_cap is null then
    return new;
  end if;

  v_old_count := coalesce(jsonb_array_length(coalesce(old.photos, '[]'::jsonb)), 0);
  v_new_count := coalesce(jsonb_array_length(coalesce(new.photos, '[]'::jsonb)), 0);

  if v_new_count > v_cap and v_new_count > v_old_count then
    raise exception
      'Photo cap exceeded for place palier %: % photos > % max (was %)',
      new.palier, v_new_count, v_cap, v_old_count
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists places_enforce_photos_cap on public.places;
create trigger places_enforce_photos_cap
  before update of photos on public.places
  for each row execute function public.enforce_places_photos_cap();


-- =====================================================================
-- 3. Comments
-- =====================================================================

comment on function public.enforce_profiles_galerie_cap() is
  'Server-side photo cap enforcement for prestataires. Caps must stay '
  'aligned with lib/palier-limits.ts PHOTO_LIMIT. Founder is_founder=true '
  '→ unlimited (cercle_pro effectif). Downgrade-gracieux : autorise les '
  'reductions au-dessus du cap, rejette uniquement les augmentations '
  'au-dessus du cap.';

comment on function public.enforce_places_photos_cap() is
  'Server-side photo cap enforcement for places. Cap aligned with '
  'lib/palier-limits.ts PLACE_PHOTO_LIMIT (aucun=8, selection_hilmy='
  'unlimited). Same downgrade-gracieux logic que profiles.';


-- =====================================================================
-- Reload PostgREST schema cache
-- =====================================================================
notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK (à exécuter manuellement si besoin)
-- =====================================================================
-- drop trigger if exists places_enforce_photos_cap on public.places;
-- drop trigger if exists profiles_enforce_galerie_cap on public.profiles;
-- drop function if exists public.enforce_places_photos_cap();
-- drop function if exists public.enforce_profiles_galerie_cap();
-- =====================================================================
