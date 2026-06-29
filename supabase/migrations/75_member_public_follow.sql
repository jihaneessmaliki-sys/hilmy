-- =====================================================================
-- HILMY · 75 — Follow universel : profil public de chaque membre
--
-- Étape A du « follow universel » : pouvoir cliquer sur n'importe quelle
-- femme (membre OU prestataire) et la suivre.
--
-- Le graphe de follow existe déjà : voix_hilmy_follows(follower_user_id,
-- voix_user_id) est en réalité un graphe générique « follower → user
-- suivi » (le nom « voix » est historique). On le réutilise tel quel pour
-- suivre N'IMPORTE quel compte — membre ou prestataire (on suit le
-- user_id propriétaire de la fiche). get_voix_followers_count(uid) compte
-- déjà les abonnés de n'importe quel user_id. Donc AUCUNE migration de
-- données, aucun risque sur le follow Créatrices existant.
--
-- Cette migration n'ajoute qu'une chose : une VUE publique du profil
-- membre (member_public), pour afficher/ suivre une copine qui n'est pas
-- (encore) Créatrice. Lecture réservée aux utilisatrices CONNECTÉES
-- (authenticated) — pas anon : on ne browse les profils membres qu'une
-- fois loguée (posture privacy/RGPD ; les Créatrices, elles, restent
-- publiques via voix_hilmy_public pour le site).
--
-- security_invoker reste à false (défaut) : la vue lit user_profiles avec
-- les droits du propriétaire de la vue et n'expose QUE des colonnes sûres
-- (prénom, avatar, compteurs) — jamais email/téléphone/PII. Même pattern
-- que voix_hilmy_public.
--
-- Idempotent. Rollback : 75_member_public_follow_rollback.sql.
-- =====================================================================

create or replace view public.member_public as
  select
    up.user_id,
    up.prenom,
    up.avatar_url,
    up.voix_hilmy_bio                              as bio,
    up.is_voix_hilmy,
    up.voix_hilmy_slug                             as slug,
    -- Carnet = lieux uniquement (cohérent avec la page Créatrice) :
    -- recos publiées de type 'place' avec un commentaire écrit.
    ( select count(*)
        from public.recommendations r
       where r.user_id = up.user_id
         and r.status = 'published'
         and r.type = 'place'
         and r.comment is not null
         and length(trim(r.comment)) > 0 )         as recos_count,
    public.get_voix_followers_count(up.user_id)    as followers_count
  from public.user_profiles up
  where up.prenom is not null
    and length(trim(up.prenom)) > 0;

-- Lecture réservée aux connectées (pas anon).
revoke all on public.member_public from anon;
grant select on public.member_public to authenticated;

comment on view public.member_public is
  'Profil public d''une membre pour le follow universel (étape A). Colonnes sûres uniquement (prénom, avatar, bio, statut Créatrice, compteurs). Lecture authenticated only. Le graphe de follow reste voix_hilmy_follows (générique) ; les compteurs via get_voix_followers_count().';
