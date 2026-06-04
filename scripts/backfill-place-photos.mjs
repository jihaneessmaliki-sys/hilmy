// =====================================================================
// HILMY · Backfill places.main_photo_url → proxy /api/places/photo
// =====================================================================
// Usage :
//   node --env-file=.env.local scripts/backfill-place-photos.mjs          (DRY-RUN)
//   node --env-file=.env.local scripts/backfill-place-photos.mjs --apply   (ÉCRIT)
//
// Pourquoi : main_photo_url était soit NULL (lieux créés sans photo), soit
// une URL places.googleapis.com contenant la clé API en clair (fuite +
// HTTP 400, image cassée). On remplace par l'URL stable du proxy serveur
// `https://www.hilmy.io/api/places/photo?place_id=<gpid>` qui streame la
// photo sans jamais exposer la clé.
//
// IMPORTANT : la card mobile n'affiche son placeholder de couleur QUE si
// main_photo_url est null. Si on écrit une URL proxy sur un lieu SANS photo
// Google, l'endpoint renverra 404 → image cassée au lieu du placeholder.
// Donc on appelle Place Details (field mask `photos` seul, 1 call/ligne,
// PAS de download d'image) et on n'écrit le proxy QUE si une photo existe ;
// sinon on laisse / remet main_photo_url à null.
//
// Décision par lieu (avec google_place_id) :
//                       │ photo Google existe │ pas de photo / Details KO
//   ────────────────────┼─────────────────────┼──────────────────────────
//   main_photo_url null │ FILL  (→ proxy)      │ SKIP  (reste null)
//   url clé/cassée       │ REPLACE (→ proxy)    │ CLEAR (→ null, retire fuite)
//   url curée (unsplash) │ SKIP                 │ SKIP  (on préserve)
//   déjà proxy           │ SKIP                 │ CLEAR (→ null, sinon 404)
//
//   En cas d'erreur HTTP Google (transitoire), on SKIP : jamais d'écriture
//   destructive sur un doute réseau.
//
// Idempotent : relançable sans effet une fois les lignes migrées.
// =====================================================================

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GKEY = process.env.GOOGLE_PLACES_API_KEY?.trim();

