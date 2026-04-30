-- =====================================================================
-- HILMY · 28 — places : tracking créateur + RLS DELETE Cas C
--
-- Ajoute created_by_user_id sur places pour tracer l'auteur de la fiche
-- (commit 6.5 du brief Voix Hilmy : flow create-reco mobile augmenté
-- avec Google Places autocomplete, où la copine peut créer une fiche
-- fantôme depuis un résultat Google).
--
-- Policy DELETE Cas C préparée mais PAS exposée côté UI en Phase 1 :
-- une copine pourra supprimer une fiche qu'elle a créée UNIQUEMENT si
-- aucun autre utilisateur n'a posé de reco dessus. Permet à la
-- créatrice de revenir sur une création par erreur sans risquer
-- d'effacer une fiche utile à d'autres copines.
--
-- Workflow applicatif futur (hors scope Phase 1) :
--   1. La créatrice supprime sa propre reco
--   2. Si elle était l'unique reco sur la place → DELETE place autorisé
--   3. Sinon DELETE place bloqué silencieusement par la policy
-- La FK recommendations.place_id étant RESTRICT par défaut, l'ordre
-- (reco d'abord, place ensuite) est imposé. L'application gérera le
-- workflow utilisateur — la policy DB est juste le garde-fou.
--
-- Idempotent. Voir 28_places_created_by_rollback.sql pour le rollback.
-- =====================================================================

-- ─── Colonne (idempotent) ────────────────────────────────────────
-- ON DELETE SET NULL : si le compte créateur est supprimé, la fiche
-- reste mais perd son lien créateur (devient anonyme). Aligné sur
-- le pattern voix_hilmy_follows (mig 25) qui CASCADE — choix
-- différent ici car la fiche reste utile aux autres copines même
-- sans créateur identifiable.
alter table public.places
  add column if not exists created_by_user_id uuid
    references auth.users(id) on delete set null;

-- ─── Index partiel (lookup "fiches créées par moi") ──────────────
-- Filtre WHERE created_by_user_id IS NOT NULL pour ne pas indexer
-- les ~42 fiches existantes pré-Phase 1 (qui auront NULL).
create index if not exists idx_places_created_by
  on public.places (created_by_user_id)
  where created_by_user_id is not null;

-- ─── RLS DELETE policy Cas C ─────────────────────────────────────
-- Une copine peut DELETE une fiche SI :
--   1. Elle est la créatrice (created_by_user_id = auth.uid())
--   2. ET aucun autre utilisateur n'a posé de reco dessus
--      (NOT EXISTS sur recommendations avec user_id != auth.uid())
--
-- ⚠️ Phase 1 : AUCUN UI de suppression n'est exposé. La policy est
-- préparée pour un commit futur "modifier/supprimer ma reco" qui
-- ajoutera le flow applicatif (DELETE reco → DELETE place si
-- conditions remplies).
--
-- Note edge case : la NOT EXISTS retourne true (vacuously) si la
-- place n'a AUCUNE reco. Cas qui peut arriver si la créatrice a
-- d'abord supprimé sa propre reco. La policy autorise alors le
-- DELETE — comportement attendu (Cas C).

drop policy if exists "places_delete_own_if_no_other_recos"
  on public.places;
create policy "places_delete_own_if_no_other_recos"
  on public.places
  for delete
  using (
    created_by_user_id = auth.uid()
    and not exists (
      select 1
      from public.recommendations r
      where r.place_id = places.id
        and r.user_id <> auth.uid()
    )
  );

-- ─── Comment ──────────────────────────────────────────────────────
comment on column public.places.created_by_user_id is
  'auth.users.id de la copine ayant créé la fiche fantôme via Google Places autocomplete (commit 6.5 voix hilmy). NULL pour les fiches créées avant ce commit ou via scripts curation. ON DELETE SET NULL pour préserver la fiche si le compte créateur est supprimé.';

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/28_places_created_by_rollback.sql
-- =====================================================================
