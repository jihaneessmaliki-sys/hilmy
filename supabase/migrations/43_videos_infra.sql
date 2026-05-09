-- =====================================================================
-- HILMY · 43 — Videos infra (Phase 3 · PR-2)
--
-- Pose le terrain BDD + Storage pour le support vidéo MP4 dans les
-- fiches prestataires (Premium 60s × 1, Cercle Pro 90s × illimitées) et
-- les fiches lieux Sélection Hilmy (90s × illimitées).
--
-- AUCUNE UI dans cette migration — l'UploadVideo + VideoPlayer + intégration
-- viendront en PR-3. PR-2 = pure infra.
--
-- Décisions Jiji 2026-05-10 :
--   - D : storage path interne au bucket = `{user_id}/{nanoid}.mp4`
--         (cohérent storage_owner_from_path() mig 08, pas de préfixe bucket)
--   - E : trust client + bucket file_size_limit = 50 MB
--   - B(γ) : helpers TS prêts mais UI lieu déférée
--   - Pas de trigger BEFORE INSERT pour cap nombre vidéos (validation
--     côté API route en PR-3)
--   - Étendre les 4 policies hilmy_buckets_* (mig 08) plutôt que créer
--     de nouvelles policies dédiées
--
-- ⚠️ Tables référencent `public.profiles(id)` (PAS `prestataires(id)` qui
--    n'existe pas). Cf docs/db-schema-summary.md conventions piégeantes.
--
-- Idempotente. Voir bas de fichier pour rollback.
-- =====================================================================


-- =====================================================================
-- 1. Table profile_videos
-- =====================================================================

create table if not exists public.profile_videos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Path interne au bucket profile-videos (sans préfixe bucket).
  -- Convention HILMY : `{user_id}/{nanoid}.mp4`
  storage_path text not null,
  -- Path interne au bucket profile-videos pour le thumbnail JPEG.
  -- Nullable : si la génération thumbnail (ffmpeg.wasm) échoue,
  -- la vidéo reste utilisable sans poster image.
  thumbnail_storage_path text,
  duration_seconds integer not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CHECK constraints (drop+add pour idempotence sur replay)
alter table public.profile_videos drop constraint if exists profile_videos_duration_check;
alter table public.profile_videos add constraint profile_videos_duration_check
  check (duration_seconds > 0 and duration_seconds <= 90);

alter table public.profile_videos drop constraint if exists profile_videos_size_check;
alter table public.profile_videos add constraint profile_videos_size_check
  check (size_bytes > 0 and size_bytes <= 52428800);  -- 50 MB

create index if not exists idx_profile_videos_profile
  on public.profile_videos(profile_id);

comment on table public.profile_videos is
  'Vidéos MP4 attachées à une fiche prestataire (Premium 60s × 1, '
  'Cercle Pro 90s × illimitées). Le cap par palier est appliqué côté '
  'API route en PR-3, pas via trigger SQL. Le CHECK duration <= 90 '
  'est la borne dure BDD (max absolu Cercle Pro). Storage_path = '
  '{user_id}/{nanoid}.mp4 dans le bucket profile-videos.';


-- =====================================================================
-- 2. Table place_videos
-- =====================================================================

create table if not exists public.place_videos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  storage_path text not null,
  thumbnail_storage_path text,
  duration_seconds integer not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.place_videos drop constraint if exists place_videos_duration_check;
alter table public.place_videos add constraint place_videos_duration_check
  check (duration_seconds > 0 and duration_seconds <= 90);

alter table public.place_videos drop constraint if exists place_videos_size_check;
alter table public.place_videos add constraint place_videos_size_check
  check (size_bytes > 0 and size_bytes <= 52428800);

create index if not exists idx_place_videos_place
  on public.place_videos(place_id);

comment on table public.place_videos is
  'Vidéos MP4 attachées à une fiche lieu Sélection Hilmy (90s × '
  'illimitées). Mirror profile_videos. Owner = places.created_by_user_id '
  '(mig 28). Storage_path = {user_id}/{nanoid}.mp4 dans bucket place-videos.';


-- =====================================================================
-- 3. RLS profile_videos
-- =====================================================================

alter table public.profile_videos enable row level security;

drop policy if exists "profile_videos_public_read" on public.profile_videos;
create policy "profile_videos_public_read"
  on public.profile_videos
  for select
  to anon, authenticated
  using (true);

drop policy if exists "profile_videos_owner_write" on public.profile_videos;
create policy "profile_videos_owner_write"
  on public.profile_videos
  for all
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where user_id = auth.uid()
    )
  )
  with check (
    profile_id in (
      select id from public.profiles where user_id = auth.uid()
    )
  );

drop policy if exists "profile_videos_admin_all" on public.profile_videos;
create policy "profile_videos_admin_all"
  on public.profile_videos
  for all
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- =====================================================================
-- 4. RLS place_videos
-- =====================================================================

alter table public.place_videos enable row level security;

drop policy if exists "place_videos_public_read" on public.place_videos;
create policy "place_videos_public_read"
  on public.place_videos
  for select
  to anon, authenticated
  using (true);

