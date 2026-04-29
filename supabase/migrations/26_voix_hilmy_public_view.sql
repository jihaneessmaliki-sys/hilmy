-- =====================================================================
-- HILMY · 26 — Voix Hilmy : vue publique voix_hilmy_public
--
-- ╔════════════════════════════════════════════════════════════════╗
-- ║ ⚠️ AVERTISSEMENT — VUE EXPOSÉE PUBLIQUEMENT À ANON ⚠️           ║
-- ║                                                                ║
-- ║ Toute colonne ajoutée au SELECT de cette vue est exposée       ║
-- ║ publiquement à anon (SECURITY DEFINER via                      ║
-- ║ security_invoker = false).                                     ║
-- ║                                                                ║
-- ║ N'ajouter QUE des données déjà publiques par design :          ║
-- ║   user_id, prenom, slug, bio, activated_at,                    ║
-- ║   recos_count, followers_count                                 ║
-- ║                                                                ║
-- ║ Ne JAMAIS ajouter age_range, email, posture, univers_choisis,  ║
-- ║ onboarding_data, preferences, ou toute autre colonne privée    ║
-- ║ de user_profiles.                                              ║
-- ╚════════════════════════════════════════════════════════════════╝
--
-- ────────────────────────────────────────────────────────────────
-- Vue de présentation publique des Voix Hilmy. Source unique de
-- vérité pour le rendu :
--   • SSR Next.js de hilmy.io/{slug}
--   • Listing app mobile (tab Recos > Les Voix Hilmy)
--   • Mention "Recommandé par X" sur fiche lieu/prestataire (lookup
--     par user_id pour récupérer prenom + slug)
--
-- Pourquoi user_id (auth.users.id) et pas user_profiles.id :
--   Le frontend doit composer avec voix_hilmy_follows (FK voix_user_id
--   = auth.users.id), avec recommendations (user_id = auth.users.id),
--   et avec get_voix_followers_count(p_voix_user_id auth.users.id).
--   Exposer user_profiles.id forcerait un JOIN supplémentaire à
--   chaque consumer. user_id est la clé d'agrégation canonique.
--
-- Pourquoi SECURITY DEFINER (security_invoker = false) :
--   1. Cohérence avec get_featured_voix() (migration 24) qui sert le
--      même cas d'usage anon SSR.
--   2. Défense par column-whitelisting : la liste explicite du SELECT
--      garantit que seules ces colonnes sont publiques, quoi que
--      fasse anon sur la vue.
--   3. Résilient si la RLS user_profiles est durcie plus tard. Pour
--      info, à la création (avril 2026) user_profiles a une policy
--      "select_all" (qual = true, role = public) qui rend toutes
--      les lignes lisibles par anon — dette de sécurité héritée à
--      traiter hors-scope Voix Hilmy (TODO post-Phase 1).
--   4. Owner attendu = postgres (créée via Management API
--      run-migration.sh, qui exécute en role postgres). Le bypass
--      RLS du owner est ce qui rend security_invoker = false utile.
--      Si jamais la vue est recréée par un autre role, vérifier
--      l'owner via :
--          SELECT viewowner FROM pg_views
--          WHERE schemaname = 'public'
--            AND viewname = 'voix_hilmy_public';
--
--   ⚠️ Note linter : la règle 0010_security_definer_view du dashboard
--   Supabase va flagger cette vue. C'est volontaire (voir raisons
--   1-4 ci-dessus). Ne PAS "fixer" en repassant en security_invoker
--   = true sans relire le contexte de cette migration.
--
-- Pourquoi WHERE is_voix_hilmy = true AND voix_hilmy_slug IS NOT NULL :
--   La contrainte voix_hilmy_complete (migration 24) garantit déjà
--   que slug + bio sont renseignés si is_voix_hilmy = true. Le filtre
--   slug IS NOT NULL est un garde-fou défensif : si une Voix se
--   retrouve flaggée sans slug pour une raison aberrante (bug admin,
--   anomalie data import), on l'exclut de la vue plutôt que d'exposer
--   une page hilmy.io/null cassée.
--
-- Compteurs :
--   • recos_count : sub-query inline. Filtré sur status = 'published'
--     (les autres valeurs CHECK 'flagged'/'removed' ne sont pas
--     publiques). Pas de fonction dédiée — count direct trivial,
--     pas de logique métier à factoriser.
--   • followers_count : délègue à get_voix_followers_count() de la
--     migration 25. Single source of truth du compteur (cohérent
--     avec usage de la fonction sur la fiche perso côté front).
--
-- Idempotent via CREATE OR REPLACE VIEW.
-- Voir 26_voix_hilmy_public_view_rollback.sql pour le rollback.
-- =====================================================================

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

-- ─── Grants : strictement SELECT à anon, authenticated, service_role
revoke all on public.voix_hilmy_public from public;
grant select on public.voix_hilmy_public to anon, authenticated, service_role;

-- ─── Comment (visible dans pg_views.viewdef) ────────────────────
comment on view public.voix_hilmy_public is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée publiquement à anon (SSR site + app mobile). Toute colonne ajoutée au SELECT devient publiquement accessible. N''ajouter QUE des données déjà publiques par design (user_id, prenom, slug, bio, activated_at, recos_count, followers_count). Ne JAMAIS ajouter age_range, email, posture, ou toute autre donnée privée de user_profiles. user_id est l''auth.users.id (pas user_profiles.id) — c''est la clé d''agrégation pour follow, recos, get_voix_followers_count.';

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/26_voix_hilmy_public_view_rollback.sql
-- =====================================================================
