-- =====================================================================
-- HILMY · 32 — Ajout colonne pays sur profiles
-- Idempotent.
--
-- Contexte : le flow d'inscription via Google Places envoie un champ
-- `pays` (extrait de `details.country`) lors de l'insert dans `profiles`,
-- mais la colonne n'existait pas encore → crash PostgREST.
--
-- Fix : ajoute la colonne de façon non-destructive.
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pays TEXT;

-- Recharge le schema cache PostgREST pour que la colonne soit visible immédiatement
NOTIFY pgrst, 'reload schema';
