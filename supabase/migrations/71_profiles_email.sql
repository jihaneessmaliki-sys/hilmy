-- =====================================================================
-- HILMY · 71 — Email de contact public sur les fiches prestataires
--
-- Ajoute une colonne `email` (optionnelle) sur profiles : email de contact
-- public que la prestataire peut renseigner, en plus de WhatsApp/réseaux.
-- Éditable par l'owner (policy UPDATE existante), lisible par tous (policy
-- SELECT "public read visible profiles" existante — RLS row-level, donc la
-- nouvelle colonne est couverte). Aucune nouvelle policy nécessaire.
--
-- Sûr & additif : ADD COLUMN IF NOT EXISTS, contrainte longueur idempotente.
-- =====================================================================

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  drop constraint if exists profiles_email_len_chk;
alter table public.profiles
  add constraint profiles_email_len_chk
  check (email is null or char_length(email) <= 160);

comment on column public.profiles.email is
  'Email de contact public (optionnel), éditable par la prestataire (owner). Affiché sur la fiche.';
