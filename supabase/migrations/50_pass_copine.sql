-- =====================================================================
-- HILMY · 50 — Pass Copine (abonnement utilisatrices 4,99€/mois ou 49€/an)
--
-- Pose le schéma pour le Pass Copine — abonnement OPTIONNEL côté
-- utilisatrices (PAS un paywall d'accès, juste deux paywalls hard :
-- favoris > 10 et events accès anticipé).
--
-- Architecture (validée Jiji 2026-05-13) :
--   • user_profiles : colonnes denormalisées is_copine + copine_since +
--     copine_stripe_customer_id (fast-path gating, mirror du pattern
--     profiles.palier mig 19)
--   • copine_subscriptions : table mirror Stripe parallèle à
--     subscriptions (mig 49) — FK user_id → auth.users, historique
--     préservé pour analytics
--   • Fonction is_user_copine() SECURITY DEFINER : réutilisée par le
--     trigger favoris ET par la policy INSERT sur pro_perk_claims
--   • pro_perks + pro_perk_claims : offres créées par prestataires
--     Cercle Pro (modération admin via status='pending_review'),
--     consommées par les Copines (1 code unique par perk × user)
--   • events.early_access_until : paywall accès anticipé Copines 48h
--   • Trigger favoris : 10 max si non-Copine, illimité si Copine
--
-- Décisions clés :
--   • is_copine est strictement piloté par le webhook Stripe sur events
--     Copine — JAMAIS modifiable côté authenticated (RLS sans update)
--   • Cercle Pro (prestataire) ≠ Copine (utilisatrice). Une même
--     personne physique peut être les deux (deux abos distincts).
--     Le founder gift Cercle Pro ne donne PAS le Pass Copine.
--   • PROMO_LANCEMENT-50% ne s'applique pas au Pass Copine.
--
-- Idempotente. Rollback complet en bas de fichier.
--
-- ⚠️ Application en prod : SUR DEMANDE EXPLICITE de Jiji, après backup.
-- =====================================================================


-- =====================================================================
-- 1. user_profiles — colonnes Copine
-- =====================================================================
-- Fast-path gating column. Source de vérité = ces colonnes. Le mirror
-- copine_subscriptions (section 2) garde l'historique mais le UI lit
-- user_profiles directement pour les checks "is_copine ?".
--
-- copine_stripe_customer_id UNIQUE pour empêcher 2 utilisatrices de
-- partager le même customer Stripe (1 customer = 1 user_profile).
-- Une copine peut PARTAGER un customer Stripe avec sa fiche prestataire
-- (même email donc même customer côté Stripe), mais ici on stocke
-- uniquement le customer attaché au flow d'abonnement Copine.

alter table public.user_profiles
  add column if not exists is_copine boolean not null default false;

alter table public.user_profiles
  add column if not exists copine_since timestamptz;

alter table public.user_profiles
  add column if not exists copine_stripe_customer_id text;

-- UNIQUE séparée pour idempotence (drop+recreate possible).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_profiles'::regclass
      and conname = 'user_profiles_copine_stripe_customer_id_key'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_copine_stripe_customer_id_key
      unique (copine_stripe_customer_id);
  end if;
end $$;

-- Index partiel : la majorité des user_profiles n'auront pas de
-- copine_stripe_customer_id. Aussi : index sur is_copine pour les
-- requêtes admin / analytics ("combien de Copines actives ?").
create index if not exists user_profiles_copine_stripe_customer_id_idx
  on public.user_profiles (copine_stripe_customer_id)
  where copine_stripe_customer_id is not null;

create index if not exists user_profiles_is_copine_idx
  on public.user_profiles (is_copine)
  where is_copine = true;

comment on column public.user_profiles.is_copine is
  'Vrai si abonnement Pass Copine actif. Modifié uniquement via webhook '
  'Stripe (/api/stripe/webhook). Pas de policy UPDATE authenticated.';
comment on column public.user_profiles.copine_since is
  'Timestamp du premier checkout Copine réussi. Conservé après '
  'unsubscribe pour analytics (réabonnement, fidélité).';
comment on column public.user_profiles.copine_stripe_customer_id is
  'FK vers Stripe customer (cus_xxx) attaché au flow Pass Copine. '
  'Peut être identique à profiles.stripe_customer_id si la personne '
  'est aussi prestataire avec le même email Stripe (1 customer Stripe '
  '= 1 email, mais 2 subs distinctes côté Hilmy).';


