// =====================================================================
// HILMY · Backfill profiles.galerie[] / photos[] → proxy keyless indexé
// =====================================================================
// Usage :
//   node --env-file=.env.local scripts/backfill-profiles-galleries.mjs          (DRY-RUN)
//   node --env-file=.env.local scripts/backfill-profiles-galleries.mjs --apply   (ÉCRIT)
//
// Pourquoi : l'onboarding prestataire Google (app/onboarding/prestataire/
// google) stocke details.photos dans profiles.galerie ET profiles.photos.
// Avant le fix, details.photos contenait des URLs places.googleapis.com avec
// la clé en clair (fuite + galerie cassée). On remplace par l'URL proxy
// keyless indexée.
//
// PARTICULARITÉ : profiles N'A PAS de colonne google_place_id. Mais le
// place_id est encodé dans l'URL fuitée elle-même (`/places/{ID}/photos/…`).
// On l'extrait de l'URL pour reconstruire `…/photo?place_id=<ID>&i=<n>`.
// L'index `i` = position dans le tableau (= ordre des photos Google).
//
// Décision par URL :
//   - fuitée (clé) + place_id extractible → proxy indexé (REPLACE)
//   - fuitée mais place_id introuvable    → ligne SKIP + flag (à vérifier)
//   - déjà proxy / curée                  → gardée telle quelle
//
// galerie[] et photos[] sont traités indépendamment (mêmes données en
// pratique, mais on ne suppose rien).
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

const PHOTO_PROXY_BASE = "https://www.hilmy.io";
const proxyUrl = (gpid, i) => {
  const base = `${PHOTO_PROXY_BASE}/api/places/photo?place_id=${encodeURIComponent(gpid)}`;
  return i > 0 ? `${base}&i=${i}` : base;
};

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const isLeaked = (u) =>
  typeof u === "string" &&
  (u.includes("places.googleapis.com") || u.includes("key="));

// place_id encodé dans l'URL google : /v1/places/{ID}/photos/{ref}/media
const idFromUrl = (u) => {
  const m = typeof u === "string" && u.match(/\/places\/([^/]+)\/photos\//);
  return m ? m[1] : null;
};

const redact = (s) => String(s).replace(/key=[^&]+/g, "key=<REDACTED>");

// Réécrit un tableau. Retourne { next, changed, unresolved }.
//   unresolved = au moins une URL fuitée sans place_id extractible.
function rebuild(arr) {
  let changed = false;
  let unresolved = false;
  const next = arr.map((u, i) => {
    if (!isLeaked(u)) return u;
    const gpid = idFromUrl(u);
    if (!gpid) {
      unresolved = true;
      return u;
    }
    changed = true;
    return proxyUrl(gpid, i);
  });
  return { next, changed, unresolved };
}

async function main() {
  const res = await fetch(
    `${BASE}/rest/v1/profiles?select=id,slug,source_import,galerie,photos&order=created_at.asc`,
    { headers: H },
  );
  if (!res.ok) {
    console.error(`❌ lecture profiles : HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }
  const rows = await res.json();

  console.log(`\n=== Backfill profiles galerie/photos (${APPLY ? "APPLY" : "DRY-RUN"}) ===`);
  console.log(`Prestataires : ${rows.length}`);

  const toWrite = [];
  const unresolvedRows = [];

  for (const r of rows) {
    const galerie = Array.isArray(r.galerie) ? r.galerie : [];
    const photos = Array.isArray(r.photos) ? r.photos : [];

    const g = rebuild(galerie);
    const p = rebuild(photos);

    if (g.unresolved || p.unresolved) unresolvedRows.push(r);
    if (!g.changed && !p.changed) continue;

    r._patch = {};
    if (g.changed) r._patch.galerie = g.next;
    if (p.changed) r._patch.photos = p.next;
    r._old = { galerie, photos };
    toWrite.push(r);
  }

  console.log(`  REPLACE (fuite → proxy indexé) : ${toWrite.length}`);
  console.log(`  unresolved (fuite sans id)     : ${unresolvedRows.length}`);
  console.log(`  → à écrire                     : ${toWrite.length}\n`);

  for (const r of toWrite) {
    const cols = Object.keys(r._patch).join(", ");
    console.log(`  [REPLACE] ${r.slug}  (cols: ${cols})`);
    const firstOld = r._old.galerie.find(isLeaked) ?? r._old.photos.find(isLeaked);
    const firstNew = (r._patch.galerie ?? r._patch.photos)[0];
    console.log(`         old[0]: ${redact(firstOld).slice(0, 80)}`);
    console.log(`         new[0]: ${firstNew}`);
  }

  if (unresolvedRows.length) {
    console.log(`\n  ⚠️  fuite sans place_id extractible (à vérifier manuellement) :`);
    for (const r of unresolvedRows) console.log(`     - ${r.slug} (id ${r.id})`);
  }

  if (!APPLY) {
    console.log(`\nDRY-RUN : aucune écriture. Relancer avec --apply pour écrire.\n`);
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const r of toWrite) {
    const patch = await fetch(`${BASE}/rest/v1/profiles?id=eq.${r.id}`, {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(r._patch),
    });
    if (patch.ok) {
      ok++;
    } else {
      fail++;
      console.error(`  ❌ ${r.slug}: HTTP ${patch.status} ${await patch.text()}`);
    }
  }
  console.log(`\n✅ Écrit : ${ok}   ❌ Échecs : ${fail}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
