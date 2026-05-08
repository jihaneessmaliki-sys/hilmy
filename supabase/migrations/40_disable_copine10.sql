-- =====================================================================
-- HILMY · 40 — Désactivation du seed COPINE10 (legacy)
-- =====================================================================
-- Le code promo `COPINE10` (-10% Premium, seed migration 35) est retiré
-- de l'UI prestataire à la même date. On le désactive en BDD via
-- `active = false` plutôt qu'un DELETE pour préserver l'historique
-- (audit trail + replay fresh-env cohérent).
--
-- Note : la migration 35 fait `ON CONFLICT DO UPDATE SET active = true`
-- sur le seed. En replay fresh-env, l'ordre des migrations garantit que
-- 35 réactive le seed puis 40 le redésactive. État final cohérent.
--
-- Idempotent : peut être rejouée sans erreur.
-- =====================================================================

UPDATE public.promo_codes
SET active = false,
    notes = COALESCE(notes, '') || ' [désactivé 2026-05-08 — promo lancement -50% via LANCEMENT50]'
WHERE code = 'COPINE10'
  AND active = true;

-- Reload PostgREST schema cache (pas strictement nécessaire pour un
-- UPDATE sur ligne existante, mais cohérent avec la convention du repo).
NOTIFY pgrst, 'reload schema';
