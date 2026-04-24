// =====================================================================
// HILMY · Stage 8 · seed de lancement
// =====================================================================
// Usage :
//   node --env-file=.env.local scripts/seed-launch.mjs
//
// Insère 8 prestataires (approved), 8 lieux, 4 événements futurs.
// Idempotent : utilise upsert sur les slugs et google_place_id pour éviter
// les doublons. Les events utilisent le user_id de jihane.ess.maliki@gmail.com
// comme organisatrice par défaut (confirmé Stage 8).
// =====================================================================

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORGANISER_USER_ID = "79fbe5a3-2acb-4a2c-b111-004ad9f20548";

if (!URL || !KEY) {
  console.error("ERREUR : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
  process.exit(1);
}

const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function post(path, rows, onConflict) {
  const qs = onConflict ? `?on_conflict=${onConflict}` : "";
  const url = `${URL}/rest/v1/${path}${qs}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...H,
      Prefer: `resolution=merge-duplicates,return=representation`,
    },
    body: JSON.stringify(rows),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ ${path}: HTTP ${res.status}`);
    console.error(text);
    throw new Error(`Seed failed on ${path}`);
  }
  return JSON.parse(text);
}

async function deleteWhere(path, col, values) {
  if (!values.length) return;
  const list = values.map((v) => `"${v}"`).join(",");
  const url = `${URL}/rest/v1/${path}?${col}=in.(${encodeURIComponent(list)})`;
  const res = await fetch(url, { method: "DELETE", headers: H });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    console.error(`cleanup ${path}: ${res.status}`, text);
  }
}

// ─── Photos placeholder (Unsplash valides) ────────────────────────────
const PHOTO = {
  coachRoom: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200",
  therapyCouch: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200",
  beautySalon: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200",
  beautyFace: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200",
  yoga: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200",
  yoga2: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200",
  kidsPlay: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1200",
  kidsReading: "https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=1200",
  homeOrganize: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200",
  home2: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
  cuisine: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200",
  cuisineTable: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200",
  wedding: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200",
  wedding2: "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=1200",
  cafe1: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200",
  cafe2: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200",
  resto1: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200",
  spa1: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200",
  spa2: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=1200",
  boutique1: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200",
  boutique2: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200",
  museum: "https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=1200",
  brunch: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200",
  workshop: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200",
  bookclub: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200",
  wellness: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1200",
};

