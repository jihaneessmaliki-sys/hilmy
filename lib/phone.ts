/**
 * Helpers téléphone / WhatsApp — format international (E.164).
 *
 * Objectif : un numéro WhatsApp doit être stocké en E.164 sans espaces
 * (ex: +33612345678) pour produire un lien wa.me valide quel que soit le
 * pays de la prestataire. Le lien wa.me exige des chiffres uniquement,
 * indicatif pays inclus, sans `+`, sans `0` national, sans espaces.
 *
 * - `COUNTRY_CODES` : liste complète des pays (drapeau + nom FR + indicatif),
 *   pays prioritaires de la communauté en tête, puis ordre alphabétique.
 * - `toE164(dial, national)` : compose un numéro E.164 propre depuis
 *   l'indicatif choisi au sélecteur + le numéro national saisi (retire le 0
 *   initial et tout espacement).
 * - `nationalDigits(s)` : chiffres du numéro national (sans 0 initial) — sert
 *   à valider la longueur minimale à l'inscription.
 * - `cleanWhatsappDigits(raw)` : normalise un numéro déjà stocké vers la
 *   suite de chiffres attendue par wa.me (retire un préfixe `00` international
 *   et un `0` national parasite après un indicatif connu). N'INVENTE jamais
 *   d'indicatif quand il manque (cas ambigu laissé tel quel).
 */

export interface Country {
  /** Drapeau emoji */
  flag: string
  /** Nom du pays en français */
  name: string
  /** Indicatif international avec `+` (ex: '+33') */
  dial: string
}

/**
 * Pays prioritaires (cible francophone + communauté), affichés en tête du
 * sélecteur dans cet ordre exact pour éviter le scroll.
 */
const PRIORITY_COUNTRIES: Country[] = [
  { flag: '🇫🇷', name: 'France', dial: '+33' },
  { flag: '🇨🇭', name: 'Suisse', dial: '+41' },
  { flag: '🇧🇪', name: 'Belgique', dial: '+32' },
  { flag: '🇱🇺', name: 'Luxembourg', dial: '+352' },
  { flag: '🇲🇦', name: 'Maroc', dial: '+212' },
  { flag: '🇩🇿', name: 'Algérie', dial: '+213' },
  { flag: '🇹🇳', name: 'Tunisie', dial: '+216' },
  { flag: '🇨🇦', name: 'Canada', dial: '+1' },
]

/**
 * Reste du monde (ISO 3166), ordre alphabétique par nom FR.
 * Les 8 pays prioritaires ci-dessus sont volontairement exclus d'ici pour
 * éviter les doublons.
 */
