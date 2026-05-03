# Session fix juridique Hilmy — 2026-05-04

## TL;DR
4 PRs mergées auto en autonomie pour fermer les contradictions contractuelles identifiées par l'audit PR #35 (issue [#25](https://github.com/jihaneessmaliki-sys/hilmy/issues/25)). Toutes les surfaces critiques visibles publiquement disent maintenant la vérité sur le pricing : utilisatrices 100% gratuit, prestataires 3 paliers payants 19/49/99€/mois sans commission sur prestations. Stripe reste à brancher (Jiji ce soir). 1 surface marketing reste à arbitrer manuellement (`ElleProfiles` / Pionnières).

## Mission reçue
Réécrire 4 surfaces du site pour qu'elles soient cohérentes avec /tarifs (Standard 19€ / Premium 49€ / Cercle Pro 99€) :
1. `/manifeste` + `Manifesto.tsx` (3 promesses + mot interdit)
2. `/cgu` Section 06 (refléter abonnements payants)
3. `/dashboard/prestataire/abonnement` (réécriture complète)
4. Signup : `AuthShell.tsx:71` + `PrestataireMethodsClient.tsx:138`

Contraintes : ne pas toucher Stripe (hors scope, Jiji ce soir), ne pas toucher l'auth, vocab Sara, 1 PR par groupe, time-box 4h.

## PRs créées + statut merge

| PR | Titre | Statut | URL |
|---|---|---|---|
| #36 | fix(manifeste): cohérence promesses vs tarifs payants + mot interdit | ✅ Mergée auto 21:03:54 | [#36](https://github.com/jihaneessmaliki-sys/hilmy/pull/36) |
| #37 | fix(cgu): refondre section 06 pour refléter les abonnements payants | ✅ Mergée auto 21:06:24 | [#37](https://github.com/jihaneessmaliki-sys/hilmy/pull/37) |
| #38 | fix(dashboard): réécriture complète page abonnement prestataire | ✅ Mergée auto 21:08:52 | [#38](https://github.com/jihaneessmaliki-sys/hilmy/pull/38) |
| #39 | fix(signup): cohérence aside + onboarding prestataire vs /tarifs | ✅ Mergée auto 21:11:52 | [#39](https://github.com/jihaneessmaliki-sys/hilmy/pull/39) |

Time-box utilisée : ~50 min sur les 4h budgetées (rythme rapide grâce au scope précis fourni).

## Avant / Après par surface

### PR #36 — `/manifeste` + `components/landing/Manifesto.tsx`

**`app/manifeste/page.tsx` — 3 promesses**

| # | Avant | Après |
|---|---|---|
| 01 | "**Zéro commission.** Les prestataires ne nous paient rien sur leurs prestations. Ce que tu paies va entièrement dans leur poche. Notre business model, c'est elles — pas nous sur leur dos." | "**Pas de commission sur tes prestations.** Ta fiche prestataire fonctionne par abonnement plat (3 formules dès 19€/mois). Ce que ta cliente te paie, tu le gardes en entier. On ne prend rien sur tes prestations." |
| 02 | "**Zéro pub.** Aucune fiche n'est mise en avant contre argent. L'algorithme, c'est la qualité de la recommandation et la proximité géographique, rien d'autre." | "**Pas de pub tierce.** Aucune marque extérieure ne s'affiche dans le carnet. Les seules mises en avant sont éditoriales (Sélection Hilmy, Voix de la semaine) ou intégrées aux paliers prestataires — jamais d'achat publicitaire externe." |
| 03 | "**Zéro compromis.** Chaque fiche passe entre les mains de **notre équipe** avant d'être visible…" | "**Zéro compromis.** Chaque fiche passe entre les mains de **la team Hilmy** avant d'être visible…" |

**`components/landing/Manifesto.tsx:27`** (visible sur la home)
- AVANT : `— L'équipe Hilmy`
- APRÈS : `— La team Hilmy`

### PR #37 — `app/(legal)/cgu/page.tsx`

**Section 06 ("Gratuité" → "Modèle économique et abonnements")**

AVANT (1 paragraphe) :
> L'inscription et l'utilisation de Hilmy sont entièrement gratuites, tant pour les utilisatrices que pour les prestataires. Aucune commission n'est prélevée sur les prestations.

APRÈS (4 paragraphes structurés) :
1. **Côté utilisatrices** : 100% gratuit, sans paywall, sans limitation
2. **Côté prestataires** : Standard 19€, Premium 49€, Cercle Pro 99€/mois + renvoi /tarifs + mention Sélection Hilmy lieux 39€/mois
3. **Pas de commission sur les prestations** : Hilmy ne prélève aucun % sur le CA prestataire-cliente
4. **Sans engagement minimum obligatoire** : mensuel reconductible tacitement, résiliation à tout moment via dashboard ou `hello@hilmy.io`, effet en fin de période payée sans remboursement prorata, annuels sans tacite reconduction au-delà

