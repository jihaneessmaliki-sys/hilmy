-- =====================================================================
-- HILMY · 75 ROLLBACK — retire la vue profil public membre
--
-- N'affecte ni voix_hilmy_follows ni get_voix_followers_count (préexistants
-- et inchangés par la 75).
-- =====================================================================

drop view if exists public.member_public;
