// =====================================================================
// HILMY · Curation · Build dry-run pour batch 1 (30 recos)
// =====================================================================
// Lit candidates.json (produit par search-places.mjs), applique les
// commentaires voix Sara (option A : pas de détails fabriqués), et
// produit :
//   - dry-run.json  (payloads exactes places + recommendations)
//   - DRY-RUN-BATCH-1.md  (doc de revue pour validation humaine)
//
// Usage : node --env-file=.env.local scripts/hilmy-curation/build-dry-run.mjs
// =====================================================================

import fs from "node:fs";
import path from "node:path";

const TEAM_USER_ID = "9c51573b-6e39-4bd1-b83a-612f9c5b665d";
const BATCH = "hilmy_curation_batch_1";

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function randSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

// ─── Commentaires voix Sara (option A) · 1 par google_place_id ────────
// Règles : pas de détails staff/plats/interactions inventés. Oui aux infos
// vérifiables sur Google Places (type de cuisine, quartier, note).
// tags : contextuels (avec-enfants/en-couple/entre-copines/pour-le-boulot/
//        pour-une-occasion) + diet (halal/casher/vegetarien/vegan/sans-gluten)
//        seulement pour restos-cafes ET salons-the.
const COMMENTS = {
  // 1 · ANAR (Genève · Iranien/Afghan halal · vegetarian_restaurant)
  ChIJ8wdatfNljEcRSVCsMfaSpfs: {
    comment:
      "Cuisine iranienne et afghane à Genève, halal avec options végé. Très bien notée (★4.9, 370+ avis) — une belle option pour sortir du brunch classique, entre copines ou en famille.",
    rating: 5,
    tags: ["halal", "vegetarien", "entre-copines"],
    price_indicator: "€€",
  },
  // 2 · White Rabbit (Genève · brunch)
  ChIJg0yz4mNljEcRyMq2laPASvU: {
    comment:
      "Brunch installé sur le Bd Helvétique, carte soignée et très bon accueil d'après les avis (1800+). Pense à réserver le weekend.",
    rating: 5,
    tags: ["entre-copines", "en-couple"],
    price_indicator: "€€",
  },
  // 3 · Lily (Lausanne)
  ChIJYQE_UJUvjEcRDxIgVZFto0k: {
    comment:
      "Table lausannoise bien notée, ambiance soignée. Le genre d'adresse qu'on glisse au carnet pour un dîner tranquille entre copines.",
    rating: 5,
    tags: ["entre-copines", "en-couple"],
    price_indicator: "€€",
  },
  // 4 · after the rain spa (Genève · Florissant)
  ChIJa_bdHjR7jEcRPEUXZ_AVYVI: {
    comment:
      "Spa cosy côté Florissant, noté 5★ par ses clientes. Parfait pour une vraie pause, loin du spa d'hôtel tape-à-l'œil.",
    rating: 5,
    tags: ["entre-copines", "pour-une-occasion"],
    price_indicator: "€€",
  },
  // 5 · Beauty Cartel By Haneva (Genève · Eaux-Vives)
  ChIJvXt4gedljEcRmJVWUru19MU: {
    comment:
      "Institut beauté aux Eaux-Vives, noté 5★ sur Google. À ajouter au carnet pour soins visage et rituels esthétiques.",
    rating: 5,
    tags: [],
    price_indicator: "€€",
  },
  // 6 · Boulevard (Genève · librairie Carouge)
  ChIJOfz49NR6jEcRXuXPt4CMo8I: {
    comment:
      "Librairie indépendante sur Carouge. Bonne adresse pour flâner, bouquiner, repartir avec une découverte.",
    rating: 5,
    tags: [],
    price_indicator: null,
  },
  // 7 · L'Inopinée (Lausanne · librairie)
  ChIJ889L1pAvjEcRAEMAovMijcc: {
    comment:
      "Librairie lausannoise près de l'Av. de Rumine, notée 5★. Le genre d'endroit où tu entres pour une minute et tu ressors avec trois livres.",
    rating: 5,
    tags: [],
    price_indicator: null,
  },
  // 8 · La Boutique Saint-Pierre (Genève · vieille-ville)
  ChIJT0hexHRljEcRlSp1Q_znCDo: {
    comment:
      "Coin vieille-ville à Genève, mi-boutique cadeaux mi-petit plaisir sucré. Bonne adresse notée 5★ pour un cadeau à offrir (ou à soi).",
    rating: 5,
    tags: [],
    price_indicator: "€€",
  },
  // 9 · Café Jardin Specialty Coffee (Lausanne)
  ChIJtZCruq8vjEcR8U4R9hlqY7U: {
    comment:
      "Café de spécialité à Lausanne, place Benjamin-Constant. Si tu tiens à ton filtre bien tiré, c'est là.",
    rating: 5,
    tags: ["pour-le-boulot", "entre-copines"],
    price_indicator: "€",
  },
  // 10 · Luma café & more (Genève)
  "ChIJ-xIcH6JljEcRBZ0UIgbjdL0": {
    comment:
      "Café-bibliothèque-bar à Genève, ambiance douce le jour et plus feutrée le soir. Bien noté et bien pensé.",
    rating: 5,
    tags: ["pour-le-boulot", "entre-copines"],
    price_indicator: "€€",
  },
  // 11 · CCALM (Paris 4e Marais)
  ChIJk6d8saxv5kcR2COb5BoXYpo: {
    comment:
      "Petit resto dans le Marais, cuisine maison comme le nom l'annonce. Très bien noté — réserve avant de passer.",
    rating: 5,
    tags: ["entre-copines", "en-couple"],
    price_indicator: "€€",
  },
  // 12 · Nilo Coffee & Brunch (Paris 11e)
  "ChIJCYT3fyxt5kcR-7KIz9di_gg": {
    comment:
      "Brunch et café dans le 11e, côté Parmentier. Vibe coffee shop soignée, à prendre tôt le weekend.",
    rating: 5,
    tags: ["entre-copines"],
    price_indicator: "€€",
  },
  // 13 · Aux Bains Montorgueil Spa (Paris 2e)
  "ChIJVVWFPRhu5kcR2EKcvX6-j0Q": {
    comment:
      "Spa rue Montorgueil bien établi (★4.9, 1600+ avis). Prestations soins et massages, adresse sûre au cœur de Paris.",
    rating: 5,
    tags: ["entre-copines", "pour-une-occasion"],
    price_indicator: "€€€",
  },
  // 14 · L'Éden des Sens (Paris 10e)
  ChIJx7euOSNv5kcRlbg4Yya3pIo: {
    comment:
      "Centre bien-être dans le 10e, spécialisé soin visage (Biologique Recherche) et massages. Très bien noté (★4.9, 1300+ avis).",
    rating: 5,
    tags: ["pour-une-occasion"],
    price_indicator: "€€€",
  },
  // 15 · ARTSYMBOL (Paris 3e, place des Vosges)
  ChIJ6871BgBu5kcRzKZOzHZ40GU: {
    comment:
      "Galerie d'art place des Vosges. Pour une visite tranquille entre deux terrasses du Marais.",
    rating: 5,
    tags: [],
    price_indicator: null,
  },
  // 16 · Les Mots à la Bouche (Paris 11e, librairie)
  ChIJrYVf6AJu5kcRvDWUukjN5Qg: {
    comment:
      "Librairie indépendante et engagée, une institution parisienne. Sélection tranchée qui ne ressemble pas aux têtes de gondole des chaînes.",
    rating: 5,
    tags: [],
    price_indicator: null,
  },
  // 17 · Boutique We Are Paris (Paris 11e, Oberkampf)
  ChIJq6rOnQZu5kcR9DTDk3r8P6M: {
    comment:
      "Concept store Oberkampf, mix cadeaux-bijoux-beauté. Sélection pointue, 5★ Google — parfait pour trouver un cadeau à offrir (ou à se faire).",
    rating: 5,
    tags: [],
    price_indicator: "€€",
  },
  // 18 · LIV Coffee Shop (Paris 4e, Henri IV)
  "ChIJzZH35Nlz5kcRf_1_eB592EQ": {
    comment:
      "Coffee shop proche Bastille, bien noté avec énormément d'avis (1000+). Pour un café lisible et un moment tranquille.",
    rating: 5,
    tags: ["pour-le-boulot", "entre-copines"],
    price_indicator: "€",
  },
  // 19 · La Bonne Chère (Bruxelles centre)
  ChIJ51gfnXvEw0cR4Wue9q2JsoE: {
    comment:
      "Table bruxelloise du centre, très bien notée (★4.9, 485 avis). Pour un dîner soigné sans chichis.",
    rating: 5,
    tags: ["en-couple", "pour-une-occasion"],
    price_indicator: "€€€",
  },
  // 20 · Massage Brussels (Bruxelles, Rue de Flandre)
  ChIJr6KQfsTDw0cRgtrnIv8PjQ0: {
    comment:
      "Institut massage rue de Flandre à Bruxelles, noté 4.8★. Adresse confiance pour une pause détente en plein centre.",
    rating: 5,
    tags: ["entre-copines"],
    price_indicator: "€€",
  },
  // 21 · Le Point Du Jour (Bruxelles, Saint-Gilles)
  "ChIJt_ZrKS_Fw0cRUjiRJqy0vi4": {
    comment:
      "Librairie côté Saint-Gilles, petite mais bien triée. Parfaite pour flâner un dimanche après-midi.",
    rating: 4,
    tags: [],
    price_indicator: null,
  },
  // 22 · On and On (Bruxelles, Marché aux Herbes)
  ChIJy7ubEXjFw0cRa6Mum3qpdu8: {
    comment:
      "Boutique cadeaux en plein centre historique de Bruxelles. Sélection qui tient la route, 600+ avis convergent sur ★4.9.",
    rating: 5,
    tags: [],
    price_indicator: "€€",
  },
  // 23 · The Unusual (Bruxelles, Montagne aux Herbes)
  ChIJTzTjWcPDw0cRpaOOiuMdGgM: {
    comment:
      "Café-pâtisserie en plein centre de Bruxelles. Très bien noté, parfait pour une pause thé-gâteau l'après-midi.",
    rating: 5,
    tags: ["entre-copines"],
    price_indicator: "€€",
  },
  // 24 · GluFree Pancake (Luxembourg)
  ChIJJ5fKDxVJlUcRL3MxgDnsdGo: {
    comment:
      "Brunch 100% sans gluten à Luxembourg-ville — rare et précieux quand tu sors du schéma blé. Note excellente, file de l'emporter.",
    rating: 5,
    tags: ["sans-gluten", "entre-copines"],
    price_indicator: "€€",
  },
  // 25 · Librairie Alinea (Luxembourg)
  ChIJUwljfCtPlUcRuNlNHj5OJU0: {
    comment:
      "Librairie rue des Capucins à Luxembourg-ville, notée 4.8★. Adresse solide pour tes prochaines lectures.",
    rating: 5,
    tags: [],
    price_indicator: null,
  },
  // 26 · SOUVENIR (Luxembourg mode/bijoux)
  "ChIJM-NWbNFIlUcRGvb91nujUUA": {
    comment:
      "Boutique mode et bijoux au centre de Luxembourg. Sélection qui sort un peu des chaînes habituelles.",
    rating: 4,
    tags: [],
    price_indicator: "€€",
  },
  // 27 · SEIN (Zurich, Hohlstrasse)
  ChIJmYms8t0LkEcRb7TiLGQhFnc: {
    comment:
      "Adresse réputée à Zurich côté Hohlstrasse. Bonne note (★4.8) et bonne vibe — à tester si tu passes par la ville.",
    rating: 5,
    tags: ["entre-copines", "en-couple"],
    price_indicator: "€€",
  },
  // 28 · Home Massage Zürich (Zeltweg)
  ChIJAzcxYYoLkEcRMojMG2tmo5w: {
    comment:
      "Institut massage au Zeltweg à Zurich, noté 5★ avec beaucoup d'avis. Bonne adresse confiance pour relâcher.",
    rating: 5,
    tags: ["entre-copines"],
    price_indicator: "€€",
  },
  // 29 · TARA STYLE (Bern, Kramgasse)
  ChIJDw8883s5jkcRpJmjlXjNmo4: {
    comment:
      "Boutique mode-bijoux femme dans la vieille ville de Berne (Kramgasse). Bien notée, sélection de marques difficiles à trouver ailleurs.",
    rating: 5,
    tags: [],
    price_indicator: "€€",
  },
  // 30 · Chez Pierre (Monaco, Metropole Shopping)
  ChIJfdlaLgrDzRIRI4BvHF9Q72Y: {
    comment:
      "Bistrot français dans le centre Metropole à Monaco. Très bien noté (★4.9, 600+ avis) — bonne option pour un déjeuner sans te ruiner dans la ville.",
    rating: 5,
    tags: ["en-couple", "pour-une-occasion"],
    price_indicator: "€€",
  },
};

