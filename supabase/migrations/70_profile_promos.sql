-- =====================================================================
-- HILMY · 70 — Promos temporaires datées sur les fiches prestataires
--
-- Une prestataire peut publier une offre limitée dans le temps (« soldes »)
-- affichée sur sa fiche publique pendant la fenêtre [starts_at, ends_at].
--
-- Sûr & additif : CREATE TABLE IF NOT EXISTS, RLS + policies dans la même
-- migration, DROP POLICY IF EXISTS avant CREATE (idempotent). Aucune
-- donnée existante touchée.
-- =====================================================================

create table if not exists public.profile_promos (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,            -- ex. « -20% sur les soins du visage »
  description text,                     -- conditions / détails (optionnel)
  starts_at   date not null,
  ends_at     date not null,
  created_at  timestamptz not null default now(),
  constraint promos_dates_chk check (ends_at >= starts_at),
  constraint promos_title_chk check (char_length(title) between 3 and 80),
  constraint promos_desc_chk  check (description is null or char_length(description) <= 200)
);

create index if not exists idx_profile_promos_profile
  on public.profile_promos (profile_id);

alter table public.profile_promos enable row level security;

-- SELECT public : uniquement les promos ACTIVES (dans la fenêtre), et
-- seulement pour des fiches visibles (la sous-requête sur profiles est
-- soumise à la RLS "public read visible profiles" → anon ne voit que les
-- promos de fiches publiques).
drop policy if exists "promos_public_read_active" on public.profile_promos;
create policy "promos_public_read_active"
  on public.profile_promos for select
  using (
    current_date between starts_at and ends_at
    and profile_id in (select id from public.profiles)
  );

-- SELECT owner : la prestataire voit TOUTES ses promos (passées/à venir).
drop policy if exists "promos_owner_read_all" on public.profile_promos;
create policy "promos_owner_read_all"
  on public.profile_promos for select
  to authenticated
  using (profile_id in (select id from public.profiles where user_id = auth.uid()));

-- INSERT/UPDATE/DELETE : owner-only (propriétaire de la fiche).
drop policy if exists "promos_owner_write" on public.profile_promos;
create policy "promos_owner_write"
  on public.profile_promos for all
  to authenticated
  using      (profile_id in (select id from public.profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.profiles where user_id = auth.uid()));

comment on table public.profile_promos is
  'Promos temporaires datées des prestataires (mobile PR C). Lecture publique limitée aux promos actives de fiches visibles ; écriture owner-only.';
