/**
 * Google Places API wrapper.
 *
 * À utiliser côté client via les routes /api/places/search et /api/places/details.
 * Les helpers ci-dessous sont appelés depuis ces routes (serveur uniquement).
 * La clé GOOGLE_PLACES_API_KEY n'est JAMAIS exposée côté client.
 */

const PLACES_BASE = "https://places.googleapis.com/v1";

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.photos",
  "places.addressComponents",
  "places.rating",
  "places.userRatingCount",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "location",
  "primaryType",
  "primaryTypeDisplayName",
  "internationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
  "photos",
  "rating",
  "userRatingCount",
  "businessStatus",
].join(",");

export type PlaceSearchResult = {
  google_place_id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  google_category: string | null;
  google_category_label: string | null;
  rating: number | null;
  user_rating_count: number | null;
  photo_name: string | null;
};

export type PlaceDetails = PlaceSearchResult & {
  phone: string | null;
  website: string | null;
  opening_hours: string[] | null;
  photos: string[];
  business_status: string | null;
};

type AddressComponent = { types: string[]; longText: string };
type GooglePhoto = { name: string; widthPx?: number; heightPx?: number };
type GooglePlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: { latitude: number; longitude: number };
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  photos?: GooglePhoto[];
  rating?: number;
  userRatingCount?: number;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  businessStatus?: string;
};

function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY non configurée");
  return key;
}

function extractLocation(components?: AddressComponent[]) {
  let city = "";
  let region = "";
  let country = "";
  if (components) {
    for (const c of components) {
      if (c.types?.includes("locality")) city = c.longText;
      if (c.types?.includes("administrative_area_level_1")) region = c.longText;
      if (c.types?.includes("country")) country = c.longText;
    }
    if (!city) {
      const fallback = components.find((c) =>
        c.types?.includes("postal_town") || c.types?.includes("administrative_area_level_2"),
      );
      if (fallback) city = fallback.longText;
    }
  }
  return { city, region, country };
}

function mapSearch(p: GooglePlace): PlaceSearchResult {
  const { city, region, country } = extractLocation(p.addressComponents);
  return {
    google_place_id: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    city,
    region,
    country,
    latitude: p.location?.latitude ?? 0,
    longitude: p.location?.longitude ?? 0,
    google_category: p.primaryType ?? null,
    google_category_label: p.primaryTypeDisplayName?.text ?? null,
    rating: p.rating ?? null,
    user_rating_count: p.userRatingCount ?? null,
    photo_name: p.photos?.[0]?.name ?? null,
  };
}

export async function searchPlaces(
  query: string,
  locationBias?: { latitude: number; longitude: number; radius: number },
): Promise<PlaceSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const apiKey = getApiKey();

  const body: Record<string, unknown> = {
    textQuery: query.trim(),
    languageCode: "fr",
    maxResultCount: 8,
  };
  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.latitude,
          longitude: locationBias.longitude,
        },
        radius: locationBias.radius,
      },
    };
  }

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return [];
  const data = (await res.json()) as { places?: GooglePlace[] };
  return (data.places ?? []).map(mapSearch);
}

export async function getPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  if (!placeId) return null;
  const apiKey = getApiKey();

  const res = await fetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=fr`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
    },
  );

  if (!res.ok) return null;
  const p = (await res.json()) as GooglePlace;
  const base = mapSearch(p);
  return {
    ...base,
    phone: p.internationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    opening_hours: p.regularOpeningHours?.weekdayDescriptions ?? null,
    // URLs keyless indexées (proxy). Ordre = ordre des photos Google, donc
    // l'index i sert plus tard la même photo via getPlacePhotoName(id, i).
    photos: (p.photos ?? [])
      .slice(0, 6)
      .map((_ph, i) => placePhotoProxyUrl(p.id, i)),
    business_status: p.businessStatus ?? null,
  };
}

/**
 * Contact LIVE d'un lieu (téléphone + horaires) — réservé aux membres.
 *
 * Field mask MINIMAL (`internationalPhoneNumber,regularOpeningHours`) → on ne
 * tire QUE ces deux champs, jamais photos/rating/atmosphere. SKU Place Details
 * (Enterprise), payload réduit. La clé reste dans le header (jamais en URL).
 *
 * Cache de PERFORMANCE 6 h (Data Cache Next, `revalidate`) keyé par l'URL donc
 * par place_id : si plusieurs membres regardent le même lieu dans la journée,
 * 1 seul appel Google. Conforme CGU (cache temporaire < 30 j ; AUCUN stockage
 * durable en base). La donnée renvoyée est non-personnelle (donnée lieu).
 */
export type PlaceContactLive = {
  phone: string | null;
  opening_hours: string[] | null;
};

const CONTACT_FIELD_MASK = "internationalPhoneNumber,regularOpeningHours";
const CONTACT_CACHE_SECONDS = 6 * 60 * 60; // 6 h

export async function getPlaceContactLive(
  placeId: string,
): Promise<PlaceContactLive | null> {
  if (!placeId) return null;
  const apiKey = getApiKey();

  const res = await fetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=fr`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": CONTACT_FIELD_MASK,
      },
      // Cache partagé entre membres (donnée lieu, non perso). Le verrou session
      // est en amont dans la route → l'anonyme n'atteint jamais ce fetch.
      next: { revalidate: CONTACT_CACHE_SECONDS },
    },
  );

  if (!res.ok) return null;
  const p = (await res.json()) as {
    internationalPhoneNumber?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
  };
  return {
    phone: p.internationalPhoneNumber ?? null,
    opening_hours: p.regularOpeningHours?.weekdayDescriptions ?? null,
  };
}

// Domaine canonique de prod. `hilmy.io` redirige 307 vers `www.hilmy.io` :
// on stocke directement le www pour éviter un hop de redirect à chaque
// chargement d'image (mobile expo-image + web <img>). NE PAS utiliser
// NEXT_PUBLIC_SITE_URL ici : c'est une valeur persistée en DB, elle doit
// pointer vers la prod quel que soit l'environnement qui l'écrit.
const PHOTO_PROXY_BASE = "https://www.hilmy.io";

/**
 * URL stable de la photo d'un lieu, servie par le proxy /api/places/photo.
 * Ne contient JAMAIS la clé Google. C'est cette URL qu'on persiste dans
 * `places.main_photo_url` / `places.photos[]` (lue telle quelle par web et
 * mobile). `index` (défaut 0) sélectionne la nième photo de la fiche, pour
 * servir une galerie entière en URLs keyless indexées.
 */
export function placePhotoProxyUrl(googlePlaceId: string, index = 0): string {
  const base = `${PHOTO_PROXY_BASE}/api/places/photo?place_id=${encodeURIComponent(
    googlePlaceId,
  )}`;
  return index > 0 ? `${base}&i=${index}` : base;
}

/**
 * Récupère le resource name de la nième photo d'un lieu Google
 * (`places/{id}/photos/{ref}`) via Place Details (New), field mask `photos`
 * uniquement (call minimal, moins cher que getPlaceDetails). La clé reste
 * dans le header X-Goog-Api-Key, jamais dans une URL. `index` (défaut 0)
 * sélectionne la photo dans la galerie. Retourne null si pas de photo à cet
 * index ou erreur upstream.
 */
export async function getPlacePhotoName(
  placeId: string,
  index = 0,
): Promise<string | null> {
  if (!placeId) return null;
  const apiKey = getApiKey();

  const res = await fetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=fr`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos",
      },
    },
  );

  if (!res.ok) return null;
  const p = (await res.json()) as { photos?: GooglePhoto[] };
  return p.photos?.[index]?.name ?? null;
}
