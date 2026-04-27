/**
 * Pricing & mailto helpers pour la page /tarifs.
 *
 * Décisions Jiji (batch 3.2 brief tarifs) :
 *  - Slug TS : 'cercle_pro' (avec underscore, cohérence DB + mobile),
 *    label visible : "Cercle Pro" (avec espace).
 *  - 4 durées : mensuel / 3m / 6m / 1an. Réductions -10% à 6m, -20% à 1an
 *    (exact pricing fourni dans la maquette HTML).
 *  - Mailto pour CTAs de commit uniquement ("Je choisis cette formule",
 *    "Je veux ma fiche"). Les CTAs de navigation ("Trouver ma formule",
 *    "Je tiens un lieu", etc.) restent en scroll vers les ancres.
 *  - Body lieu différent du body prestataire (cf brief Q4).
 */

export type Palier = 'standard' | 'premium' | 'cercle_pro';
export type Duree = 1 | 3 | 6 | 12;

export interface PricePoint {
  /** Prix mensuel équivalent (peut être décimal pour 6m/12m après remise) */
  m: number;
  /** Total facturé (null pour mensuel = paiement récurrent sans total fixe) */
  t: number | null;
}

export const PRICING: Record<Palier | 'lieu', Record<Duree, PricePoint>> = {
  standard: {
    1: { m: 19, t: null },
    3: { m: 18, t: 54 },
    6: { m: 17, t: 102 },
    12: { m: 15.17, t: 182 },
  },
  premium: {
    1: { m: 49, t: null },
    3: { m: 46.33, t: 139 },
    6: { m: 44, t: 264 },
    12: { m: 39.17, t: 470 },
  },
  cercle_pro: {
    1: { m: 99, t: null },
    3: { m: 94, t: 282 },
    6: { m: 89, t: 534 },
    12: { m: 79.17, t: 950 },
  },
  lieu: {
    1: { m: 39, t: null },
    3: { m: 36.67, t: 110 },
    6: { m: 35, t: 210 },
    12: { m: 31.17, t: 374 },
  },
};

export interface PalierInfo {
  name: string;
  tagline: string;
  features: string[];
  detail: string;
}

export const PALIER_INFO: Record<Palier, PalierInfo> = {
  standard: {
    name: 'Standard',
    tagline: "L'essentiel pour démarrer en douceur.",
    features: [
      "Ta fiche dans l'annuaire",
      '9 canaux de contact',
      '5 photos',
      'Avis des copines',
      'Total des vues',
      'Badge Standard',
    ],
    detail:
      "Tu démarres, tu testes, tu découvres ta clientèle. Standard te donne le strict nécessaire pour exister dans la team, sans surinvestir.",
  },
  premium: {
    name: 'Premium',
    tagline: 'Pour celles qui sont prêtes à grandir.',
    features: [
      'Tout le Standard +',
      'Dashboard détaillé',
      'Tap-to-contact tracé',
      '20 photos · 1 vidéo 60s',
      '-10% pour les Copines',
      'Stats hebdo',
      'Story trimestrielle',
      '2 boosts par an',
    ],
    detail:
      "Tu as une pratique établie. Tu veux des données pour piloter, des photos pour raconter, et un coup de pouce de visibilité quand t'en as besoin. Premium est calibrée pour ça.",
  },
  cercle_pro: {
    name: 'Cercle Pro',
    tagline: 'Pour celles prêtes à passer un cap.',
    features: [
      'Tout le Premium +',
      'Photos & vidéos illimitées',
      'Carrousel autoplay',
      'Devis express',
      'Mise en avant prio',
      'Pastille Sélection Hilmy',
      'Newsletter mensuelle',
      'Portrait éditorial',
      'Stats avancées',
      'Boosts illimités',
      'Support prioritaire',
    ],
    detail:
      'Tu veux exploser. Visibilité maximale, contenu sans limite, pilotage avancé, et tu accèdes au Cercle Pro avec un statut visible et une mise en avant éditoriale.',
  },
};

export const DUREE_OPTIONS: { value: Duree; label: string; discount: number }[] = [
  { value: 1, label: 'Mensuel', discount: 0 },
  { value: 3, label: '3 mois', discount: 0 },
  { value: 6, label: '6 mois', discount: 10 },
  { value: 12, label: '1 an', discount: 20 },
];

/** Phrase utilisée dans le body du mailto. */
export const DUREE_LABEL: Record<Duree, string> = {
  1: 'un mois',
  3: '3 mois',
  6: '6 mois',
  12: 'un an',
};

/** Phrase utilisée dans la card pour résumer le total payé. */
export const DUREE_PERIODE: Record<Duree, string> = {
  1: '',
  3: 'pour 3 mois',
  6: 'pour 6 mois',
  12: 'pour 1 an',
};

/** "19€" si entier, "39,17€" sinon. */
export function formatPrice(value: number): string {
  return Number.isInteger(value)
    ? `${value}€`
    : `${value.toFixed(2).replace('.', ',')}€`;
}

const HELLO = 'hilmy.io@hotmail.com';

/** Mailto pour les CTAs de commit prestataires (post-wizard ou switch). */
export function buildMailtoPalier(palier: Palier, duree: Duree): string {
  const name = PALIER_INFO[palier].name;
  const subject = `Je veux rejoindre la team Hilmy — ${name}`;
  const body = `Bonjour, je suis intéressée par la formule ${name} pour ${DUREE_LABEL[duree]}.`;
  return `mailto:${HELLO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Mailto pour le CTA Sélection Hilmy lieux. Body différent du prestataire
 *  (cf brief Q4 batch 3.2). */
export function buildMailtoLieu(duree: Duree): string {
  const subject = 'Je veux ma fiche Sélection Hilmy';
  const body = `Bonjour, je tiens un lieu et je veux ma fiche Sélection Hilmy pour ${DUREE_LABEL[duree]}.`;
  return `mailto:${HELLO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
