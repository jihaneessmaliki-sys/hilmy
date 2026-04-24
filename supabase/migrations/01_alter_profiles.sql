-- =====================================================================
-- HILMY · Stage 4 · 01 — ALTER profiles (non-destructif)
-- Enrichit la table profiles avec les colonnes métier V2.
-- Idempotent : peut être rejoué sans erreur.
-- Tables profiles a 0 lignes au moment de l'exécution.
-- =====================================================================

-- ─── Colonnes métier V2 ───────────────────────────────────────────────
alter table public.profiles add column if not exists tagline text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists site_web text;
alter table public.profiles add column if not exists linkedin text;
alter table public.profiles add column if not exists services jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists galerie jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists prix_from numeric(10, 2);
alter table public.profiles add column if not exists prix_gamme text;
alter table public.profiles add column if not exists devise text default 'CHF';
alter table public.profiles add column if not exists source_import text default 'manuel';
alter table public.profiles add column if not exists approved_at timestamptz;
alter table public.profiles add column if not exists note_moyenne numeric(2, 1) not null default 0;
alter table public.profiles add column if not exists nb_avis integer not null default 0;
alter table public.profiles add column if not exists nb_vues integer not null default 0;

-- ─── CHECK constraints (drop + recreate pour idempotence) ────────────
alter table public.profiles drop constraint if exists profiles_categorie_check;
alter table public.profiles add constraint profiles_categorie_check
  check (categorie in (
    'beaute', 'bien-etre', 'sante-mentale', 'sport-nutrition',
    'enfants-famille', 'maison', 'cuisine', 'evenementiel',
    'mode-style', 'business-juridique'
  ));

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected', 'ghost', 'paused'));

alter table public.profiles drop constraint if exists profiles_prix_gamme_check;
alter table public.profiles add constraint profiles_prix_gamme_check
  check (prix_gamme is null or prix_gamme in ('€', '€€', '€€€'));

alter table public.profiles drop constraint if exists profiles_devise_check;
alter table public.profiles add constraint profiles_devise_check
  check (devise in ('CHF', 'EUR'));

alter table public.profiles drop constraint if exists profiles_source_import_check;
alter table public.profiles add constraint profiles_source_import_check
  check (source_import in ('google_places', 'instagram', 'linkedin', 'manuel'));

-- ─── Indexes (utiles pour V2) ────────────────────────────────────────
create index if not exists profiles_categorie_approved_idx
  on public.profiles (categorie) where status = 'approved';
create index if not exists profiles_ville_approved_idx
  on public.profiles (ville) where status = 'approved';
create index if not exists profiles_status_idx on public.profiles (status);
create unique index if not exists profiles_slug_unique_idx on public.profiles (slug);

comment on column public.profiles.tagline is 'Phrase d''accroche éditoriale affichée en grand sur la fiche.';
comment on column public.profiles.services is 'JSONB : liste [{nom, prix, duree}] des prestations proposées.';
comment on column public.profiles.galerie is 'JSONB : URLs des photos d''illustration (en plus de photos text[] existant).';
comment on column public.profiles.source_import is 'Provenance de la création : google_places, instagram, linkedin, manuel.';
comment on column public.profiles.note_moyenne is 'Maintenue par trigger sur recommendations (type=prestataire).';
comment on column public.profiles.nb_avis is 'Maintenu par trigger sur recommendations (type=prestataire).';