// ─── 8 prestataires ────────────────────────────────────────────────────
const prestataires = [
  {
    nom: "Clara Mercier",
    slug: "clara-mercier-coach-geneve",
    categorie: "sante-mentale",
    ville: "Geneve",
    tagline: "Remettre de la clarté là où tu en as besoin.",
    description:
      "Coach certifiée ICF, j'accompagne depuis 8 ans les femmes qui se sentent un peu perdues entre leurs ambitions, leurs doutes et le bruit ambiant. Les séances se passent dans mon cabinet à Plainpalais ou en visio — toi tu choisis ce qui te convient. Approche douce, directe quand il faut, toujours respectueuse de ton rythme.",
    whatsapp: "+41 79 234 56 78",
    email: "clara@claramercier.ch",
    instagram: "claramercier.coach",
    site_web: "https://claramercier.ch",
    services: [
      { nom: "Séance découverte", prix: "gratuit", duree: "30 min" },
      { nom: "Séance individuelle", prix: "180 CHF", duree: "60 min" },
      { nom: "Programme 6 séances", prix: "960 CHF", duree: "3 mois" },
    ],
    prix_from: 180,
    prix_gamme: "€€",
    devise: "CHF",
    galerie: [PHOTO.coachRoom, PHOTO.therapyCouch],
    photos: [PHOTO.coachRoom, PHOTO.therapyCouch],
  },
  {
    nom: "Élise Vidal",
    slug: "elise-vidal-therapeute-paris",
    categorie: "sante-mentale",
    ville: "Paris",
    tagline: "Écouter ce qui ne se dit pas.",
    description:
      "Psychologue clinicienne, spécialisée en thérapie brève et EMDR. J'accueille les femmes qui traversent un passage — burn-out, deuil, rupture, désir d'enfant qui se fait attendre. Cabinet dans le 11e, proche République. Premier échange téléphonique toujours gratuit pour voir si on s'accorde.",
    whatsapp: "+33 6 12 34 56 78",
    email: "elise.vidal@protonmail.com",
    instagram: "elisevidal.psy",
    site_web: null,
    services: [
      { nom: "Premier contact téléphonique", prix: "gratuit", duree: "15 min" },
      { nom: "Séance individuelle", prix: "95 EUR", duree: "50 min" },
      { nom: "Séance EMDR", prix: "130 EUR", duree: "75 min" },
    ],
    prix_from: 95,
    prix_gamme: "€€",
    devise: "EUR",
    galerie: [PHOTO.therapyCouch],
    photos: [PHOTO.therapyCouch],
  },
  {
    nom: "Nora Benkhaled",
    slug: "nora-benkhaled-esthetique-lausanne",
    categorie: "beaute",
    ville: "Lausanne",
    tagline: "La peau, traitée comme elle le mérite.",
    description:
      "Esthéticienne diplômée CAP + formation peaux sensibles et perimenopause, installée à Ouchy. Mon crédo : des soins pensés pour la peau que tu as aujourd'hui, pas celle qu'Instagram essaie de te vendre. Produits bio, gestes précis, lumière douce, musique discrète. On ressort apaisée, pas bluffée.",
    whatsapp: "+41 78 345 67 89",
    email: "nora@norabk.ch",
    instagram: "nora.bk.esthetique",
    site_web: "https://norabk.ch",
    services: [
      { nom: "Soin visage signature", prix: "140 CHF", duree: "75 min" },
      { nom: "Épilation au sucre jambes", prix: "65 CHF", duree: "30 min" },
      { nom: "Soin peau mature + lifting manuel", prix: "180 CHF", duree: "90 min" },
    ],
    prix_from: 65,
    prix_gamme: "€€",
    devise: "CHF",
    galerie: [PHOTO.beautySalon, PHOTO.beautyFace],
    photos: [PHOTO.beautySalon, PHOTO.beautyFace],
  },
  {
    nom: "Julia Roth",
    slug: "julia-roth-coach-sportive-geneve",
    categorie: "sport-nutrition",
    ville: "Geneve",
    tagline: "Bouger, sans se forcer à aimer ça.",
    description:
      "Ancienne athlète, coach sportive spécialisée pré/post-partum et femmes 40+. Je viens chez toi, en studio aux Bains ou en extérieur. L'idée : trouver la forme de mouvement qui te remet d'aplomb — pas celle qui coche la case 'bonne élève'. Programme adapté à ta tête autant qu'à tes muscles.",
    whatsapp: "+41 76 456 78 90",
    email: "julia@juliaroth.ch",
    instagram: "juliaroth.coach",
    site_web: null,
    services: [
      { nom: "Bilan + essai", prix: "80 CHF", duree: "60 min" },
      { nom: "Séance individuelle à domicile", prix: "130 CHF", duree: "60 min" },
      { nom: "Pack 10 séances", prix: "1200 CHF", duree: "2-3 mois" },
    ],
    prix_from: 80,
    prix_gamme: "€€€",
    devise: "CHF",
    galerie: [PHOTO.yoga, PHOTO.yoga2],
    photos: [PHOTO.yoga, PHOTO.yoga2],
  },
  {
    nom: "Amal Driss",
    slug: "amal-driss-nounou-bilingue-bruxelles",
    categorie: "enfants-famille",
    ville: "Bruxelles",
    tagline: "Garder les enfants comme s'ils étaient les tiens.",
    description:
      "10 ans d'expérience en garde d'enfants (0-12 ans), formation premiers secours à jour, bilingue français-arabe, anglais conversationnel. Je travaille avec 3 familles max pour rester vraiment présente. Disponible en semaine et certains weekends pour baby-sittings de soirée.",
    whatsapp: "+32 470 12 34 56",
    email: "amal.driss.garde@gmail.com",
    instagram: null,
    site_web: null,
    services: [
      { nom: "Garde régulière (à partir de 4h/semaine)", prix: "18 EUR/h", duree: "—" },
      { nom: "Baby-sitting ponctuel soirée", prix: "22 EUR/h", duree: "minimum 3h" },
      { nom: "Garde complète semaine", prix: "sur devis", duree: "—" },
    ],
    prix_from: 18,
    prix_gamme: "€€",
    devise: "EUR",
    galerie: [PHOTO.kidsPlay, PHOTO.kidsReading],
    photos: [PHOTO.kidsPlay, PHOTO.kidsReading],
  },
  {
    nom: "Sophie Carron",
    slug: "sophie-carron-home-organizer-geneve",
    categorie: "maison",
    ville: "Geneve",
    tagline: "Ton intérieur, allégé de tout ce qui ne te sert plus.",
    description:
      "Home organizer certifiée Konmari, j'interviens à domicile sur Genève et environs pour tout ce qui coince : dressing qui déborde, papiers qui traînent, pièce enfant qui ne tient plus debout. On trie ensemble, on range intelligemment, et je te laisse un système simple à maintenir. Premier rendez-vous gratuit pour faire le tour.",
    whatsapp: "+41 78 567 89 01",
    email: "sophie@espace-clair.ch",
    instagram: "sophie.espaceclair",
    site_web: "https://espace-clair.ch",
    services: [
      { nom: "Visite de découverte", prix: "gratuit", duree: "45 min" },
      { nom: "Demi-journée organisation", prix: "280 CHF", duree: "4h" },
      { nom: "Forfait refonte complète appartement", prix: "sur devis", duree: "2-4 jours" },
    ],
    prix_from: 280,
    prix_gamme: "€€€",
    devise: "CHF",
    galerie: [PHOTO.homeOrganize, PHOTO.home2],
    photos: [PHOTO.homeOrganize, PHOTO.home2],
  },
  {
    nom: "Mounia Kessal",
    slug: "mounia-kessal-traiteur-paris",
    categorie: "cuisine",
    ville: "Paris",
    tagline: "Nourrir vraiment les gens qu'on invite.",
    description:
      "Traiteuse privée, cuisine méditerranéenne et franco-levantine. Je m'occupe des dîners entre copines, des anniversaires pas tape-à-l'œil, des baby showers qui réchauffent. Tout est fait maison, pensé selon ce que tu aimes et ce que tes invité·es tolèrent. Paris et petite couronne.",
    whatsapp: "+33 6 34 56 78 90",
    email: "mounia@mounia-traiteur.fr",
    instagram: "mounia.table",
    site_web: "https://mounia-traiteur.fr",
    services: [
      { nom: "Menu dîner 6 personnes", prix: "à partir de 55 EUR/pers", duree: "—" },
      { nom: "Brunch maison 8-12 pers", prix: "40 EUR/pers", duree: "—" },
      { nom: "Événement sur-mesure", prix: "sur devis", duree: "—" },
    ],
    prix_from: 40,
    prix_gamme: "€€€",
    devise: "EUR",
    galerie: [PHOTO.cuisine, PHOTO.cuisineTable],
    photos: [PHOTO.cuisine, PHOTO.cuisineTable],
  },
  {
    nom: "Catherine Weber",
    slug: "catherine-weber-wedding-luxembourg",
    categorie: "evenementiel",
    ville: "Luxembourg",
    tagline: "Ton mariage, à ton image — pas à celle de Pinterest.",
    description:
      "Wedding planner indépendante depuis 12 ans, je travaille au Luxembourg, en Belgique et en Moselle. Mon approche : moins de décor, plus de sens. On commence toujours par deux heures de conversation pour comprendre ce qui compte vraiment pour toi, puis on bâtit quelque chose qui te ressemble — même si c'est petit, même si c'est atypique.",
    whatsapp: "+352 621 23 45 67",
    email: "catherine@atelier-weber.lu",
    instagram: "atelier.weber",
    site_web: "https://atelier-weber.lu",
    services: [
      { nom: "Consultation stratégique", prix: "350 EUR", duree: "3h" },
      { nom: "Coordination jour J", prix: "à partir de 1800 EUR", duree: "—" },
      { nom: "Organisation complète", prix: "à partir de 4500 EUR", duree: "6-12 mois" },
    ],
    prix_from: 350,
    prix_gamme: "€€€",
    devise: "EUR",
    galerie: [PHOTO.wedding, PHOTO.wedding2],
    photos: [PHOTO.wedding, PHOTO.wedding2],
  },
];

