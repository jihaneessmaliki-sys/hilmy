export type GooglePlaceResult = {
  placeId: string;
  nom: string;
  adresse: string;
  ville: string;
  pays: string;
  telephone: string;
  siteWeb: string;
  horaires: { jour: string; heures: string }[];
  note: number;
  avis: number;
  photos: string[];
  categorie: string;
};

export const googlePlacesSuggestions = [
  "Café Lila · Lausanne",
  "Maison Véronique · Paris",
  "Bain Turc de Carouge · Genève",
  "Atelier Mimi · Lyon",
  "Salon Margaux · Bruxelles",
  "Spa Lumina · Monaco",
  "Studio Pilates Beaulieu · Lausanne",
];

export const mockGooglePlace: GooglePlaceResult = {
  placeId: "ChIJ_mock_cafe_lila",
  nom: "Café Lila",
  adresse: "Rue de Bourg 12",
  ville: "Lausanne",
  pays: "Suisse",
  telephone: "+41 21 312 45 67",
  siteWeb: "www.cafelila.ch",
  horaires: [
    { jour: "Lundi", heures: "07:30 – 19:00" },
    { jour: "Mardi", heures: "07:30 – 19:00" },
    { jour: "Mercredi", heures: "07:30 – 19:00" },
    { jour: "Jeudi", heures: "07:30 – 21:00" },
    { jour: "Vendredi", heures: "07:30 – 21:00" },
    { jour: "Samedi", heures: "09:00 – 18:00" },
    { jour: "Dimanche", heures: "Fermé" },
  ],
  note: 4.7,
  avis: 213,
  photos: ["#EEE6D8", "#D4C5B0", "#C9A961", "#B8C7B0", "#E8D5B0", "#F5F0E6"],
  categorie: "Café · Brunch",
};

export type InstagramProfile = {
  username: string;
  nomComplet: string;
  bio: string;
  followers: number;
  posts: number;
  photoProfil: string;
  derniersPosts: { id: string; couleur: string; legende: string; likes: number }[];
};

export const mockInstagramProfile: InstagramProfile = {
  username: "anissa.hairstylist",
  nomComplet: "Anissa Karimi",
  bio: "Coloriste · Balayage californien · Lyon\nCabines intimistes, 1 cliente à la fois\n📩 hello@anissa-hair.fr",
  followers: 18400,
  posts: 347,
  photoProfil: "#C9A961",
  derniersPosts: [
    { id: "p1", couleur: "#E5D4AF", legende: "Balayage cuivré sur base châtain", likes: 847 },
    { id: "p2", couleur: "#C9A961", legende: "Avant / après — retour aux racines", likes: 1204 },
    { id: "p3", couleur: "#D4C5B0", legende: "Technique balayage à main levée", likes: 692 },
    { id: "p4", couleur: "#B8927A", legende: "Ombré blond vanille", likes: 1534 },
    { id: "p5", couleur: "#E8D5B0", legende: "Nuances miel pour l'été", likes: 978 },
    { id: "p6", couleur: "#8B6F47", legende: "Mahogany sur cheveux bouclés", likes: 1127 },
  ],
};

export type LinkedInProfile = {
  nom: string;
  prenom: string;
  titre: string;
  photoProfil: string;
  bio: string;
  localisation: string;
  experiences: { poste: string; entreprise: string; periode: string }[];
  formations: { diplome: string; ecole: string; annee: string }[];
  competences: string[];
};

export const mockLinkedInProfile: LinkedInProfile = {
  nom: "Moreau",
  prenom: "Claire",
  titre: "Coach certifiée ICF · Accompagnement des femmes en transition",
  photoProfil: "#D4C5B0",
  bio: "Coach ACC certifiée par l'International Coach Federation, j'accompagne depuis 8 ans des femmes à des tournants de vie — maternité, reconversion, couple, deuil. Mon approche combine coaching narratif, psychologie positive et outils somatiques. Je reçois en cabinet à Genève ou en visio partout dans le monde francophone.",
  localisation: "Genève, Suisse",
  experiences: [
    {
      poste: "Coach indépendante",
      entreprise: "Claire Moreau Coaching",
      periode: "Depuis 2018 · 8 ans",
    },
    {
      poste: "Consultante RH senior",
      entreprise: "Nestlé",
      periode: "2013 – 2018 · 5 ans",
    },
    {
      poste: "Chargée de recrutement",
      entreprise: "PwC Genève",
      periode: "2010 – 2013 · 3 ans",
    },
  ],
  formations: [
    {
      diplome: "Certification ACC · Coaching",
      ecole: "International Coach Federation",
      annee: "2018",
    },
    {
      diplome: "Master en psychologie du travail",
      ecole: "Université de Genève",
      annee: "2010",
    },
  ],
  competences: [
    "Coaching individuel",
    "Transitions de vie",
    "Maternité & carrière",
    "Psychologie positive",
    "Outils somatiques",
  ],
};

export type OnboardingMethode = "google" | "instagram" | "linkedin" | "manuel";

export const onboardingMethodes: {
  slug: OnboardingMethode;
  titre: string;
  accroche: string;
  ideal: string;
  duree: string;
  recommande?: boolean;
}[] = [
  {
    slug: "google",
    titre: "Depuis Google Places",
    accroche: "On récupère ton adresse, tes horaires et tes photos en deux clics.",
    ideal: "Restaurants, spas, salons, boutiques — tout lieu physique.",
    duree: "2 min",
    recommande: true,
  },
  {
    slug: "instagram",
    titre: "Depuis Instagram",
    accroche: "Ta bio, ta photo, tes six derniers posts — importés direct.",
    ideal: "Créatrices, influenceuses, marques. Compte Business ou Creator uniquement.",
    duree: "2 min",
  },
  {
    slug: "linkedin",
    titre: "Depuis LinkedIn",
    accroche: "Ton parcours pro reformaté version HILMY.",
    ideal: "Coachs, thérapeutes en ligne, consultantes, avocates.",
    duree: "3 min",
  },
  {
    slug: "manuel",
    titre: "Remplir manuellement",
    accroche: "Ligne par ligne, dans l'ordre. Si tu préfères tout contrôler.",
    ideal: "Si aucune des méthodes ci-dessus ne colle.",
    duree: "8 min",
  },
];