const OTHER_COUNTRIES: Country[] = [
  { flag: '🇦🇫', name: 'Afghanistan', dial: '+93' },
  { flag: '🇿🇦', name: 'Afrique du Sud', dial: '+27' },
  { flag: '🇦🇱', name: 'Albanie', dial: '+355' },
  { flag: '🇩🇪', name: 'Allemagne', dial: '+49' },
  { flag: '🇦🇩', name: 'Andorre', dial: '+376' },
  { flag: '🇦🇴', name: 'Angola', dial: '+244' },
  { flag: '🇦🇮', name: 'Anguilla', dial: '+1' },
  { flag: '🇦🇬', name: 'Antigua-et-Barbuda', dial: '+1' },
  { flag: '🇸🇦', name: 'Arabie saoudite', dial: '+966' },
  { flag: '🇦🇷', name: 'Argentine', dial: '+54' },
  { flag: '🇦🇲', name: 'Arménie', dial: '+374' },
  { flag: '🇦🇼', name: 'Aruba', dial: '+297' },
  { flag: '🇦🇺', name: 'Australie', dial: '+61' },
  { flag: '🇦🇹', name: 'Autriche', dial: '+43' },
  { flag: '🇦🇿', name: 'Azerbaïdjan', dial: '+994' },
  { flag: '🇧🇸', name: 'Bahamas', dial: '+1' },
  { flag: '🇧🇭', name: 'Bahreïn', dial: '+973' },
  { flag: '🇧🇩', name: 'Bangladesh', dial: '+880' },
  { flag: '🇧🇧', name: 'Barbade', dial: '+1' },
  { flag: '🇧🇿', name: 'Belize', dial: '+501' },
  { flag: '🇧🇯', name: 'Bénin', dial: '+229' },
  { flag: '🇧🇲', name: 'Bermudes', dial: '+1' },
  { flag: '🇧🇹', name: 'Bhoutan', dial: '+975' },
  { flag: '🇧🇾', name: 'Biélorussie', dial: '+375' },
  { flag: '🇧🇴', name: 'Bolivie', dial: '+591' },
  { flag: '🇧🇦', name: 'Bosnie-Herzégovine', dial: '+387' },
  { flag: '🇧🇼', name: 'Botswana', dial: '+267' },
  { flag: '🇧🇷', name: 'Brésil', dial: '+55' },
  { flag: '🇧🇳', name: 'Brunei', dial: '+673' },
  { flag: '🇧🇬', name: 'Bulgarie', dial: '+359' },
  { flag: '🇧🇫', name: 'Burkina Faso', dial: '+226' },
  { flag: '🇧🇮', name: 'Burundi', dial: '+257' },
  { flag: '🇰🇭', name: 'Cambodge', dial: '+855' },
  { flag: '🇨🇲', name: 'Cameroun', dial: '+237' },
  { flag: '🇨🇻', name: 'Cap-Vert', dial: '+238' },
  { flag: '🇨🇱', name: 'Chili', dial: '+56' },
  { flag: '🇨🇳', name: 'Chine', dial: '+86' },
  { flag: '🇨🇾', name: 'Chypre', dial: '+357' },
  { flag: '🇨🇴', name: 'Colombie', dial: '+57' },
  { flag: '🇰🇲', name: 'Comores', dial: '+269' },
  { flag: '🇨🇬', name: 'Congo-Brazzaville', dial: '+242' },
  { flag: '🇨🇩', name: 'Congo (RDC)', dial: '+243' },
  { flag: '🇰🇷', name: 'Corée du Sud', dial: '+82' },
  { flag: '🇰🇵', name: 'Corée du Nord', dial: '+850' },
  { flag: '🇨🇷', name: 'Costa Rica', dial: '+506' },
  { flag: '🇨🇮', name: "Côte d'Ivoire", dial: '+225' },
  { flag: '🇭🇷', name: 'Croatie', dial: '+385' },
  { flag: '🇨🇺', name: 'Cuba', dial: '+53' },
  { flag: '🇨🇼', name: 'Curaçao', dial: '+599' },
  { flag: '🇩🇰', name: 'Danemark', dial: '+45' },
  { flag: '🇩🇯', name: 'Djibouti', dial: '+253' },
  { flag: '🇩🇲', name: 'Dominique', dial: '+1' },
  { flag: '🇪🇬', name: 'Égypte', dial: '+20' },
  { flag: '🇸🇻', name: 'Salvador', dial: '+503' },
  { flag: '🇦🇪', name: 'Émirats arabes unis', dial: '+971' },
  { flag: '🇪🇨', name: 'Équateur', dial: '+593' },
  { flag: '🇪🇷', name: 'Érythrée', dial: '+291' },
  { flag: '🇪🇸', name: 'Espagne', dial: '+34' },
  { flag: '🇪🇪', name: 'Estonie', dial: '+372' },
  { flag: '🇸🇿', name: 'Eswatini', dial: '+268' },
  { flag: '🇺🇸', name: 'États-Unis', dial: '+1' },
  { flag: '🇪🇹', name: 'Éthiopie', dial: '+251' },
  { flag: '🇫🇯', name: 'Fidji', dial: '+679' },
  { flag: '🇫🇮', name: 'Finlande', dial: '+358' },
  { flag: '🇬🇦', name: 'Gabon', dial: '+241' },
  { flag: '🇬🇲', name: 'Gambie', dial: '+220' },
  { flag: '🇬🇪', name: 'Géorgie', dial: '+995' },
  { flag: '🇬🇭', name: 'Ghana', dial: '+233' },
  { flag: '🇬🇮', name: 'Gibraltar', dial: '+350' },
  { flag: '🇬🇷', name: 'Grèce', dial: '+30' },
  { flag: '🇬🇩', name: 'Grenade', dial: '+1' },
  { flag: '🇬🇱', name: 'Groenland', dial: '+299' },
  { flag: '🇬🇵', name: 'Guadeloupe', dial: '+590' },
  { flag: '🇬🇺', name: 'Guam', dial: '+1' },
  { flag: '🇬🇹', name: 'Guatemala', dial: '+502' },
  { flag: '🇬🇬', name: 'Guernesey', dial: '+44' },
  { flag: '🇬🇳', name: 'Guinée', dial: '+224' },
  { flag: '🇬🇼', name: 'Guinée-Bissau', dial: '+245' },
  { flag: '🇬🇶', name: 'Guinée équatoriale', dial: '+240' },
  { flag: '🇬🇾', name: 'Guyana', dial: '+592' },
  { flag: '🇬🇫', name: 'Guyane française', dial: '+594' },
  { flag: '🇭🇹', name: 'Haïti', dial: '+509' },
  { flag: '🇭🇳', name: 'Honduras', dial: '+504' },
  { flag: '🇭🇰', name: 'Hong Kong', dial: '+852' },
  { flag: '🇭🇺', name: 'Hongrie', dial: '+36' },
  { flag: '🇮🇳', name: 'Inde', dial: '+91' },
  { flag: '🇮🇩', name: 'Indonésie', dial: '+62' },
  { flag: '🇮🇶', name: 'Irak', dial: '+964' },
  { flag: '🇮🇷', name: 'Iran', dial: '+98' },
  { flag: '🇮🇪', name: 'Irlande', dial: '+353' },
  { flag: '🇮🇸', name: 'Islande', dial: '+354' },
  { flag: '🇮🇱', name: 'Israël', dial: '+972' },
  { flag: '🇮🇹', name: 'Italie', dial: '+39' },
  { flag: '🇯🇲', name: 'Jamaïque', dial: '+1' },
  { flag: '🇯🇵', name: 'Japon', dial: '+81' },
  { flag: '🇯🇪', name: 'Jersey', dial: '+44' },
  { flag: '🇯🇴', name: 'Jordanie', dial: '+962' },
  { flag: '🇰🇿', name: 'Kazakhstan', dial: '+7' },
  { flag: '🇰🇪', name: 'Kenya', dial: '+254' },
  { flag: '🇰🇬', name: 'Kirghizistan', dial: '+996' },
  { flag: '🇰🇮', name: 'Kiribati', dial: '+686' },
  { flag: '🇽🇰', name: 'Kosovo', dial: '+383' },
  { flag: '🇰🇼', name: 'Koweït', dial: '+965' },
  { flag: '🇱🇦', name: 'Laos', dial: '+856' },
  { flag: '🇱🇸', name: 'Lesotho', dial: '+266' },
  { flag: '🇱🇻', name: 'Lettonie', dial: '+371' },
  { flag: '🇱🇧', name: 'Liban', dial: '+961' },
  { flag: '🇱🇷', name: 'Liberia', dial: '+231' },
  { flag: '🇱🇾', name: 'Libye', dial: '+218' },
  { flag: '🇱🇮', name: 'Liechtenstein', dial: '+423' },
  { flag: '🇱🇹', name: 'Lituanie', dial: '+370' },
  { flag: '🇲🇴', name: 'Macao', dial: '+853' },
  { flag: '🇲🇰', name: 'Macédoine du Nord', dial: '+389' },
  { flag: '🇲🇬', name: 'Madagascar', dial: '+261' },
  { flag: '🇲🇾', name: 'Malaisie', dial: '+60' },
  { flag: '🇲🇼', name: 'Malawi', dial: '+265' },
  { flag: '🇲🇻', name: 'Maldives', dial: '+960' },
  { flag: '🇲🇱', name: 'Mali', dial: '+223' },
  { flag: '🇲🇹', name: 'Malte', dial: '+356' },
  { flag: '🇲🇵', name: 'Mariannes du Nord', dial: '+1' },
  { flag: '🇲🇦', name: 'Maroc', dial: '+212' },
  { flag: '🇲🇭', name: 'Marshall', dial: '+692' },
  { flag: '🇲🇶', name: 'Martinique', dial: '+596' },
  { flag: '🇲🇺', name: 'Maurice', dial: '+230' },
  { flag: '🇲🇷', name: 'Mauritanie', dial: '+222' },
  { flag: '🇾🇹', name: 'Mayotte', dial: '+262' },
  { flag: '🇲🇽', name: 'Mexique', dial: '+52' },
  { flag: '🇫🇲', name: 'Micronésie', dial: '+691' },
  { flag: '🇲🇩', name: 'Moldavie', dial: '+373' },
  { flag: '🇲🇨', name: 'Monaco', dial: '+377' },
  { flag: '🇲🇳', name: 'Mongolie', dial: '+976' },
  { flag: '🇲🇪', name: 'Monténégro', dial: '+382' },
  { flag: '🇲🇸', name: 'Montserrat', dial: '+1' },
  { flag: '🇲🇿', name: 'Mozambique', dial: '+258' },
  { flag: '🇲🇲', name: 'Birmanie (Myanmar)', dial: '+95' },
  { flag: '🇳🇦', name: 'Namibie', dial: '+264' },
  { flag: '🇳🇷', name: 'Nauru', dial: '+674' },
  { flag: '🇳🇵', name: 'Népal', dial: '+977' },
  { flag: '🇳🇮', name: 'Nicaragua', dial: '+505' },
  { flag: '🇳🇪', name: 'Niger', dial: '+227' },
  { flag: '🇳🇬', name: 'Nigeria', dial: '+234' },
  { flag: '🇳🇺', name: 'Niue', dial: '+683' },
  { flag: '🇳🇴', name: 'Norvège', dial: '+47' },
  { flag: '🇳🇨', name: 'Nouvelle-Calédonie', dial: '+687' },
  { flag: '🇳🇿', name: 'Nouvelle-Zélande', dial: '+64' },
  { flag: '🇴🇲', name: 'Oman', dial: '+968' },
  { flag: '🇺🇬', name: 'Ouganda', dial: '+256' },
  { flag: '🇺🇿', name: 'Ouzbékistan', dial: '+998' },
  { flag: '🇵🇰', name: 'Pakistan', dial: '+92' },
  { flag: '🇵🇼', name: 'Palaos', dial: '+680' },
  { flag: '🇵🇸', name: 'Palestine', dial: '+970' },
  { flag: '🇵🇦', name: 'Panama', dial: '+507' },
  { flag: '🇵🇬', name: 'Papouasie-Nouvelle-Guinée', dial: '+675' },
  { flag: '🇵🇾', name: 'Paraguay', dial: '+595' },
  { flag: '🇳🇱', name: 'Pays-Bas', dial: '+31' },
  { flag: '🇵🇪', name: 'Pérou', dial: '+51' },
  { flag: '🇵🇭', name: 'Philippines', dial: '+63' },
  { flag: '🇵🇱', name: 'Pologne', dial: '+48' },
  { flag: '🇵🇫', name: 'Polynésie française', dial: '+689' },
  { flag: '🇵🇷', name: 'Porto Rico', dial: '+1' },
  { flag: '🇵🇹', name: 'Portugal', dial: '+351' },
  { flag: '🇶🇦', name: 'Qatar', dial: '+974' },
  { flag: '🇷🇪', name: 'La Réunion', dial: '+262' },
  { flag: '🇷🇴', name: 'Roumanie', dial: '+40' },
  { flag: '🇬🇧', name: 'Royaume-Uni', dial: '+44' },
  { flag: '🇷🇺', name: 'Russie', dial: '+7' },
  { flag: '🇷🇼', name: 'Rwanda', dial: '+250' },
  { flag: '🇰🇳', name: 'Saint-Christophe-et-Niévès', dial: '+1' },
  { flag: '🇸🇲', name: 'Saint-Marin', dial: '+378' },
  { flag: '🇵🇲', name: 'Saint-Pierre-et-Miquelon', dial: '+508' },
  { flag: '🇻🇨', name: 'Saint-Vincent-et-les-Grenadines', dial: '+1' },
  { flag: '🇱🇨', name: 'Sainte-Lucie', dial: '+1' },
  { flag: '🇼🇸', name: 'Samoa', dial: '+685' },
  { flag: '🇸🇹', name: 'Sao Tomé-et-Principe', dial: '+239' },
  { flag: '🇸🇳', name: 'Sénégal', dial: '+221' },
  { flag: '🇷🇸', name: 'Serbie', dial: '+381' },
  { flag: '🇸🇨', name: 'Seychelles', dial: '+248' },
  { flag: '🇸🇱', name: 'Sierra Leone', dial: '+232' },
  { flag: '🇸🇬', name: 'Singapour', dial: '+65' },
  { flag: '🇸🇰', name: 'Slovaquie', dial: '+421' },
  { flag: '🇸🇮', name: 'Slovénie', dial: '+386' },
  { flag: '🇸🇴', name: 'Somalie', dial: '+252' },
  { flag: '🇸🇩', name: 'Soudan', dial: '+249' },
  { flag: '🇸🇸', name: 'Soudan du Sud', dial: '+211' },
  { flag: '🇱🇰', name: 'Sri Lanka', dial: '+94' },
  { flag: '🇸🇪', name: 'Suède', dial: '+46' },
  { flag: '🇸🇷', name: 'Suriname', dial: '+597' },
  { flag: '🇸🇾', name: 'Syrie', dial: '+963' },
  { flag: '🇹🇯', name: 'Tadjikistan', dial: '+992' },
  { flag: '🇹🇼', name: 'Taïwan', dial: '+886' },
  { flag: '🇹🇿', name: 'Tanzanie', dial: '+255' },
  { flag: '🇹🇩', name: 'Tchad', dial: '+235' },
  { flag: '🇨🇿', name: 'Tchéquie', dial: '+420' },
  { flag: '🇹🇭', name: 'Thaïlande', dial: '+66' },
  { flag: '🇹🇱', name: 'Timor oriental', dial: '+670' },
  { flag: '🇹🇬', name: 'Togo', dial: '+228' },
  { flag: '🇹🇰', name: 'Tokelau', dial: '+690' },
  { flag: '🇹🇴', name: 'Tonga', dial: '+676' },
  { flag: '🇹🇹', name: 'Trinité-et-Tobago', dial: '+1' },
  { flag: '🇹🇷', name: 'Turquie', dial: '+90' },
  { flag: '🇹🇲', name: 'Turkménistan', dial: '+993' },
  { flag: '🇹🇨', name: 'Turques-et-Caïques', dial: '+1' },
  { flag: '🇹🇻', name: 'Tuvalu', dial: '+688' },
  { flag: '🇺🇦', name: 'Ukraine', dial: '+380' },
  { flag: '🇺🇾', name: 'Uruguay', dial: '+598' },
  { flag: '🇻🇺', name: 'Vanuatu', dial: '+678' },
  { flag: '🇻🇦', name: 'Vatican', dial: '+379' },
  { flag: '🇻🇪', name: 'Venezuela', dial: '+58' },
  { flag: '🇻🇳', name: 'Viêt Nam', dial: '+84' },
  { flag: '🇼🇫', name: 'Wallis-et-Futuna', dial: '+681' },
  { flag: '🇾🇪', name: 'Yémen', dial: '+967' },
  { flag: '🇿🇲', name: 'Zambie', dial: '+260' },
  { flag: '🇿🇼', name: 'Zimbabwe', dial: '+263' },
]

