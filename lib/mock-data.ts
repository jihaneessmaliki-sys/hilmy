// Champ libre : Hilmy couvre Suisse, France, Belgique, Luxembourg et Monaco —
// impossible d'être exhaustif. Cette liste est donnée en suggestions UI (datalist),
// pas en validation stricte.
// Stage 5 : LAUNCH_MODE boolean est désormais dérivé du flag central en
// constants.ts. Ne plus modifier ici — bascule via `LAUNCH_MODE` string
// dans lib/constants.ts ("mock" ↔ "live").
// Maintenu pour compat avec les pages qui l'importent encore.
import { LAUNCH_MODE as MODE_STRING } from "./constants";
export const LAUNCH_MODE: boolean = MODE_STRING === "mock";

export type Ville = string;

export const villesSuggestions: string[] = [
  // Suisse (sélection)
  "Genève",
  "Lausanne",
  "Zurich",
  "Berne",
  "Bâle",
  "Fribourg",
  "Neuchâtel",
  "Sion",
  "Montreux",
  "Nyon",
  // France (sélection)
  "Paris",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Toulouse",
  "Nantes",
  "Lille",
  "Strasbourg",
  "Nice",
  "Montpellier",
  "Rennes",
  "Annecy",
  // Belgique (sélection)
  "Bruxelles",
  "Anvers",
  "Liège",
  "Gand",
  "Namur",
  "Charleroi",
  // Luxembourg
  "Luxembourg",
  "Esch-sur-Alzette",
  // Monaco
  "Monaco",
  "Monte-Carlo",
];

// ─── Catégories alignées sur le schéma DB (profiles.categorie) ─────
// 10 catégories prestataires — CHECK constraint en base.
export const categoriesPrestataires = [
  { slug: "beaute", label: "Beauté", emoji: "❋" },
  { slug: "bien-etre", label: "Bien-être", emoji: "✿" },
  { slug: "sante-mentale", label: "Santé mentale", emoji: "◈" },
  { slug: "sport-nutrition", label: "Sport & Nutrition", emoji: "◎" },
  { slug: "enfants-famille", label: "Enfants & Famille", emoji: "☉" },
  { slug: "maison", label: "Maison", emoji: "◇" },
  { slug: "cuisine", label: "Cuisine", emoji: "❀" },
  { slug: "evenementiel", label: "Événementiel", emoji: "✦" },
  { slug: "mode-style", label: "Mode & Style", emoji: "❖" },
  { slug: "business-juridique", label: "Business & Juridique", emoji: "◆" },
] as const;

// 9 catégories lieux — CHECK constraint sur places.hilmy_category.
export const categoriesLieux = [
  { slug: "restos-cafes", label: "Restos & Cafés" },
  { slug: "salons-the", label: "Salons de thé" },
  { slug: "boutiques", label: "Boutiques" },
  { slug: "bien-etre", label: "Spas & Bien-être" },
  { slug: "enfants", label: "Sorties enfants" },
  { slug: "hebergements", label: "Hôtels & Séjours" },
  { slug: "sante", label: "Santé" },
  { slug: "culturel", label: "Lieux culturels" },
  { slug: "sport-nature", label: "Sport & Nature" },
] as const;

export type Avis = {
  prenom: string;
  avatar: string;
  note: number;
  date: string;
  texte: string;
};

export type Prestataire = {
  slug: string;
  nom: string;
  metier: string;
  categorie: string;
  ville: Ville;
  note: number;
  avis: number;
  prix: "€" | "€€" | "€€€";
  cover: string;
  tagline: string;
  bio: string;
  services: { nom: string; prix: string; duree: string }[];
  galerie: string[];
  tarifsDe: number;
  lesAvis?: Avis[];
  email?: string;
  telephone?: string;
  instagram?: string;
};

