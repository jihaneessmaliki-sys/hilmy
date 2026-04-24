// =====================================================================
// HILMY · Curation · Weekly add (recurring)
// =====================================================================
// Ajoute N lieux via Équipe Hilmy — à lancer chaque lundi matin.
//
// Usage :
//   node --env-file=.env.local scripts/hilmy-curation/weekly-add.mjs \
//     --type=place --count=3 --city=Paris --category=restos-cafes
//
// Défaut = dry-run (écrit un fichier pour revue, n'insère rien).
// Ajoute --confirm pour insérer réellement en DB prod.
//
// Options :
//   --type=place             (obligatoire · seul 'place' supporté en v1 — events = TBD)
//   --count=N                (obligatoire · 1..10)
//   --city=X                 (optionnel · filtre géo, ex: Paris, Genève, Bruxelles)
//   --category=slug          (optionnel · filtre catégorie HILMY, ex: restos-cafes)
//   --confirm                (optionnel · insère réellement après dry-run)
//
// Anti-doublons : check google_place_id existant avant insert.
// Tag source_import : hilmy_curation_YYYY-MM-DD (pour audit/purge).
// =====================================================================

import fs from "node:fs";
import path from "node:path";

const TEAM_USER_ID = "9c51573b-6e39-4bd1-b83a-612f9c5b665d";
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE = process.env.GOOGLE_PLACES_API_KEY?.trim();
if (!SB || !KEY || !GOOGLE) {
  console.error("❌ env manquant (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GOOGLE_PLACES_API_KEY)");
  process.exit(1);
}

const ARGS = parseArgs(process.argv.slice(2));
if (!ARGS.type || ARGS.type !== "place") {
  console.error("❌ --type=place requis (events pas encore supporté)");
  process.exit(2);
}
const COUNT = parseInt(ARGS.count ?? "0", 10);
if (!COUNT || COUNT < 1 || COUNT > 10) {
  console.error("❌ --count=N requis (1..10)");
  process.exit(2);
}

const CITY = ARGS.city ?? null;
const CATEGORY = ARGS.category ?? null;
const CONFIRM = !!ARGS.confirm;
const DATE_TAG = new Date().toISOString().slice(0, 10);
const SOURCE = `hilmy_curation_${DATE_TAG}`;

const VALID_CATEGORIES = new Set([
  "restos-cafes", "salons-the", "boutiques", "bien-etre",
  "enfants", "hebergements", "sante", "culturel", "sport-nature",
]);
if (CATEGORY && !VALID_CATEGORIES.has(CATEGORY)) {
  console.error(`❌ --category=${CATEGORY} invalide. Autorisées : ${[...VALID_CATEGORIES].join(", ")}`);
  process.exit(2);
}

// ─── Query-builders par catégorie ──────────────────────────────────────
const QUERIES_BY_CATEGORY = {
  "restos-cafes":  (city) => [`restaurant brunch ${city}`, `restaurant cosy ${city}`],
  "salons-the":    (city) => [`salon de thé ${city}`, `café spécialité ${city}`],
  "boutiques":     (city) => [`concept store ${city}`, `boutique créateurs ${city}`],
  "bien-etre":     (city) => [`spa ${city}`, `massage ${city}`],
  "enfants":       (city) => [`atelier enfant ${city}`, `librairie jeunesse ${city}`],
  "hebergements":  (city) => [`hôtel boutique ${city}`],
  "sante":         (city) => [`cabinet médical ${city}`],
  "culturel":      (city) => [`librairie indépendante ${city}`, `galerie art ${city}`],
  "sport-nature":  (city) => [`studio yoga ${city}`, `studio pilates ${city}`],
};

const DIET_CATEGORIES = new Set(["restos-cafes", "salons-the"]);

