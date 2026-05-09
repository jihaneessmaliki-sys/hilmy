-- =====================================================================
-- HILMY · 41 — Sélection Hilmy foundations (lieux)
--
-- Phase 2A · PR-A. Migration unique qui pose tout le schéma nécessaire
-- au produit "Sélection Hilmy" (39€/mois pour les LIEUX) :
--
--   1. places.palier              ('aucun' | 'selection_hilmy')
--   2. places.nb_vues             compteur agrégé (mirror profiles.nb_vues)
--   3. events.boost_event_type    25 slugs pour l'auto-boost (PR-D)
--   4. events.place_id            FK lieu organisateur (PR-D)
--   5. place_views                tracking pageview (mirror profile_views)
--   6. place_contacts             tracking tap-to-contact (mirror profile_contacts)
--   7. events_config_admin        config flexible boost par catégorie
--
-- Décisions Jiji (2026-05-09) :
--   - Conflit 1 (events.event_type déjà free-text en usage) → A1 :
--     nouvelle colonne `boost_event_type` séparée, contrainte CHECK 25 slugs.
--     `event_type` (free-text) reste intacte pour l'UI publique existante.
--   - Conflit 2 (pas de FK event ↔ lieu) → B1 : ajout `events.place_id`.
--   - Conflit 3 (pas de tracking lieu) → migration 41 unique (pas 41+42).
--
-- Idempotente. Voir bas de fichier pour le rollback.
-- ⚠️ Application en prod : SUR DEMANDE EXPLICITE de Jiji uniquement.
-- =====================================================================


-- =====================================================================
-- 1. places.palier  (Sélection Hilmy gating)
-- =====================================================================

alter table public.places
  add column if not exists palier text not null default 'aucun';

alter table public.places drop constraint if exists places_palier_check;
alter table public.places add constraint places_palier_check
  check (palier in ('aucun', 'selection_hilmy'));

