-- =====================================================================
-- HILMY · 18 — content_reports
-- Table polymorphe ultra-light pour signaler un contenu (place, event,
-- recommendation) depuis le mobile. Modération admin via une page dédiée
-- du site Next.js (à câbler dans un batch ultérieur — la table existante
-- recommendation_reports reste utilisée par /api/recommendations/[id]/report
-- pour la modération des recos).
--
-- Pour l'instant, le mobile insère ici quand l'utilisatrice tape "Signaler"
-- sur la fiche d'un lieu ou d'un événement. Le slot 'recommendation' est
-- présent dans le CHECK pour future-proof : on l'utilisera quand le panneau
-- admin du site sera étendu pour lire content_reports en plus de
-- recommendation_reports.
-- =====================================================================

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('place', 'event', 'recommendation')),
  target_id uuid not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Anti-spam : un user ne peut signaler le même target qu'une fois
create unique index if not exists content_reports_unique_per_user
  on public.content_reports (user_id, target_type, target_id);

-- Lookup admin : tous les signalements d'un target donné
create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id);

-- Lookup admin : derniers signalements pending
create index if not exists content_reports_pending_idx
  on public.content_reports (status, created_at desc) where status = 'pending';

-- ─── RLS ──────────────────────────────────────────────────────────────
alter table public.content_reports enable row level security;

-- INSERT : tout user authentifié peut signaler n'importe quel target.
-- Le CHECK target_type + UNIQUE garantit la cohérence et l'anti-dup.
drop policy if exists "content_reports_insert_authenticated" on public.content_reports;
create policy "content_reports_insert_authenticated"
  on public.content_reports for insert
  to authenticated
  with check (user_id = auth.uid());

-- SELECT : owner-only (l'utilisatrice voit ses propres signalements).
-- L'admin lit via service role / bypass RLS côté Next.js.
drop policy if exists "content_reports_select_owner" on public.content_reports;
create policy "content_reports_select_owner"
  on public.content_reports for select
  to authenticated
  using (user_id = auth.uid());

-- Pas de UPDATE/DELETE policy : seuls les admins (service role) modifient
-- le status (pending → reviewed / dismissed).

comment on table public.content_reports is
  'Signalements polymorphes (place / event / recommendation). Mobile insère, admin (service role) lit/modère.';
comment on column public.content_reports.target_type is
  'Type d''entité signalée. Le slot ''recommendation'' coexiste avec recommendation_reports (legacy) jusqu''à unification du panneau admin.';
comment on column public.content_reports.reason is
  'Motif libre optionnel. NULL = signalement sans précision.';

-- ─── ROLLBACK ─────────────────────────────────────────────────────────
-- drop policy if exists "content_reports_select_owner" on public.content_reports;
-- drop policy if exists "content_reports_insert_authenticated" on public.content_reports;
-- drop index if exists content_reports_pending_idx;
-- drop index if exists content_reports_target_idx;
-- drop index if exists content_reports_unique_per_user;
-- drop table if exists public.content_reports;