export const prestataires: Prestataire[] = [
  {
    slug: "claire-moreau",
    nom: "Claire Moreau",
    metier: "Coach de vie",
    categorie: "sante-mentale",
    ville: "Genève",
    note: 4.9,
    avis: 47,
    prix: "€€",
    cover: "#D4C5B0",
    tagline: "Remettre de la clarté là où tu en as besoin.",
    bio: "Coach certifiée ICF, j'accompagne des femmes à des tournants de leur vie — maternité, carrière, couple. Mon approche : beaucoup d'écoute, zéro jugement, et des outils concrets qui tiennent dans la vraie vie.",
    services: [
      { nom: "Séance découverte", prix: "Offerte", duree: "30 min" },
      { nom: "Séance individuelle", prix: "180 CHF", duree: "60 min" },
      { nom: "Parcours 6 séances", prix: "950 CHF", duree: "6 × 60 min" },
    ],
    galerie: ["#E5D4AF", "#D4C5B0", "#C9A961", "#EEE6D8"],
    tarifsDe: 180,
    email: "hello@clairemoreau.ch",
    telephone: "+41 22 123 45 67",
    instagram: "@claire.coaching",
    lesAvis: [
      {
        prenom: "Sophie",
        avatar: "#D4C5B0",
        note: 5,
        date: "il y a 3 semaines",
        texte: "Je suis sortie de sa première séance avec le sentiment d'avoir respiré pour la première fois depuis six mois. Claire a ce don rare de poser LA bonne question.",
      },
      {
        prenom: "Inès",
        avatar: "#C9A961",
        note: 5,
        date: "il y a 1 mois",
        texte: "J'ai fait son parcours 6 séances après ma reconversion. C'est elle qui m'a aidée à oser. Aujourd'hui je suis à mon compte — et je respire.",
      },
      {
        prenom: "Marine",
        avatar: "#B8C7B0",
        note: 4,
        date: "il y a 2 mois",
        texte: "Bienveillante, structurée, jamais dans le jargon. Elle te donne de vrais outils. Je recommande.",
      },
    ],
  },
  {
    slug: "sophie-laurent",
    nom: "Sophie Laurent",
    metier: "Thérapeute EMDR",
    categorie: "sante-mentale",
    ville: "Lausanne",
    note: 5.0,
    avis: 62,
    prix: "€€€",
    cover: "#B8C7B0",
    tagline: "Desserrer les nœuds du passé, pour respirer aujourd'hui.",
    bio: "Psychothérapeute formée à l'EMDR et à la thérapie des schémas. Je reçois en français et en anglais, en cabinet ou en visio. 12 ans de pratique, spécialisée sur les traumas complexes et le post-partum.",
    services: [
      { nom: "Première séance", prix: "220 CHF", duree: "75 min" },
      { nom: "Séance de suivi", prix: "180 CHF", duree: "50 min" },
      { nom: "Visio internationale", prix: "180 CHF", duree: "50 min" },
    ],
    galerie: ["#D4C5B0", "#EEE6D8", "#C9A961"],
    tarifsDe: 180,
    email: "contact@sophielaurent.ch",
    telephone: "+41 21 555 12 88",
    lesAvis: [
      {
        prenom: "Juliette",
        avatar: "#C9A961",
        note: 5,
        date: "il y a 1 semaine",
        texte: "J'ai tout essayé avant. Sophie est la première qui m'a vraiment aidée à avancer. Son approche EMDR a changé des choses que 10 ans de thérapie n'avaient pas dénoué.",
      },
      {
        prenom: "Léa",
        avatar: "#B8C7B0",
        note: 5,
        date: "il y a 1 mois",
        texte: "Post-partum difficile. Elle m'a rattrapée à temps. Je ne dirai jamais assez merci.",
      },
    ],
  },
  {
    slug: "juliette-faure",
    nom: "Juliette Faure",
    metier: "Naturopathe",
    categorie: "bien-etre",
    ville: "Paris",
    note: 4.8,
    avis: 89,
    prix: "€€",
    cover: "#E8D5B0",
    tagline: "Ton corps sait. Je l'aide juste à reprendre la parole.",
    bio: "Naturopathe certifiée, spécialiste de l'accompagnement féminin : cycle, post-partum, périménopause. Bilan complet + plan sur-mesure. Cabinet dans le Marais, consultations en visio partout dans le monde francophone.",
    services: [
      { nom: "Bilan initial", prix: "140 €", duree: "90 min" },
      { nom: "Suivi", prix: "80 €", duree: "45 min" },
      { nom: "Pack cycle & hormones", prix: "360 €", duree: "3 séances" },
    ],
    galerie: ["#EEE6D8", "#D4C5B0", "#C9A961", "#B8C7B0"],
    tarifsDe: 80,
    email: "juliette@naturopathie-paris.fr",
    instagram: "@juliette.naturopathe",
    lesAvis: [
      {
        prenom: "Anissa",
        avatar: "#C9A961",
        note: 5,
        date: "il y a 2 semaines",
        texte: "Enfin quelqu'un qui écoute vraiment. En 3 mois j'ai retrouvé un cycle stable et de l'énergie. Je ne comprends pas pourquoi personne ne m'avait parlé d'elle avant.",
      },
      {
        prenom: "Claire",
        avatar: "#D4C5B0",
        note: 5,
        date: "il y a 1 mois",
        texte: "Son protocole post-partum m'a sauvée. Et zéro culpabilisation, que des solutions douces.",
      },
      {
        prenom: "Marine",
        avatar: "#B8C7B0",
        note: 4,
        date: "il y a 3 mois",
        texte: "Juste pour le bilan initial — un moment suspendu. Elle prend le temps, elle explique. J'y retournerai.",
      },
    ],
  },
  {
    slug: "anissa-karimi",
    nom: "Anissa Karimi",
    metier: "Coloriste",
    categorie: "beaute",
    ville: "Lyon",
    note: 4.9,
    avis: 124,
    prix: "€€€",
    cover: "#C9A961",
    tagline: "Le balayage qui fait dire : 'tu as fait quoi ?'",
    bio: "Coloriste indépendante, passée par Dessange et formée au balayage californien. Salon intimiste, 1 cliente à la fois.",
    services: [
      { nom: "Balayage + coupe", prix: "180 €", duree: "3 h" },
      { nom: "Couleur racines", prix: "70 €", duree: "1 h 30" },
    ],
    galerie: ["#C9A961", "#E5D4AF", "#D4C5B0"],
    tarifsDe: 70,
  },
  {
    slug: "lea-benoit",
    nom: "Léa Benoit",
    metier: "Coach Pilates",
    categorie: "sport-nutrition",
    ville: "Bruxelles",
    note: 4.9,
    avis: 38,
    prix: "€€",
    cover: "#B8C7B0",
    tagline: "Post-partum, scoliose, sciatique : on remet ton corps en place.",
    bio: "Formation Polestar Pilates, spécialisée rééducation post-natale et troubles du plancher pelvien. Studio à Ixelles + visio.",
    services: [
      { nom: "Cours particulier", prix: "75 €", duree: "50 min" },
      { nom: "Pack 10 séances", prix: "680 €", duree: "10 × 50 min" },
    ],
    galerie: ["#B8C7B0", "#D4C5B0", "#EEE6D8"],
    tarifsDe: 75,
  },
  {
    slug: "marine-dupont",
    nom: "Marine Dupont",
    metier: "Diététicienne",
    categorie: "sport-nutrition",
    ville: "Genève",
    note: 4.7,
    avis: 53,
    prix: "€€",
    cover: "#EEE6D8",
    tagline: "On arrête les régimes. On apprend à s'écouter.",
    bio: "Diététicienne clinicienne, approche alimentation intuitive. Zéro balance, beaucoup d'écoute.",
    services: [
      { nom: "Bilan + plan", prix: "160 CHF", duree: "75 min" },
      { nom: "Suivi mensuel", prix: "90 CHF", duree: "40 min" },
    ],
    galerie: ["#EEE6D8", "#D4C5B0"],
    tarifsDe: 90,
  },
  {
    slug: "camille-rossi",
    nom: "Camille Rossi",
    metier: "Personal shopper",
    categorie: "mode-style",
    ville: "Monaco",
    note: 5.0,
    avis: 21,
    prix: "€€€",
    cover: "#D4C5B0",
    tagline: "Ton dressing, enfin à ton image.",
    bio: "Styliste et personal shopper, 12 ans chez Net-à-Porter. Je te remets à plat ton dressing, je t'accompagne en shopping, et on construit une garde-robe qui te ressemble.",
    services: [
      { nom: "Tri de dressing", prix: "350 €", duree: "3 h" },
      { nom: "Accompagnement shopping", prix: "450 €", duree: "4 h" },
    ],
    galerie: ["#D4C5B0", "#C9A961", "#EEE6D8"],
    tarifsDe: 350,
  },
  {
    slug: "me-fontaine",
    nom: "Me Élodie Fontaine",
    metier: "Avocate en droit de la famille",
    categorie: "business-juridique",
    ville: "Luxembourg",
    note: 4.9,
    avis: 34,
    prix: "€€€",
    cover: "#0F3D2E",
    tagline: "Divorce, garde, pension. On prend les décisions lucides.",
    bio: "Avocate au barreau de Luxembourg, spécialisation droit de la famille. Rendez-vous au cabinet ou en visio.",
    services: [
      { nom: "Consultation", prix: "250 €", duree: "60 min" },
      { nom: "Forfait dossier", prix: "Sur devis", duree: "Selon dossier" },
    ],
    galerie: ["#0F3D2E", "#D4C5B0", "#EEE6D8"],
    tarifsDe: 250,
  },
  {
    slug: "nora-meyer",
    nom: "Nora Meyer",
    metier: "Coach business",
    categorie: "business-juridique",
    ville: "Zurich",
    note: 4.8,
    avis: 46,
    prix: "€€€",
    cover: "#C9A961",
    tagline: "De l'idée à la facture. Et sans t'épuiser.",
    bio: "Ex-directrice commerciale, accompagne des fondatrices solos à structurer leur offre, leur pricing et leur prospection.",
    services: [
      { nom: "Audit + roadmap", prix: "780 CHF", duree: "2 × 90 min" },
      { nom: "Suivi trimestre", prix: "2 400 CHF", duree: "3 mois" },
    ],
    galerie: ["#C9A961", "#E5D4AF", "#D4C5B0"],
    tarifsDe: 780,
  },
];