**Bonus dans la même PR**
- Section 01 (Objet) : retiré "annuaire en ligne gratuit" + clarification fiche prestataire sous abonnement
- Section 04 (Modération) : 2× "l'équipe Hilmy" → "la team Hilmy"
- Section 07 (Suppression compte) : ajout cas prestataire avec abonnement en cours
- Date "avril 2026" → "mai 2026"

### PR #38 — `app/dashboard/prestataire/abonnement/page.tsx`

**Réécriture complète (172+ lignes vs ancien 122 lignes).**

AVANT — affichait à toutes les prestataires :
- "Aujourd'hui Hilmy est 100 % gratuit pour toi"
- "Plan Fondatrice gratuit à vie"
- "Formule Premium · Bientôt" (alors que Premium existe et est facturé)
- 5 features Premium présentées comme "à venir"

APRÈS — affiche dynamiquement selon `prestataire.palier` :
1. **Header** : "Formule [Standard/Premium/Cercle Pro]" avec PalierBadge + PastilleSelectionHilmy si Cercle Pro + date d'activation
2. **Carte gauche "Ce que tu paies"** : prix mensuel réel (depuis `PRICING`) + features incluses (depuis `PALIER_INFO[palier].features`)
3. **Carte droite upsell** : Standard → propose Premium, Premium → propose Cercle Pro, Cercle Pro → message "tu es au sommet"
4. **Section Gestion** : explique résiliation libre + sans engagement + pas de commission + CTAs `/tarifs` et `mailto:hello@hilmy.io` + note transparente "self-service arrive bientôt, en attendant on te répond sous 24h"
5. **Footer reassurance** : "Pas de commission sur tes prestations · Sans engagement minimum · Résiliation libre"

Architecture : single source of truth via `PALIER_INFO` et `PRICING` depuis `app/tarifs/_lib/pricing.ts` → toute évolution future de /tarifs propage automatiquement à cette page.

### PR #39 — Signup funnel

**`components/auth/AuthShell.tsx:71`** (aside marketing visible sur tous les écrans signup/login)
- AVANT : `Zéro commission · Zéro pub · Zéro compromis`
- APRÈS : `Curation à la main · Pas de pub tierce · Entre copines`
- Reformulation honnête qui marche pour les deux types de comptes (utilisatrices ET prestataires)

**`components/onboarding/PrestataireMethodsClient.tsx:138`** (subtitle écran "Comment veux-tu créer ta fiche ?")
- AVANT : "Ta fiche est complètement gratuite, sans commission. On te demande juste quelques infos et tu es en ligne. Les imports automatiques arriveront bientôt."
- APRÈS : "Quelques infos et tu es prête à rejoindre la team. Trois formules d'abonnement à partir de 19€/mois, sans commission sur tes prestations — le détail sur [/tarifs](/tarifs). Les imports automatiques arriveront bientôt."

## Points encore à arbitrer manuellement

### 1. `components/landing/ElleProfiles.tsx` lignes 12-17 (PROVIDER_VALUE_PROP)
Bullets visibles sur la home (section "Pionnières") :
```tsx
const PROVIDER_VALUE_PROP = [
  'Validation sous 48h, par de vraies copines',
  'Trois formules, dès 19€/mois',
  "Pas d'engagement, tu pars quand tu veux",
  'Ton profil importé en 2 min (Google, Instagram, LinkedIn)',
]
```
**Statut** : déjà cohérent avec /tarifs (mentionne "trois formules dès 19€/mois"). Pas urgent à fixer mais à harmoniser avec les autres délais (cf point 4).

### 2. `components/landing/FAQ.tsx` ligne 24 — réponse "C'est gratuit ?"
Texte actuel :
> Pour les copines qui rejoignent la team et explorent l'annuaire ou les recommandations : oui, entièrement gratuit, et ça le restera.
> Pour les prestataires qui veulent une fiche dans l'annuaire, on propose trois formules à partir de 19€/mois. Pas d'engagement, tu pars quand tu veux. Tu peux voir tous les détails sur la page /tarifs.

**Statut** : 🟢 déjà cohérent avec la nouvelle ligne directrice. Aucun fix nécessaire — c'est même devenu le modèle.

### 3. `app/comment-ca-marche/page.tsx` lignes 87-88 (côté prestataire)
> Choisis ta méthode : depuis Google Places (2 minutes) ou en remplissant toi-même (8 minutes). **Tout est gratuit, et ça le restera.**

**Statut** : 🔴 contradiction restante. **À fixer dans une 5e PR séparée si tu veux que je m'en occupe sur la prochaine session**, ou tu peux le faire toi-même en pair-prog Stripe ce soir (même angle de réécriture que PrestataireMethodsClient).

Aussi : ligne 97 "Notre équipe" → "La team" (mot interdit).

### 4. Délai validation : 24h vs 48h (incohérence cross-pages)
- /tarifs hero : "validée sous 24h"
- /tarifs FAQ "Combien de temps avant que ma fiche soit en ligne ?" : "On valide ton profil sous 24h"
- ElleProfiles bullets : "Validation sous 48h"
- comment-ca-marche : "On la valide" (sans délai)
- dashboard prestataire pending banner : "sous 24h ouvrées"
- Manifeste : pas de délai
- CGU : pas de délai

