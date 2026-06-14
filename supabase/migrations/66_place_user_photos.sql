-- =====================================================================
-- HILMY · PR-b · 66 — Table dédiée photos de lieux + modération a posteriori
--
-- Objectif PR-b : poser la STRUCTURE propre des photos membres.
--   • Table place_user_photos (1 ligne / photo), modération a posteriori
--     (default 'published' → la photo est active dès l'upload).
--   • storage_path SANS user_id (anti-fuite d'identité dans l'URL).
--   • Verrou écriture par OWNER côté storage (la colonne owner posée par
--     Supabase à l'upload), car le nouveau path (uuid plat) ne porte plus
--     l'identité dans le chemin.
--
-- ROBINET FERMÉ : RIEN de public ici. Lecture connecté-only (anon = zéro).
-- place_public_recos reste INTOUCHÉE. L'affichage public, c'est PR-c.
--
-- Dette technique notée : photo_urls (array sur recommendations) reste en
-- DOUBLE ÉCRITURE pendant PR-b (rendu connecté inchangé). À RETIRER plus tard
-- (PR-c ou PR-b.2). Règle d'or : PR-c ne lira QUE place_user_photos, JAMAIS
-- l'array legacy photo_urls. Les photos legacy (ancien path {user_id}/…) sont
-- LAISSÉES en place, jamais exposées en public.
-- =====================================================================

-- ─── 1) Table ────────────────────────────────────────────────────────
create table if not exists public.place_user_photos (
  id                uuid primary key default gen_random_uuid(),
  place_id          uuid not null references public.places(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  storage_path      text not null,
  status            text not null default 'published'
                      check (status in ('published', 'flagged', 'removed')),
  moderation_motif  text,
  created_at        timestamptz not null default now(),
  moderated_at      timestamptz
);

comment on table public.place_user_photos is
  'PR-b : photos de lieux uploadées par les membres. Modération a posteriori (default published → active dès l''upload). storage_path SANS user_id (anti-fuite). Lecture connecté-only en PR-b ; le public viendra en PR-c via une vue anon-safe. Règle d''or : la lecture publique ne lira QUE cette table, jamais l''array legacy recommendations.photo_urls.';

create index if not exists idx_place_user_photos_place_status
  on public.place_user_photos (place_id, status);
create index if not exists idx_place_user_photos_user
  on public.place_user_photos (user_id);
create index if not exists idx_place_user_photos_status
  on public.place_user_photos (status);

-- ─── 2) RLS sur la table — verrou owner-only (Postgres-enforced) ──────
alter table public.place_user_photos enable row level security;

-- SELECT : connecté seulement. Anon n'a PAS la policy (to authenticated) →
-- robinet fermé. Une membre voit les photos publiées + les siennes (tous statuts).
drop policy if exists "place_user_photos_read_connected" on public.place_user_photos;
create policy "place_user_photos_read_connected"
  on public.place_user_photos for select
  to authenticated
  using (
    (auth.uid() is not null and status = 'published')
    or (auth.uid() = user_id)
  );

-- INSERT : owner-only — on ne crée qu'à son propre nom.
drop policy if exists "place_user_photos_insert_own" on public.place_user_photos;
create policy "place_user_photos_insert_own"
  on public.place_user_photos for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE : owner-only — verrou identique à l'édition des recos.
drop policy if exists "place_user_photos_update_own" on public.place_user_photos;
create policy "place_user_photos_update_own"
  on public.place_user_photos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE : owner-only.
drop policy if exists "place_user_photos_delete_own" on public.place_user_photos;
create policy "place_user_photos_delete_own"
  on public.place_user_photos for delete
  to authenticated
  using (auth.uid() = user_id);

-- NB modération admin : via service_role (createAdminClient) qui BYPASSE la RLS.
-- Pas de policy dédiée — c'est le canal admin existant, serveur-only.

-- ─── 3) Storage — recommendation-photos : verrou par OWNER (additif) ──
-- Le nouveau path (uuid plat, sans user_id) ne porte plus l'identité, donc
-- storage_owner_from_path() ne peut plus servir de verrou ici. On bascule
-- recommendation-photos sur la colonne `owner` (posée par Supabase à l'upload).
--
-- IMPORTANT : on n' AJOUTE que des policies dédiées, on NE TOUCHE PAS aux
-- policies génériques (hilmy_buckets_*) ni aux legacy. En RLS, les policies
-- permissives se combinent en OR ; pour un path plat, storage_owner_from_path()
-- renvoie null (pas de slash) → les génériques n'accordent RIEN sur les nouveaux
-- fichiers. Toute la permission vient des policies ci-dessous. Les autres buckets
-- (prestataire-photos, event-flyers, user-avatars, profile-videos, place-videos)
-- restent strictement inchangés → zéro régression.

-- INSERT : un membre crée un NOUVEAU fichier (uuid random → pas de collision ;
-- upsert:false → impossible d'écraser un existant). Pas de owner check à
-- l'insert (owner est posé par Supabase APRÈS), inutile et fragile ici.
drop policy if exists "reco_photos_insert_auth" on storage.objects;
create policy "reco_photos_insert_auth"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recommendation-photos');

-- UPDATE/DELETE : owner-only → une membre ne touche QUE ses fichiers, jamais
-- ceux d'une autre. C'est ça qui protège les fichiers entre membres.
drop policy if exists "reco_photos_owner_update" on storage.objects;
create policy "reco_photos_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'recommendation-photos' and owner = auth.uid())
  with check (bucket_id = 'recommendation-photos' and owner = auth.uid());

drop policy if exists "reco_photos_owner_delete" on storage.objects;
create policy "reco_photos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recommendation-photos' and owner = auth.uid());