export type Lieu = {
  slug: string;
  nom: string;
  categorie: string;
  ville: Ville;
  adresse: string;
  description: string;
  cover: string;
  galerie: string[];
  recommandePar: { prenom: string; avatar: string; date: string }[];
  commentaires: { prenom: string; avatar: string; texte: string; date: string }[];
};

export const lieux: Lieu[] = [
  {
    slug: "cafe-lila",
    nom: "Café Lila",
    categorie: "restos-cafes",
    ville: "Lausanne",
    adresse: "Rue de Bourg 12, 1003 Lausanne",
    description:
      "Le genre d'adresse où tu viens pour un thé et tu repars trois heures plus tard avec un livre et trois idées de carrière. Brunch le week-end, wifi stable, barista qui reconnaît ton prénom dès la deuxième visite.",
    cover: "#EEE6D8",
    galerie: ["#EEE6D8", "#D4C5B0", "#C9A961"],
    recommandePar: [
      { prenom: "Sophie", avatar: "#D4C5B0", date: "il y a 3 jours" },
      { prenom: "Claire", avatar: "#B8C7B0", date: "il y a 1 semaine" },
      { prenom: "Inès", avatar: "#C9A961", date: "il y a 2 semaines" },
    ],
    commentaires: [
      {
        prenom: "Sophie",
        avatar: "#D4C5B0",
        texte: "Le chai latte est le meilleur de la ville. Et le personnel est adorable.",
        date: "il y a 3 jours",
      },
      {
        prenom: "Claire",
        avatar: "#B8C7B0",
        texte: "Idéal pour bosser sans se sentir poussée dehors. Je viens tous les jeudis.",
        date: "il y a 1 semaine",
      },
    ],
  },
  {
    slug: "maison-veronique",
    nom: "Maison Véronique",
    categorie: "restos-cafes",
    ville: "Paris",
    adresse: "14 rue de Bretagne, 75003 Paris",
    description:
      "Une table de quartier tenue par trois sœurs. Cuisine de saison, cave confidentielle, 18 couverts. On réserve deux semaines à l'avance mais ça vaut le coup.",
    cover: "#D4C5B0",
    galerie: ["#D4C5B0", "#C9A961", "#EEE6D8"],
    recommandePar: [
      { prenom: "Anissa", avatar: "#C9A961", date: "il y a 4 jours" },
      { prenom: "Juliette", avatar: "#E8D5B0", date: "il y a 2 semaines" },
    ],
    commentaires: [
      {
        prenom: "Anissa",
        avatar: "#C9A961",
        texte: "Le menu du midi à 34€, c'est du vol — dans le bon sens.",
        date: "il y a 4 jours",
      },
    ],
  },
  {
    slug: "bain-turc-carouge",
    nom: "Bain Turc de Carouge",
    categorie: "bien-etre",
    ville: "Genève",
    adresse: "Rue Ancienne 32, 1227 Carouge",
    description:
      "Petit hammam traditionnel tenu par Leïla. Gommage au savon noir, massage, thé à la menthe. Deux heures et tu ressors neuve.",
    cover: "#B8C7B0",
    galerie: ["#B8C7B0", "#EEE6D8", "#D4C5B0"],
    recommandePar: [
      { prenom: "Claire", avatar: "#D4C5B0", date: "il y a 1 semaine" },
      { prenom: "Nora", avatar: "#C9A961", date: "il y a 3 semaines" },
    ],
    commentaires: [],
  },
  {
    slug: "atelier-mimi",
    nom: "Atelier Mimi",
    categorie: "boutiques",
    ville: "Lyon",
    adresse: "8 rue Royale, 69001 Lyon",
    description:
      "Boutique de créatrices françaises et belges. Petites séries, beaux tissus, prix honnêtes. La propriétaire, Aïcha, t'aide à trouver sans jamais pousser à l'achat.",
    cover: "#E8D5B0",
    galerie: ["#E8D5B0", "#C9A961"],
    recommandePar: [
      { prenom: "Camille", avatar: "#D4C5B0", date: "il y a 5 jours" },
    ],
    commentaires: [],
  },
  {
    slug: "hotel-grand-parc",
    nom: "Hôtel du Grand Parc",
    categorie: "hebergements",
    ville: "Monaco",
    adresse: "Avenue du Grand Parc, 98000 Monaco",
    description:
      "Pas le plus clinquant mais le plus reposant. Chambres côté jardin, spa calme, petit-déj' servi jusqu'à 11h.",
    cover: "#0F3D2E",
    galerie: ["#0F3D2E", "#D4C5B0", "#EEE6D8"],
    recommandePar: [{ prenom: "Sophie", avatar: "#B8C7B0", date: "il y a 1 mois" }],
    commentaires: [],
  },
  {
    slug: "fondation-beyeler",
    nom: "Fondation Beyeler",
    categorie: "culturel",
    ville: "Zurich",
    adresse: "Baselstrasse 101, 4125 Riehen",
    description:
      "Pas Zurich, Riehen — mais ça vaut le détour. Expos temporaires toujours fortes, jardin de Louisa Bourgeois, café avec vue.",
    cover: "#EEE6D8",
    galerie: ["#EEE6D8", "#B8C7B0"],
    recommandePar: [],
    commentaires: [],
  },
];