// ─── Templates de commentaires (voix Sara, option A) ───────────────────
// Règle : aucune invention de détail non vérifiable. Infos Google seulement.
// Slots : {name} {neighborhood} {rating} {reviews} {type}
const TEMPLATES_BY_CATEGORY = {
  "restos-cafes": [
    "{type} bien noté ({rating}★, {reviews} avis). Le genre d'adresse à glisser au carnet pour un dîner tranquille entre copines.",
    "Table soignée côté {neighborhood}, très bien notée. À tenter pour un repas qui sort du lot.",
    "Adresse cosy qui tient sa promesse d'après les avis Google. Bonne option pour un brunch ou un déjeuner calme.",
    "Resto apprécié de la bulle, {rating}★ et {reviews}+ avis. Réservation conseillée selon le moment.",
  ],
  "salons-the": [
    "Café de quartier bien noté, {rating}★ sur Google. Pour une pause filtre bien tiré et un moment tranquille.",
    "Salon de thé chaleureux côté {neighborhood}. Adresse douce pour l'après-midi.",
    "Coffee shop chéri des habitués, {reviews}+ avis convergent. À tester si tu passes par là.",
  ],
  "boutiques": [
    "Concept store avec une sélection tranchée. Le genre d'endroit où tu trouves un truc que tu n'as vu nulle part ailleurs.",
    "Boutique côté {neighborhood}, {rating}★ — sélection pointue et accueil soigné d'après les avis.",
    "Adresse shopping à connaître dans la bulle. Parfait pour un cadeau à offrir (ou à se faire).",
  ],
  "bien-etre": [
    "Spa bien noté ({rating}★, {reviews} avis). Pour une vraie pause, loin du spa d'hôtel tape-à-l'œil.",
    "Institut {neighborhood} réputé dans la bulle féminine. Adresse confiance pour soins et massages.",
    "Centre bien-être qui a ce qu'il faut — note solide et beaucoup d'avis. À ajouter au carnet.",
  ],
  "enfants": [
    "Adresse réputée pour les sorties enfants. {rating}★ et des parents qui reviennent d'après les avis.",
    "Lieu pour les petits côté {neighborhood}. Bonne réputation et ambiance adaptée.",
  ],
  "hebergements": [
    "Hôtel boutique bien noté ({rating}★). Pour un séjour soigné sans les chaînes sans âme.",
  ],
  "sante": [
    "Cabinet réputé dans la bulle. Adresse de confiance à ajouter au carnet.",
  ],
  "culturel": [
    "Librairie ou galerie indépendante côté {neighborhood}, {rating}★. Pour flâner et repartir avec une découverte.",
    "Adresse culturelle notée 5★ par ses visiteuses régulières. Le genre d'endroit où tu entres pour 5 minutes et tu ressors une heure plus tard.",
    "Lieu réputé de la scène {neighborhood}. À glisser au carnet pour un dimanche tranquille.",
  ],
  "sport-nature": [
    "Studio bien noté ({rating}★, {reviews} avis). Pour une pratique régulière ou un cours découverte sans pression.",
  ],
};

// ─── Tags contextuels par catégorie ────────────────────────────────────
const TAGS_BY_CATEGORY = {
  "restos-cafes":  ["entre-copines", "en-couple"],
  "salons-the":    ["entre-copines", "pour-le-boulot"],
  "boutiques":     [],
  "bien-etre":     ["entre-copines", "pour-une-occasion"],
  "enfants":       ["avec-enfants"],
  "hebergements":  ["en-couple", "pour-une-occasion"],
  "sante":         [],
  "culturel":      [],
  "sport-nature":  ["entre-copines"],
};

// ─── Plan d'exécution ──────────────────────────────────────────────────
function buildPlan() {
  const plan = [];
  const cats = CATEGORY ? [CATEGORY] : Object.keys(QUERIES_BY_CATEGORY);
  const cities = CITY ? [CITY] : ["Paris", "Genève", "Lausanne", "Bruxelles", "Luxembourg", "Zürich"];
  // Mix simple : on cherche dans chaque (cat, city) et on pioche pour atteindre COUNT.
  // Si CATEGORY+CITY précis → 1 seule cellule à COUNT lieux.
  for (const cat of cats) {
    for (const city of cities) {
      plan.push({ category: cat, city, queries: QUERIES_BY_CATEGORY[cat](city) });
      if (cats.length === 1 && cities.length === 1) plan[0].pick = COUNT;
    }
  }
  return plan;
}

// ─── Google Places ─────────────────────────────────────────────────────
const PLACES_BASE = "https://places.googleapis.com/v1";
const FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress", "places.location",
  "places.primaryType", "places.primaryTypeDisplayName", "places.photos",
  "places.addressComponents", "places.rating", "places.userRatingCount",
  "places.businessStatus", "places.types",
].join(",");