// ─── 8 lieux recommandés ──────────────────────────────────────────────
const places = [
  {
    slug: "birdie-cafe-geneve",
    name: "Birdie Café",
    description: "Café brunch hyper lumineux à Plainpalais, spécialité granola maison et bols saumon-avocat. Parfait pour un petit-déj tranquille ou un coup de cœur avec les copines.",
    address: "Rue des Bains 45, 1205 Genève",
    city: "Geneve",
    region: "Genève",
    country: "Suisse",
    latitude: 46.200418,
    longitude: 6.137728,
    google_category: "cafe",
    hilmy_category: "restos-cafes",
    main_photo_url: PHOTO.cafe1,
    photos: [PHOTO.cafe1],
  },
  {
    slug: "chez-clement-paris-10",
    name: "Chez Clément",
    description: "Petit bistrot de quartier dans le 10e, cuisine française simple et bien faite. Le genre d'adresse où on prend ses habitudes, où la patronne reconnaît ton prénom après deux visites.",
    address: "14 Rue Bichat, 75010 Paris",
    city: "Paris",
    region: "Île-de-France",
    country: "France",
    latitude: 48.872198,
    longitude: 2.367211,
    google_category: "restaurant",
    hilmy_category: "restos-cafes",
    main_photo_url: PHOTO.resto1,
    photos: [PHOTO.resto1],
  },
  {
    slug: "kawa-coffee-bruxelles",
    name: "Kawa Coffee",
    description: "Torréfacteur-café à Ixelles, grains éthiopiens sourcés en direct. Si tu aimes la méthode filtre bien faite, c'est là que ça se passe. Petite terrasse ensoleillée au printemps.",
    address: "Rue Lesbroussart 38, 1050 Bruxelles",
    city: "Bruxelles",
    region: "Bruxelles-Capitale",
    country: "Belgique",
    latitude: 50.828403,
    longitude: 4.366789,
    google_category: "coffee_shop",
    hilmy_category: "restos-cafes",
    main_photo_url: PHOTO.cafe2,
    photos: [PHOTO.cafe2],
  },
  {
    slug: "maison-de-lhydratation-lausanne",
    name: "Maison de l'Hydratation",
    description: "Spa hammam et soins corps à Ouchy, ambiance bois clair, vapeur et eucalyptus. Les soirées 'femmes seulement' du mercredi sont les plus tranquilles de la semaine.",
    address: "Avenue de Rhodanie 58, 1007 Lausanne",
    city: "Lausanne",
    region: "Vaud",
    country: "Suisse",
    latitude: 46.509344,
    longitude: 6.626267,
    google_category: "spa",
    hilmy_category: "bien-etre",
    main_photo_url: PHOTO.spa1,
    photos: [PHOTO.spa1],
  },
  {
    slug: "bains-bulgari-paris",
    name: "Bains Bulgari",
    description: "Spa hôtel avec piscine à remous, le dimanche tu peux y passer 3h avec un thé à la menthe pour moins de 80€. Silence d'or, serviettes moelleuses, et les dames du vestiaire qui t'appellent madame.",
    address: "30 Avenue George V, 75008 Paris",
    city: "Paris",
    region: "Île-de-France",
    country: "France",
    latitude: 48.869614,
    longitude: 2.300906,
    google_category: "spa",
    hilmy_category: "bien-etre",
    main_photo_url: PHOTO.spa2,
    photos: [PHOTO.spa2],
  },
  {
    slug: "atelier-nouage-geneve",
    name: "Atelier Nouage",
    description: "Boutique de créatrices suisses — céramique, bijoux, foulards teints à la main. Idéal pour un cadeau à soi-même ou à une copine qui compte. Jolie sélection jamais éphémère.",
    address: "Rue de la Corraterie 15, 1204 Genève",
    city: "Geneve",
    region: "Genève",
    country: "Suisse",
    latitude: 46.203554,
    longitude: 6.145921,
    google_category: "store",
    hilmy_category: "boutiques",
    main_photo_url: PHOTO.boutique1,
    photos: [PHOTO.boutique1],
  },
  {
    slug: "bric-a-brac-paris-11",
    name: "Bric-à-Brac Paris",
    description: "Concept store vintage + neuf à Charonne, sélection pointue seconde main et marques émergentes éthiques. La patronne conseille sans forcer la main, et le café offert est un vrai café.",
    address: "82 Rue de Charonne, 75011 Paris",
    city: "Paris",
    region: "Île-de-France",
    country: "France",
    latitude: 48.853921,
    longitude: 2.385812,
    google_category: "store",
    hilmy_category: "boutiques",
    main_photo_url: PHOTO.boutique2,
    photos: [PHOTO.boutique2],
  },
  {
    slug: "nouveau-musee-national-monaco",
    name: "Nouveau Musée National de Monaco — Villa Sauber",
    description: "Villa Belle Époque transformée en musée d'art contemporain, expositions intelligentes sans foule. Jardin en terrasse côté mer. Le café du musée sert un thé glacé digne de nom.",
    address: "17 Avenue Princesse Grace, 98000 Monaco",
    city: "Monaco",
    region: "Monaco",
    country: "Monaco",
    latitude: 43.745683,
    longitude: 7.430256,
    google_category: "museum",
    hilmy_category: "culturel",
    main_photo_url: PHOTO.museum,
    photos: [PHOTO.museum],
  },
];