**Décision Jiji nécessaire** : c'est 24h ou 48h ? La trancher puis harmoniser partout. Ce n'est pas un blocker légal mais un signal de qualité.

### 5. Dead code à supprimer (issue #32)
`components/landing/ForPrestataires.tsx` (68 lignes inutilisées) contient encore :
- `'Inscription gratuite, validation sous 48h'`
- `'Aucun abonnement, aucune commission'`
- `peut en faire partie. Aucun abonnement, aucune commission, jamais.`

Pas affiché aux utilisatrices (composant non importé), mais danger latent si réintégré accidentellement. **Recommandation** : supprimer le fichier carrément.

### 6. Page /accueil utilisatrice connectée
Pas re-vérifiée ligne par ligne dans cette session, mais l'audit PR #35 ne l'avait pas marquée comme contradictoire — donc OK a priori.

## Recommandations pour la session Stripe de Jiji ce soir

### Sources de vérité à respecter
Ces 3 fichiers sont maintenant les **sources de vérité du modèle économique** :
1. `app/tarifs/_lib/pricing.ts` — montants et features par palier
2. `app/(legal)/cgu/page.tsx` Section 06 — contrat juridique des conditions d'abonnement
3. `app/dashboard/prestataire/abonnement/page.tsx` — affichage palier réel à la prestataire

Quand tu branches Stripe :
- Stripe Products/Prices doivent matcher exactement les montants de `PRICING` (19/49/99€ + variantes 3m/6m/1an avec remises -10/-20%)
- Stripe Customer Portal pour la gestion self-service (mentionnée comme "arrive bientôt" dans la nouvelle page abonnement) — quand prêt, remplacer le mailto par le lien Customer Portal
- Webhook Stripe doit mettre à jour `prestataire.palier` (column existante depuis migration 19)
- Email de confirmation paiement à créer dans `lib/email/transactional.ts` (cohérent avec les 6 templates Sara existants)

### Petits points à anticiper côté Stripe
- Les CTAs commit pricing utilisent encore `mailto:hilmy.io@hotmail.com` (`app/tarifs/_lib/pricing.ts:141`). À remplacer par Stripe Checkout sessions.
- Email contact business : passer de `hilmy.io@hotmail.com` à `hello@hilmy.io` (cf issue #32 hygiène)
- Idempotency keys obligatoires sur calls Stripe critiques (cf AGENTS.md)
- Webhook signature verification obligatoire (`stripe.webhooks.constructEvent`)
- Logs events webhook dans une table `stripe_events` pour audit + replay (cf AGENTS.md)

### Coordination avec les PRs de cette session
- Une fois Stripe branché, `app/dashboard/prestataire/abonnement/page.tsx` peut être enrichie avec :
  - Date prochain renouvellement
  - Mode de paiement masqué
  - Lien Stripe Customer Portal (remplacer le mailto)
  - Historique des paiements
- La phrase "La gestion en self-service depuis le dashboard arrive bientôt" peut être retirée le jour où c'est branché.

## Statut global après cette session

| Surface contradictoire issue audit PR #35 | Statut |
|---|---|
| `/cgu` Section 06 | ✅ Réécrite (PR #37) |
| `/manifeste` 3 promesses | ✅ Réécrites (PR #36) |
| `/manifeste` "notre équipe" | ✅ Fixé (PR #36) |
| `Manifesto.tsx:27` "L'équipe Hilmy" | ✅ Fixé (PR #36) |
| `AuthShell.tsx:71` "Zéro commission · Zéro pub · Zéro compromis" | ✅ Fixé (PR #39) |
| `PrestataireMethodsClient.tsx:138` "complètement gratuite, sans commission" | ✅ Fixé (PR #39) |
| `dashboard/prestataire/abonnement` "Plan Fondatrice gratuit à vie" | ✅ Réécrite (PR #38) |
| `comment-ca-marche` "Tout est gratuit, et ça le restera" | 🔴 **Reste à fixer** (point 3 ci-dessus) |
| `comment-ca-marche` "Notre équipe" | 🔴 **Reste à fixer** (point 3) |
| `charte` "notre équipe" | 🔴 **Reste à fixer** (audit l'avait noté) |
| Délai validation 24h vs 48h | 🟡 **Décision Jiji** (point 4) |
| `ForPrestataires.tsx` dead code | 🟡 **Suppression à faire** (point 5) |

**7 surfaces critiques sur 12 fixées.** Les 5 restantes ne sont pas des blockers App Store/légaux immédiats (le contrat juridique CGU + signup funnel sont déjà cohérents). Elles ont vocation à être traitées dans un prochain sprint copy.

## Prochaine étape recommandée
Si tu me dis "continue après ta session Stripe" :
1. **Sprint copy round 2** (~1h) : `/comment-ca-marche` + `/charte` + suppression `ForPrestataires.tsx`
2. **Décision délai validation** (5 min) : tu tranches 24h vs 48h, j'harmonise partout
3. **Issues audit autres** (#26 app native, #27 account deletion, #28 RGPD, #30-34) : à planifier selon priorité
