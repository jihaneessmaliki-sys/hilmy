-- =====================================================================
-- HILMY · 13 — events.registration_mode
-- Permet 3 modes de CTA sur la fiche event :
--   'internal'  (défaut) : RSVP Hilmy interne via event_inscriptions
--   'external'           : lien vers billetterie/signup externe (Eventbrite…)
--   'info_only'          : event gratuit sans inscription, CTA "Plus d'infos →"
-- =====================================================================

alter table public.events
  add column if not exists registration_mode text not null default 'internal';

alter table public.events drop constraint if exists events_registration_mode_check;
alter table public.events add constraint events_registration_mode_check
  check (registration_mode in ('internal', 'external', 'info_only'));

comment on column public.events.registration_mode is
  'Mode CTA : internal (RSVP Hilmy), external (lien billetterie), info_only (gratuit sans inscription, CTA "Plus d''infos").';
