-- Migration 31 : RLS DELETE policy sur recommendations (Bug C)
-- ────────────────────────────────────────────────────────────────────
-- Permet à chaque copine de supprimer ses propres recos publiées.
--
-- Audit pré-mig : la table recommendations avait 3 policies (SELECT,
-- INSERT, UPDATE) toutes sur auth.uid() = user_id, mais AUCUNE policy
-- DELETE. Conséquence : les DELETE depuis le client mobile échouaient
-- silencieusement (0 rows affected) car RLS bloque par défaut tout
-- ce qui n'est pas explicitement autorisé.
--
-- Cette migration ajoute la 4e policy. Pattern symétrique aux 3
-- existantes (auth.uid() = user_id), defense in depth aussi côté
-- client mobile (deleteMyRecommendation passe .eq('user_id', user.id)
-- en plus du filtre RLS).
-- ────────────────────────────────────────────────────────────────────

create policy "Delete own recommendations" on public.recommendations
  for delete
  using (auth.uid() = user_id);
