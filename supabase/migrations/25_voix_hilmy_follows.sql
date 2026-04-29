-- =====================================================================
-- HILMY · 25 — Voix Hilmy : table voix_hilmy_follows + RLS + counter fn
--
-- Système de follow : une copine peut suivre une Voix Hilmy pour voir
-- ses futures recos dans son flux Recos. Une Voix peut être suivie
-- par 0..N copines. Une copine peut suivre 0..N Voix.
--
-- Modèle :
--   • 1 ligne = 1 follow actif (création)
--   • UNIQUE (follower, voix) → pas de doublon
--   • CHECK no-self-follow → une copine ne peut pas se follow elle-même
--   • FK vers auth.users(id) ON DELETE CASCADE → si compte supprimé,
--     follows nettoyés automatiquement (pas d'orphelins)
--   • Pas de soft-delete : un unfollow = DELETE de la ligne
--
-- Pourquoi auth.users(id) et non user_profiles(id) :
--   auth.uid() (utilisé par RLS) retourne l'id auth.users, pas
--   user_profiles.id. Référencer auth.users directement évite un
--   deux-temps (sub-query + lookup) et aligne FK / RLS / app code.
--
-- Naming : les colonnes s'appellent follower_user_id et voix_user_id
--   pour rester proches du brief, même si techniquement elles
--   contiennent des auth.users.id (pattern Supabase standard).
--
-- Idempotent. Voir 25_voix_hilmy_follows_rollback.sql pour le rollback.
-- =====================================================================

-- ─── Table ────────────────────────────────────────────────────────
create table if not exists public.voix_hilmy_follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  voix_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint voix_hilmy_follows_no_self_follow
    check (follower_user_id <> voix_user_id),
  constraint voix_hilmy_follows_unique
    unique (follower_user_id, voix_user_id)
);

-- ─── Index sur les 2 FK (hot path queries) ───────────────────────
-- "Qui je suis" → filter par follower_user_id
-- Note : la contrainte UNIQUE crée déjà un index implicite sur
-- (follower_user_id, voix_user_id), qui couvre cette query via
-- leftmost prefix. L'index dédié reste explicite pour symétrie
-- avec idx_voix_follows_voix et lisibilité du brief.
create index if not exists idx_voix_follows_follower
  on public.voix_hilmy_follows (follower_user_id);

-- "Qui suit cette Voix" + count public → filter par voix_user_id
-- Pas couvert par l'index unique (voix_user_id n'est pas leftmost),
-- donc cet index est strictement nécessaire pour les perfs du counter.
create index if not exists idx_voix_follows_voix
  on public.voix_hilmy_follows (voix_user_id);

-- ─── RLS ─────────────────────────────────────────────────────────
alter table public.voix_hilmy_follows enable row level security;

-- ─── Policies : 3 policies "own only" ────────────────────────────
-- Strictement privé à chaque follower. Pas de SELECT publique sur
-- la table. Le compteur public (qui veut juste un nombre) passe par
-- la fonction get_voix_followers_count() définie plus bas.
--
-- Choix architectural — pourquoi PAS de policy SELECT publique :
--   La policy publique du brief original (EXISTS user_profiles
--   is_voix_hilmy = true) exposerait toutes les colonnes — donc
--   follower_user_id — à anon. Anon pourrait alors faire
--       SELECT follower_user_id FROM voix_hilmy_follows
--       WHERE voix_user_id = '<voix>';
--   et obtenir la liste nominative des followers. Leak de privacy.
--
--   Solution retenue : table strictement privée + fonction SECURITY
--   DEFINER qui ne retourne QUE le count. Anon n'a aucune visibilité
--   sur la table elle-même, ne peut donc pas extraire les identités.
--   Pattern aligné sur get_featured_voix() (migration 24).

drop policy if exists "Users can view own follows" on public.voix_hilmy_follows;
create policy "Users can view own follows" on public.voix_hilmy_follows
  for select
  using (auth.uid() = follower_user_id);

drop policy if exists "Users can create own follows" on public.voix_hilmy_follows;
create policy "Users can create own follows" on public.voix_hilmy_follows
  for insert
  with check (auth.uid() = follower_user_id);

drop policy if exists "Users can delete own follows" on public.voix_hilmy_follows;
create policy "Users can delete own follows" on public.voix_hilmy_follows
  for delete
  using (auth.uid() = follower_user_id);

-- ─── Fonction get_voix_followers_count() — compteur public ──────
-- Source unique de vérité pour le compteur de followers d'une Voix.
-- Appelable par anon (page publique hilmy.io/{slug}) et par
-- authenticated (app mobile). Retourne uniquement un bigint, jamais
-- d'identité — la table sous-jacente reste privée.
--
-- SECURITY DEFINER : bypasse la RLS pour faire le count(*). Sûr car
-- la fonction ne retourne que le total agrégé, jamais les rows
-- individuelles. Paramètre obligatoire = scope explicite à 1 Voix
-- (pas de SELECT global possible).
-- =====================================================================

create or replace function public.get_voix_followers_count(p_voix_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.voix_hilmy_follows
  where voix_user_id = p_voix_user_id
$$;

revoke all on function public.get_voix_followers_count(uuid) from public;
grant execute on function public.get_voix_followers_count(uuid) to anon, authenticated, service_role;

-- ─── Comments ─────────────────────────────────────────────────────
comment on table public.voix_hilmy_follows is
  'Système de follow Voix Hilmy. Une ligne = un follow actif. Strictement privée par RLS (chaque copine ne voit que ses propres follows). Compteur public exposé via get_voix_followers_count().';

comment on column public.voix_hilmy_follows.follower_user_id is
  'auth.users.id de la copine qui suit. ON DELETE CASCADE depuis auth.users : compte supprimé → follows nettoyés.';

comment on column public.voix_hilmy_follows.voix_user_id is
  'auth.users.id de la Voix Hilmy suivie. Pas de FK vers user_profiles(is_voix_hilmy=true) — l''app valide. Si la Voix se désactive (is_voix_hilmy → false), les follows persistent (orphelins inoffensifs : page non résoluble côté SSR).';

comment on constraint voix_hilmy_follows_no_self_follow on public.voix_hilmy_follows is
  'Empêche follower_user_id = voix_user_id (cas absurde, garde-fou DB).';

comment on constraint voix_hilmy_follows_unique on public.voix_hilmy_follows is
  'Un follow unique par couple (follower, voix). Tap répété sur "Suivre" → no-op (l''app fait UPSERT ou ignore l''erreur 23505).';

comment on function public.get_voix_followers_count(uuid) is
  'Compteur public de followers d''une Voix donnée. SECURITY DEFINER : seul moyen pour anon/authenticated de connaître ce chiffre sans avoir SELECT sur voix_hilmy_follows. Toute autre query sur la table respecte la RLS stricte (chaque copine ne voit que ses propres follows). Pattern aligné sur get_featured_voix().';

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/25_voix_hilmy_follows_rollback.sql
-- =====================================================================
