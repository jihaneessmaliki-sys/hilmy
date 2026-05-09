-- =====================================================================
-- HILMY · 46 — Filtres saisonniers /événements (PR-F)
--
-- Ajoute la colonne `event_seasonal_category_id` sur la table events,
-- FK optionnelle vers event_seasonal_categories (mig 44 + 45). Drive :
--   1. Le select "Catégorie saisonnière" dans le form de création event
--      (/dashboard/utilisatrice/evenements/nouveau)
--   2. Les filtres chips de la page publique /evenements-v2
--   3. Le badge "🌙 RAMADAN" sur EvenementCard
--
-- ⚠️ Distinct de events.boost_event_type (mig 41) : ce dernier reste en
-- place pour le boost lieu Sélection Hilmy (25 slugs snake_case CHECK
-- constraint, basés sur events réels). Cette colonne-ci utilise des
-- slugs kebab-case (ramadan, saint-valentin, fete-meres…) référencés
-- comme FK uuid → naming distinct, pas de couplage.
--
-- Idempotente. ALTER TABLE ADD COLUMN nullable + INDEX partial +
-- COMMENT. Aucun impact sur les rows existantes (NULL par défaut).
-- =====================================================================


-- =====================================================================
-- 1. Colonne FK nullable
-- =====================================================================

alter table public.events
  add column if not exists event_seasonal_category_id uuid
  references public.event_seasonal_categories(id) on delete set null;


-- =====================================================================
-- 2. Index partial (lookup filtre + jointure feed page)
-- =====================================================================
-- Partial index : seules les rows avec une catégorie sont indexées.
-- Compact + efficace pour le filtre "?seasonal=ramadan" du feed.

create index if not exists idx_events_seasonal_category
  on public.events(event_seasonal_category_id)
  where event_seasonal_category_id is not null;


-- =====================================================================
-- 3. Comment de doc
-- =====================================================================

comment on column public.events.event_seasonal_category_id is
  'FK optionnelle vers event_seasonal_categories (mig 44/45). Drive les '
  'filtres saisonniers /événements et le badge card (PR-F mig 46). '
  'Distinct de boost_event_type (mig 41, 25 slugs snake_case lieu).';


-- =====================================================================
-- 4. NOTIFY PostgREST — recharger le schéma exposé par l''API
-- =====================================================================

notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK (à exécuter en SQL si besoin de défaire la mig 46)
-- =====================================================================
-- drop index if exists public.idx_events_seasonal_category;
-- alter table public.events drop column if exists event_seasonal_category_id;
-- notify pgrst, 'reload schema';
