// =====================================================================
// HILMY · Curation · Insert batch 1 en prod
// =====================================================================
// Lit dry-run.json, normalise la ville (Lëtzebuerg → Luxembourg), insère
// places (upsert google_place_id) + recommendations (source_import
// = hilmy_curation_batch_1).
//
// Usage : node --env-file=.env.local scripts/hilmy-curation/insert-batch-1.mjs
// =====================================================================

import fs from "node:fs";
import path from "node:path";

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) {
  console.error("❌ env manquant");
  process.exit(1);
}

const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function post(pathRel, rows, { onConflict, merge = false } = {}) {
  const qs = onConflict ? `?on_conflict=${onConflict}` : "";
  const url = `${SB}/rest/v1/${pathRel}${qs}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...H,
      Prefer: `${merge ? "resolution=merge-duplicates," : ""}return=representation`,
    },
    body: JSON.stringify(rows),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ ${pathRel}: HTTP ${res.status}`);
    console.error(text);
    throw new Error(`insert ${pathRel} failed`);
  }
  return JSON.parse(text);
}

async function main() {
  const dry = JSON.parse(
    fs.readFileSync(path.resolve("scripts/hilmy-curation/dry-run.json"), "utf8")
  );

  // Normalise ville (Lëtzebuerg → Luxembourg)
  for (const p of dry.places) {
    if (p.city === "Lëtzebuerg") p.city = "Luxembourg";
  }

  console.log(`→ Insert ${dry.places.length} places (upsert google_place_id)…`);
  const placesInserted = await post("places", dry.places, {
    onConflict: "google_place_id",
    merge: true,
  });
  console.log(`  ✓ ${placesInserted.length} places OK`);

  // Map google_place_id → id
  const idByGid = new Map(
    placesInserted.map((p) => [p.google_place_id, p.id])
  );

  // Build recommendations payload
  const recos = dry.recommendations.map((r) => {
    const place_id = idByGid.get(r.google_place_id_ref);
    if (!place_id)
      throw new Error(`missing place_id for ${r.google_place_id_ref}`);
    const { google_place_id_ref, ...clean } = r;
    return { ...clean, place_id };
  });

  console.log(`→ Insert ${recos.length} recommendations…`);
  const recosInserted = await post("recommendations", recos);
  console.log(`  ✓ ${recosInserted.length} recommendations OK`);

  console.log("\n📋 IDs insérés (place_id · reco_id · slug) :");
  for (const p of placesInserted) {
    const reco = recosInserted.find((r) => r.place_id === p.id);
    console.log(
      `  ${p.id}  ·  ${reco?.id ?? "—"}  ·  ${p.slug}  (${p.city})`
    );
  }
  console.log(
    `\n✅ Batch 1 inséré : ${placesInserted.length} places + ${recosInserted.length} recos.`
  );
  console.log(
    `   Source import : hilmy_curation_batch_1  (filtrable / purgeable)`
  );
}

try {
  await main();
} catch (e) {
  console.error("\n💥 FAILED:", e.message);
  process.exit(1);
}
