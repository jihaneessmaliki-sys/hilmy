-- =====================================================================
-- HILMY · 38 — Module "Je cherche..." (Phase 6)
-- Feed communautaire de demandes / recommandations entre membres.
-- Driver de trafic vers les fiches prestataires payantes.
-- Idempotent.
--
-- 4 tables :
--   - demandes              : posts publics des copines
--   - demande_responses     : recos en réponse à une demande
--   - demande_signalements  : modération communautaire (XOR demande/response)
--   - demande_response_thanks : "merci copine" sur une reco (1 par user)
--
-- 3 triggers :
--   - response_count auto sur demandes
--   - flag_count auto + auto-hide à 3 signalements
--   - helpful_count auto sur demande_responses
--
-- 1 view :
--   - demandes_feed : demandes publiques + JOIN user_profiles (prenom, avatar)
--
-- Conventions Hilmy :
--   - user_id REFERENCES auth.users(id) ON DELETE CASCADE (cohérent avec
--     le reste du repo : recommendations, favoris, content_reports)
--   - prestataire_id REFERENCES profiles(id) (table prestataires)
--   - JOIN user_profiles via user_profiles.user_id = demandes.user_id
--   - Catégories : alignées sur PrestataireCategorie (lib/constants.ts) +
--     'autre' pour les demandes hors-annuaire
--
-- ATTENTION : exécuter via bash scripts/run-migration.sh
-- =====================================================================