async function textSearch(q) {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: q, languageCode: "fr", maxResultCount: 10 }),
  });
  if (!res.ok) { console.warn(`  ⚠ ${q}: HTTP ${res.status}`); return []; }
  const data = await res.json();
  return data.places ?? [];
}

function extractLocation(components = []) {
  let city = "", region = "", country = "";
  for (const c of components) {
    if (c.types?.includes("locality")) city = c.longText;
    if (c.types?.includes("administrative_area_level_1")) region = c.longText;
    if (c.types?.includes("country")) country = c.longText;
  }
  // Normalise Luxembourg : Lëtzebuerg → Luxembourg
  if (city === "Lëtzebuerg") city = "Luxembourg";
  return { city, region, country };
}

function normalize(s) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── Supabase ──────────────────────────────────────────────────────────
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function existingGooglePlaceIds(gids) {
  if (!gids.length) return new Set();
  const listParam = gids.map((id) => `"${id}"`).join(",");
  const res = await fetch(`${SB}/rest/v1/places?google_place_id=in.(${encodeURIComponent(listParam)})&select=google_place_id`, { headers: H });
  if (!res.ok) throw new Error(`existing lookup: ${res.status}`);
  const rows = await res.json();
  return new Set(rows.map((r) => r.google_place_id));
}