// ─── 4 événements ─────────────────────────────────────────────────────
// Dates : on se base sur aujourd'hui (2026-04-17) + offsets réalistes.
const eventsData = [
  {
    slug: "brunch-entre-copines-geneve-avril-2026",
    title: "Brunch entre copines — édition Genève",
    description:
      "Trois heures au soleil autour d'une grande table, tarte maison, granola, café filtre et zéro networking forcé. On te pose une seule question en arrivant : qu'est-ce qui t'a fait du bien ce mois-ci ? Le reste vient tout seul. 18 places, prévoir un petit billet (20 CHF) pour couvrir les frais.",
    event_type: "brunch",
    format: "presentiel",
    visibility: "public",
    start_date: "2026-04-25T10:00:00+02:00",
    end_date: "2026-04-25T13:00:00+02:00",
    country: "Suisse",
    region: "Genève",
    city: "Geneve",
    address: "Un jardin privé — adresse envoyée aux inscrites la veille",
    price_type: "payant",
    price_amount: 20,
    price_currency: "CHF",
    places_max: 18,
    flyer_url: PHOTO.brunch,
  },
  {
    slug: "atelier-creatif-paris-mai-2026",
    title: "Atelier créatif — dessiner sans savoir dessiner",
    description:
      "Deux heures de gribouillage assumé, animées par Ophélie (illustratrice). Matériel fourni, débutantes absolues bienvenues — surtout elles, en fait. On repart avec trois dessins dont au moins un qu'on osera afficher. 12 places, goûter inclus.",
    event_type: "atelier",
    format: "presentiel",
    visibility: "public",
    start_date: "2026-05-02T15:00:00+02:00",
    end_date: "2026-05-02T17:30:00+02:00",
    country: "France",
    region: "Île-de-France",
    city: "Paris",
    address: "Atelier rue du Temple, 75003 Paris",
    price_type: "payant",
    price_amount: 35,
    price_currency: "EUR",
    places_max: 12,
    flyer_url: PHOTO.workshop,
  },
  {
    slug: "book-club-bruxelles-mai-2026",
    title: "Book club de printemps — Annie Ernaux",
    description:
      "On relit Les Années d'Annie Ernaux et on en discute, sans chichis, autour d'un verre. Pas besoin d'avoir tout fini, juste d'avoir envie d'en parler. L'animation est assurée par Sarah (libraire à Uccle) qui sait lancer les vraies conversations sans noyer le poisson.",
    event_type: "autre",
    format: "presentiel",
    visibility: "public",
    start_date: "2026-05-09T19:00:00+02:00",
    end_date: "2026-05-09T21:30:00+02:00",
    country: "Belgique",
    region: "Bruxelles-Capitale",
    city: "Bruxelles",
    address: "Librairie Les Yeux Gourmands, Saint-Gilles",
    price_type: "gratuit",
    price_amount: null,
    price_currency: null,
    places_max: 15,
    flyer_url: PHOTO.bookclub,
  },
  {
    slug: "conference-bien-etre-lausanne-mai-2026",
    title: "Conférence — Prendre soin de soi sans culpabiliser",
    description:
      "Intervention de Dr. Anaïs Pellet (médecin généraliste) et Clara Mercier (coach) sur le self-care qui marche vraiment — et celui qui ne sert qu'à vendre des bougies. 90 minutes de contenu, 30 minutes de Q&A, un sirop maison à l'arrivée.",
    event_type: "conference",
    format: "presentiel",
    visibility: "public",
    start_date: "2026-05-16T18:30:00+02:00",
    end_date: "2026-05-16T20:30:00+02:00",
    country: "Suisse",
    region: "Vaud",
    city: "Lausanne",
    address: "Centre culturel Pôle Sud, Avenue Jean-Jacques Mercier",
    price_type: "payant",
    price_amount: 25,
    price_currency: "CHF",
    places_max: 60,
    flyer_url: PHOTO.wellness,
  },
];

