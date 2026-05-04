-- =====================================================================
-- HILMY · 35 — Codes promo (Premium "-10% pour les Copines")
-- Idempotent.
--
-- Table publique en READ ONLY pour le client (validation d'un code saisi
-- au moment du commit pricing). Seul le service-role peut INSERT/UPDATE
-- (création de codes par admin).
--
-- Le seed initial crée le code "COPINE10" -10% pour les abonnements
-- Premium uniquement, valide 1 an, sans limite d'usages.
--
-- ⚠️ Structure compatible Stripe Coupons : quand Stripe LIVE sera actif,
-- chaque code sera répliqué côté Stripe (stripe_coupon_id à ajouter).
--
-- ATTENTION : ne pas exécuter en prod sans validation Jiji.
-- Exécuter via : bash scripts/run-migration.sh 35_promo_codes.sql
-- =====================================================================

-- ─── Table promo_codes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  discount_pct INTEGER NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  applies_to_palier TEXT NOT NULL CHECK (
    applies_to_palier IN ('standard', 'premium', 'cercle_pro', 'all')
  ),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Code unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_unique_idx
  ON public.promo_codes (LOWER(code));

CREATE INDEX IF NOT EXISTS promo_codes_active_idx
  ON public.promo_codes (active, valid_until);

COMMENT ON TABLE public.promo_codes IS
  'Codes promo applicables aux abonnements prestataires. Compatible Stripe Coupons.';
COMMENT ON COLUMN public.promo_codes.applies_to_palier IS
  'Palier(s) éligible(s) : standard | premium | cercle_pro | all (tous).';
COMMENT ON COLUMN public.promo_codes.max_uses IS
  'NULL = illimité.';
COMMENT ON COLUMN public.promo_codes.current_uses IS
  'Incrementé via server-side trigger ou server action lors d''une souscription validée.';

-- ─── Trigger updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS promo_codes_updated_at_trg ON public.promo_codes;
CREATE TRIGGER promo_codes_updated_at_trg
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.bump_promo_codes_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- READ : tout le monde peut lire les codes ACTIFS et valides (validation
-- côté tarifs). On ne révèle pas les codes inactifs ou expirés.
DROP POLICY IF EXISTS "promo_codes_public_read_active" ON public.promo_codes;
CREATE POLICY "promo_codes_public_read_active"
  ON public.promo_codes
  FOR SELECT
  USING (
    active = true
    AND (valid_until IS NULL OR valid_until > now())
    AND valid_from <= now()
  );

-- WRITE : aucune policy → seul le service-role (admin) peut créer/modifier.
-- Le current_uses sera incrémenté par une server action côté admin
-- quand Stripe webhook confirme une souscription.

-- ─── Seed : code COPINE10 ─────────────────────────────────────────────
-- -10% sur les abonnements Premium uniquement, valide 1 an, illimité.
INSERT INTO public.promo_codes (code, discount_pct, applies_to_palier, valid_until, max_uses, notes)
VALUES (
  'COPINE10',
  10,
  'premium',
  now() + INTERVAL '1 year',
  NULL,
  'Code "Pour les Copines" — promesse Premium /tarifs. Valide 1 an, illimité.'
)
ON CONFLICT ((LOWER(code))) DO UPDATE
  SET discount_pct = EXCLUDED.discount_pct,
      applies_to_palier = EXCLUDED.applies_to_palier,
      valid_until = EXCLUDED.valid_until,
      max_uses = EXCLUDED.max_uses,
      active = true,
      notes = EXCLUDED.notes;

-- ─── Reload PostgREST schema cache ───────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- DROP POLICY IF EXISTS "promo_codes_public_read_active" ON public.promo_codes;
-- DROP TRIGGER IF EXISTS promo_codes_updated_at_trg ON public.promo_codes;
-- DROP FUNCTION IF EXISTS public.bump_promo_codes_updated_at();
-- DROP TABLE IF EXISTS public.promo_codes;
-- =====================================================================