// ─── Build ─────────────────────────────────────────────────────────────
function main() {
  const data = JSON.parse(
    fs.readFileSync(path.resolve("scripts/hilmy-curation/candidates.json"), "utf8")
  );
  const placesPayload = [];
  const recosPayload = [];
  const missingComments = [];
  const missingGids = [];

  for (const p of data.all) {
    const gid = p.google_place_id;
    const spec = COMMENTS[gid];
    if (!spec || spec.comment === "PLACEHOLDER") {
      missingComments.push({ gid, name: p.name });
      continue;
    }
    const slug = `${slugify(p.name)}-${randSuffix()}`;
    placesPayload.push({
      google_place_id: gid,
      name: p.name,
      slug,
      address: p.address,
      city: p.city,
      region: p.region || null,
      country: p.country,
      latitude: p.latitude,
      longitude: p.longitude,
      google_category: p.google_category,
      hilmy_category: p.hilmy_category,
      main_photo_url: p.photo_url,
      photos: p.photo_url ? [p.photo_url] : [],
    });
    recosPayload.push({
      user_id: TEAM_USER_ID,
      type: "place",
      google_place_id_ref: gid, // temp helper for dry-run display only
      comment: spec.comment,
      rating: spec.rating,
      tags: spec.tags.length ? spec.tags : null,
      price_indicator: spec.price_indicator ?? null,
      photo_urls: null,
      status: "published",
      source_import: BATCH,
    });
  }

  // Verify : should have 30 of each
  console.log(`Places ready: ${placesPayload.length}/${data.all.length}`);
  console.log(`Recos ready : ${recosPayload.length}/${data.all.length}`);
  if (missingComments.length) {
    console.log(`\n⚠ ${missingComments.length} candidats sans commentaire :`);
    missingComments.forEach((m) => console.log(`  · ${m.gid}  ${m.name}`));
  }

  // Write JSON dry-run
  const outJson = path.resolve("scripts/hilmy-curation/dry-run.json");
  fs.writeFileSync(
    outJson,
    JSON.stringify({ places: placesPayload, recommendations: recosPayload }, null, 2)
  );
  console.log(`\n✅ JSON dry-run : ${outJson}`);

  // Write human-readable MD
  const md = buildMarkdown(data.all, placesPayload, recosPayload);
  const outMd = path.resolve("scripts/hilmy-curation/DRY-RUN-BATCH-1.md");
  fs.writeFileSync(outMd, md);
  console.log(`✅ Markdown dry-run : ${outMd}`);
}