export type Evenement = {
  slug: string;
  titre: string;
  date: string;
  dateRelative: string;
  lieu: string;
  ville: Ville;
  categorie: string;
  description: string;
  organisatrice: string;
  cover: string;
  flyer?: string | null;
  places: number;
  inscrites: number;
};

export const evenements: Evenement[] = [
  {
    slug: "cercle-janvier-geneve",
    titre: "Cercle des copines — Soirée lecture",
    date: "14 mai 2026 · 19h30",
    dateRelative: "dans 3 semaines",
    lieu: "Café Lila",
    ville: "Lausanne",
    categorie: "Culture",
    description:
      "On choisit un livre ensemble, on le lit, et on se retrouve pour en parler autour d'un verre. Ce mois-ci : 'Betty' de Tiffany McDaniel.",
    organisatrice: "Sara & Claire",
    cover: "#D4C5B0",
    places: 20,
    inscrites: 14,
  },
  {
    slug: "brunch-mai-paris",
    titre: "Brunch des fondatrices",
    date: "22 mai 2026 · 11h",
    dateRelative: "dans 5 semaines",
    lieu: "Maison Véronique",
    ville: "Paris",
    categorie: "Business",
    description:
      "12 fondatrices autour d'une table. Pas de pitch, pas de cartes. Juste des vraies conversations sur ce qui marche (et ce qui casse).",
    organisatrice: "Nora Meyer",
    cover: "#C9A961",
    places: 12,
    inscrites: 12,
  },
  {
    slug: "yoga-lac-leman",
    titre: "Yoga au bord du lac",
    date: "8 juin 2026 · 8h",
    dateRelative: "dans 7 semaines",
    lieu: "Parc de la Grange",
    ville: "Genève",
    categorie: "Bien-être",
    description:
      "Ashtanga doux face au Léman. Café et pain au levain offerts après la séance. Amène ton tapis.",
    organisatrice: "Léa Benoit",
    cover: "#B8C7B0",
    places: 25,
    inscrites: 18,
  },
  {
    slug: "atelier-finances-bruxelles",
    titre: "Atelier : Parler d'argent sans malaise",
    date: "15 juin 2026 · 18h",
    dateRelative: "dans 8 semaines",
    lieu: "Tiers-lieu Femmes Actives",
    ville: "Bruxelles",
    categorie: "Business",
    description:
      "Négocier son salaire, fixer ses tarifs, parler pognon avec son mec. 2h, 3 intervenantes, zéro langue de bois.",
    organisatrice: "Collectif HILMY",
    cover: "#0F3D2E",
    places: 30,
    inscrites: 22,
  },
  {
    slug: "cine-club-monaco",
    titre: "Ciné-club : Réalisatrices arabes",
    date: "29 juin 2026 · 20h",
    dateRelative: "dans 10 semaines",
    lieu: "Cinéma des Beaux-Arts",
    ville: "Monaco",
    categorie: "Culture",
    description:
      "Projection de 'Les Filles d'Olfa' de Kaouther Ben Hania, suivie d'un échange.",
    organisatrice: "Inès Tazi",
    cover: "#EEE6D8",
    places: 40,
    inscrites: 9,
  },
];

