-- =====================================================================
-- HILMY · 27 — Voix Hilmy : vue voix_hilmy_recos_public
--                          + maj voix_hilmy_public (filtre cohérent)
--
-- ╔════════════════════════════════════════════════════════════════╗
-- ║ ⚠️ AVERTISSEMENT — VUES EXPOSÉES PUBLIQUEMENT À ANON ⚠️         ║
-- ║                                                                ║
-- ║ Toute colonne ajoutée au SELECT de ces vues est exposée        ║
-- ║ publiquement à anon (SECURITY DEFINER via                      ║
-- ║ security_invoker = false).                                     ║
-- ║                                                                ║
-- ║ Pour voix_hilmy_recos_public — N'ajouter QUE des données       ║
-- ║ publiques par design. Ne JAMAIS ajouter user_id de l'auteur,   ║
-- ║ admin_notes, source_import, ou toute autre colonne privée de   ║
-- ║ recommendations / places / profiles.                           ║
-- ╚════════════════════════════════════════════════════════════════╝
--
-- ────────────────────────────────────────────────────────────────
-- Pourquoi cette migration :
--   La page publique hilmy.io/{slug} (commit 4 du brief Voix Hilmy)
--   doit afficher la liste des recos publiées par une Voix à un
--   visiteur anon. Or les RLS existantes bloquent anon sur :
--     • recommendations : (auth.uid() IS NOT NULL AND status='published')
--                         OR auth.uid() = user_id
--     • places          : auth.uid() IS NOT NULL
--   profiles a déjà une RLS publique pour status='approved' (OK).
--
--   Plutôt que d'élargir les RLS existantes (sensibles, élargissent
--   la surface anon globalement), on crée une vue SECURITY DEFINER
--   qui joint recommendations + places + profiles avec les filtres
--   de visibilité reproduits manuellement, scopée uniquement aux
--   recos d'une Voix Hilmy active.
--
--   Pattern aligné sur voix_hilmy_public (mig 26) et
--   get_featured_voix() / get_voix_followers_count() (mig 24/25).
--
-- ────────────────────────────────────────────────────────────────
-- Filtres reproduits dans la vue (équivalent RLS publique) :
--
--   • r.status = 'published'
--     → seules les recos publiées sont visibles (aligné sur RLS
--       recommendations existante).
--
--   • r.comment IS NOT NULL AND length(trim(r.comment)) > 0
--     → on filtre les recos sans citation. Décision UX : la valeur
--       d'une reco Voix EST sa citation (le mockup la met centrale).
--       Sans citation → pas de valeur Voix → exclue. Cohérence
--       importante : recos_count de voix_hilmy_public est aussi mis
--       à jour ici-bas pour appliquer le même filtre, sinon la vue
--       perso afficherait "27 recos" alors que cette vue n'en
--       montrerait que 22.
--
--   • r.user_id IN (SELECT user_id FROM user_profiles
--                   WHERE is_voix_hilmy = true
--                     AND voix_hilmy_slug IS NOT NULL)
--     → seules les recos d'une Voix active. Le filtre voix_hilmy_slug
--       IS NOT NULL est aligné sur voix_hilmy_public (mig 26) pour
--       éviter qu'une Voix flaggée mais sans slug ait des recos
--       publiques tout en n'apparaissant pas dans le listing perso.
--
--   • LEFT JOIN places p ON p.id = r.place_id
--     → pas de filtre additionnel sur places. Pas de filtre métier
--       non plus car la table n'a PAS de colonne status / is_published
--       (vérifié par sondage migration 27). Si la convention métier
--       évolue (ex: ajout d'un archived_at), mettre à jour le LEFT
--       JOIN ici.
--
--   • LEFT JOIN profiles pr ON pr.id = r.profile_id
--                              AND pr.status = 'approved'
--     → reproduit la RLS publique de profiles ("public read approved
--       profiles"). Une reco type='prestataire' référençant un
--       profile non-approved sortira de la vue avec profile_* NULL
--       (LEFT JOIN sans match). Le frontend doit skip / fallback.
--
-- ────────────────────────────────────────────────────────────────
-- Edge cases que le frontend doit gérer :
--
--   • place_slug ou profile_slug peut être NULL (les colonnes slug
--     sont nullable côté DB). Si null → fallback vers /lieu/{id} ou
--     /prestataire-v2/{id}, ou skip la card.
--
--   • Pour une reco type='prestataire' avec un profile non-approved,
--     toutes les colonnes profile_* seront NULL → frontend doit
--     reconnaître ce cas (par ex. skip la card silencieusement).
--
--   • Pour une reco type='place' où le place a été supprimé après
--     coup, place_* seront NULL → idem, frontend skip.
--
-- ────────────────────────────────────────────────────────────────
-- Pas de ORDER BY dans la vue : c'est aux consumers d'ajouter
-- ORDER BY r.created_at DESC selon leur cas d'usage.
--
-- ⚠️ Note linter : la règle 0010_security_definer_view du dashboard
-- Supabase va flagger CETTE vue ET voix_hilmy_public (mig 26). C'est
-- volontaire pour les deux. Voir docs/voix-hilmy-onboarding.md section
-- "Limitations Phase 1 / dette technique".
--
-- Idempotent. Voir 27_voix_hilmy_recos_public_rollback.sql (rollback
-- la nouvelle vue ET restaure voix_hilmy_public à son état mig 26).
-- =====================================================================

-- ─── Section A : nouvelle vue voix_hilmy_recos_public ────────────

create or replace view public.voix_hilmy_recos_public
with (security_invoker = false) as
select
  r.id,
  r.user_id as voix_user_id,
  r.type,
  r.comment,
  r.created_at,
  -- place data : NULL si type='prestataire' ou si place supprimé
  p.id as place_id,
  p.name as place_name,
  p.city as place_city,
  p.slug as place_slug,
  -- profile data : NULL si type='place' ou si profile.status != 'approved'
  pr.id as profile_id,
  pr.nom as profile_nom,
  pr.ville as profile_ville,
  pr.slug as profile_slug
from public.recommendations r
left join public.places p
  on p.id = r.place_id
left join public.profiles pr
  on pr.id = r.profile_id
  and pr.status = 'approved'
where r.status = 'published'
  and r.comment is not null
  and length(trim(r.comment)) > 0
  and r.user_id in (
    select up.user_id
    from public.user_profiles up
    where up.is_voix_hilmy = true
      and up.voix_hilmy_slug is not null
  );

revoke all on public.voix_hilmy_recos_public from public;
grant select on public.voix_hilmy_recos_public to anon, authenticated, service_role;

comment on view public.voix_hilmy_recos_public is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée publiquement à anon (SSR site + app mobile). Liste des recos publiées par les Voix Hilmy actives, joint avec places ou profiles selon type. Filtres : status=published, comment non-vide, auteur=Voix avec slug. profile filtré sur status=approved (LEFT JOIN, NULL si non-approved → frontend skip). place sans filtre (la table n''a pas de colonne status). Le frontend doit gérer place_slug/profile_slug NULL. Ne JAMAIS ajouter user_id de l''auteur, admin_notes, source_import, ou toute donnée privée.';

-- ─── Section B : MAJ voix_hilmy_public — filtre comment cohérent ─

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
      and r.comment is not null
      and length(trim(r.comment)) > 0
  ) as recos_count,
  public.get_voix_followers_count(up.user_id) as followers_count
from public.user_profiles up
where up.is_voix_hilmy = true
  and up.voix_hilmy_slug is not null;

revoke all on public.voix_hilmy_public from public;
grant select on public.voix_hilmy_public to anon, authenticated, service_role;

comment on view public.voix_hilmy_public is
  '⚠️ Vue SECURITY DEFINER (security_invoker=false) — exposée publiquement à anon (SSR site + app mobile). Toute colonne ajoutée au SELECT devient publiquement accessible. N''ajouter QUE des données déjà publiques par design (user_id, prenom, slug, bio, activated_at, recos_count, followers_count). Ne JAMAIS ajouter age_range, email, posture, ou toute autre donnée privée de user_profiles. user_id est l''auth.users.id (pas user_profiles.id) — c''est la clé d''agrégation pour follow, recos, get_voix_followers_count. recos_count est filtré sur status=published ET comment non-vide pour cohérence avec voix_hilmy_recos_public (mig 27).';

-- =====================================================================
-- ROLLBACK : voir supabase/migrations/27_voix_hilmy_recos_public_rollback.sql
-- =====================================================================