// ─── Exécution ────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Hilmy seed launch\n");

  // Idempotence : supprime d'abord les rows seed par slug (les uniques partiels
  // sur slug empêchent ON CONFLICT directement via PostgREST).
  console.log("→ Cleanup des slugs seed…");
  await deleteWhere("profiles", "slug", prestataires.map((p) => p.slug));
  await deleteWhere("places", "slug", places.map((p) => p.slug));
  await deleteWhere("events", "slug", eventsData.map((e) => e.slug));

  // 1. Prestataires
  console.log(`→ Insert ${prestataires.length} prestataires…`);
  const prestaRows = prestataires.map((p) => ({
    ...p,
    status: "approved",
    source_import: "manuel",
    approved_at: new Date().toISOString(),
    user_id: null,
  }));
  const insertedPresta = await post("profiles", prestaRows);
  console.log(`  ✓ ${insertedPresta.length} prestataires`);

  // 2. Places
  console.log(`→ Insert ${places.length} lieux…`);
  const insertedPlaces = await post("places", places);
  console.log(`  ✓ ${insertedPlaces.length} lieux`);

  // 3. Events (user_id obligatoire)
  console.log(`→ Insert ${eventsData.length} événements…`);
  const eventRows = eventsData.map((e) => ({
    ...e,
    user_id: ORGANISER_USER_ID,
    status: "published",
  }));
  const insertedEvents = await post("events", eventRows);
  console.log(`  ✓ ${insertedEvents.length} événements`);

  console.log("\n📊 Récap IDs :");
  console.log("\nPrestataires :");
  for (const p of insertedPresta) {
    console.log(`  ${p.id} · ${p.slug} · ${p.ville}`);
  }
  console.log("\nLieux :");
  for (const p of insertedPlaces) {
    console.log(`  ${p.id} · ${p.slug} · ${p.city}`);
  }
  console.log("\nÉvénements :");
  for (const e of insertedEvents) {
    console.log(`  ${e.id} · ${e.slug} · ${e.start_date}`);
  }

  console.log("\n✅ Seed terminé.");
}

main().catch((e) => {
  console.error("\n💥 SEED FAILED:", e.message);
  process.exit(1);
});
