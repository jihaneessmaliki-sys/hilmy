// =====================================================================
// HILMY · Curation · Google Places textSearch pour 30 lieux batch 1
// =====================================================================
// Répartition géo/catégorie :
//   Genève+Lausanne 10 · Paris 8 · Bruxelles 5 · Luxembourg 3 · ZH+BE 3 · Monaco 1
//   Restos 8 · Spas 6 · Culturel 6 · Boutiques 5 · Cafés/salons-thé 5
//
// Filtres : rating ≥ 4.0, userRatingCount ≥ 50, businessStatus OPERATIONAL.
// Output : scripts/hilmy-curation/candidates.json (liste enrichie).
//
// Usage : node --env-file=.env.local scripts/hilmy-curation/search-places.mjs
// =====================================================================

import fs from "node:fs";
import path from "node:path";

const KEY = process.env.GOOGLE_PLACES_API_KEY?.trim();
if (!KEY) {
  console.error("❌ GOOGLE_PLACES_API_KEY manquant");
  process.exit(1);
}

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
  "places.businessStatus",
  "places.types",
].join(",");

// Plan de recherche : [cellule] → { queries[], pick N, hilmy_category, country }
const PLAN = [
  // ─── Genève + Lausanne (10) ────────────────────────────────────────
  { cell: "gen-resto",   queries: ["restaurant brunch Genève", "restaurant cosy Genève"],             pick: 2, hilmy_category: "restos-cafes",  city_bias: "Genève",   country: "Suisse" },
  { cell: "lau-resto",   queries: ["restaurant brunch Lausanne"],                                       pick: 1, hilmy_category: "restos-cafes",  city_bias: "Lausanne", country: "Suisse" },
  { cell: "gen-spa",     queries: ["spa massage Genève", "hammam Genève"],                              pick: 2, hilmy_category: "bien-etre",     city_bias: "Genève",   country: "Suisse" },
  { cell: "gen-culturel",queries: ["librairie indépendante Genève", "musée Genève"],                    pick: 1, hilmy_category: "culturel",      city_bias: "Genève",   country: "Suisse" },
  { cell: "lau-culturel",queries: ["librairie Lausanne", "galerie art Lausanne"],                       pick: 1, hilmy_category: "culturel",      city_bias: "Lausanne", country: "Suisse" },
  { cell: "gen-boutique",queries: ["concept store Genève", "boutique créateurs Genève"],                pick: 1, hilmy_category: "boutiques",     city_bias: "Genève",   country: "Suisse" },
  { cell: "lau-cafe",    queries: ["café spécialité Lausanne", "salon de thé Lausanne"],                pick: 1, hilmy_category: "salons-the",    city_bias: "Lausanne", country: "Suisse" },
  { cell: "gen-cafe",    queries: ["salon de thé Genève", "café cosy Genève"],                          pick: 1, hilmy_category: "salons-the",    city_bias: "Genève",   country: "Suisse" },

  // ─── Paris (8) ──────────────────────────────────────────────────────
  { cell: "par-resto",   queries: ["restaurant brunch Paris 11", "restaurant cosy Marais"],             pick: 2, hilmy_category: "restos-cafes",  city_bias: "Paris",    country: "France" },
  { cell: "par-spa",     queries: ["spa massage Paris", "hammam Paris"],                                 pick: 2, hilmy_category: "bien-etre",     city_bias: "Paris",    country: "France" },
  { cell: "par-culturel",queries: ["librairie indépendante Paris", "galerie art Paris"],                pick: 2, hilmy_category: "culturel",      city_bias: "Paris",    country: "France" },
  { cell: "par-boutique",queries: ["concept store Paris", "boutique créateurs Paris"],                  pick: 1, hilmy_category: "boutiques",     city_bias: "Paris",    country: "France" },
  { cell: "par-cafe",    queries: ["salon de thé Paris", "coffee shop Paris"],                          pick: 1, hilmy_category: "salons-the",    city_bias: "Paris",    country: "France" },

  // ─── Bruxelles (5) ──────────────────────────────────────────────────
  { cell: "bxl-resto",   queries: ["brunch Bruxelles", "restaurant cosy Bruxelles", "restaurant brunch Ixelles"], pick: 1, hilmy_category: "restos-cafes",  city_bias: "Bruxelles",country: "Belgique" },
  { cell: "bxl-spa",     queries: ["spa massage Bruxelles"],                                             pick: 1, hilmy_category: "bien-etre",     city_bias: "Bruxelles",country: "Belgique" },
  { cell: "bxl-culturel",queries: ["librairie Bruxelles Saint-Gilles"],                                  pick: 1, hilmy_category: "culturel",      city_bias: "Bruxelles",country: "Belgique" },
  { cell: "bxl-boutique",queries: ["concept store Bruxelles"],                                           pick: 1, hilmy_category: "boutiques",     city_bias: "Bruxelles",country: "Belgique" },
  { cell: "bxl-cafe",    queries: ["salon de thé Bruxelles", "coffee shop Bruxelles"],                  pick: 1, hilmy_category: "salons-the",    city_bias: "Bruxelles",country: "Belgique" },

  // ─── Luxembourg (3) ─────────────────────────────────────────────────
  { cell: "lux-resto",   queries: ["restaurant brunch Luxembourg ville"],                               pick: 1, hilmy_category: "restos-cafes",  city_bias: "Luxembourg", country: "Luxembourg" },
  { cell: "lux-culturel",queries: ["librairie Luxembourg ville", "musée Luxembourg"],                    pick: 1, hilmy_category: "culturel",      city_bias: "Luxembourg", country: "Luxembourg" },
  { cell: "lux-boutique",queries: ["concept store Luxembourg ville"],                                    pick: 1, hilmy_category: "boutiques",     city_bias: "Luxembourg", country: "Luxembourg" },

  // ─── Zurich + Berne (3) ─────────────────────────────────────────────
  { cell: "zur-resto",   queries: ["brunch Zürich", "café brunch Zurich Kreis 4", "breakfast Zurich"],                  pick: 1, hilmy_category: "restos-cafes",  city_bias: "Zürich",    country: "Suisse" },
  { cell: "zur-spa",     queries: ["spa Zürich", "hammam Zurich", "massage Zürich"],                                    pick: 1, hilmy_category: "bien-etre",     city_bias: "Zürich",    country: "Suisse" },
  { cell: "ber-boutique",queries: ["concept store Bern", "boutique design Berne", "boutique Bern Altstadt"],             pick: 1, hilmy_category: "boutiques",     city_bias: "Bern",      country: "Suisse" },

  // ─── Monaco (1) ─────────────────────────────────────────────────────
  { cell: "mco-resto",   queries: ["brunch Monaco Monte-Carlo", "restaurant Monaco", "café Monte-Carlo"],                pick: 1, hilmy_category: "restos-cafes",  city_bias: "Monaco",    country: "Monaco" },
];

