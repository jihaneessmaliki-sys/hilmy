-- Sprint 7bis #1 : Fermeture automatique fenêtre founders au 2026-06-01
-- Remplace le check manuel app_config.founders_window_open par date butoir UTC

CREATE OR REPLACE FUNCTION auto_flag_founder() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved')
     AND NEW.is_founder = false
     AND NOW() < '2026-06-01 00:00:00+00'::timestamptz
  THEN
    NEW.is_founder := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note : on garde la table app_config en place (pas DROP) au cas où on
-- veuille réintroduire un override manuel en Sprint 8. Mais le trigger
-- ne l'utilise plus.

COMMENT ON FUNCTION auto_flag_founder() IS
  'Sprint 7bis : flag is_founder=true automatiquement pour les nouvelles prestataires approved jusqu''au 2026-06-01 00:00 UTC. Après cette date, plus de nouveau founder créé automatiquement. Founders existants conservent leur statut à vie (révocation manuelle si inactif > 6 mois — Sprint 8bis).';
