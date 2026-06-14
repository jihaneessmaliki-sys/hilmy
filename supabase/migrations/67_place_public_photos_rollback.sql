-- =====================================================================
-- HILMY · 67 ROLLBACK — supprime la vue publique des photos communauté.
-- Ne touche NI place_user_photos NI les policies (PR-b intacte).
-- =====================================================================

drop view if exists public.place_public_photos;
