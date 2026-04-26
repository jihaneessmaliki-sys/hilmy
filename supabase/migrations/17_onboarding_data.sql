-- =====================================================================
-- HILMY · 17 — Onboarding utilisatrice : données saisies au J0
-- Idempotent.
--
-- Contexte : `user_profiles` est une table existante (créée hors
-- migrations 01-15). On ajoute des colonnes de manière non-destructive.
--
-- Colonnes attendues sur user_profiles avant ce migration :
--   id, user_id, prenom, pays, ville, signupType, bio, avatar_url,
--   created_at
-- (cf. lib/supabase/types.ts ligne ~310)
--
-- Cette migration ajoute :
--   • univers_choisis text[]    — max 3 univers d''intérêt
--   • posture text              — 1 parmi 3 valeurs
--   • onboarding_data jsonb     — snapshot figé J0
--   • preferences jsonb         — évolutif (default '{}')
--   • onboarding_completed_at   — timestamp ou NULL
--
-- Note : `ville` existe déjà → ALTER ADD IF NOT EXISTS no-op.
-- =====================================================================

-- ─── Colonnes (idempotent) ────────────────────────────────────────
alter table public.user_profiles
  add column if not exists ville text;

alter table public.user_profiles
  add column if not exists univers_choisis text[];

alter table public.user_profiles
  add column if not exists posture text;

alter table public.user_profiles
  add column if not exists onboarding_data jsonb;

alter table public.user_profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

alter table public.user_profiles
  add column if not exists onboarding_completed_at timestamptz;

-- ─── CHECK constraints ────────────────────────────────────────────
alter table public.user_profiles drop constraint if exists user_profiles_posture_check;
alter table public.user_profiles add constraint user_profiles_posture_check
  check (
    posture is null
    or posture in ('partage_tout', 'partage_selectif', 'decouverte_surtout')
  );

alter table public.user_profiles drop constraint if exists user_profiles_univers_max3_check;
alter table public.user_profiles add constraint user_profiles_univers_max3_check
  check (
    univers_choisis is null
    or array_length(univers_choisis, 1) <= 3
  );

-- ─── Index : retrouver les users qui n''ont pas fini l''onboarding ─
create index if not exists user_profiles_pending_onboarding_idx
  on public.user_profiles (user_id)
  where onboarding_completed_at is null;

-- ─── Comments ─────────────────────────────────────────────────────
comment on column public.user_profiles.ville is
  'Ville saisie à l''onboarding. Permet pré-remplissage des formulaires de partage de reco.';

comment on column public.user_profiles.univers_choisis is
  'Univers d''intérêt sélectionnés à l''onboarding (max 3 parmi 9 valeurs : beaute, bien-etre, enfants-famille, sport-nutrition, mode-style, lifestyle-deco, food-restauration, enseignement-coaching, professionnel). Pas de CHECK constraint sur les valeurs (évolutif).';

comment on column public.user_profiles.posture is
  'Posture déclarée : partage_tout | partage_selectif | decouverte_surtout. Influence le tone des CTAs (Sprint 2+).';

comment on column public.user_profiles.onboarding_data is
  'Snapshot figé J0 (jsonb). Garde la trace exacte des réponses initiales même si les colonnes individuelles évoluent ensuite. Format : { ville, univers_choisis[], posture, completed_at, skipped: boolean }.';

comment on column public.user_profiles.preferences is
  'Préférences évolutives (jsonb). Distinct de onboarding_data (figé). Default {}.';

comment on column public.user_profiles.onboarding_completed_at is
  'Timestamp du moment où l''utilisatrice a soumis l''onboarding (réponses ou skip volontaire). NULL = pas encore vue. Sert à savoir si on doit rediriger vers /onboarding.';

-- =====================================================================
-- ROLLBACK (à exécuter en cas de besoin)
-- =====================================================================
-- drop index if exists public.user_profiles_pending_onboarding_idx;
-- alter table public.user_profiles drop constraint if exists user_profiles_univers_max3_check;
-- alter table public.user_profiles drop constraint if exists user_profiles_posture_check;
-- alter table public.user_profiles drop column if exists onboarding_completed_at;
-- alter table public.user_profiles drop column if exists preferences;
-- alter table public.user_profiles drop column if exists onboarding_data;
-- alter table public.user_profiles drop column if exists posture;
-- alter table public.user_profiles drop column if exists univers_choisis;
-- -- ATTENTION : ne PAS drop la colonne `ville` au rollback : elle
-- -- existait avant cette migration.
-- =====================================================================
