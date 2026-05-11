-- Sprint 7bis C2 : 3 champs pour fiche prestataire publique
-- code_postal + horaires + prendre_rdv_url

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS horaires JSONB,
  ADD COLUMN IF NOT EXISTS prendre_rdv_url TEXT;

COMMENT ON COLUMN public.profiles.code_postal IS
  'Sprint 7bis C2 : code postal pour fiche publique (ville + CP affichés)';
COMMENT ON COLUMN public.profiles.horaires IS
  'Sprint 7bis C2 : horaires hebdo JSON format {monday: "9h-19h", ...}';
COMMENT ON COLUMN public.profiles.prendre_rdv_url IS
  'Sprint 7bis C2 : URL booking externe (Calendly, etc), gated derrière signup';
