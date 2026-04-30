-- =====================================================================
-- HILMY · 29 — ROLLBACK migration bio_required
--
-- Restaure le CHECK constraint user_profiles_voix_complete à son état
-- mig 24 (sans le filtre length(trim(bio)) > 0). Auto-suffisant : pas
-- d'INCLUDE de mig 24, le SQL est recopié inline.
--
-- ⚠️ Pré-check : aucune action destructive nécessaire avant rollback
-- (le CHECK plus permissif est compatible avec toutes les rows qui
-- passent le CHECK plus strict).
-- =====================================================================

alter table public.user_profiles
  drop constraint if exists user_profiles_voix_complete;

alter table public.user_profiles
  add constraint user_profiles_voix_complete
  check (
    is_voix_hilmy = false
    or (
      is_voix_hilmy = true
      and voix_hilmy_slug is not null
      and voix_hilmy_bio is not null
    )
  );