drop policy if exists "place_videos_owner_write" on public.place_videos;
create policy "place_videos_owner_write"
  on public.place_videos
  for all
  to authenticated
  using (
    place_id in (
      select id from public.places where created_by_user_id = auth.uid()
    )
  )
  with check (
    place_id in (
      select id from public.places where created_by_user_id = auth.uid()
    )
  );

drop policy if exists "place_videos_admin_all" on public.place_videos;
create policy "place_videos_admin_all"
  on public.place_videos
  for all
  to authenticated
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- =====================================================================
-- 5. Storage buckets profile-videos + place-videos
-- =====================================================================
-- Buckets PUBLICS pour lecture directe (UUID dans path = obscurité).
-- file_size_limit = 50 MB (cap dur, aligné CHECK size_bytes BDD).
-- MIME types : video/mp4, video/webm pour les vidéos, image/jpeg pour
-- les thumbnails générés par ffmpeg.wasm (PR-3) — pas de bucket dédié
-- thumbnails pour simplifier.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-videos', 'profile-videos', true, 52428800,
    array['video/mp4', 'video/webm', 'image/jpeg']::text[]),
  ('place-videos', 'place-videos', true, 52428800,
    array['video/mp4', 'video/webm', 'image/jpeg']::text[])
on conflict (id) do nothing;


-- =====================================================================
-- 6. Extension des 4 policies hilmy_buckets_* (mig 08)
-- =====================================================================
-- On AJOUTE 'profile-videos' et 'place-videos' aux 4 buckets existants
-- couverts par le pattern owner-from-path. DROP POLICY puis CREATE pour
-- idempotence.

drop policy if exists "hilmy_buckets_public_read" on storage.objects;
create policy "hilmy_buckets_public_read"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars',
      'profile-videos',
      'place-videos'
    )
  );

drop policy if exists "hilmy_buckets_owner_insert" on storage.objects;
create policy "hilmy_buckets_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars',
      'profile-videos',
      'place-videos'
    )
    and public.storage_owner_from_path(name) = auth.uid()
  );

drop policy if exists "hilmy_buckets_owner_update" on storage.objects;
create policy "hilmy_buckets_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars',
      'profile-videos',
      'place-videos'
    )
    and public.storage_owner_from_path(name) = auth.uid()
  )
  with check (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars',
      'profile-videos',
      'place-videos'
    )
    and public.storage_owner_from_path(name) = auth.uid()
  );

drop policy if exists "hilmy_buckets_owner_delete" on storage.objects;
create policy "hilmy_buckets_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars',
      'profile-videos',
      'place-videos'
    )
    and public.storage_owner_from_path(name) = auth.uid()
  );


-- =====================================================================
-- 7. updated_at triggers (cohérence avec autres tables récentes)
-- =====================================================================

create or replace function public.bump_profile_videos_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profile_videos_updated_at_trg on public.profile_videos;
create trigger profile_videos_updated_at_trg
  before update on public.profile_videos
  for each row execute function public.bump_profile_videos_updated_at();

create or replace function public.bump_place_videos_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists place_videos_updated_at_trg on public.place_videos;
create trigger place_videos_updated_at_trg
  before update on public.place_videos
  for each row execute function public.bump_place_videos_updated_at();


-- =====================================================================
-- 8. Reload PostgREST schema cache
-- =====================================================================
notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK (à exécuter manuellement si besoin)
-- =====================================================================
-- -- Triggers updated_at
-- drop trigger if exists place_videos_updated_at_trg on public.place_videos;
-- drop trigger if exists profile_videos_updated_at_trg on public.profile_videos;
-- drop function if exists public.bump_place_videos_updated_at();
-- drop function if exists public.bump_profile_videos_updated_at();
--
-- -- Restore les 4 policies hilmy_buckets_* à leur état mig 08 (sans
-- -- profile-videos / place-videos)
-- drop policy if exists "hilmy_buckets_owner_delete" on storage.objects;
-- drop policy if exists "hilmy_buckets_owner_update" on storage.objects;
-- drop policy if exists "hilmy_buckets_owner_insert" on storage.objects;
-- drop policy if exists "hilmy_buckets_public_read" on storage.objects;
-- -- (Re-créer via mig 08 si besoin — copier le bloc original)
--
-- -- Buckets storage (laisser DELETE FROM hors transaction Supabase Mgmt
-- -- car contient peut-être des objets uploadés)
-- delete from storage.buckets where id in ('profile-videos','place-videos');
--
-- -- RLS policies des 2 tables
-- drop policy if exists "place_videos_admin_all" on public.place_videos;
-- drop policy if exists "place_videos_owner_write" on public.place_videos;
-- drop policy if exists "place_videos_public_read" on public.place_videos;
-- drop policy if exists "profile_videos_admin_all" on public.profile_videos;
-- drop policy if exists "profile_videos_owner_write" on public.profile_videos;
-- drop policy if exists "profile_videos_public_read" on public.profile_videos;
--
-- -- Tables (CASCADE supprime les indexes + check constraints)
-- drop table if exists public.place_videos;
-- drop table if exists public.profile_videos;
-- =====================================================================
