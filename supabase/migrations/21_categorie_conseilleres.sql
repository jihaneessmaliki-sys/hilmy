-- =====================================================================
-- HILMY · 21 — Élargit profiles_categorie_check pour inclure
-- 'conseilleres-de-marque' (11e catégorie : VDI, ambassadrices, vendeuses
-- à domicile).
--
-- Cible Sara distincte de 'business-juridique' (avocates/fiscalistes) :
-- femmes en reconversion ou complément de revenu.
--
-- Idempotent (drop+recreate du CHECK). Voir bas de fichier pour rollback.
--
-- ⚠️ NE PAS appliquer automatiquement — Jiji applique manuellement via
-- Management API (User-Agent obligatoire pour bypasser Cloudflare 1010).
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_categorie_check;
alter table public.profiles add constraint profiles_categorie_check
  check (categorie in (
    'beaute',
    'bien-etre',
    'sante-mentale',
    'sport-nutrition',
    'enfants-famille',
    'maison',
    'cuisine',
    'evenementiel',
    'mode-style',
    'business-juridique',
    'conseilleres-de-marque'
  ));

comment on constraint profiles_categorie_check on public.profiles is
  '11 catégories prestataires V2 (Sprint 3.1 : ajout conseilleres-de-marque
   pour cibler VDI / ambassadrices de marque).';

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- ⚠️ Avant de rollback : vérifier qu'aucune fiche n'a la catégorie
-- 'conseilleres-de-marque' (le DROP CONSTRAINT puis ADD CONSTRAINT
-- échouera si des lignes ont la valeur retirée).
--
-- alter table public.profiles drop constraint if exists profiles_categorie_check;
-- alter table public.profiles add constraint profiles_categorie_check
--   check (categorie in (
--     'beaute', 'bien-etre', 'sante-mentale', 'sport-nutrition',
--     'enfants-famille', 'maison', 'cuisine', 'evenementiel',
--     'mode-style', 'business-juridique'
--   ));
-- =====================================================================
