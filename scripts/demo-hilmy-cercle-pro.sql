-- =====================================================================
-- DÉMO INVESTISSEUR — Fiche "Hilmy Demo · Cercle Pro" + stats peuplées
--
-- À exécuter dans Supabase SQL Editor avant la démo de demain.
-- Idempotent : peut être rejoué (insert profile = ON CONFLICT DO NOTHING,
-- inserts stats = clean re-insert après delete).
--
-- Owner : jihane.ess.maliki@gmail.com (user_id = 79fbe5a3-2acb-4a2c-b111-004ad9f20548)
-- =====================================================================

-- ─── 1) Création de la fiche démo ───────────────────────────────────
insert into public.profiles (
  user_id,
  nom,
  slug,
  categorie,
  ville,
  description,
  tagline,
  whatsapp,
  status,
  approved_at,
  palier,
  nb_vues,
  source_import,
  devise
) values (
  '79fbe5a3-2acb-4a2c-b111-004ad9f20548',
  'Hilmy Demo · Cercle Pro',
  'hilmy-demo-cercle-pro',
  'evenementiel',
  'Genève',
  'Cette fiche est utilisée par la fondatrice d''Hilmy pour présenter le palier Cercle Pro aux prestataires intéressées. Toutes les fonctionnalités du palier le plus complet sont visibles ici.',
  'Fiche de démonstration pour visualiser un compte Cercle Pro',
  '+41 79 000 00 00',
  'approved',
  now(),
  'cercle_pro',
  87,
  'manuel',
  'CHF'
)
on conflict (slug) do update
  set palier      = excluded.palier,
      status      = excluded.status,
      nb_vues     = excluded.nb_vues,
      user_id     = excluded.user_id,
      approved_at = excluded.approved_at,
      updated_at  = now();

-- ─── 2) Reset des stats pour rejouer le seed proprement ──────────────
delete from public.profile_views
 where profile_id = (select id from public.profiles where slug = 'hilmy-demo-cercle-pro');

delete from public.profile_contacts
 where profile_id = (select id from public.profiles where slug = 'hilmy-demo-cercle-pro');

-- ─── 3) profile_views — 40 lignes sur 30 jours, gradient croissant ───
-- Semaine 1 (J-28 à J-22) : 5 vues  → "ma fiche démarre"
-- Semaine 2 (J-21 à J-15) : 8 vues
-- Semaine 3 (J-14 à J-8)  : 12 vues
-- Semaine 4 (J-7  à J-0)  : 15 vues → "ça décolle"
-- Total                   : 40 vues réelles côté tracking (≠ nb_vues=87 cosmétique)

-- Semaine 1 : 5 vues
insert into public.profile_views (profile_id, viewed_at, country)
select
  (select id from public.profiles where slug = 'hilmy-demo-cercle-pro'),
  now() - interval '28 day' + (n * interval '33 hour') + (random() * interval '6 hour'),
  (array['CH','FR','BE','CH','FR'])[n + 1]
from generate_series(0, 4) as n;

-- Semaine 2 : 8 vues
insert into public.profile_views (profile_id, viewed_at, country)
select
  (select id from public.profiles where slug = 'hilmy-demo-cercle-pro'),
  now() - interval '21 day' + (n * interval '21 hour') + (random() * interval '4 hour'),
  (array['CH','FR','CH','BE','FR','CH','LU','FR'])[n + 1]
from generate_series(0, 7) as n;

-- Semaine 3 : 12 vues
insert into public.profile_views (profile_id, viewed_at, country)
select
  (select id from public.profiles where slug = 'hilmy-demo-cercle-pro'),
  now() - interval '14 day' + (n * interval '14 hour') + (random() * interval '3 hour'),
  (array['CH','FR','BE','CH','FR','CH','LU','FR','CH','BE','FR','CH'])[n + 1]
from generate_series(0, 11) as n;

-- Semaine 4 : 15 vues
insert into public.profile_views (profile_id, viewed_at, country)
select
  (select id from public.profiles where slug = 'hilmy-demo-cercle-pro'),
  now() - interval '7 day' + (n * interval '11 hour') + (random() * interval '2 hour'),
  (array['CH','FR','CH','BE','FR','CH','FR','CH','BE','LU','FR','CH','FR','CH','BE'])[n + 1]
from generate_series(0, 14) as n;

-- ─── 4) profile_contacts — 15 clics (8 WhatsApp + 4 email + 3 website) ──
insert into public.profile_contacts (profile_id, contact_type, clicked_at)
select
  (select id from public.profiles where slug = 'hilmy-demo-cercle-pro'),
  c.type,
  now() - interval '14 day' + (random() * interval '14 day')
from (values
  ('whatsapp'), ('whatsapp'), ('whatsapp'), ('whatsapp'),
  ('whatsapp'), ('whatsapp'), ('whatsapp'), ('whatsapp'),
  ('email'), ('email'), ('email'), ('email'),
  ('website'), ('website'), ('website')
) as c(type);

-- ─── 5) Vérification ────────────────────────────────────────────────
select
  p.id,
  p.nom,
  p.slug,
  p.palier,
  p.status,
  p.nb_vues                                                             as nb_vues_compteur,
  (select count(*) from public.profile_views    where profile_id = p.id) as views_real,
  (select count(*) from public.profile_contacts where profile_id = p.id) as contacts_real
from public.profiles p
where p.slug = 'hilmy-demo-cercle-pro';

-- Attendu : 1 ligne — palier=cercle_pro, status=approved, nb_vues=87,
-- views_real=40, contacts_real=15.

-- =====================================================================
-- ROLLBACK (à utiliser après la démo si tu veux nettoyer)
-- =====================================================================
-- delete from public.profile_contacts
--  where profile_id = (select id from public.profiles where slug = 'hilmy-demo-cercle-pro');
-- delete from public.profile_views
--  where profile_id = (select id from public.profiles where slug = 'hilmy-demo-cercle-pro');
-- delete from public.profiles where slug = 'hilmy-demo-cercle-pro';
-- =====================================================================