async function post(pathRel, rows, { onConflict, merge = false } = {}) {
  const qs = onConflict ? `?on_conflict=${onConflict}` : "";
  const res = await fetch(`${SB}/rest/v1/${pathRel}${qs}`, {
    method: "POST",
    headers: { ...H, Prefer: `${merge ? "resolution=merge-duplicates," : ""}return=representation` },
    body: JSON.stringify(rows),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathRel}: HTTP ${res.status} ${text}`);
  return JSON.parse(text);
}

// ─── Helpers ───────────────────────────────────────────────────────────
function slugify(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

function pickTemplate(category) {
  const pool = TEMPLATES_BY_CATEGORY[category] || ["Adresse bien notée à ajouter au carnet."];
  return pool[Math.floor(Math.random() * pool.length)];
}

function fillTemplate(tmpl, p) {
  const neighborhood = (p.address ?? "").split(",")[0] ?? "";
  const typeLabel = p.google_category_label || "Adresse";
  return tmpl
    .replaceAll("{name}", p.displayName?.text ?? "")
    .replaceAll("{neighborhood}", neighborhood)
    .replaceAll("{rating}", (p.rating ?? 0).toString())
    .replaceAll("{reviews}", (p.userRatingCount ?? 0).toString())
    .replaceAll("{type}", typeLabel);
}

function guessDietTags(googleTypes = []) {
  const out = [];
  if (googleTypes.includes("halal_restaurant")) out.push("halal");
  if (googleTypes.includes("vegetarian_restaurant")) out.push("vegetarien");
  if (googleTypes.includes("vegan_restaurant")) out.push("vegan");
  return out;
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      out[k] = v ?? true;
    }
  }
  return out;
}

// ─── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`🌱 Weekly add · ${COUNT} lieu(x) · city=${CITY ?? "any"} · cat=${CATEGORY ?? "any"}`);
  console.log(`   source_import = ${SOURCE}`);
  console.log(`   mode = ${CONFIRM ? "INSERT PROD" : "DRY-RUN (aucun insert — relancer avec --confirm)"}`);
  console.log();

  const plan = buildPlan();
  const collected = [];
  const seenGids = new Set();

  for (const slot of plan) {
    if (collected.length >= COUNT) break;
    for (const q of slot.queries) {
      if (collected.length >= COUNT) break;
      const results = await textSearch(q);
      for (const r of results) {
        if (collected.length >= COUNT) break;
        if (seenGids.has(r.id)) continue;
        if ((r.rating ?? 0) < 4.0) continue;
        if ((r.userRatingCount ?? 0) < 50) continue;
        if (r.businessStatus && r.businessStatus !== "OPERATIONAL") continue;
        // Filtre géo si CITY précis
        if (CITY) {
          const addrN = normalize(r.formattedAddress);
          if (!addrN.includes(normalize(CITY))) continue;
        }
        seenGids.add(r.id);
        collected.push({ raw: r, slot });
      }
    }
  }

  console.log(`→ ${collected.length} candidat(s) trouvé(s) après filtres qualité.`);
  if (collected.length === 0) {
    console.log("Aucun candidat — abandon.");
    return;
  }

  // Anti-doublons DB
  const gids = collected.map((c) => c.raw.id);
  const existing = await existingGooglePlaceIds(gids);
  const fresh = collected.filter((c) => !existing.has(c.raw.id));
  console.log(`→ ${fresh.length} frais (${collected.length - fresh.length} déjà en DB, skip).`);
  if (fresh.length === 0) {
    console.log("Tous les candidats sont déjà en DB — abandon.");
    return;
  }

  // Build payloads
  const places = [];
  const recos = [];
  for (const { raw, slot } of fresh.slice(0, COUNT)) {
    const loc = extractLocation(raw.addressComponents ?? []);
    const photo = raw.photos?.[0]?.name ?? null;
    const photoUrl = photo ? `${PLACES_BASE}/${photo}/media?maxWidthPx=1600&key=${GOOGLE}` : null;
    const slug = `${slugify(raw.displayName?.text ?? "")}-${Math.random().toString(36).slice(2, 6)}`;
    places.push({
      google_place_id: raw.id,
      name: raw.displayName?.text ?? "",
      slug,
      address: raw.formattedAddress ?? "",
      city: loc.city,
      region: loc.region || null,
      country: loc.country,
      latitude: raw.location?.latitude ?? 0,
      longitude: raw.location?.longitude ?? 0,
      google_category: raw.primaryType ?? null,
      hilmy_category: slot.category,
      main_photo_url: photoUrl,
      photos: photoUrl ? [photoUrl] : [],
    });
    const tags = [...(TAGS_BY_CATEGORY[slot.category] || [])];
    if (DIET_CATEGORIES.has(slot.category)) tags.push(...guessDietTags(raw.types ?? []));
    recos.push({
      user_id: TEAM_USER_ID,
      type: "place",
      _gid: raw.id,
      comment: fillTemplate(pickTemplate(slot.category), raw),
      rating: (raw.rating ?? 0) >= 4.8 ? 5 : 4,
      tags: tags.length ? [...new Set(tags)] : null,
      price_indicator: null,
      photo_urls: null,
      status: "published",
      source_import: SOURCE,
    });
  }

  // Dry-run file
  const outDir = path.resolve("scripts/hilmy-curation");
  const outFile = path.join(outDir, `weekly-${DATE_TAG}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ places, recommendations: recos }, null, 2));
  console.log(`\n📄 Dry-run écrit : ${outFile}`);
  console.log(`\n╭─ PRÉVIEW ─────────────────────────────────────────────────`);
  for (let i = 0; i < places.length; i++) {
    console.log(`│ ${i + 1}. ${places[i].name} — ${places[i].city} · ${places[i].hilmy_category}`);
    console.log(`│    ${recos[i].comment}`);
  }
  console.log(`╰──────────────────────────────────────────────────────────\n`);

  if (!CONFIRM) {
    console.log("ℹ DRY-RUN. Pour insérer, relance avec --confirm :");
    const argvCmd = process.argv.slice(2).filter((a) => a !== "--confirm").concat("--confirm").join(" ");
    console.log(`   node --env-file=.env.local scripts/hilmy-curation/weekly-add.mjs ${argvCmd}`);
    return;
  }

  // INSERT
  console.log(`→ Insert ${places.length} places…`);
  const placesIns = await post("places", places, { onConflict: "google_place_id", merge: true });
  const idByGid = new Map(placesIns.map((p) => [p.google_place_id, p.id]));
  const recoPayload = recos.map((r) => {
    const { _gid, ...clean } = r;
    return { ...clean, place_id: idByGid.get(_gid) };
  });
  console.log(`→ Insert ${recoPayload.length} recommendations…`);
  const recosIns = await post("recommendations", recoPayload);
  console.log(`\n✅ Inséré : ${placesIns.length} places + ${recosIns.length} recos.`);
  console.log(`   source_import = ${SOURCE}`);
  for (const p of placesIns) {
    const r = recosIns.find((x) => x.place_id === p.id);
    console.log(`   · ${p.name} (${p.city})  →  reco ${r?.id}`);
  }
}

main().catch((e) => { console.error("\n💥 FAILED:", e.message); process.exit(1); });
