-- =====================================================================
-- HILMY · Stage 4 · 02 — ALTER places (non-destructif)
-- Enrichit la table places pour les fiches lieux V2.
-- =====================================================================

alter table public.places add column if not exists slug text;
alter table public.places add column if not exists description text;
alter table public.places add column if not exists photos jsonb not null default '[]'::jsonb;

-- Unique sur slug : utiliser un index unique (supporte WHERE, contrairement
-- à UNIQUE constraint). Permet aux anciennes rows sans slug de cohabiter.
create unique index if not exists places_slug_unique_idx
  on public.places (slug) where slug is not null;

-- CHECK hilmy_category (9 catégories lieux validées)
alter table public.places drop constraint if exists places_hilmy_category_check;
alter table public.places add constraint places_hilmy_category_check
  check (hilmy_category is null or hilmy_category in (
    'restos-cafes', 'salons-the', 'boutiques', 'bien-etre',
    'enfants', 'hebergements', 'sante', 'culturel', 'sport-nature'
  ));

-- Indexes utiles
create index if not exists places_hilmy_category_idx on public.places (hilmy_category);
create index if not exists places_city_idx on public.places (city);

comment on column public.places.slug is 'URL-friendly identifier, unique quand présent. Généré depuis name.';
comment on column public.places.description is 'Description rédigée (éditoriale) du lieu, en plus des données Google Places.';
comment on column public.places.photos is 'JSONB : galerie d''URLs de photos additionnelles (en plus de main_photo_url).';