export type Temoignage = {
  prenom: string;
  age: number;
  ville: Ville;
  metier: string;
  citation: string;
  avatar: string;
};

export const temoignages: Temoignage[] = [
  {
    prenom: "Sara",
    age: 34,
    ville: "Genève",
    metier: "Architecte d'intérieur",
    citation:
      "J'ai trouvé ma thérapeute ici. Celle qui m'a aidée à divorcer sans me perdre. HILMY, c'est pas une app — c'est un filet.",
    avatar: "#D4C5B0",
  },
  {
    prenom: "Inès",
    age: 41,
    ville: "Paris",
    metier: "Fondatrice d'un studio créatif",
    citation:
      "Quand j'ai déménagé à Paris, j'ai refait ma vie en trois semaines grâce aux recos. Coiffeuse, pédiatre, appart : tout.",
    avatar: "#C9A961",
  },
  {
    prenom: "Juliette",
    age: 29,
    ville: "Lausanne",
    metier: "Avocate",
    citation:
      "J'ai testé trois apps de recommandations. Aucune ne tient la route. Ici, c'est vraiment entre nous.",
    avatar: "#B8C7B0",
  },
];

/* ────────────── Utilisatrice connectée (mock Sara) ────────────── */
export const currentUser = {
  prenom: "Sara",
  nom: "Gasperini",
  email: "sara@example.com",
  ville: "Genève",
  avatar: "#D4C5B0",
  membreDepuis: "avril 2026",
  bio: "Architecte d'intérieur, 34 ans. Je cherche les adresses qui ne s'affichent pas sur Google.",
};

