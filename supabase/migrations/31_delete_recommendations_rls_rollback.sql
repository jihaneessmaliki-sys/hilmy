-- Rollback migration 31 : retire la RLS DELETE policy sur recommendations.
-- Après ce rollback, les DELETE depuis le client mobile échoueront à
-- nouveau silencieusement (RLS bloque). Code mobile reste compatible
-- (le pattern { ok: false, error } est déjà géré côté UI).

drop policy if exists "Delete own recommendations" on public.recommendations;
