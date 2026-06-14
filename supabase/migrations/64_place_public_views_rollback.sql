-- =====================================================================
-- HILMY · 64 ROLLBACK — supprime les vues publiques de la fiche reco.
-- Additif et sans donnée : drop pur, aucun impact sur places/recommendations.
-- =====================================================================

drop view if exists public.place_public_detail;
drop view if exists public.place_public_recos;
