-- =====================================================================
-- HILMY · 34 — Ajout des colonnes profil manquantes (audit DB)
-- Idempotent.
--
-- Contexte : audit autonome du 2026-05-03 — 4 colonnes sont écrites par
-- le code (app/onboarding/prestataire/manuel/page.tsx + app/dashboard/
-- prestataire/fiche/page.tsx) mais absentes du schéma migré (1 → 33).
-- Probable cause : oubli lors d'un commit antérieur. Le INSERT échoue
-- silencieusement côté Supabase ou drop ces clés selon la config PostgREST.
--
-- Colonnes ajoutées :
--   • phone_public : téléphone affiché publiquement (séparé de whatsapp)
--   • tiktok       : URL du compte TikTok
--   • facebook     : URL de la page Facebook
--   • youtube      : URL de la chaîne YouTube
--
-- ⚠️ AVANT EXÉCUTION : confirmer en prod via
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='profiles'
--     AND column_name IN ('phone_public','tiktok','facebook','youtube');
-- Si les colonnes existent déjà (créées hors-migration), la migration est
-- no-op grâce à IF NOT EXISTS.
--
-- Exécuter via : bash scripts/run-migration.sh 34_missing_profile_columns.sql
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_public text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube text;

COMMENT ON COLUMN public.profiles.phone_public IS
  'Numéro de téléphone affiché publiquement sur la fiche (distinct de whatsapp).';
COMMENT ON COLUMN public.profiles.tiktok IS
  'URL complète du compte TikTok (https://tiktok.com/@…).';
COMMENT ON COLUMN public.profiles.facebook IS
  'URL complète de la page/profil Facebook.';
COMMENT ON COLUMN public.profiles.youtube IS
  'URL complète de la chaîne YouTube (https://youtube.com/@…).';

-- ─── Recharge le schema cache PostgREST ───────────────────────────────
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- ROLLBACK (à utiliser uniquement si données nulles partout)
-- =====================================================================
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_public;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS tiktok;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS facebook;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS youtube;
-- =====================================================================
