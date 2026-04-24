// =====================================================================
// HILMY · Curation · Events batch 1 (Option B, best-effort)
// =====================================================================
// 3 events réels extraits via WebFetch de lausanne.ch Bureau de l'Égalité.
// Autres sources (womenwave, lespremieres, ladiesdrivingclub, mampreneures,
// geneve.ch, impacthub) = vides ou inaccessibles → pas de données à injecter.
//
// Règles Option A voix Sara : description factuelle + 1 phrase chaleureuse.
// Aucune affirmation non vérifiable.
//
// Usage :
//   # Dry-run (défaut)
//   node --env-file=.env.local scripts/hilmy-curation/events-batch-1.mjs
//
//   # Insert prod
//   node --env-file=.env.local scripts/hilmy-curation/events-batch-1.mjs --confirm
// =====================================================================

const TEAM_USER_ID = "9c51573b-6e39-4bd1-b83a-612f9c5b665d";
const SOURCE = "hilmy_curation_batch_1_events";
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) { console.error("❌ env manquant"); process.exit(1); }

const CONFIRM = process.argv.includes("--confirm");

// Unsplash placeholders (licence libre : free to use, no attribution required)
const PHOTO = {
  conference: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1600",
  atelier:    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600",
  balade:     "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1600",
  inauguration: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=1600",
};

function slugify(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

// ─── 3 events vérifiés · source lausanne.ch/.../bureau-egalite/evenements.html
const EVENTS = [
  {
    title: "Atelier — Inégalités dans la prévoyance professionnelle",
    slug: `atelier-prevoyance-lausanne-${Math.random().toString(36).slice(2, 6)}`,
    description:
      "Soirée thématique organisée par le Bureau de l'égalité de la Ville de Lausanne autour des inégalités de prévoyance professionnelle. Format atelier, 2h au Casino de Montbenon. Gratuit, sans inscription. Une adresse à connaître pour comprendre les enjeux concrets de la retraite côté femmes. Info officielle via le Bureau de l'égalité de Lausanne.",
    event_type: "atelier",
    format: "presentiel",
    visibility: "public",
    start_date: "2026-04-21T18:30:00+02:00",
    end_date: "2026-04-21T20:30:00+02:00",
    country: "Suisse",
    region: "Vaud",
    city: "Lausanne",
    address: "Casino de Montbenon, Salon, Allée Ernest-Ansermet, 1003 Lausanne",
    online_link: null,
    flyer_url: PHOTO.atelier,
    external_signup_url:
      "https://www.lausanne.ch/portrait/cohesion-sociale/bureau-egalite/evenements.html",
    price_type: "gratuit",
    price_amount: null,
    price_currency: null,
    places_max: null,
  },
  {
    title: "Inauguration en l'honneur des femmes qui ont fait Lausanne",
    slug: `inauguration-femmes-lausanne-${Math.random().toString(36).slice(2, 6)}`,
    description:
      "Inauguration organisée par le Bureau de l'égalité de la Ville de Lausanne pour rendre hommage aux femmes qui ont marqué l'histoire de la ville. Place des Pionnières, gratuit, sans inscription. À marquer au calendrier si tu es à Lausanne ce jour-là.",
    event_type: "autre",
    format: "presentiel",
    visibility: "public",
    start_date: "2026-05-09T11:00:00+02:00",
    end_date: "2026-05-09T13:00:00+02:00",
    country: "Suisse",
    region: "Vaud",
    city: "Lausanne",
    address: "Place des Pionnières, 1003 Lausanne",
    online_link: null,
    flyer_url: PHOTO.inauguration,
    external_signup_url:
      "https://www.lausanne.ch/portrait/cohesion-sociale/bureau-egalite/evenements.html",
    price_type: "gratuit",
    price_amount: null,
    price_currency: null,
    places_max: null,
  },
  {
    title: "Balade — Sur les traces de Sophie Mercier",
    slug: `balade-sophie-mercier-${Math.random().toString(36).slice(2, 6)}`,
    description:
      "Promenade guidée organisée par le Zonta Club Lausanne dans l'histoire lausannoise au féminin. 2h de marche dans la ville, gratuit, sans inscription. Info officielle via le Bureau de l'égalité de Lausanne.",
    event_type: "autre",
    format: "presentiel",
    visibility: "public",
    start_date: "2026-06-07T14:00:00+02:00",
    end_date: "2026-06-07T16:00:00+02:00",
    country: "Suisse",
    region: "Vaud",
    city: "Lausanne",
    address: "Lausanne — point de rencontre via Bureau de l'égalité",
    online_link: null,
    flyer_url: PHOTO.balade,
    external_signup_url:
      "https://www.lausanne.ch/portrait/cohesion-sociale/bureau-egalite/evenements.html",
    price_type: "gratuit",
    price_amount: null,
    price_currency: null,
    places_max: null,
  },
];

// ─── Supabase insert ───────────────────────────────────────────────────
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function post(pathRel, rows) {
  const res = await fetch(`${SB}/rest/v1/${pathRel}`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathRel}: HTTP ${res.status} ${text}`);
  return JSON.parse(text);
}

async function main() {
  console.log(`🗓  Events batch 1 · ${EVENTS.length} events (source_import=${SOURCE})`);
  console.log(`   mode = ${CONFIRM ? "INSERT PROD" : "DRY-RUN (aucun insert — relance --confirm)"}`);
  console.log();

  console.log("╭─ PRÉVIEW ─────────────────────────────────────────────────");
  for (let i = 0; i < EVENTS.length; i++) {
    const e = EVENTS[i];
    console.log(`│ ${i + 1}. ${e.title}`);
    console.log(`│    📅 ${e.start_date.slice(0, 16).replace("T", " ")} · ${e.city}`);
    console.log(`│    📍 ${e.address}`);
    console.log(`│    ${e.description}`);
    console.log(`│    🔗 ${e.external_signup_url}`);
    console.log("│");
  }
  console.log("╰──────────────────────────────────────────────────────────");

  if (!CONFIRM) {
    console.log("\nℹ DRY-RUN. Relance avec --confirm pour insérer.");
    return;
  }

  const rows = EVENTS.map((e) => ({
    ...e,
    user_id: TEAM_USER_ID,
    status: "published",
    registration_mode: "info_only",
    source_import: SOURCE,
  }));
  console.log(`\n→ Insert ${rows.length} events…`);
  const inserted = await post("events", rows);
  console.log(`\n✅ ${inserted.length} events insérés :`);
  for (const e of inserted) {
    console.log(`   ${e.id}  ·  ${e.slug}  ·  ${e.start_date}`);
  }
}

main().catch((err) => { console.error("\n💥 FAILED:", err.message); process.exit(1); });