if (!URL || !KEY) {
  console.error(
    "ERREUR : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant",
  );
  process.exit(1);
}
if (!GKEY) {
  console.error("ERREUR : GOOGLE_PLACES_API_KEY manquant (nécessaire pour vérifier l'existence des photos)");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

// Doit matcher lib/google/places.ts placePhotoProxyUrl (www canonique).
const PHOTO_PROXY_BASE = "https://www.hilmy.io";
const PLACES_BASE = "https://places.googleapis.com/v1";
const proxyUrl = (gpid) =>
  `${PHOTO_PROXY_BASE}/api/places/photo?place_id=${encodeURIComponent(gpid)}`;

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const isLeaked = (u) =>
  typeof u === "string" &&
  (u.includes("places.googleapis.com") || u.includes("key="));
const isProxy = (u) =>
  typeof u === "string" && u.includes("/api/places/photo");
const isCurated = (u) =>
  typeof u === "string" && u.trim() !== "" && !isLeaked(u) && !isProxy(u);

/**
 * Vérifie l'existence d'une photo Google. Retourne :
 *   { state: "photo" }   → au moins une photo
 *   { state: "none" }    → aucune photo (réponse Google OK)
 *   { state: "error" }   → erreur HTTP (on SKIP par prudence)
 * 1 seul appel Place Details, field mask `photos`. Clé en header.
 */
async function probePhoto(gpid) {
  try {
    const res = await fetch(
      `${PLACES_BASE}/places/${encodeURIComponent(gpid)}?languageCode=fr`,
      { headers: { "X-Goog-Api-Key": GKEY, "X-Goog-FieldMask": "photos" } },
    );
    if (!res.ok) return { state: "error", code: res.status };
    const p = await res.json();
    return { state: p.photos?.[0]?.name ? "photo" : "none" };
  } catch (e) {
    return { state: "error", code: e instanceof Error ? e.message : "?" };
  }
}

// target final voulu pour main_photo_url selon présence photo.
function decide(current, hasPhoto) {
  // Curation manuelle (unsplash, etc.) : jamais touchée.
  if (isCurated(current)) return { action: "SKIP", value: current };

  const desired = hasPhoto ? "PROXY" : null;
  const curIsNull = current == null || current.trim?.() === "";

  if (desired === "PROXY") {
    if (curIsNull) return { action: "FILL", value: "PROXY" };
    if (isProxy(current)) return { action: "SKIP", value: current };
    return { action: "REPLACE", value: "PROXY" }; // leaked → proxy
  }
  // pas de photo : on veut null
  if (curIsNull) return { action: "SKIP", value: null };
  return { action: "CLEAR", value: null }; // leaked/proxy → null
}

async function main() {
  const res = await fetch(
    `${URL}/rest/v1/places?select=id,name,slug,google_place_id,main_photo_url&google_place_id=not.is.null&order=created_at.asc`,
    { headers: H },
  );
  if (!res.ok) {
    console.error(`❌ lecture places : HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }
  const places = await res.json();

  console.log(`\n=== Backfill main_photo_url (${APPLY ? "APPLY" : "DRY-RUN"}) ===`);
  console.log(`Lieux avec google_place_id : ${places.length}`);
  process.stdout.write("Vérification des photos Google (1 call/ligne) ");

  const buckets = { FILL: [], REPLACE: [], CLEAR: [], SKIP: [], ERROR: [] };
  for (const p of places) {
    const probe = await probePhoto(p.google_place_id);
    if (probe.state === "error") {
      buckets.ERROR.push(p);
      process.stdout.write("!");
      continue;
    }
    const hasPhoto = probe.state === "photo";
    const d = decide(p.main_photo_url, hasPhoto);
    p._action = d.action;
    p._value = d.value === "PROXY" ? proxyUrl(p.google_place_id) : null;
    buckets[d.action].push(p);
    process.stdout.write(".");
  }
  process.stdout.write("\n\n");

  const toWrite = [...buckets.FILL, ...buckets.REPLACE, ...buckets.CLEAR];

  console.log(`  FILL    (null → proxy)        : ${buckets.FILL.length}`);
  console.log(`  REPLACE (clé/cassé → proxy)   : ${buckets.REPLACE.length}`);
  console.log(`  CLEAR   (clé/cassé → null)    : ${buckets.CLEAR.length}`);
  console.log(`  SKIP    (déjà ok / null / curé): ${buckets.SKIP.length}`);
  console.log(`  ERROR   (Details KO → ignoré) : ${buckets.ERROR.length}`);
  console.log(`  → à écrire                    : ${toWrite.length}\n`);

  for (const p of toWrite.slice(0, 15)) {
    const old = (p.main_photo_url ?? "∅").replace(/key=[^&]+/g, "key=<REDACTED>");
    console.log(`  [${p._action}] ${p.slug}`);
    console.log(`         old: ${old.slice(0, 70)}`);
    console.log(`         new: ${p._value ?? "null"}`);
  }
  if (toWrite.length > 15) console.log(`  … +${toWrite.length - 15} autres`);

  if (!APPLY) {
    console.log(`\nDRY-RUN : aucune écriture. Relancer avec --apply pour écrire.\n`);
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const p of toWrite) {
    const patch = await fetch(`${URL}/rest/v1/places?id=eq.${p.id}`, {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ main_photo_url: p._value }),
    });
    if (patch.ok) {
      ok++;
    } else {
      fail++;
      console.error(`  ❌ ${p.slug}: HTTP ${patch.status} ${await patch.text()}`);
    }
  }
  console.log(`\n✅ Écrit : ${ok}   ❌ Échecs : ${fail}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
