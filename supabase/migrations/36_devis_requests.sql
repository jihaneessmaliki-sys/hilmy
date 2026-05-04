-- =====================================================================
-- HILMY · 36 — Devis Express (Cercle Pro · Phase 4)
-- Table devis_requests : demandes de devis envoyées par les utilisatrices
-- aux prestataires Cercle Pro.
-- Idempotent.
--
-- Modèle :
--  - Chaque ligne = une demande envoyée par une utilisatrice (auth requise)
--    à une prestataire spécifique
--  - L'email envoyée à la prestataire est best-effort (pas de garantie
--    de delivery → la table sert d'archive + dashboard)
--  - La prestataire peut répondre directement à l'utilisatrice (out of
--    band, hors Hilmy) → la table sert juste à archiver l'historique
--    + permettre de marquer "traité" / "ignoré"
--
-- ATTENTION : ne pas exécuter en prod sans validation Jiji.
-- Exécuter via : bash scripts/run-migration.sh 36_devis_requests.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.devis_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Infos contact saisies dans le formulaire (snapshot à l'envoi)
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  message TEXT NOT NULL,

  -- Statut traité côté prestataire
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'replied', 'ignored', 'archived')),

  -- Trace email best-effort (null si l'envoi a raté)
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS devis_requests_prestataire_created_idx
  ON public.devis_requests (prestataire_id, created_at DESC);

CREATE INDEX IF NOT EXISTS devis_requests_user_idx
  ON public.devis_requests (user_id);

CREATE INDEX IF NOT EXISTS devis_requests_pending_idx
  ON public.devis_requests (prestataire_id) WHERE status = 'pending';

COMMENT ON TABLE public.devis_requests IS
  'Demandes de devis envoyées par utilisatrices aux prestataires Cercle Pro (Phase 4).';
COMMENT ON COLUMN public.devis_requests.status IS
  'pending = en attente / replied = répondu / ignored = ignoré par prestataire / archived = archivé.';
COMMENT ON COLUMN public.devis_requests.message IS
  'Texte libre saisi par utilisatrice. Limite côté server action 2000 chars.';

-- ─── Trigger updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_devis_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS devis_requests_updated_at_trg ON public.devis_requests;
CREATE TRIGGER devis_requests_updated_at_trg
  BEFORE UPDATE ON public.devis_requests
  FOR EACH ROW EXECUTE FUNCTION public.bump_devis_requests_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.devis_requests ENABLE ROW LEVEL SECURITY;

-- INSERT : utilisatrice authentifiée pour elle-même.
-- La validation que la prestataire ciblée est bien Cercle Pro se fait
-- côté server action (la policy SQL ne peut pas joindre profiles ici
-- sans complexifier).
DROP POLICY IF EXISTS "devis_requests_user_insert" ON public.devis_requests;
CREATE POLICY "devis_requests_user_insert"
  ON public.devis_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT : 2 cas
--  1) L'utilisatrice qui a envoyé le devis peut voir ses propres devis
--  2) La prestataire (owner du profile cible) peut voir les devis reçus
DROP POLICY IF EXISTS "devis_requests_user_select_own" ON public.devis_requests;
CREATE POLICY "devis_requests_user_select_own"
  ON public.devis_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "devis_requests_prestataire_select" ON public.devis_requests;
CREATE POLICY "devis_requests_prestataire_select"
  ON public.devis_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = devis_requests.prestataire_id
        AND p.user_id = auth.uid()
    )
  );

-- UPDATE : seule la prestataire peut changer le statut (pending -> replied/ignored/archived)
DROP POLICY IF EXISTS "devis_requests_prestataire_update_status" ON public.devis_requests;
CREATE POLICY "devis_requests_prestataire_update_status"
  ON public.devis_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = devis_requests.prestataire_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = devis_requests.prestataire_id
        AND p.user_id = auth.uid()
    )
  );

-- DELETE : aucune policy → personne ne peut supprimer (cleanup admin via service-role).

-- ─── Reload PostgREST schema cache ───────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- DROP POLICY IF EXISTS "devis_requests_user_insert" ON public.devis_requests;
-- DROP POLICY IF EXISTS "devis_requests_user_select_own" ON public.devis_requests;
-- DROP POLICY IF EXISTS "devis_requests_prestataire_select" ON public.devis_requests;
-- DROP POLICY IF EXISTS "devis_requests_prestataire_update_status" ON public.devis_requests;
-- DROP TRIGGER IF EXISTS devis_requests_updated_at_trg ON public.devis_requests;
-- DROP FUNCTION IF EXISTS public.bump_devis_requests_updated_at();
-- DROP TABLE IF EXISTS public.devis_requests;
-- =====================================================================
