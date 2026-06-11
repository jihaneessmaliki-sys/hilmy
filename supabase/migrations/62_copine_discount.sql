-- =====================================================================
-- HILMY · 62 — Réduction « copines Hilmy » (Lot 2A · schéma)
-- Idempotent. Purement additive : RLS et triggers INTOUCHÉS.
--
-- Contexte : une prestataire peut afficher sur sa fiche publique une
-- réduction réservée aux copines Hilmy (« −X% pour les copines »).
-- Deux champs, librement éditables par la prestataire (inscription +
-- espace prestataire web). Coexiste avec le système pro_perks (mig 50)
-- — on n'y touche PAS, ce sont deux mécanismes parallèles.
--
--   • copine_discount_pct  smallint  — 5/10/15/20 ou NULL (= pas de réduc)
--   • copine_discount_note text      — conditions libres, NULL = vide
--
-- Anti-tamper : ces colonnes ne sont PAS ajoutées à lock_profile_update
-- / lock_profile_insert (mig 54), donc volontairement modifiables par
-- l'authenticated. Aucune resync de ces triggers ici (intouchés).
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS copine_discount_pct  smallint,
  ADD COLUMN IF NOT EXISTS copine_discount_note text;

-- CHECK idempotent : % dans {5,10,15,20} ou NULL.
-- (NULL passe le CHECK : `x IN (...)` vaut UNKNOWN pour NULL, et un CHECK
--  n'échoue que sur FALSE. La clause `IS NULL OR` est explicite par lisibilité.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname  = 'profiles_copine_discount_pct_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_copine_discount_pct_check
      CHECK (copine_discount_pct IS NULL OR copine_discount_pct IN (5, 10, 15, 20));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.copine_discount_pct IS
  'mig 62 — Réduction copines Hilmy. smallint dans {5,10,15,20} ou NULL '
  '(NULL = pas de réduction). Librement éditable par la prestataire.';

COMMENT ON COLUMN public.profiles.copine_discount_note IS
  'mig 62 — Conditions libres de la réduction copines (text, NULL = vide). '
  'Librement éditable par la prestataire.';

-- Recharge le schema cache PostgREST pour que les colonnes soient visibles immédiatement.
NOTIFY pgrst, 'reload schema';
