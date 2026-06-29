-- =====================================================================
-- HILMY · 78 — member_public : ajoute following_count
--
-- Profil membre « façon réseau social » : on affiche désormais à la fois
-- les abonnées (qui la suivent, followers_count) ET les abonnements
-- (qui elle suit, following_count). On ajoute following_count à la vue.
--
-- CREATE OR REPLACE en AJOUTANT la colonne EN FIN de SELECT (ordre des
-- colonnes existantes inchangé → remplacement autorisé). Idempotent.
-- Reprend exactement la def de la migration 75 + following_count.
-- =====================================================================

create or replace view public.member_public as
  select
    up.user_id,
    up.prenom,
    up.avatar_url,
    up.voix_hilmy_bio                              as bio,
    up.is_voix_hilmy,
    up.voix_hilmy_slug                             as slug,
    ( select count(*)
        from public.recommendations r
       where r.user_id = up.user_id
         and r.status = 'published'
         and r.type = 'place'
         and r.comment is not null
         and length(trim(r.comment)) > 0 )         as recos_count,
    public.get_voix_followers_count(up.user_id)    as followers_count,
    -- Abonnements : nombre de comptes que CETTE membre suit.
    ( select count(*)
        from public.voix_hilmy_follows f
       where f.follower_user_id = up.user_id )      as following_count
  from public.user_profiles up
  where up.prenom is not null
    and length(trim(up.prenom)) > 0;

revoke all on public.member_public from anon;
grant select on public.member_public to authenticated;
