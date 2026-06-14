-- =====================================================================
-- HILMY · 65 — Traçabilité du consentement photos sur les recommandations.
-- ---------------------------------------------------------------------
-- Contexte (PR-a « ajout reco depuis la fiche ») : dès qu'une copine
-- attache des photos à sa reco, on lui demande de certifier qu'elle a le
-- droit de les publier et qu'aucune personne identifiable n'y figure sans
-- son accord (case bloquante côté UI). On HORODATE ce consentement ici.
--
-- Pourquoi dès PR-a alors que les photos ne sont PAS encore publiques
-- (l'affichage public = PR-c) : on veut une preuve de consentement éclairé
-- tracée dès la saisie, pas rétroactivement. Enjeu RGPD/nLPD.
--
-- Additif et sûr : colonne nullable, aucune valeur par défaut, aucune
-- réécriture de ligne existante. Les recos déjà en base restent à NULL
-- (consentement non collecté à l'époque — distinction nette). Aucune RLS
-- touchée : l'écriture passe par les policies INSERT/UPDATE owner-only
-- existantes (user_id = auth.uid()).
-- =====================================================================

alter table public.recommendations
  add column if not exists photo_consent_at timestamptz;

comment on column public.recommendations.photo_consent_at is
  'Horodatage du consentement photos (certif. droit de publication + absence de tiers identifiable sans accord). NULL = non collecté. Renseigné par RecoForm uniquement quand des photos sont attachées.';