-- =====================================================================
-- 2. copine_subscriptions — mirror Stripe parallèle à subscriptions
-- =====================================================================
-- Structure miroir de public.subscriptions (mig 49) mais :
--   • FK user_id → auth.users (pas profile_id → profiles)
--   • plan text in ('monthly','annual') au lieu de palier+duree_months
--   • Mêmes statuts Stripe officiels
--
-- stripe_subscription_id UNIQUE = idempotency key des webhooks. La
-- contrainte UNIQUE crée un index btree implicite — pas besoin d'en
-- créer un explicite supplémentaire (cf risque 4 plan : redondance
-- évitée).

create table if not exists public.copine_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Identifiants Stripe
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,

  -- Décodage business
  plan text not null,
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

  constraint copine_subscriptions_plan_check
    check (plan in ('monthly', 'annual')),

  constraint copine_subscriptions_status_check
    check (status in (
      'active', 'past_due', 'canceled', 'incomplete',
      'incomplete_expired', 'trialing', 'unpaid'
    ))
);

-- Active sub par user (lookup le plus fréquent : "cette user paie-t-elle
-- actuellement ?"). Partial index = compact + rapide.
create index if not exists copine_subscriptions_user_active_idx
  on public.copine_subscriptions (user_id, status)
  where status = 'active';

-- Ordre temporel : utile reporting + analytics churn
create index if not exists copine_subscriptions_current_period_start_idx
  on public.copine_subscriptions (current_period_start desc);


-- ─── RLS ─────────────────────────────────────────────────────────────
-- Owner read = la copine voit son propre abo dans son espace.
-- Admin all = debug + audit.
-- Pas de policy INSERT/UPDATE/DELETE pour authenticated : seul l'admin
-- client (service_role via webhook) écrit.

alter table public.copine_subscriptions enable row level security;

drop policy if exists "copine_subscriptions_owner_read" on public.copine_subscriptions;
create policy "copine_subscriptions_owner_read"
  on public.copine_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "copine_subscriptions_admin_all" on public.copine_subscriptions;
create policy "copine_subscriptions_admin_all"
  on public.copine_subscriptions
  for all
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- ─── Trigger updated_at ──────────────────────────────────────────────

create or replace function public.bump_copine_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists copine_subscriptions_updated_at_trg on public.copine_subscriptions;
create trigger copine_subscriptions_updated_at_trg
  before update on public.copine_subscriptions
  for each row execute function public.bump_copine_subscriptions_updated_at();


comment on table public.copine_subscriptions is
  'Mirror local des abonnements Stripe Pass Copine (mig 50). Updates '
  'exclusivement via /api/stripe/webhook avec service_role. Parallèle '
  'à public.subscriptions (mig 49) qui gère les abos prestataires.';

comment on column public.copine_subscriptions.plan is
  'monthly = 4,99€/mois · annual = 49€/an (2 mois offerts). Aligné sur '
  'les 2 prices Stripe LIVE STRIPE_PRICE_COPINE_MONTHLY/ANNUAL.';


-- =====================================================================
-- 3. is_user_copine(uuid) — fonction réutilisable
-- =====================================================================
-- SECURITY DEFINER pour bypass RLS (le trigger favoris et la policy
-- pro_perk_claims doivent pouvoir lire user_profiles.is_copine même
-- quand le caller n'a pas de droit SELECT sur le row).
--
-- search_path explicite = parade contre l'attaque par hijacking
-- (un schéma dans le path pourrait shadow public.user_profiles).
--
-- STABLE = même valeur dans une même transaction → optimisation planner.

create or replace function public.is_user_copine(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select is_copine from public.user_profiles where user_id = p_user_id limit 1),
    false
  );
$$;

revoke all on function public.is_user_copine(uuid) from public;
grant execute on function public.is_user_copine(uuid) to authenticated, anon;

comment on function public.is_user_copine(uuid) is
  'Retourne true si user_profiles.is_copine = true pour ce user_id. '
  'SECURITY DEFINER : utilisable depuis triggers et RLS policies sans '
  'que le caller ait besoin de droit SELECT direct sur user_profiles.';


-- =====================================================================
-- 4. pro_perks — offres prestataires Cercle Pro pour Copines
-- =====================================================================
-- Workflow modération :
--   created → status='pending_review' (admin email envoyé via Resend)
--   admin valide → status='active'
--   admin refuse → status='rejected' + rejection_reason
--   prestataire peut pauser → status='paused' (revisitable)
--   ends_at < now() ou used_count >= max_uses → status='expired'
--     (script cron ou check à la lecture)
--
-- prestataire_profile_id pointe sur profiles.id (la fiche prestataire),
-- pas sur auth.users(id). Cohérent avec le pattern Hilmy (profiles
-- = prestataires, user_profiles = membres).

create table if not exists public.pro_perks (
  id uuid primary key default gen_random_uuid(),
  prestataire_profile_id uuid not null references public.profiles(id) on delete cascade,

  -- Contenu
  title text not null,
  description text,
  discount_type text not null,
  discount_value numeric not null,
  conditions text,

  -- Limites
  max_uses integer,
  used_count integer not null default 0,

  -- Fenêtre temporelle
  starts_at timestamptz not null default now(),
  ends_at timestamptz,

  -- Workflow modération
  status text not null default 'pending_review',
  rejection_reason text,

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pro_perks_title_length_check
    check (char_length(title) between 1 and 80),
  constraint pro_perks_description_length_check
    check (description is null or char_length(description) <= 300),
  constraint pro_perks_discount_type_check
    check (discount_type in ('percentage', 'fixed')),
  constraint pro_perks_discount_value_positive
    check (discount_value > 0),
  constraint pro_perks_max_uses_positive
    check (max_uses is null or max_uses > 0),
  constraint pro_perks_used_count_positive
    check (used_count >= 0),
  constraint pro_perks_status_check
    check (status in ('pending_review', 'active', 'paused', 'expired', 'rejected')),
  constraint pro_perks_window_check
    check (ends_at is null or ends_at > starts_at)
);

-- Lookup principal côté Copines : "perks actives consultables maintenant"
create index if not exists pro_perks_active_window_idx
  on public.pro_perks (status, ends_at)
  where status = 'active';

-- Lookup côté prestataire : "mes offres"
create index if not exists pro_perks_prestataire_idx
  on public.pro_perks (prestataire_profile_id);

-- Lookup admin modération : queue pending_review
create index if not exists pro_perks_pending_review_idx
  on public.pro_perks (created_at desc)
  where status = 'pending_review';


-- ─── RLS pro_perks ───────────────────────────────────────────────────
-- SELECT public si active + dans la fenêtre temporelle (lecture par
-- les Copines depuis /dashboard/utilisatrice/avantages).
-- ALL owner si auth.uid() = profiles.user_id de la prestataire owner.
-- ALL admin via jwt.

alter table public.pro_perks enable row level security;

drop policy if exists "pro_perks_public_active_select" on public.pro_perks;
create policy "pro_perks_public_active_select"
  on public.pro_perks
  for select
  to authenticated
  using (
    status = 'active'
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "pro_perks_owner_all" on public.pro_perks;
create policy "pro_perks_owner_all"
  on public.pro_perks
  for all
  to authenticated
  using (
    prestataire_profile_id in (
      select id from public.profiles where user_id = auth.uid()
    )
  )
  with check (
    prestataire_profile_id in (
      select id from public.profiles where user_id = auth.uid()
    )
  );

drop policy if exists "pro_perks_admin_all" on public.pro_perks;
create policy "pro_perks_admin_all"
  on public.pro_perks
  for all
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- ─── Trigger updated_at pro_perks ────────────────────────────────────

create or replace function public.bump_pro_perks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pro_perks_updated_at_trg on public.pro_perks;
create trigger pro_perks_updated_at_trg
  before update on public.pro_perks
  for each row execute function public.bump_pro_perks_updated_at();


comment on table public.pro_perks is
  'Offres créées par prestataires Cercle Pro pour les Copines (mig 50). '
  'Workflow modération admin (status pending_review → active). '
  'Lecture publique uniquement si active + dans la fenêtre temporelle.';


-- =====================================================================
-- 5. pro_perk_claims — consommations Copines (1 code par perk × user)
-- =====================================================================
-- UNIQUE(perk_id, user_id) = une Copine ne peut claim qu'une fois la
-- même perk. Re-visit du détail = retourne le code existant.
--
-- code_displayed format HILMY-XXXX-YYYY (4 hex chars + 4 hex chars
-- uppercase). 16^8 = 4.3 milliards de combinaisons par perk. Collision
-- attendue après ~65k claims (anniversaire), mais UNIQUE(perk_id,
-- user_id) garantit qu'aucune Copine n'aura 2 codes — pas de risque
-- pratique de collision. Génération côté server-only via crypto.
--
-- INSERT policy : seuls les Copines actives peuvent claim
-- (is_user_copine(auth.uid()) = true).

create table if not exists public.pro_perk_claims (
  id uuid primary key default gen_random_uuid(),
  perk_id uuid not null references public.pro_perks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_displayed text not null,
  marked_used_at timestamptz,
  created_at timestamptz not null default now(),

  constraint pro_perk_claims_unique_per_user_perk
    unique (perk_id, user_id),

  constraint pro_perk_claims_code_format_check
    check (code_displayed ~ '^HILMY-[A-F0-9]{4}-[A-F0-9]{4}$')
);

create index if not exists pro_perk_claims_user_idx
  on public.pro_perk_claims (user_id, created_at desc);

create index if not exists pro_perk_claims_perk_idx
  on public.pro_perk_claims (perk_id);


-- ─── RLS pro_perk_claims ─────────────────────────────────────────────
-- SELECT : la Copine voit ses propres claims (pour afficher le code).
-- INSERT : la Copine peut claim une perk UNIQUEMENT si elle est
--          actuellement Copine active (is_user_copine = true).
-- UPDATE : la Copine peut marquer "utilisé" (marked_used_at).
-- DELETE : interdit (pas de policy) — anti-fraude. Si besoin, admin via
--          service_role.

alter table public.pro_perk_claims enable row level security;

drop policy if exists "pro_perk_claims_self_select" on public.pro_perk_claims;
create policy "pro_perk_claims_self_select"
  on public.pro_perk_claims
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "pro_perk_claims_copine_insert" on public.pro_perk_claims;
create policy "pro_perk_claims_copine_insert"
  on public.pro_perk_claims
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_user_copine(auth.uid())
  );

drop policy if exists "pro_perk_claims_self_update" on public.pro_perk_claims;
create policy "pro_perk_claims_self_update"
  on public.pro_perk_claims
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "pro_perk_claims_admin_all" on public.pro_perk_claims;
create policy "pro_perk_claims_admin_all"
  on public.pro_perk_claims
  for all
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


comment on table public.pro_perk_claims is
  'Consommation d''une pro_perk par une Copine (mig 50). UNIQUE(perk_id, '
  'user_id) = 1 code par perk × user. code_displayed généré server-side '
  'via crypto.randomBytes, format HILMY-XXXX-YYYY. INSERT gated par '
  'is_user_copine() — RLS bloque les non-Copines.';


-- =====================================================================
-- 6. events.early_access_until — paywall accès anticipé Copines
-- =====================================================================
-- NULL (par défaut sur les events existants) = pas d'accès anticipé,
-- inscriptions ouvertes à tout le monde immédiatement.
-- NOT NULL = inscriptions ouvertes aux Copines depuis maintenant et au
-- reste du monde à partir de cette date.
--
-- Vérification doublée :
--   1. Côté UI : EventPaywallSheet si early_access_until > now() AND
--      !is_copine
--   2. Côté server action inscription : 403 si check côté serveur fail
--
-- Aucune valeur backfillée — toutes les rows existantes restent à NULL.

alter table public.events
  add column if not exists early_access_until timestamptz;

create index if not exists events_early_access_until_idx
  on public.events (early_access_until)
  where early_access_until is not null;

comment on column public.events.early_access_until is
  'Si non-NULL et > now(), seules les Copines (user_profiles.is_copine = '
  'true) peuvent s''inscrire à l''event jusqu''à cette date. Passé cette '
  'date, ouvert à tout le monde. NULL = pas de fenêtre Copines (default).';


-- =====================================================================
-- 7. Trigger favoris : 10 max si non-Copine
-- =====================================================================
-- BEFORE INSERT sur public.favoris. Si user est Copine → pass. Sinon
-- compte les favoris existants : ≥ 10 → exception P0001.
--
-- SECURITY DEFINER + search_path explicite : on doit pouvoir compter
-- les favoris d'un user même si le contexte d'exécution n'a pas le
-- droit SELECT direct (cas service_role ou trigger chained).
--
-- Erreur capturée côté server action favori : on retourne un payload
-- { ok: false, code: 'FAVORITES_LIMIT_REACHED' } pour permettre au
-- client d'ouvrir le FavorisPaywallSheet (UX paywall propre).
--
-- Edge case : un user qui avait 50 favoris en étant Copine, puis qui
-- unsubscribe, conserve ses 50 favoris (pas de delete rétroactif). Mais
-- il ne peut plus en ajouter tant qu'il n'a pas re-souscrit OU
-- supprimé pour redescendre sous 10. Comportement intentionnel.

create or replace function public.check_favoris_limit_for_non_copine()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  -- Copine : aucune limite
  if public.is_user_copine(NEW.user_id) then
    return NEW;
  end if;

  -- Non-Copine : compte les favoris existants
  select count(*) into v_count
  from public.favoris
  where user_id = NEW.user_id;

  if v_count >= 10 then
    raise exception 'FAVORITES_LIMIT_REACHED'
      using errcode = 'P0001',
            hint = 'Limite 10 favoris atteinte pour user non-Copine. Pass Copine = illimité.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists favoris_limit_for_non_copine_trg on public.favoris;
create trigger favoris_limit_for_non_copine_trg
  before insert on public.favoris
  for each row execute function public.check_favoris_limit_for_non_copine();


comment on function public.check_favoris_limit_for_non_copine() is
  'Trigger BEFORE INSERT sur favoris (mig 50). Bloque l''insert avec '
  'P0001 si user non-Copine a déjà 10 favoris. Copines = illimité. '
  'SECURITY DEFINER pour count fiable indépendamment du contexte RLS.';


-- =====================================================================
-- 8. NOTIFY PostgREST — recharger le schéma exposé par l'API
-- =====================================================================

notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK (à exécuter en SQL si besoin de défaire la mig 50)
-- =====================================================================
-- Ordre inverse strict pour respecter les dépendances FK + functions.
--
-- -- Triggers + fonctions trigger
-- drop trigger if exists favoris_limit_for_non_copine_trg on public.favoris;
-- drop function if exists public.check_favoris_limit_for_non_copine();
-- drop trigger if exists pro_perks_updated_at_trg on public.pro_perks;
-- drop function if exists public.bump_pro_perks_updated_at();
-- drop trigger if exists copine_subscriptions_updated_at_trg on public.copine_subscriptions;
-- drop function if exists public.bump_copine_subscriptions_updated_at();
--
-- -- events column
-- drop index if exists public.events_early_access_until_idx;
-- alter table public.events drop column if exists early_access_until;
--
-- -- pro_perk_claims (FK vers pro_perks → drop avant pro_perks)
-- drop policy if exists "pro_perk_claims_admin_all" on public.pro_perk_claims;
-- drop policy if exists "pro_perk_claims_self_update" on public.pro_perk_claims;
-- drop policy if exists "pro_perk_claims_copine_insert" on public.pro_perk_claims;
-- drop policy if exists "pro_perk_claims_self_select" on public.pro_perk_claims;
-- drop table if exists public.pro_perk_claims cascade;
--
-- -- pro_perks
-- drop policy if exists "pro_perks_admin_all" on public.pro_perks;
-- drop policy if exists "pro_perks_owner_all" on public.pro_perks;
-- drop policy if exists "pro_perks_public_active_select" on public.pro_perks;
-- drop table if exists public.pro_perks cascade;
--
-- -- is_user_copine (utilisée par trigger favoris + RLS pro_perk_claims —
-- -- doit être dropée APRÈS ces deux)
-- drop function if exists public.is_user_copine(uuid);
--
-- -- copine_subscriptions
-- drop policy if exists "copine_subscriptions_admin_all" on public.copine_subscriptions;
-- drop policy if exists "copine_subscriptions_owner_read" on public.copine_subscriptions;
-- drop table if exists public.copine_subscriptions cascade;
--
-- -- user_profiles : drop columns (préserver constraint en commentaire
-- -- au cas où des rows ont copine_since/customer_id à archiver)
-- drop index if exists public.user_profiles_is_copine_idx;
-- drop index if exists public.user_profiles_copine_stripe_customer_id_idx;
-- alter table public.user_profiles drop constraint if exists user_profiles_copine_stripe_customer_id_key;
-- alter table public.user_profiles drop column if exists copine_stripe_customer_id;
-- alter table public.user_profiles drop column if exists copine_since;
-- alter table public.user_profiles drop column if exists is_copine;
--
-- notify pgrst, 'reload schema';
