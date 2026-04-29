-- =====================================================================
-- HILMY · 27 — ROLLBACK migration vue voix_hilmy_recos_public
--
-- ⚠️ Pré-check :
--   1. Vérifier qu'aucun code applicatif (Next.js, Expo, scripts) ne
--      lit voix_hilmy_recos_public — un grep dans hilmy-muslim et
--      hilmy-mobile sur 'voix_hilmy_recos_public' suffit.
--   2. Le rollback DROP la nouvelle vue ET restaure voix_hilmy_public
--      à son état pré-migration 27 (= état mig 26, sans le filtre
--      comment IS NOT NULL dans recos_count). La vue voix_hilmy_public
--      reste donc fonctionnelle après rollback 27 — c'est SEULEMENT
--      le rollback 26 qui la drop entièrement.
--
-- ──────────────────────────────────────────────────────────────────
-- ORDRE D'EXÉCUTION :
--   Ce fichier seul. Si tu rollback aussi 26 ou 25 ou 24, exécute
--   ce fichier en premier (la vue voix_hilmy_recos_public dépend
--   des colonnes voix_hilmy_* de mig 24 et indirectement de la vue
--   voix_hilmy_public restaurée ici → DROP propre nécessaire avant
--   DROP des dépendances DB).
-- ──────────────────────────────────────────────────────────────────
-- =====================================================================

-- ─── Étape 1 : DROP voix_hilmy_recos_public ─────────────────────

drop view if exists public.voix_hilmy_recos_public;

-- ─── Étape 2 : Restauration voix_hilmy_public à l'état mig 26 ───
--
-- Le SQL ci-dessous est une copie auto-suffisante de la définition
-- de voix_hilmy_public telle qu'elle était à la fin de la migration
-- 26, AVANT que la 27 n'ajoute le filtre comment IS NOT NULL au
-- recos_count. Pas d'INCLUDE de fichier — tout en clair pour que ce
-- rollback soit exécutable seul.

create or replace view public.voix_hilmy_public
with (security_invoker = false) as
select
  up.user_id,
  up.prenom,
  up.voix_hilmy_slug as slug,
  up.voix_hilmy_bio as bio,
  up.voix_hilmy_activated_at as activated_at,
  (
    select count(*)::bigint
    from public.recommendations r
    where r.user_id = up.user_id
      and r.status = 'published'
  ) as recos_count,
  public.get_voix_followers_count(up.user_id) as followers_count
from public.user_profiles up
where up.is_voix_hilmy = true
  and up.voix_hilmy_slug is not null;

revoke all on public.voix_hilmy_public from public;
grant select on public.voix_hilmy_public to anon, authenticated, service_role;

comment on view public.voix_hilmy_public is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée publiquement à anon (SSR site + app mobile). Toute colonne ajoutée au SELECT devient publiquement accessible. N''ajouter QUE des données déjà publiques par design (user_id, prenom, slug, bio, activated_at, recos_count, followers_count). Ne JAMAIS ajouter age_range, email, posture, ou toute autre donnée privée de user_profiles. user_id est l''auth.users.id (pas user_profiles.id) — c''est la clé d''agrégation pour follow, recos, get_voix_followers_count.';
