-- =====================================================================
-- HILMY · 33 — Préférences de notifications dans user_profiles.preferences
-- Idempotent.
--
-- Contexte : la colonne `preferences jsonb` existe déjà sur user_profiles
-- (migration 17, default '{}'). Cette migration :
--   1. Documente les clés de notifications utilisées dans ce champ.
--   2. Matérialise une policy UPDATE explicite pour que les utilisatrices
--      puissent sauvegarder leurs préférences (owner-only).
--
-- Clés stockées dans preferences.notifications :
--   {
--     "notifications": {
--       "emailWeekly":       boolean,  -- lettre mensuelle
--       "emailEvenements":   boolean,  -- rappels d'événements
--       "emailNouvelles":    boolean,  -- nouvelles prestataires
--       "notifCommentaires": boolean   -- activité sur les recos
--     }
--   }
--
-- ATTENTION : ne pas exécuter en prod directement.
-- Exécuter via : bash scripts/run-migration.sh 33_notification_preferences.sql
-- =====================================================================

-- ─── Policy UPDATE owner-only sur user_profiles ───────────────────
-- drop + create pour idempotence
DROP POLICY IF EXISTS "user_profiles_self_update" ON public.user_profiles;
CREATE POLICY "user_profiles_self_update"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Commentaire documentation ────────────────────────────────────
COMMENT ON COLUMN public.user_profiles.preferences IS
  'Préférences évolutives (jsonb). Default {}.
   Clés notification : {"notifications": {"emailWeekly": bool, "emailEvenements": bool, "emailNouvelles": bool, "notifCommentaires": bool}}.
   Traçabilité RGPD : toute modif est horodatée via updated_at.';

-- ─── Recharge le schema cache PostgREST ───────────────────────────
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- DROP POLICY IF EXISTS "user_profiles_self_update" ON public.user_profiles;
-- =====================================================================
