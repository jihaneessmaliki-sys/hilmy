// =====================================================================
// HILMY · Backfill places.photos[] → proxy keyless indexé
// =====================================================================
// Usage :
//   node --env-file=.env.local scripts/backfill-places-photos-array.mjs          (DRY-RUN)
//   node --env-file=.env.local scripts/backfill-places-photos-array.mjs --apply   (ÉCRIT)
//
// Pourquoi : places.photos[] contient des URLs places.googleapis.com avec la
// clé API en clair (fuite + HTTP 400, galerie cassée). On remplace chaque URL
// fuitée par l'URL stable du proxy `…/api/places/photo?place_id=<gpid>&i=<n>`
// qui streame la nième photo sans jamais exposer la clé.
//
// L'index `i` = position dans le tableau. Le tableau a été construit depuis
// details.photos (ordre des photos Google), donc photos[i] correspond bien à
// la nième photo Google que getPlacePhotoName(gpid, i) resservira.
//
// Décision par URL du tableau :
//   - fuitée (clé) → proxy indexé (REPLACE)
//   - déjà proxy   → gardée telle quelle
//   - curée (autre)→ gardée telle quelle
//
// Sécurité : on extrait le place_id encodé dans l'URL fuitée
// (`/places/{ID}/photos/…`) et on vérifie qu'il == google_place_id de la
// ligne. En cas de mismatch → on SKIP la ligne (jamais d'écriture douteuse).
//
// Idempotent : relançable sans effet une fois les lignes migrées.
// =====================================================================

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BASE || !KEY) {
  console.error(
    "ERREUR : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant",
  );
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

// Doit matcher lib/google/places.ts placePhotoProxyUrl (www canonique).
const PHOTO_PROXY_BASE = "https://www.hilmy.io";
const proxyUrl = (gpid, i) => {
  const base = `${PHOTO_PROXY_BASE}/api/places/photo?place_id=${encodeURIComponent(gpid)}`;
  return i > 0 ? `${base}&i=${i}` : base;
};

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const isLeaked = (u) =>
  typeof u === "string" &&
  (u.includes("places.googleapis.com") || u.includes("key="));
const isProxy = (u) =>
  typeof u === "string" && u.includes("/api/places/photo");

// place_id encodé dans l'URL google : /v1/places/{ID}/photos/{ref}/media
const idFromUrl = (u) => {
  const m = typeof u === "string" && u.match(/\/places\/([^/]+)\/photos\//);
  return m ? m[1] : null;
};

const redact = (s) => String(s).replace(/key=[^&]+/g, "key=<REDACTED>");

function rebuild(photos, gpid) {
  // Retourne { next, mismatch } ; next = tableau réécrit, mismatch = bool.
  let mismatch = false;
  const next = photos.map((u, i) => {
    if (isLeaked(u)) {
      const embedded = idFromUrl(u);
      if (embedded && gpid && embedded !== gpid) mismatch = true;
      return proxyUrl(gpid, i);
    }
    return u; // proxy déjà OK ou URL curée : on garde
  });
  return { next, mismatch };
}

async function main() {
  const res = await fetch(
    `${BASE}/rest/v1/places?select=id,name,slug,google_place_id,photos&order=created_at.asc`,
    { headers: H },
  );
  if (!res.ok) {
    console.error(`❌ lecture places : HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }
  const places = await res.json();

  console.log(`\n=== Backfill places.photos[] (${APPLY ? "APPLY" : "DRY-RUN"}) ===`);
  console.log(`Lieux : ${places.length}`);

  const buckets = { REPLACE: [], SKIP_NOLEAK: [], SKIP_NOGPID: [], SKIP_MISMATCH: [] };

  for (const p of places) {
    const photos = Array.isArray(p.photos) ? p.photos : [];
    const hasLeak = photos.some(isLeaked);
    if (!hasLeak) {
      buckets.SKIP_NOLEAK.push(p);
      continue;
    }
    if (!p.google_place_id) {
      buckets.SKIP_NOGPID.push(p);
      continue;
    }
    const { next, mismatch } = rebuild(photos, p.google_place_id);
    if (mismatch) {
      buckets.SKIP_MISMATCH.push(p);
      continue;
    }
    p._next = next;
    buckets.REPLACE.push(p);
  }

  console.log(`  REPLACE (fuite → proxy indexé) : ${buckets.REPLACE.length}`);
  console.log(`  SKIP    (pas de fuite)         : ${buckets.SKIP_NOLEAK.length}`);
  console.log(`  SKIP    (fuite sans gpid)      : ${buckets.SKIP_NOGPID.length}`);
  console.log(`  SKIP    (place_id mismatch)    : ${buckets.SKIP_MISMATCH.length}`);
  console.log(`  → à écrire                     : ${buckets.REPLACE.length}\n`);

  for (const p of buckets.REPLACE.slice(0, 8)) {
    console.log(`  [REPLACE] ${p.slug}  (${p.photos.length} photos)`);
    console.log(`         old[0]: ${redact(p.photos[0]).slice(0, 80)}`);
    console.log(`         new[0]: ${p._next[0]}`);
    if (p._next.length > 1) console.log(`         new[${p._next.length - 1}]: ${p._next[p._next.length - 1]}`);
  }
  if (buckets.REPLACE.length > 8) console.log(`  … +${buckets.REPLACE.length - 8} autres`);

  if (buckets.SKIP_NOGPID.length || buckets.SKIP_MISMATCH.length) {
    console.log(`\n  ⚠️  lignes ignorées à vérifier manuellement :`);
    for (const p of [...buckets.SKIP_NOGPID, ...buckets.SKIP_MISMATCH]) {
      console.log(`     - ${p.slug} (id ${p.id})`);
    }
  }

  if (!APPLY) {
    console.log(`\nDRY-RUN : aucune écriture. Relancer avec --apply pour écrire.\n`);
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const p of buckets.REPLACE) {
    const patch = await fetch(`${BASE}/rest/v1/places?id=eq.${p.id}`, {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ photos: p._next }),
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
