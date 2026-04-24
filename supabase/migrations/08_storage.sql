-- =====================================================================
-- HILMY · Stage 4 · 08 — Storage buckets + RLS
-- 4 buckets publics en lecture, owner-only en écriture.
-- Convention de path : {user_id}/fichier.ext — le premier segment DOIT
-- être l'UUID du user propriétaire.
--
-- ⚠️ Si un bucket existe déjà avec le même nom, il n'est PAS écrasé
-- (ON CONFLICT DO NOTHING).
-- =====================================================================

-- ─── Création des buckets ────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('prestataire-photos', 'prestataire-photos', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('recommendation-photos', 'recommendation-photos', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('event-flyers', 'event-flyers', true, 8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]),
  ('user-avatars', 'user-avatars', true, 2097152,
    array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do nothing;

-- ─── Helper : extrait le user_id depuis le chemin du fichier ────────
create or replace function public.storage_owner_from_path(object_name text)
returns uuid
language sql
immutable
as $$
  select
    case
      when object_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
      then (split_part(object_name, '/', 1))::uuid
      else null
    end;
$$;

grant execute on function public.storage_owner_from_path(text) to authenticated, anon;

-- =====================================================================
-- POLICIES — une seule paire générique pour tous les buckets HILMY
-- (couvre prestataire-photos, recommendation-photos, event-flyers, user-avatars)
-- =====================================================================

-- Liste des buckets gérés par ces policies
-- On utilise un ARRAY pour éviter 16 policies (4 par bucket × 4 buckets)
-- ─────────────────────────────────────────────────────────────────────

-- READ : tout le monde peut lire (les buckets sont publics)
drop policy if exists "hilmy_buckets_public_read" on storage.objects;
create policy "hilmy_buckets_public_read"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars'
    )
  );

-- INSERT : authenticated uploade dans son propre dossier {user_id}/...
drop policy if exists "hilmy_buckets_owner_insert" on storage.objects;
create policy "hilmy_buckets_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars'
    )
    and public.storage_owner_from_path(name) = auth.uid()
  );

-- UPDATE : owner uniquement
drop policy if exists "hilmy_buckets_owner_update" on storage.objects;
create policy "hilmy_buckets_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars'
    )
    and public.storage_owner_from_path(name) = auth.uid()
  )
  with check (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars'
    )
    and public.storage_owner_from_path(name) = auth.uid()
  );

-- DELETE : owner uniquement
drop policy if exists "hilmy_buckets_owner_delete" on storage.objects;
create policy "hilmy_buckets_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in (
      'prestataire-photos',
      'recommendation-photos',
      'event-flyers',
      'user-avatars'
    )
    and public.storage_owner_from_path(name) = auth.uid()
  );

comment on function public.storage_owner_from_path(text) is
  'Extrait le UUID propriétaire d''un fichier Storage depuis son chemin (premier segment). Convention HILMY : {user_id}/{fichier.ext}';