function extractLocation(components = []) {
  let city = "", region = "", country = "";
  for (const c of components) {
    if (c.types?.includes("locality")) city = c.longText;
    if (c.types?.includes("administrative_area_level_1")) region = c.longText;
    if (c.types?.includes("country")) country = c.longText;
  }
  if (!city) {
    const fb = components.find(
      (c) => c.types?.includes("postal_town") || c.types?.includes("administrative_area_level_2")
    );
    if (fb) city = fb.longText;
  }
  return { city, region, country };
}

async function textSearch(query) {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "fr",
      maxResultCount: 10,
    }),
  });
  if (!res.ok) {
    console.warn(`  ⚠ ${query}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.places ?? [];
}

function mapPlace(p, hilmy_category) {
  const { city, region, country } = extractLocation(p.addressComponents ?? []);
  const firstPhoto = p.photos?.[0]?.name ?? null;
  const photoUrl = firstPhoto
    ? `${PLACES_BASE}/${firstPhoto}/media?maxWidthPx=1600&key=${KEY}`
    : null;
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
    google_types: p.types ?? [],
    hilmy_category,
    rating: p.rating ?? null,
    user_rating_count: p.userRatingCount ?? null,
    business_status: p.businessStatus ?? null,
    photo_name: firstPhoto,
    photo_url: photoUrl,
    maps_url: `https://www.google.com/maps/place/?q=place_id:${p.id}`,
  };
}

async function main() {
  console.log("🔍 Google Places scan · batch 1 (30 lieux cible)\n");
  const seen = new Set();
  const byCell = {};
  let totalPicked = 0;

  for (const slot of PLAN) {
    console.log(`→ ${slot.cell}  (objectif ${slot.pick}, cat=${slot.hilmy_category})`);
    const candidates = [];
    const localSeen = new Set();
    for (const q of slot.queries) {
      const results = await textSearch(q);
      for (const r of results) {
        if (seen.has(r.id) || localSeen.has(r.id)) continue;
        // Filtres qualité
        if ((r.rating ?? 0) < 4.0) continue;
        if ((r.userRatingCount ?? 0) < 50) continue;
        if (r.businessStatus && r.businessStatus !== "OPERATIONAL") continue;
        // Filtre géo : adresse doit mentionner la ville attendue (fuzzy : sans accents)
        const addrNorm = (r.formattedAddress ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const biasNorm = slot.city_bias.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!addrNorm.includes(biasNorm)) continue;
        localSeen.add(r.id);
        candidates.push(mapPlace(r, slot.hilmy_category));
      }
    }
    // Tri qualité décroissante (rating puis review count)
    candidates.sort((a, b) => {
      if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
      return (b.user_rating_count ?? 0) - (a.user_rating_count ?? 0);
    });
    const picked = candidates.slice(0, slot.pick);
    for (const c of picked) seen.add(c.google_place_id);
    byCell[slot.cell] = picked;
    totalPicked += picked.length;
    console.log(`  ✓ ${picked.length}/${slot.pick} retenu(s)`);
    for (const c of picked) {
      console.log(`     · ${c.name}  ★${c.rating} (${c.user_rating_count})  — ${c.city}`);
    }
  }

  // Flatten
  const all = Object.values(byCell).flat();
  console.log(`\n📊 Total : ${totalPicked} lieux retenus`);

  const out = path.resolve("scripts/hilmy-curation/candidates.json");
  fs.writeFileSync(out, JSON.stringify({ byCell, all }, null, 2));
  console.log(`\n✅ Écrit : ${out}`);
  console.log(`   (re-run le script pour réessayer les cellules sous-peuplées)`);
}

main().catch((e) => {
  console.error("\n💥 FAILED:", e.message);
  process.exit(1);
});