export const userStats = {
  favoris: 12,
  recommandationsPostees: 3,
  evenementsSauvegardes: 4,
  evenementsInscrite: 2,
};

// Slugs favoris (références aux prestataires/lieux existants)
export const userFavorisPrestataires = [
  "claire-moreau",
  "sophie-laurent",
  "juliette-faure",
  "anissa-karimi",
  "lea-benoit",
];
export const userFavorisLieux = [
  "cafe-lila",
  "bain-turc-carouge",
  "maison-veronique",
];
export const userRecommandationsPostees = ["cafe-lila", "atelier-mimi"];
export const userEvenementsSauvegardes = [
  "cercle-janvier-geneve",
  "yoga-lac-leman",
  "atelier-finances-bruxelles",
];
export const userEvenementsInscrites = [
  "cercle-janvier-geneve",
  "brunch-mai-paris",
];

/* ────────────── Prestataire connectée (mock Claire Moreau) ────────────── */
export const currentPrestataire = {
  slug: "claire-moreau",
  prenom: "Claire",
  plan: "premium", // "free" | "premium"
};

// Dernière activité pour dashboard
export const prestaRecentActivity = [
  { date: "il y a 2 heures", label: "Nouvelle vue sur ta fiche depuis Genève" },
  { date: "il y a 5 heures", label: "Sophie a sauvegardé ton profil" },
  { date: "il y a 1 jour", label: "Nouvel avis ★★★★★ de Inès" },
  { date: "il y a 2 jours", label: "3 clics sur ton email de contact" },
];