/**
 * Liste finale affichée par le sélecteur : pays prioritaires en tête (ordre
 * imposé), puis tous les autres triés alphabétiquement (locale FR).
 */
export const COUNTRY_CODES: Country[] = [
  ...PRIORITY_COUNTRIES,
  ...OTHER_COUNTRIES.slice().sort((a, b) =>
    a.name.localeCompare(b.name, 'fr'),
  ),
]

/**
 * Indicatifs (sans `+`) connus du nettoyeur wa.me, triés du plus long au plus
 * court pour matcher correctement (ex: '352' avant '35'). On couvre au moins
 * les indicatifs prioritaires + quelques voisins européens fréquents.
 * Sert UNIQUEMENT à détecter/retirer un `0` national parasite collé après un
 * indicatif — jamais à deviner un indicatif manquant.
 */
const KNOWN_DIAL_DIGITS = [
  '352',
  '212',
  '213',
  '216',
  '351',
  '49',
  '39',
  '34',
  '44',
  '33',
  '41',
  '32',
  '1',
].sort((a, b) => b.length - a.length)

/** Chiffres du numéro national, 0 initial(aux) retiré(s). */
export function nationalDigits(national: string): string {
  return national.replace(/\D/g, '').replace(/^0+/, '')
}

/**
 * Compose un E.164 propre depuis l'indicatif choisi (ex: '+33') et le numéro
 * national saisi (ex: '06 12 34 56 78'). Retire espaces et 0 national initial.
 * Si l'utilisatrice a collé l'indicatif dans le champ national, on l'absorbe.
 */
