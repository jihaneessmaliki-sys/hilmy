-- =====================================================================
-- 53 · places.main_photo_url auto-rempli depuis google_place_id
-- =====================================================================
-- Couvre web ET mobile pour les FUTURS lieux, sans toucher au code app :
-- le createPlace mobile insère directement dans `places` sans
-- main_photo_url. Ce trigger dérive l'URL stable du proxy /api/places/photo
-- (sans clé) côté DB, au moment de l'INSERT/UPDATE.
--
-- Concat texte PURE, aucun appel réseau/API. Ne se déclenche que si :
--   - google_place_id est non-null, ET
--   - main_photo_url est null (on n'écrase jamais une valeur déjà posée :
--     curation manuelle, valeur fixée par le backfill, etc.)
--
-- NOTE (lieux sans photo Google) : ce trigger ne peut pas savoir si Google
-- a réellement une photo (pas d'appel API en SQL). Si un futur lieu a un
-- google_place_id mais aucune photo, main_photo_url pointera vers le proxy
-- qui renverra 404. Pour ne jamais casser une card, l'endpoint
-- /api/places/photo doit servir un fallback image sur 404 (cf. discussion).
-- Le backfill historique (script .mjs), lui, sonde Google et laisse null
-- les lieux sans photo.
-- =====================================================================

create or replace function public.set_place_main_photo_url()
returns trigger
language plpgsql
as $$
begin
  if new.google_place_id is not null and new.main_photo_url is null then
    new.main_photo_url :=
      'https://www.hilmy.io/api/places/photo?place_id=' || new.google_place_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_place_main_photo_url on public.places;

create trigger trg_set_place_main_photo_url
  before insert or update on public.places
  for each row
  execute function public.set_place_main_photo_url();