function buildMarkdown(candidates, places, recos) {
  const recosByGid = new Map(recos.map((r) => [r.google_place_id_ref, r]));
  const placesByGid = new Map(places.map((p) => [p.google_place_id, p]));

  let md = `# Dry-run · Batch 1 — ${places.length} recommandations Équipe Hilmy\n\n`;
  md += `**Source import** : \`${BATCH}\`  |  **user_id** Équipe Hilmy : \`${TEAM_USER_ID}\`\n\n`;
  md += `Check avant insertion prod :\n`;
  md += `- [ ] Répartition géo OK (GE+LS 10 · Paris 8 · BXL 5 · LU 3 · ZH+BE 3 · MC 1)\n`;
  md += `- [ ] Répartition catégorie OK (Restos 8 · Spas 6 · Culturel 6 · Boutiques 5 · Cafés/Salons 5)\n`;
  md += `- [ ] Commentaires voix Sara option A (aucun détail fabriqué)\n`;
  md += `- [ ] Tags diet cohérents avec données Google Places\n`;
  md += `- [ ] Photos Google utilisables (photo_url non null)\n\n`;

  // Répartition check
  const byCity = {};
  const byCat = {};
  for (const p of places) {
    byCity[p.city] = (byCity[p.city] || 0) + 1;
    byCat[p.hilmy_category] = (byCat[p.hilmy_category] || 0) + 1;
  }
  md += `## Répartition effective\n\n`;
  md += `**Villes** : ${Object.entries(byCity).map(([c, n]) => `${c} ${n}`).join(" · ")}\n\n`;
  md += `**Catégories** : ${Object.entries(byCat).map(([c, n]) => `${c} ${n}`).join(" · ")}\n\n---\n\n`;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const r = recosByGid.get(p.google_place_id);
    md += `## ${i + 1}. ${p.name}\n\n`;
    md += `- **Ville / Pays** : ${p.city} · ${p.country}\n`;
    md += `- **Adresse** : ${p.address}\n`;
    md += `- **Catégorie HILMY** : \`${p.hilmy_category}\`  |  **Google** : ${p.google_category}\n`;
    const cand = candidates.find((c) => c.google_place_id === p.google_place_id);
    md += `- **Rating Google** : ★${cand.rating} (${cand.user_rating_count} avis)\n`;
    md += `- **Slug (temp)** : \`${p.slug}\`\n`;
    md += `- **Photo** : ${p.main_photo_url ? `[voir](${p.main_photo_url})` : "(aucune)"}\n`;
    md += `- **Maps** : ${cand.maps_url}\n\n`;
    md += `### Recommandation\n\n`;
    md += `- **Note Hilmy** : ${r.rating} ★\n`;
    md += `- **Tags** : ${(r.tags || []).length ? (r.tags || []).join(", ") : "(aucun)"}\n`;
    md += `- **Prix** : ${r.price_indicator || "(non renseigné)"}\n`;
    md += `- **Commentaire** :\n\n> ${r.comment}\n\n---\n\n`;
  }

  return md;
}

main();