-- Index utilisé pour le tri du feed (Sélection Hilmy d'abord) et pour
-- le filtrage admin "lieux payants" / cron de stats.
create index if not exists places_palier_idx on public.places (palier);

comment on column public.places.palier is
  'Palier d''abonnement du lieu. ''aucun'' = lieu gratuit/communautaire, '
  '''selection_hilmy'' = lieu payant 39€/mois (pastille, tri prio, stats).';


-- =====================================================================
-- 2. places.nb_vues  (compteur agrégé maintenu par trigger)
-- =====================================================================
-- Mirror du pattern profiles.nb_vues (cf migration 15). Le compteur est
-- bumpé par le trigger sur place_views (cf section 5 de cette migration).

alter table public.places
  add column if not exists nb_vues integer not null default 0;

alter table public.places drop constraint if exists places_nb_vues_positive;
alter table public.places add constraint places_nb_vues_positive
  check (nb_vues >= 0);

comment on column public.places.nb_vues is
  'Compteur cumulé des vues de la fiche lieu (toutes époques). Maintenu '
  'atomiquement par trigger sur place_views (UPDATE ... SET nb_vues = '
  'nb_vues + 1, pas de SELECT-then-UPDATE pour éviter race condition).';


-- =====================================================================
-- 3. events.boost_event_type  (25 catégories pour l'auto-boost lieu)
-- =====================================================================
-- ⚠️ Colonne SÉPARÉE de events.event_type (free-text déjà en usage par
-- la home, dashboard utilisatrice, admin, etc.). Décision A1 du brief.
--
-- Cette colonne est nullable :
--   - NULL pour les events historiques (avant cette migration)
--   - NULL pour les events qui n'ont pas vocation à boost (event sans
--     lieu lié, ou lieu non Sélection Hilmy)
--   - 1 des 25 slugs pour les events de lieux Sélection Hilmy
--
-- L'obligation "boost_event_type non-NULL si lieu Sélection Hilmy" est
-- enforcée côté form UI + API server (cf PR-D). PAS via CHECK BDD :
-- impossible de joindre places.palier au moment de l'INSERT event.

alter table public.events
  add column if not exists boost_event_type text;

alter table public.events drop constraint if exists events_boost_event_type_check;
alter table public.events add constraint events_boost_event_type_check
  check (boost_event_type is null or boost_event_type in (
    -- Restauration / convivialité
    'brunch_copines',
    'diner_thematique',
    'soiree_iftar_ramadan',
    'apero_afterwork',
    -- Beauté / bien-être
    'atelier_decouverte',
    'journee_portes_ouvertes',
    'masterclass_beaute',
    'retraite_bien_etre',
    -- Shopping / créatrices
    'pop_up_ephemere',
    'vente_privee_copines',
    'lancement_collection',
    'marche_creatrices',
    -- Religieux / culturel
    'preparation_aid',
    'soiree_henne',
    -- Saisonnier laïque
    'saint_valentin',
    'fete_des_meres',
    'ete_vacances',
    'rentree',
    'black_friday',
    'fetes_fin_annee',
    -- Lifestyle / pro
    'soiree_privee_copines',
    'atelier_creatif',
    'conference_talk',
    'workshop_business',
    -- Fallback
    'autre'
  ));

create index if not exists events_boost_event_type_idx
  on public.events (boost_event_type)
  where boost_event_type is not null;

comment on column public.events.boost_event_type is
  'Catégorie taxonomique (25 slugs) pour le système d''auto-boost lieu '
  '(PR-D). Distinct de event_type (free-text UI publique). NULL si event '
  'antérieur à mig 41 ou sans lien lieu Sélection Hilmy. Obligatoire côté '
  'form/API si l''event est créé par un lieu palier=''selection_hilmy''.';


-- =====================================================================
-- 4. events.place_id  (FK lieu organisateur)
-- =====================================================================
-- Un event peut être lié à un prestataire (events.prestataire_id, mig 03)
-- et/ou à un lieu (events.place_id, ici). Les deux peuvent être NULL
-- (event organisé par une copine sans rattachement business). Ce n'est
-- ni l'un ni l'autre exclusivement — pas de XOR constraint.
-- ON DELETE SET NULL : si le lieu disparaît, l'event reste mais perd
-- son rattachement (idem pattern prestataire_id).

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'place_id'
  ) then
    alter table public.events
      add column place_id uuid
      references public.places(id) on delete set null;
  end if;
end $$;

create index if not exists events_place_id_idx
  on public.events (place_id)
  where place_id is not null;

comment on column public.events.place_id is
  'FK vers places(id) du lieu organisateur. Optionnel — un event peut '
  'être organisé par un prestataire (prestataire_id), un lieu (place_id), '
  'les deux, ou ni l''un ni l''autre. Utilisé par le système d''auto-boost '
  'lieu (PR-D) pour identifier quel lieu mettre en avant.';


-- =====================================================================
-- 5. place_views  (tracking pageview lieu, mirror profile_views)
-- =====================================================================
-- Pattern aligné sur la migration 15 (profile_views). Anonymous OK
-- (viewer_id NULL). Le client est responsable du debounce 1/session/lieu
-- côté <TrackPlaceView /> (pattern futur en PR-B).

create table if not exists public.place_views (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  viewed_at timestamptz not null default now(),
  country text,                 -- ISO-2 depuis x-vercel-ip-country
  region text,
  city text,
  referer text,
  user_agent_hash text          -- sha256 anti-fingerprint, dedupe
);

create index if not exists place_views_place_viewed_idx
  on public.place_views (place_id, viewed_at desc);
create index if not exists place_views_viewer_idx
  on public.place_views (viewer_id) where viewer_id is not null;
create index if not exists place_views_viewed_at_idx
  on public.place_views (viewed_at desc);

comment on table public.place_views is
  'Une ligne = une visite de fiche lieu. Anonyme OK. Mirror de profile_views.';


-- ─── Trigger atomique : nb_vues++ après INSERT view ─────────────────
-- Utilise UPDATE ... SET nb_vues = nb_vues + 1 (verrou row-level postgres
-- atomique, pas de SELECT-then-UPDATE qui créerait une race condition).
create or replace function public.bump_place_nb_vues() returns trigger as $$
begin
  update public.places
     set nb_vues = nb_vues + 1
   where id = new.place_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists place_views_bump_nb_vues on public.place_views;
create trigger place_views_bump_nb_vues
  after insert on public.place_views
  for each row execute function public.bump_place_nb_vues();


-- ─── RLS place_views ────────────────────────────────────────────────
alter table public.place_views enable row level security;

-- INSERT : public. En pratique le client passera par /api/lieux/track-view
-- (service-role) en PR-B, mais on laisse l'insert direct ouvert pour
-- futur flexibility (mirror du choix migration 15 sur profile_views).
drop policy if exists "Anyone can insert a place view" on public.place_views;
create policy "Anyone can insert a place view"
  on public.place_views
  for insert
  with check (true);

-- SELECT : owner du lieu (places.created_by_user_id, mig 28) OU admin.
-- Note : pas de notion d'"owner-prestataire" pour les places — c'est la
-- créatrice de la fiche (mig 28). Si on a besoin d'un autre owner type
-- en PR-B/C, on ajustera. Admin via JWT user_metadata.is_admin (pattern
-- établi mig 06, 15).
drop policy if exists "Owner reads own place views" on public.place_views;
create policy "Owner reads own place views"
  on public.place_views
  for select
  using (
    exists (
      select 1 from public.places p
      where p.id = place_views.place_id
        and p.created_by_user_id = auth.uid()
    )
    or coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );

-- Pas de policy UPDATE/DELETE : historique immutable.


-- =====================================================================
-- 6. place_contacts  (tracking tap-to-contact lieu, mirror profile_contacts)
-- =====================================================================
-- Mirror profile_contacts (mig 15). Les lieux n'ont pas tous les mêmes
-- canaux que les prestataires (pas de WhatsApp en général, mais site web
-- + téléphone Google Places + Instagram parfois). On garde un CHECK
-- ouvert pour permettre d'ajouter des canaux sans nouvelle migration.

create table if not exists public.place_contacts (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  clicker_id uuid references auth.users(id) on delete set null,
  contact_type text not null,
  clicked_at timestamptz not null default now(),
  country text,
  region text,
  city text,
  referer text
);

alter table public.place_contacts drop constraint if exists place_contacts_type_check;
alter table public.place_contacts add constraint place_contacts_type_check
  check (contact_type in (
    'phone', 'website', 'email',
    'instagram', 'tiktok', 'facebook', 'youtube',
    'google_maps', 'whatsapp'
  ));

create index if not exists place_contacts_place_clicked_idx
  on public.place_contacts (place_id, clicked_at desc);
create index if not exists place_contacts_type_idx
  on public.place_contacts (place_id, contact_type);

comment on table public.place_contacts is
  'Une ligne = un clic sur un canal contact d''une fiche lieu. Mirror '
  'profile_contacts. Tracking universel (toutes places), affichage stats '
  'gated palier=''selection_hilmy'' côté UI dashboard.';


-- ─── RLS place_contacts ─────────────────────────────────────────────
alter table public.place_contacts enable row level security;

drop policy if exists "Anyone can insert a place contact click" on public.place_contacts;
create policy "Anyone can insert a place contact click"
  on public.place_contacts
  for insert
  with check (true);

drop policy if exists "Owner reads own place contacts" on public.place_contacts;
create policy "Owner reads own place contacts"
  on public.place_contacts
  for select
  using (
    exists (
      select 1 from public.places p
      where p.id = place_contacts.place_id
        and p.created_by_user_id = auth.uid()
    )
    or coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- =====================================================================
-- 7. events_config_admin  (config flexible auto-boost par catégorie)
-- =====================================================================
-- Une ligne par event_type (les 25 slugs). Modifiable côté admin via
-- /admin/events-config (PR-D). Lue par la fonction is_lieu_boosted (PR-D).

create table if not exists public.events_config_admin (
  id uuid primary key default gen_random_uuid(),
  event_type text not null unique,
  boost_enabled boolean not null default true,
  boost_days_before integer not null default 7,
  boost_until_event_end boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_config_admin_event_type_check check (event_type in (
    'brunch_copines', 'diner_thematique', 'soiree_iftar_ramadan', 'apero_afterwork',
    'atelier_decouverte', 'journee_portes_ouvertes', 'masterclass_beaute', 'retraite_bien_etre',
    'pop_up_ephemere', 'vente_privee_copines', 'lancement_collection', 'marche_creatrices',
    'preparation_aid', 'soiree_henne',
    'saint_valentin', 'fete_des_meres', 'ete_vacances', 'rentree', 'black_friday', 'fetes_fin_annee',
    'soiree_privee_copines', 'atelier_creatif', 'conference_talk', 'workshop_business',
    'autre'
  )),
  constraint events_config_admin_days_before_positive
    check (boost_days_before >= 0 and boost_days_before <= 365)
);

create index if not exists events_config_admin_event_type_idx
  on public.events_config_admin (event_type);

-- Trigger updated_at (idempotent, fonction réutilisée si elle existe déjà)
create or replace function public.bump_events_config_admin_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_config_admin_updated_at_trg on public.events_config_admin;
create trigger events_config_admin_updated_at_trg
  before update on public.events_config_admin
  for each row execute function public.bump_events_config_admin_updated_at();


-- ─── RLS events_config_admin ────────────────────────────────────────
-- SELECT : public (le client en a besoin pour calculer is_currently_boosted).
-- INSERT/UPDATE/DELETE : admin uniquement (pattern is_admin via JWT).

alter table public.events_config_admin enable row level security;

drop policy if exists "events_config_admin_public_read" on public.events_config_admin;
create policy "events_config_admin_public_read"
  on public.events_config_admin
  for select
  using (true);

drop policy if exists "events_config_admin_admin_write" on public.events_config_admin;
create policy "events_config_admin_admin_write"
  on public.events_config_admin
  for all
  using (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  )
  with check (
    coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)
  );


-- ─── Seed initial : 25 catégories ───────────────────────────────────
-- Toutes activées par défaut (boost_enabled=true) sauf 'autre' (laissée
-- désactivée pour éviter qu'un event mal catégorisé déclenche un boost).
-- ON CONFLICT DO NOTHING : idempotent en cas de replay.

insert into public.events_config_admin (event_type, boost_enabled, boost_days_before, boost_until_event_end) values
  ('brunch_copines',         true, 7, true),
  ('diner_thematique',       true, 7, true),
  ('soiree_iftar_ramadan',   true, 7, true),
  ('apero_afterwork',        true, 7, true),
  ('atelier_decouverte',     true, 7, true),
  ('journee_portes_ouvertes',true, 7, true),
  ('masterclass_beaute',     true, 7, true),
  ('retraite_bien_etre',     true, 7, true),
  ('pop_up_ephemere',        true, 7, true),
  ('vente_privee_copines',   true, 7, true),
  ('lancement_collection',   true, 7, true),
  ('marche_creatrices',      true, 7, true),
  ('preparation_aid',        true, 7, true),
  ('soiree_henne',           true, 7, true),
  ('saint_valentin',         true, 7, true),
  ('fete_des_meres',         true, 7, true),
  ('ete_vacances',           true, 7, true),
  ('rentree',                true, 7, true),
  ('black_friday',           true, 7, true),
  ('fetes_fin_annee',        true, 7, true),
  ('soiree_privee_copines',  true, 7, true),
  ('atelier_creatif',        true, 7, true),
  ('conference_talk',        true, 7, true),
  ('workshop_business',      true, 7, true),
  ('autre',                  false, 7, true)
on conflict (event_type) do nothing;


-- =====================================================================
-- Reload PostgREST schema cache (sinon les nouveaux columns/tables sont
-- invisibles au client supabase-js jusqu'au prochain redémarrage).
-- =====================================================================
notify pgrst, 'reload schema';


-- =====================================================================
-- ROLLBACK (à exécuter manuellement si besoin de revert)
-- =====================================================================
-- -- 7. events_config_admin
-- drop policy if exists "events_config_admin_admin_write" on public.events_config_admin;
-- drop policy if exists "events_config_admin_public_read" on public.events_config_admin;
-- drop trigger if exists events_config_admin_updated_at_trg on public.events_config_admin;
-- drop function if exists public.bump_events_config_admin_updated_at();
-- drop table if exists public.events_config_admin;
--
-- -- 6. place_contacts
-- drop policy if exists "Owner reads own place contacts" on public.place_contacts;
-- drop policy if exists "Anyone can insert a place contact click" on public.place_contacts;
-- drop table if exists public.place_contacts;
--
-- -- 5. place_views
-- drop policy if exists "Owner reads own place views" on public.place_views;
-- drop policy if exists "Anyone can insert a place view" on public.place_views;
-- drop trigger if exists place_views_bump_nb_vues on public.place_views;
-- drop function if exists public.bump_place_nb_vues();
-- drop table if exists public.place_views;
--
-- -- 4. events.place_id
-- drop index if exists events_place_id_idx;
-- alter table public.events drop column if exists place_id;
--
-- -- 3. events.boost_event_type
-- drop index if exists events_boost_event_type_idx;
-- alter table public.events drop constraint if exists events_boost_event_type_check;
-- alter table public.events drop column if exists boost_event_type;
--
-- -- 2. places.nb_vues
-- alter table public.places drop constraint if exists places_nb_vues_positive;
-- alter table public.places drop column if exists nb_vues;
--
-- -- 1. places.palier
-- drop index if exists places_palier_idx;
-- alter table public.places drop constraint if exists places_palier_check;
-- alter table public.places drop column if exists palier;
-- =====================================================================
