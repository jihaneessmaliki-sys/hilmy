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

function buildPhotoUrl(photoName: string, maxWidth = 1200) {
  const apiKey = getApiKey();
  return `${PLACES_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
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
    photos: (p.photos ?? []).slice(0, 6).map((ph) => buildPhotoUrl(ph.name)),
    business_status: p.businessStatus ?? null,
  };
}

export function buildGooglePhotoProxyUrl(photoName: string, maxWidth = 1200) {
  return buildPhotoUrl(photoName, maxWidth);
}
