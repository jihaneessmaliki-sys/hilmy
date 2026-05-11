-- =====================================================================
-- HILMY · 49 — Stripe Checkout subscriptions (Sprint 7)
--
-- Pose le schéma BDD pour les abonnements Stripe prestataires :
--   1. profiles.stripe_customer_id    (FK vers Stripe customer, UNIQUE)
--   2. subscriptions                  (table principale, mirror Stripe)
--   3. RLS owner_read + admin_all
--   4. Trigger updated_at
--
-- Décisions Jiji (2026-05-10) :
--   Q1 (c) → Sélection Hilmy lieux déférée au Sprint 7bis. Ce sprint
--           gère uniquement les paliers PRESTATAIRES :
--           standard / premium / cercle_pro.
--   Q3 (c) → duree_months int CHECK IN (1,3,6,12) — aligné sur le
--           type Duree de app/tarifs/_lib/pricing.ts. Pas de mapping
--           string '3_months' qui dériverait de Stripe.
--
-- profiles.palier CHECK constraint reste IN ('standard','premium','
-- cercle_pro') — pas de 'selection_hilmy'. Le webhook checkout ne
-- propagera jamais ce palier vers profiles dans ce sprint.
--
-- Idempotente. ALTER ADD COLUMN nullable + CREATE TABLE = ultra-safe.
--
-- ⚠️ Application en prod : SUR DEMANDE EXPLICITE de Jiji, après backup
-- (auto-backup 2026-05-09 00:28 UTC dispo).
-- =====================================================================


-- =====================================================================
-- 1. profiles.stripe_customer_id  (FK vers Stripe customer)
-- =====================================================================
-- UNIQUE pour empêcher 2 prestataires de partager le même customer
-- Stripe (= 1 customer = 1 profile, mapping bijectif). Index partial
-- WHERE NOT NULL — la majorité des profiles n'auront pas encore de
-- customer Stripe avant l'ouverture des ventes.

alter table public.profiles
  add column if not exists stripe_customer_id text;

-- Contrainte UNIQUE séparée pour idempotence (drop+recreate possible
-- contrairement à un UNIQUE inline sur ADD COLUMN).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_stripe_customer_id_key'
  ) then
    alter table public.profiles
      add constraint profiles_stripe_customer_id_key unique (stripe_customer_id);
  end if;
end $$;

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.profiles.stripe_customer_id is
  'FK vers Stripe customer (cus_xxx). Crée à la 1ère souscription via '
  '/api/stripe/checkout. Réutilisé pour les checkouts ultérieurs et '
  'l''accès au billing portal.';


-- =====================================================================
-- 2. Table subscriptions
-- =====================================================================
-- Mirror local du state Stripe pour les queries rapides côté UI
-- (dashboard "Mon abonnement" + gating palier server-side via le
-- trigger UPDATE profiles.palier dans le webhook).
--
-- stripe_subscription_id UNIQUE = idempotency key des webhooks
-- (re-run = upsert via ON CONFLICT). Stripe peut re-sender un event
-- 3-7 jours après en cas de timeout — le UNIQUE protège des doublons.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,

  -- Identifiants Stripe (3 niveaux : customer, subscription, prix)
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,

  -- Décodage business
  palier text not null,
  duree_months int not null,
  status text not null,

  -- Cycle de vie (timestamps Stripe)
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  ended_at timestamptz,

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- CHECK : palier prestataire uniquement (Sprint 7 = pas selection_hilmy)
  constraint subscriptions_palier_check
    check (palier in ('standard', 'premium', 'cercle_pro')),

  -- CHECK : durées alignées sur app/tarifs/_lib/pricing.ts Duree
  constraint subscriptions_duree_months_check
    check (duree_months in (1, 3, 6, 12)),

  -- CHECK : statuts Stripe officiels
  constraint subscriptions_status_check
    check (status in (
      'active', 'past_due', 'canceled', 'incomplete',
      'incomplete_expired', 'trialing', 'unpaid'
    ))
);


-- ─── Indexes ─────────────────────────────────────────────────────────
-- Active sub par profile (lookup le plus fréquent : "que paie cette
-- prestataire actuellement ?"). Partial index = compact + rapide.
create index if not exists subscriptions_profile_active_idx
  on public.subscriptions (profile_id, status)
  where status = 'active';

-- Lookup webhook : on reçoit un stripe_subscription_id et on cherche
-- la row à upsert. UNIQUE constraint crée déjà un index implicite, on
-- en re-crée pas un.

-- Ordre temporel : utile pour reporting + admin (last 30 days etc.)
create index if not exists subscriptions_current_period_start_idx
  on public.subscriptions (current_period_start desc);


-- ─── RLS ─────────────────────────────────────────────────────────────
-- Owner read = la prestataire voit son propre abo dans le dashboard.
-- Admin all = panel admin pour debug + audit.
-- Pas de policy INSERT/UPDATE/DELETE pour authenticated : seul l'admin
-- client (service_role) écrit, depuis le webhook /api/stripe/webhook.

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_owner_read" on public.subscriptions;
create policy "subscriptions_owner_read"
  on public.subscriptions
  for select
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

drop policy if exists "subscriptions_admin_all" on public.subscriptions;
create policy "subscriptions_admin_all"
  on public.subscriptions
  for all
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- ─── Trigger updated_at ──────────────────────────────────────────────

create or replace function public.bump_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_updated_at_trg on public.subscriptions;
create trigger subscriptions_updated_at_trg
  before update on public.subscriptions
  for each row execute function public.bump_subscriptions_updated_at();


-- ─── Comments doc ────────────────────────────────────────────────────

comment on table public.subscriptions is
  'Mirror local des abonnements Stripe prestataires (Sprint 7 mig 49). '
  'Updates exclusivement via /api/stripe/webhook avec service_role. '
  'Sélection Hilmy lieux déférée au Sprint 7bis.';

comment on column public.subscriptions.duree_months is
  '1=mensuel, 3=trimestriel, 6=semestriel, 12=annuel. Aligné sur '
  'app/tarifs/_lib/pricing.ts Duree type.';

comment on column public.subscriptions.status is
  'Statut Stripe officiel. ''active'' + ''trialing'' = palier appliqué. '
  '''past_due'' = retry Stripe en cours, palier toujours appliqué. '
  '''canceled''/''incomplete_expired'' = abo terminé, palier=standard.';


-- =====================================================================
-- 3. NOTIFY PostgREST — recharger le schéma exposé par l'API
-- =====================================================================

notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK (à exécuter en SQL si besoin de défaire la mig 49)
-- =====================================================================
-- drop trigger if exists subscriptions_updated_at_trg on public.subscriptions;
-- drop function if exists public.bump_subscriptions_updated_at();
-- drop policy if exists "subscriptions_admin_all" on public.subscriptions;
-- drop policy if exists "subscriptions_owner_read" on public.subscriptions;
-- drop table if exists public.subscriptions cascade;
-- alter table public.profiles drop constraint if exists profiles_stripe_customer_id_key;
-- alter table public.profiles drop column if exists stripe_customer_id;
-- notify pgrst, 'reload schema';
