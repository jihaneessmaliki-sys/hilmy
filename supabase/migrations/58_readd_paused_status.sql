-- 58_readd_paused_status.sql
--
-- Réintroduit 'paused' dans le CHECK constraint profiles_status_check.
--
-- Contexte : la migration 54 a redéclaré profiles_status_check sans 'paused'
-- (oubli — son commentaire ne mentionne que draft/suspended comme "conservés").
-- Résultat : tout UPDATE status='paused' était rejeté par la DB depuis la 54,
-- alors que le code (toggle de visibilité dans les paramètres prestataire,
-- labelFor, canToggle) s'appuie sur ce statut. La mise en pause d'une fiche
-- était donc cassée à la racine, indépendamment de la RLS.
--
-- Fix : on ré-ajoute 'paused' à la liste autorisée. Changement purement
-- additif (aucune ligne existante invalidée) et idempotent (drop + recreate).
-- Complète la migration 57 qui rend déjà 'paused' invisible côté RLS.

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_status_check'
  ) then
    alter table public.profiles drop constraint profiles_status_check;
  end if;

  alter table public.profiles
    add constraint profiles_status_check
    check (status in (
      'draft', 'pending', 'approved', 'rejected', 'suspended', 'ghost', 'paused'
    ));
end $$;
