-- =====================================================================
-- HILMY · 48 — Backfill historique gamification (Sprint U1.5)
--
-- Mig 16 a installé l'infra gamification (table point_events + vue
-- user_gamification + 3 triggers) le 2026-04-XX. Les triggers fire sur
-- INSERT/UPDATE post-mig uniquement → toutes les recos/events publiés
-- AVANT mig 16 ne sont JAMAIS comptés.
--
-- Cette mig 48 backfille rétroactivement :
--   - chaque reco status='published' → +10 pts à l'auteur
--   - chaque event status='published' → +20 pts à l'auteur
-- avec `created_at` historique préservé (la copine voit "il y a 2 mois"
-- pour ses gains backfillés, pas une date de mig artificielle).
--
-- Idempotente via NOT EXISTS sur (source_id, event_type) : re-run sans
-- doublons. Couvre tout : pré-mig 16 ET post-mig 16 si les triggers ont
-- raté (best-effort SECURITY DEFINER swallow).
--
-- Safeguard FK : ON DELETE CASCADE de point_events.user_id → auth.users
-- ferait planter l'INSERT si un user_id orphelin existe. Filtre explicite
-- IN auth.users pour défensiver — coût négligeable (jointure sur l'index
-- pkey de auth.users).
--
-- ⚠️ Application en prod : SUR DEMANDE EXPLICITE de Jiji, après backup
-- (auto-backup 09/05 00:28 UTC dispo).
-- =====================================================================


-- =====================================================================
-- 1. Backfill recos publiées → +10 pts/reco
-- =====================================================================
-- event_type='reco_published' (CHECK aligné sur trigger gamif_award_reco_points).
-- created_at = r.created_at préserve l'historique chronologique pour
-- "Tes derniers gains" (UI profil).

insert into public.point_events (user_id, source_id, event_type, points, created_at)
select r.user_id, r.id, 'reco_published', 10, r.created_at
from public.recommendations r
where r.status = 'published'
  and r.user_id in (select id from auth.users)  -- safeguard FK
  and not exists (
    select 1 from public.point_events pe
    where pe.source_id = r.id
      and pe.event_type = 'reco_published'
  );


-- =====================================================================
-- 2. Backfill events publiés → +20 pts/event
-- =====================================================================
-- event_type='event_published' (CHECK aligné sur trigger gamif_award_event_points).

insert into public.point_events (user_id, source_id, event_type, points, created_at)
select e.user_id, e.id, 'event_published', 20, e.created_at
from public.events e
where e.status = 'published'
  and e.user_id in (select id from auth.users)  -- safeguard FK
  and not exists (
    select 1 from public.point_events pe
    where pe.source_id = e.id
      and pe.event_type = 'event_published'
  );


-- =====================================================================
-- 3. NOTIFY PostgREST — vue user_gamification recalcule à chaque SELECT,
--    pas besoin de refresh, juste signaler le schéma changé pour cohérence.
-- =====================================================================

notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK (à exécuter en SQL si besoin de défaire la mig 48)
-- =====================================================================
-- ⚠️ Le rollback doit ne supprimer QUE les rows backfillées par cette mig,
-- pas les rows futures créées par les triggers post-mig 48. Comme on a
-- préservé created_at = source.created_at, il suffit de supprimer les
-- rows dont source_id correspond à une reco/event ANTÉRIEUR à l'apply de
-- la mig (les triggers post-mig ne fire que sur de nouvelles rows).
--
-- Pragmatique : capturer la timestamp d'apply de mig 48 (à la main) puis :
--
-- DELETE FROM public.point_events
--   WHERE event_type IN ('reco_published', 'event_published')
--     AND created_at < '<timestamp_apply_mig_48>';
--
-- (Les rows backfillées ont created_at < apply_date par construction,
-- les rows trigger normales auront created_at >= apply_date.)