export function toE164(dial: string, national: string): string {
  const cc = dial.replace(/\D/g, '')
  let n = national.replace(/\D/g, '')
  // tolère un préfixe international collé par erreur dans le champ national
  if (n.startsWith('00' + cc)) n = n.slice(2 + cc.length)
  else if (n.startsWith(cc) && n.length > cc.length + 4) n = n.slice(cc.length)
  n = n.replace(/^0+/, '')
  return `+${cc}${n}`
}

/**
 * Normalise un numéro stocké vers la suite de chiffres attendue par wa.me.
 * Répare les cas NON ambigus :
 *  - préfixe international `00` (ex: 0041… → 41…)
 *  - `0` national parasite juste après un indicatif connu (ex: 330760… → 33760…)
 * N'invente JAMAIS d'indicatif : un numéro national pur (06…, 079…) est
 * renvoyé tel quel (lien restera invalide → à corriger en base/à la saisie).
 */
export function cleanWhatsappDigits(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('+')) s = s.slice(1)
  else if (s.startsWith('00')) s = s.slice(2)
  let d = s.replace(/\D/g, '')
  for (const cc of KNOWN_DIAL_DIGITS) {
    if (d.startsWith(cc + '0')) {
      d = cc + d.slice(cc.length + 1)
      break
    }
  }
  return d
}
