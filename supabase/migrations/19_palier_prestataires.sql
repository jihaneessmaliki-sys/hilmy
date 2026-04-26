-- =====================================================================
-- HILMY · 19 — palier prestataires (display only, marketing chantier 2)
--
-- ⚠️ NOTE TECHNIQUE :
-- Cette colonne `palier` sera renommée en `tier` au Chantier 3 (Stripe),
-- avec ajout de la valeur 'fondatrice' (legacy gratuit). Ici on ne crée
-- que le minimum nécessaire pour la démo investisseur de demain.
--
-- Idempotent. Voir bas de fichier pour rollback.
-- =====================================================================

alter table public.profiles
  add column if not exists palier text not null default 'standard';

alter table public.profiles drop constraint if exists profiles_palier_check;
alter table public.profiles add constraint profiles_palier_check
  check (palier in ('standard', 'premium', 'cercle_pro'));

comment on column public.profiles.palier is
  'Palier d''abonnement display-only (chantier marketing 2). '
  'À fusionner avec une colonne `tier` au Chantier 3 Stripe.';

-- =====================================================================
-- DONNÉES DE DÉMO — à exécuter séparément après avoir identifié les
-- fiches que tu veux mettre en avant pour le RDV de demain.
--
-- Récupère 2 UUID via :
--   select id, slug, nom from public.profiles
--    where status = 'approved'
--    order by approved_at desc
--    limit 5;
--
-- Puis exécute :
--   update public.profiles set palier = 'premium'    where id = '<UUID-FICHE-DEMO-1>';
--   update public.profiles set palier = 'cercle_pro' where id = '<UUID-FICHE-DEMO-2>';
--
-- Toutes les autres fiches restent en 'standard' (default), donc badge
-- masqué dans la liste annuaire (cf. PrestataireCard.tsx).
-- =====================================================================

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- alter table public.profiles drop constraint if exists profiles_palier_check;
-- alter table public.profiles drop column if exists palier;
-- =====================================================================