export const prestaStats = {
  vuesFiche: [
    { jour: "Lun", vues: 34 },
    { jour: "Mar", vues: 52 },
    { jour: "Mer", vues: 41 },
    { jour: "Jeu", vues: 68 },
    { jour: "Ven", vues: 73 },
    { jour: "Sam", vues: 48 },
    { jour: "Dim", vues: 29 },
  ],
  clicsContact: 18,
  demandesEnAttente: 3,
  nouveauxAvis: 2,
  tauxConversion: 12,
};

// 30 jours de vues (line chart)
export const prestaVues30j = Array.from({ length: 30 }).map((_, i) => {
  const base = 20 + Math.round(Math.abs(Math.sin(i / 3)) * 40);
  const noise = Math.round(((i * 7) % 17) - 7);
  const vues = Math.max(5, base + noise);
  const jour = new Date(2026, 3, 1 + i).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
  return { jour, vues };
});

// Sources de trafic (bar chart)
export const prestaSources = [
  { source: "Annuaire", clics: 147 },
  { source: "Recommandations", clics: 89 },
  { source: "Direct", clics: 54 },
  { source: "Recherche", clics: 38 },
  { source: "Partage", clics: 21 },
];

// Avis du prestataire connecté (reprend lesAvis de claire-moreau)
export const prestaEvenements = [
  {
    titre: "Atelier : Reprendre son souffle",
    date: "22 juin 2026",
    places: 12,
    inscrites: 8,
    statut: "En cours",
  },
  {
    titre: "Masterclass : Négocier sans céder",
    date: "15 mai 2026",
    places: 20,
    inscrites: 20,
    statut: "Complet",
  },
];