-- =====================================================================
-- 1. TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.demandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  content text NOT NULL CHECK (char_length(content) BETWEEN 10 AND 2000),
  category text NOT NULL CHECK (category IN (
    'beaute', 'bien-etre', 'sante-mentale', 'sport-nutrition',
    'enfants-famille', 'maison', 'cuisine', 'evenementiel',
    'mode-style', 'business-juridique', 'conseilleres-de-marque',
    'autre'
  )),
  canton text,
  city text,
  country text NOT NULL DEFAULT 'CH' CHECK (country IN (
    'CH', 'FR', 'BE', 'LU', 'MC'
  )),
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'resolved', 'hidden', 'closed'
  )),

  flag_count int NOT NULL DEFAULT 0 CHECK (flag_count >= 0),
  response_count int NOT NULL DEFAULT 0 CHECK (response_count >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.demandes IS
  'Demandes publiques du module Je cherche. Auto-hide à 3 signalements via trigger.';

CREATE INDEX IF NOT EXISTS demandes_status_created_idx
  ON public.demandes (status, created_at DESC)
  WHERE status IN ('open', 'resolved');
CREATE INDEX IF NOT EXISTS demandes_category_status_created_idx
  ON public.demandes (category, status, created_at DESC)
  WHERE status IN ('open', 'resolved');
CREATE INDEX IF NOT EXISTS demandes_urgency_status_created_idx
  ON public.demandes (urgency, status, created_at DESC)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS demandes_user_idx ON public.demandes (user_id);

-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.demande_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id uuid NOT NULL REFERENCES public.demandes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  content text NOT NULL CHECK (char_length(content) BETWEEN 5 AND 1500),
  prestataire_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  flag_count int NOT NULL DEFAULT 0 CHECK (flag_count >= 0),
  is_hidden boolean NOT NULL DEFAULT false,
  helpful_count int NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.demande_responses IS
  'Recos en reponse a une demande. Auto-hide a 3 signalements.';

CREATE INDEX IF NOT EXISTS demande_responses_demande_visible_idx
  ON public.demande_responses (demande_id, helpful_count DESC, created_at DESC)
  WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS demande_responses_user_idx
  ON public.demande_responses (user_id);

-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.demande_signalements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  demande_id uuid REFERENCES public.demandes(id) ON DELETE CASCADE,
  response_id uuid REFERENCES public.demande_responses(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN (
    'spam', 'inapproprie', 'harcelement', 'autre'
  )),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- XOR : exactement une cible (demande OU response, pas les deux)
  CONSTRAINT demande_signalements_xor_target CHECK (
    (demande_id IS NOT NULL AND response_id IS NULL) OR
    (demande_id IS NULL AND response_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.demande_signalements IS
  'Signalements communautaires sur demandes ou responses (XOR). Anti-dup unique reporter/cible.';

-- Anti-dup : un reporter ne peut signaler la meme cible qu'une fois.
-- Index UNIQUE multi-colonnes nullables : on cree 2 index partiels.
CREATE UNIQUE INDEX IF NOT EXISTS demande_signalements_unique_demande
  ON public.demande_signalements (reporter_id, demande_id)
  WHERE demande_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS demande_signalements_unique_response
  ON public.demande_signalements (reporter_id, response_id)
  WHERE response_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS demande_signalements_demande_idx
  ON public.demande_signalements (demande_id) WHERE demande_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS demande_signalements_response_idx
  ON public.demande_signalements (response_id) WHERE response_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS demande_signalements_created_idx
  ON public.demande_signalements (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.demande_response_thanks (
  response_id uuid NOT NULL REFERENCES public.demande_responses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (response_id, user_id)
);

COMMENT ON TABLE public.demande_response_thanks IS
  'Like "merci copine" sur une reco. PK composite -> 1 thanks par user max.';

CREATE INDEX IF NOT EXISTS demande_response_thanks_user_idx
  ON public.demande_response_thanks (user_id);

-- =====================================================================
-- 2. TRIGGERS
-- =====================================================================

-- ─── Trigger updated_at générique ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_je_cherche_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS demandes_updated_at_trg ON public.demandes;
CREATE TRIGGER demandes_updated_at_trg
  BEFORE UPDATE ON public.demandes
  FOR EACH ROW EXECUTE FUNCTION public.bump_je_cherche_updated_at();

DROP TRIGGER IF EXISTS demande_responses_updated_at_trg ON public.demande_responses;
CREATE TRIGGER demande_responses_updated_at_trg
  BEFORE UPDATE ON public.demande_responses
  FOR EACH ROW EXECUTE FUNCTION public.bump_je_cherche_updated_at();

-- ─── response_count auto ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_demande_response_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.demandes
       SET response_count = response_count + 1
     WHERE id = NEW.demande_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.demandes
       SET response_count = GREATEST(response_count - 1, 0)
     WHERE id = OLD.demande_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_demande_response_count ON public.demande_responses;
CREATE TRIGGER trg_update_demande_response_count
  AFTER INSERT OR DELETE ON public.demande_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_demande_response_count();

-- ─── flag_count auto + auto-hide a 3 ───────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_demande_signalement()
RETURNS TRIGGER AS $$
DECLARE
  new_flag_count int;
BEGIN
  IF NEW.demande_id IS NOT NULL THEN
    UPDATE public.demandes
       SET flag_count = flag_count + 1
     WHERE id = NEW.demande_id
     RETURNING flag_count INTO new_flag_count;

    IF new_flag_count >= 3 THEN
      UPDATE public.demandes
         SET status = 'hidden'
       WHERE id = NEW.demande_id
         AND status NOT IN ('hidden', 'closed');
    END IF;

  ELSIF NEW.response_id IS NOT NULL THEN
    UPDATE public.demande_responses
       SET flag_count = flag_count + 1
     WHERE id = NEW.response_id
     RETURNING flag_count INTO new_flag_count;

    IF new_flag_count >= 3 THEN
      UPDATE public.demande_responses
         SET is_hidden = true
       WHERE id = NEW.response_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_signalement ON public.demande_signalements;
CREATE TRIGGER trg_handle_signalement
  AFTER INSERT ON public.demande_signalements
  FOR EACH ROW EXECUTE FUNCTION public.handle_demande_signalement();

-- ─── helpful_count auto ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_response_thanks_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.demande_responses
       SET helpful_count = helpful_count + 1
     WHERE id = NEW.response_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.demande_responses
       SET helpful_count = GREATEST(helpful_count - 1, 0)
     WHERE id = OLD.response_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_response_thanks ON public.demande_response_thanks;
CREATE TRIGGER trg_update_response_thanks
  AFTER INSERT OR DELETE ON public.demande_response_thanks
  FOR EACH ROW EXECUTE FUNCTION public.update_response_thanks_count();

-- =====================================================================
-- 3. RLS
-- =====================================================================

ALTER TABLE public.demandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demande_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demande_signalements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demande_response_thanks ENABLE ROW LEVEL SECURITY;

-- ─── demandes ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "demandes_public_read_visible" ON public.demandes;
CREATE POLICY "demandes_public_read_visible"
  ON public.demandes FOR SELECT
  USING (status IN ('open', 'resolved'));

-- L'auteur peut aussi voir ses propres demandes hidden/closed (utile pour
-- comprendre qu'elles ont ete masquees apres signalements).
DROP POLICY IF EXISTS "demandes_owner_read_all" ON public.demandes;
CREATE POLICY "demandes_owner_read_all"
  ON public.demandes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "demandes_auth_insert" ON public.demandes;
CREATE POLICY "demandes_auth_insert"
  ON public.demandes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "demandes_owner_update" ON public.demandes;
CREATE POLICY "demandes_owner_update"
  ON public.demandes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "demandes_owner_delete" ON public.demandes;
CREATE POLICY "demandes_owner_delete"
  ON public.demandes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── demande_responses ────────────────────────────────────────────
DROP POLICY IF EXISTS "demande_responses_public_read_visible" ON public.demande_responses;
CREATE POLICY "demande_responses_public_read_visible"
  ON public.demande_responses FOR SELECT
  USING (is_hidden = false);

DROP POLICY IF EXISTS "demande_responses_owner_read_all" ON public.demande_responses;
CREATE POLICY "demande_responses_owner_read_all"
  ON public.demande_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT : auth user pour soi-meme. La verification que la demande n'est
-- pas hidden se fait cote server action (le RLS ne peut pas joindre la
-- demande sans complexifier).
DROP POLICY IF EXISTS "demande_responses_auth_insert" ON public.demande_responses;
CREATE POLICY "demande_responses_auth_insert"
  ON public.demande_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "demande_responses_owner_update" ON public.demande_responses;
CREATE POLICY "demande_responses_owner_update"
  ON public.demande_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "demande_responses_owner_delete" ON public.demande_responses;
CREATE POLICY "demande_responses_owner_delete"
  ON public.demande_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── demande_signalements ────────────────────────────────────────
DROP POLICY IF EXISTS "demande_signalements_auth_insert" ON public.demande_signalements;
CREATE POLICY "demande_signalements_auth_insert"
  ON public.demande_signalements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "demande_signalements_self_read" ON public.demande_signalements;
CREATE POLICY "demande_signalements_self_read"
  ON public.demande_signalements FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);
-- Pas d'UPDATE ni DELETE -> reserve service-role (admin)

-- ─── demande_response_thanks ─────────────────────────────────────
DROP POLICY IF EXISTS "demande_response_thanks_public_read" ON public.demande_response_thanks;
CREATE POLICY "demande_response_thanks_public_read"
  ON public.demande_response_thanks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "demande_response_thanks_auth_insert" ON public.demande_response_thanks;
CREATE POLICY "demande_response_thanks_auth_insert"
  ON public.demande_response_thanks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "demande_response_thanks_owner_delete" ON public.demande_response_thanks;
CREATE POLICY "demande_response_thanks_owner_delete"
  ON public.demande_response_thanks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================================
-- 4. VIEW demandes_feed
-- =====================================================================
-- JOIN avec user_profiles pour exposer prenom + avatar_url cote feed.
-- SECURITY INVOKER (default) -> respecte les RLS du caller.
DROP VIEW IF EXISTS public.demandes_feed;
CREATE VIEW public.demandes_feed AS
SELECT
  d.id,
  d.user_id,
  d.title,
  d.content,
  d.category,
  d.canton,
  d.city,
  d.country,
  d.urgency,
  d.status,
  d.flag_count,
  d.response_count,
  d.created_at,
  d.updated_at,
  up.prenom,
  up.avatar_url
FROM public.demandes d
LEFT JOIN public.user_profiles up ON up.user_id = d.user_id
WHERE d.status IN ('open', 'resolved');

COMMENT ON VIEW public.demandes_feed IS
  'Feed public Je cherche : demandes visibles + prenom/avatar_url join user_profiles.';

-- =====================================================================
-- 5. Reload PostgREST schema cache
-- =====================================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- DROP VIEW IF EXISTS public.demandes_feed;
-- DROP TRIGGER IF EXISTS trg_update_response_thanks ON public.demande_response_thanks;
-- DROP TRIGGER IF EXISTS trg_handle_signalement ON public.demande_signalements;
-- DROP TRIGGER IF EXISTS trg_update_demande_response_count ON public.demande_responses;
-- DROP TRIGGER IF EXISTS demande_responses_updated_at_trg ON public.demande_responses;
-- DROP TRIGGER IF EXISTS demandes_updated_at_trg ON public.demandes;
-- DROP FUNCTION IF EXISTS public.update_response_thanks_count();
-- DROP FUNCTION IF EXISTS public.handle_demande_signalement();
-- DROP FUNCTION IF EXISTS public.update_demande_response_count();
-- DROP FUNCTION IF EXISTS public.bump_je_cherche_updated_at();
-- DROP TABLE IF EXISTS public.demande_response_thanks;
-- DROP TABLE IF EXISTS public.demande_signalements;
-- DROP TABLE IF EXISTS public.demande_responses;
-- DROP TABLE IF EXISTS public.demandes;
-- =====================================================================
