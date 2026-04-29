-- =====================================================================
-- HILMY · 24 — Voix Hilmy : flag + métadonnées sur user_profiles
--
-- Ajoute le statut "Voix Hilmy" sur la table user_profiles existante.
-- C'est un flag manuel attribué par l'admin Hilmy à 5-10 copines micro-
-- influenceuses partenaires. Pas un nouveau type d'utilisatrice, juste
-- un set de colonnes opt-in.
--
-- Colonnes ajoutées :
--   • is_voix_hilmy             — flag d'activation (default false)
--   • voix_hilmy_slug           — URL courte (hilmy.io/{slug}), unique
--   • voix_hilmy_bio            — bio publique, max 200 chars
--   • voix_hilmy_activated_at   — timestamp d'activation
--   • voix_hilmy_featured_until — expiration de la "Voix de la semaine"
--                                 en vedette. NULL = pas vedette. Si
--                                 > now(), card featured. Si plusieurs
--                                 simultanées, celle avec activated_at
--                                 le plus récent prime côté query.
--
-- Contrainte de complétude : si is_voix_hilmy = true, slug + bio
-- doivent être renseignés.
--
-- L'unicité du slug est portée par un index unique partiel (les NULL
-- coexistent sans conflit). Le check anti-collision avec une route
-- Next.js existante (ex: 'tarifs') est porté côté backend, pas en DB
-- (cf. commit 14, lib/reserved-slugs.ts).
--
-- Idempotent. Voir 24_voix_hilmy_rollback.sql pour le rollback.
-- =====================================================================

-- ─── Colonnes (idempotent) ────────────────────────────────────────
alter table public.user_profiles
  add column if not exists is_voix_hilmy boolean not null default false;

alter table public.user_profiles
  add column if not exists voix_hilmy_slug text;

alter table public.user_profiles
  add column if not exists voix_hilmy_bio text;

alter table public.user_profiles
  add column if not exists voix_hilmy_activated_at timestamptz;

alter table public.user_profiles
  add column if not exists voix_hilmy_featured_until timestamptz;

-- ─── Unicité du slug (index unique partiel) ───────────────────────
-- Seules les lignes avec voix_hilmy_slug non-NULL sont contraintes
-- uniques. Permet à toutes les utilisatrices "non Voix" de coexister
-- avec slug = NULL.
create unique index if not exists user_profiles_voix_slug_unique_idx
  on public.user_profiles (voix_hilmy_slug)
  where voix_hilmy_slug is not null;

-- ─── CHECK constraints (drop + recreate pour idempotence) ────────
alter table public.user_profiles drop constraint if exists user_profiles_voix_bio_length;
alter table public.user_profiles add constraint user_profiles_voix_bio_length
  check (voix_hilmy_bio is null or char_length(voix_hilmy_bio) <= 200);

alter table public.user_profiles drop constraint if exists user_profiles_voix_complete;
alter table public.user_profiles add constraint user_profiles_voix_complete
  check (
    is_voix_hilmy = false
    or (
      is_voix_hilmy = true
      and voix_hilmy_slug is not null
      and voix_hilmy_bio is not null
    )
  );

-- ─── Index pour la recherche par slug (SSR site, très chaud) ─────
-- Distinct de l'index unique : ce 2nd index est filtré sur
-- is_voix_hilmy = true pour optimiser le lookup le plus fréquent
-- (résolution `hilmy.io/{slug}` → user_profile).
create index if not exists idx_user_profiles_voix_slug
  on public.user_profiles (voix_hilmy_slug)
  where is_voix_hilmy = true;

-- ─── Comments ─────────────────────────────────────────────────────
comment on column public.user_profiles.is_voix_hilmy is
  'Flag : copine partenaire micro-influenceuse avec page publique partageable. Activation manuelle par admin Hilmy via SQL Editor en Phase 1 (pas d''UI admin). Default false.';

comment on column public.user_profiles.voix_hilmy_slug is
  'Slug URL court (hilmy.io/{slug}). Unique parmi les non-NULL. NULL si pas Voix. Validation côté backend : ne doit pas matcher une route Next.js existante (cf. lib/reserved-slugs.ts).';

comment on column public.user_profiles.voix_hilmy_bio is
  'Bio publique affichée sur la page perso et la card listing. Max 200 chars. NULL si pas Voix.';

comment on column public.user_profiles.voix_hilmy_activated_at is
  'Timestamp d''activation du statut Voix Hilmy. Sert au tri du listing (plus récentes d''abord) et au tie-break des Voix vedettes simultanées.';

comment on column public.user_profiles.voix_hilmy_featured_until is
  'Date d''expiration de la Voix de la semaine en vedette. NULL = pas vedette. Si > now(), card featured affichée en haut du listing. Si plusieurs Voix vedettes simultanées, celle avec voix_hilmy_activated_at le plus récent prime.';

-- =====================================================================
-- Fonction get_featured_voix() — source unique de vérité
--
-- Toutes les vues/queries qui ont besoin de la Voix vedette ("Voix de
-- la semaine") doivent passer par cette fonction. Pas 3 implémentations
-- différentes (listing app, listing site, mention) — une seule.
--
-- Logique :
--   1. Filtre : is_voix_hilmy = true ET featured_until > now()
--   2. Tie-break si plusieurs simultanées : activated_at DESC
--   3. LIMIT 1 → retourne 0 ou 1 ligne, jamais plus
--
-- Colonnes retournées avec les noms publics (slug, bio, etc.) — alignés
-- sur la future vue voix_hilmy_public (commit 3) pour que les consumers
-- puissent JOIN sans renommage.
--
-- SECURITY DEFINER : la page publique hilmy.io/{slug} est servie en
-- SSR à anon. Cette fonction doit pouvoir résoudre la Voix vedette
-- sans dépendre de la RLS sur user_profiles. Les données exposées
-- sont publiques par design (le slug et la bio sont déjà visibles
-- sur la page perso).
-- =====================================================================

create or replace function public.get_featured_voix()
returns table (
  id uuid,
  prenom text,
  slug text,
  bio text,
  activated_at timestamptz,
  featured_until timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    up.id,
    up.prenom,
    up.voix_hilmy_slug as slug,
    up.voix_hilmy_bio as bio,
    up.voix_hilmy_activated_at as activated_at,
    up.voix_hilmy_featured_until as featured_until
  from public.user_profiles up
  where up.is_voix_hilmy = true
    and up.voix_hilmy_featured_until is not null
    and up.voix_hilmy_featured_until > now()
  order by up.voix_hilmy_activated_at desc
  limit 1
$$;

revoke all on function public.get_featured_voix() from public;
grant execute on function public.get_featured_voix() to anon, authenticated, service_role;

comment on function public.get_featured_voix() is
  'Source unique de vérité pour la Voix vedette ("Voix de la semaine"). Retourne 0 ou 1 ligne : la Voix avec voix_hilmy_featured_until > now(), tie-break par voix_hilmy_activated_at DESC. Toutes les vues/queries qui ont besoin de la Voix vedette doivent passer par cette fonction (pas de duplication de logique).';

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/24_voix_hilmy_rollback.sql
-- =====================================================================
