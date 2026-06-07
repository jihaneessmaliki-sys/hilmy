-- 57_hide_paused_profiles.sql
--
-- Ajoute 'paused' à la liste des statuts NON visibles de la policy de lecture
-- publique "public read visible profiles" (introduite en migration 54).
--
-- Contexte : une prestataire peut mettre sa fiche en pause depuis ses
-- paramètres (status='paused'). Or la policy n'excluait que
-- ('suspended','rejected','ghost','draft') : une fiche en pause conservant
-- un abonnement actif passait le test `profile_has_active_subscription(id)`
-- et restait donc VISIBLE (annuaire web, page publique, app native — toutes
-- soumises à cette policy unique). La pause ne cachait rien.
--
-- Fix : 'paused' est désormais traité comme caché, au même titre que
-- suspended/rejected/ghost/draft. Idempotent (drop + recreate).

begin;

drop policy if exists "public read visible profiles" on public.profiles;

create policy "public read visible profiles"
  on public.profiles
  for select
  to anon, authenticated
  using (
    status not in ('suspended', 'rejected', 'ghost', 'draft', 'paused')
    and (
      paywall_exempt = true
      or public.profile_has_active_subscription(id)
    )
  );

comment on policy "public read visible profiles" on public.profiles is
  'Modèle B : visibilité publique gérée par la RLS. Caché si status in '
  '(suspended,rejected,ghost,draft,paused) ; sinon visible si paywall_exempt '
  'ou abonnement actif (profile_has_active_subscription). 57 ajoute paused.';

commit;
