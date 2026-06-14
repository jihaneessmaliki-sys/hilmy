-- =====================================================================
-- HILMY · PR-b · 66 ROLLBACK — place_user_photos + storage policies
-- La mig 66 n'a fait qu' AJOUTER 3 policies dédiées + la table (elle n'a PAS
-- touché aux policies génériques). Le rollback retire donc seulement ces 3
-- policies et drop la table.
-- =====================================================================

-- ─── Storage : retirer les policies dédiées recommendation-photos ────
drop policy if exists "reco_photos_insert_auth" on storage.objects;
drop policy if exists "reco_photos_owner_update" on storage.objects;
drop policy if exists "reco_photos_owner_delete" on storage.objects;

-- ─── Table ───────────────────────────────────────────────────────────
drop table if exists public.place_user_photos;
