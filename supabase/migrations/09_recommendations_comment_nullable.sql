-- =====================================================================
-- HILMY · 09 — recommendations.comment devient nullable
-- Permet publier un avis rating-only (sans texte).
-- Le client (AvisSection.tsx) envoie déjà comment=null dans ce mode ;
-- la contrainte NOT NULL initiale bloquait l'insert.
-- =====================================================================

alter table public.recommendations alter column comment drop not null;
