-- =====================================================================
-- HILMY · 70 ROLLBACK — supprime la table profile_promos et ses policies
-- =====================================================================

drop policy if exists "promos_public_read_active" on public.profile_promos;
drop policy if exists "promos_owner_read_all" on public.profile_promos;
drop policy if exists "promos_owner_write" on public.profile_promos;

drop table if exists public.profile_promos;
