-- ========================================
-- Migration 39 : système founders
-- ========================================
-- - app_config : table singleton (1 ligne) qui contrôle si la fenêtre founders est ouverte
-- - profiles.is_founder : flag prestataire founder (accès Cercle Pro à vie)
-- - trigger : tant que founders_window_open = true, toute prestataire qui passe approved est auto-flaggée founder

-- ========================================
-- 1. TABLE DE CONFIG APP (singleton)
-- ========================================
CREATE TABLE IF NOT EXISTS app_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  founders_window_open boolean NOT NULL DEFAULT true,
  stripe_live boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO app_config (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config readable by all" ON app_config;
CREATE POLICY "app_config readable by all"
  ON app_config FOR SELECT
  USING (true);

-- ========================================
-- 2. COLONNE is_founder SUR profiles
-- ========================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_founder
ON profiles(is_founder)
WHERE is_founder = true;

-- ========================================
-- 3. FLAGGER LES 15 FOUNDERS ACTUELLES
-- ========================================
UPDATE profiles
SET is_founder = true,
    updated_at = NOW()
WHERE id IN (
  '6a483d6e-fd8f-4cb8-a606-3a9dfebab123', -- La Cosmeticaire
  'c6aa6589-ff7f-44bc-9dab-7b1c42fc7fcf', -- Hennailah
  '1fa64557-dcbc-456d-8ae9-838b0c30e8eb', -- Mountiq.io
  '2dcd2d1f-8faa-4012-97f1-24b74746d667', -- KAINA CAFTAN
  'cf3dd84f-e426-4aa0-901c-6375f5cd0799', -- La Villa Aesthetic
  'f4302742-f063-423d-b653-c8a739d0e22c', -- Dolcezza Traiteur
  '1db45ae9-bc08-4fd9-97ed-b8aa948e9f00', -- The Nice Events
  'e3b9018a-02c3-4966-8cb0-479ef5e7978d', -- By A La Votre
  '38d55f76-cca2-4a34-9d7c-a91c0b5a6ff7', -- NOUNOU DE NUIT
  '145818f2-67d4-43ef-bc9f-1a91ba70cf6d', -- Naya traiteur
  '3e5a4ea1-86f3-4a28-b7d3-803cb6a27cc8', -- Myra Events
  'fab86ba0-591e-49bb-ba57-3832af250899', -- Stukkkkkkkk
  '5b548775-12f6-47a6-a730-ace4a6cc21ff', -- O caramel
  'b9e21392-2a57-4b52-a465-f5e50759ad8b', -- Loli Studio
  '0aa84b53-9b01-403a-8ef6-991ac45b4ab2'  -- ErdesiaFood
);

-- ========================================
-- 4. TRIGGER AUTO-FLAG FOUNDERS
-- ========================================
CREATE OR REPLACE FUNCTION auto_flag_founder()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved')
     AND NEW.is_founder = false
     AND (SELECT founders_window_open FROM app_config LIMIT 1) = true
  THEN
    NEW.is_founder := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_flag_founder ON profiles;

CREATE TRIGGER trg_auto_flag_founder
BEFORE INSERT OR UPDATE OF status ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_flag_founder();
