import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getPlacePhotoName } from "@/lib/google/places";

// Streaming des bytes binaires → runtime Node (pas Edge).
export const runtime = "nodejs";

const PLACES_BASE = "https://places.googleapis.com/v1";
// 30 jours. Les photos de lieux changent rarement ; on cache fort côté
// navigateur ET CDN (s-maxage) pour ne pas retaper Google à chaque vue.
const CACHE_SECONDS = 60 * 60 * 24 * 30;
// Lieu SANS photo Google (réponse Google OK) : on sert le placeholder marque
// et on le cache 1 jour. Assez long pour ne pas re-sonder Google à chaque
// vue, assez court pour se réparer si le lieu gagne une photo plus tard.
const FALLBACK_CACHE_SECONDS = 60 * 60 * 24;
// Erreur transitoire (réseau / upstream KO) : placeholder mais cache court,
// pour ne jamais figer une card cassée sur un simple hoquet réseau.
const FALLBACK_SOFT_CACHE_SECONDS = 60 * 5;
const FALLBACK_PATH = "/place-fallback.jpg";
const MAX_WIDTH = 1200;
// Un Google Place ID est une chaîne URL-safe (base64-like). On rejette tout
// ce qui ne colle pas au format AVANT de taper Google : limite l'abus de
// quota aux IDs plausibles et bloque toute injection dans l'URL upstream.
const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,512}$/;
// Borne l'index photo (une fiche Google a au plus ~10 photos exposées).
const MAX_PHOTO_INDEX = 9;

// 302 vers le placeholder statique. expo-image (mobile) et <img> (web)
// suivent la redirection ; l'asset /public a son propre cache long (immutable
// côté Next). On ne renvoie JAMAIS 404 pour ne pas casser une card.
function fallbackRedirect(request: Request, cacheSeconds: number) {
  const url = new URL(FALLBACK_PATH, request.url);
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}` },
  });
}

/**
 * Proxy photo de lieu : GET /api/places/photo?place_id=<google_place_id>&i=<n>
 *
 * Récupère la photo Google côté serveur et streame les bytes. La clé
 * GOOGLE_PLACES_API_KEY ne transite que vers places.googleapis.com via le
 * header X-Goog-Api-Key ; elle n'apparaît dans AUCUNE URL renvoyée au
 * client. On résout d'abord une URL signée keyless (skipHttpRedirect) puis
 * on fetch cette URL sans clé pour streamer l'image — la clé n'est donc
 * jamais transmise au CDN googleusercontent non plus.
 *
 * `i` (optionnel, défaut 0) sélectionne la nième photo de la fiche : permet
 * de servir une galerie entière (places.photos[], profiles.galerie[]) en
 * URLs keyless indexées.
 *
 * Si Google n'a pas de photo (ou erreur), on 302 vers un placeholder marque
 * au lieu de 404 : une card n'est jamais cassée.
 *
 * C'est l'URL de cet endpoint (sans clé) qui est persistée dans
 * places.main_photo_url / photos[] et lue directement par web et mobile.
 */
export async function GET(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: "places-photo",
    max: 120,
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id");
  if (!placeId || !PLACE_ID_RE.test(placeId)) {
    return NextResponse.json({ error: "place_id invalide" }, { status: 400 });
  }

  const rawIndex = searchParams.get("i");
  let index = 0;
  if (rawIndex !== null) {
    const parsed = Number(rawIndex);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_PHOTO_INDEX) {
      return NextResponse.json({ error: "index invalide" }, { status: 400 });
    }
    index = parsed;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY non configurée" },
      { status: 500 },
    );
  }

  try {
    const photoName = await getPlacePhotoName(placeId, index);
    if (!photoName) {
      // Pas de photo Google (ou Details KO) → placeholder marque, cache 1 jour.
      return fallbackRedirect(request, FALLBACK_CACHE_SECONDS);
    }

    // 1) Résolution de l'URL signée (keyless). Clé en header uniquement.
    const metaRes = await fetch(
      `${PLACES_BASE}/${photoName}/media?maxWidthPx=${MAX_WIDTH}&skipHttpRedirect=true`,
      { headers: { "X-Goog-Api-Key": apiKey } },
    );
    if (!metaRes.ok) {
      return fallbackRedirect(request, FALLBACK_SOFT_CACHE_SECONDS);
    }
    const { photoUri } = (await metaRes.json()) as { photoUri?: string };
    if (!photoUri) {
      return fallbackRedirect(request, FALLBACK_SOFT_CACHE_SECONDS);
    }

    // 2) Fetch de l'image via l'URL signée — aucune clé transmise ici.
    const imgRes = await fetch(photoUri);
    if (!imgRes.ok || !imgRes.body) {
      return fallbackRedirect(request, FALLBACK_SOFT_CACHE_SECONDS);
    }

    return new NextResponse(imgRes.body, {
      status: 200,
      headers: {
        "Content-Type": imgRes.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, immutable`,
      },
    });
  } catch {
    // Hoquet réseau : placeholder cache court, jamais de 500 qui casse la card.
    return fallbackRedirect(request, FALLBACK_SOFT_CACHE_SECONDS);
  }
}
