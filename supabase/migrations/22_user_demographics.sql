-- =====================================================================
-- HILMY · 22 — Démographiques utilisatrices : age_range
--
-- Ajoute une tranche d'âge nullable sur user_profiles pour alimenter les
-- stats communautaires et personnaliser l'expérience. Pseudonymisée
-- (tranches, pas âges exacts) pour conformité RGPD.
--
-- prenom : NON ajouté ici — la colonne existe déjà sur user_profiles
-- (NOT NULL depuis le seed initial), donc rien à faire côté schéma.
-- Le brief Batch A demandait initialement les 2 colonnes sur `profiles`
-- (prestataires), réorienté vers user_profiles (option B confirmée Jiji)
-- car le contexte business cible les utilisatrices.
--
-- Idempotent. Voir bas de fichier pour rollback.
-- =====================================================================

alter table public.user_profiles
  add column if not exists age_range text;

alter table public.user_profiles drop constraint if exists user_profiles_age_range_check;
alter table public.user_profiles add constraint user_profiles_age_range_check
  check (age_range is null or age_range in ('18-24', '25-34', '35-44', '45-54', '55+'));

-- Index partiel pour les requêtes statistiques admin (anciennes utilisatrices
-- qui n'ont pas encore opt-in via la modale Batch C ne pollueront pas l'index).
create index if not exists idx_user_profiles_age_range
  on public.user_profiles (age_range) where age_range is not null;

comment on column public.user_profiles.age_range is
  'Tranche d''âge collectée à l''onboarding (Batch B 04/2026) ou via modale opt-in (Batch C 04/2026). Nullable pour rétro-compat avec utilisatrices existantes. Données pseudonymisées (tranches, pas âges exacts) conformes RGPD.';

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- ⚠️ Avant rollback : check si des lignes ont age_range non-null que tu
-- veux préserver dans un export, sinon perdues.
--
-- drop index if exists public.idx_user_profiles_age_range;
-- alter table public.user_profiles drop constraint if exists user_profiles_age_range_check;
-- alter table public.user_profiles drop column if exists age_range;
-- =====================================================================
