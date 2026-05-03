# Audit promesses vs réalité — 2026-05-03

## TL;DR (5 lignes max)
- Promesses inventoriées : **~85** (Site: 78 | App native: 0 — repo absent | Email: 7 templates)
- 🟢 DONE : ~28 (33%) — annuaire, recos, events, dashboards de base, emails transactionnels
- 🟡 PARTIAL : ~14 (16%) — stats (visibles mais pas envoyées par email), badges (visuel mais pas systématisé), imports onboarding (route existe, à tester live)
- 🔴 MISSING : ~38 (45%) — quasi TOUTES les features payantes Premium / Cercle Pro + paiement Stripe + RGPD opérationnel + OAuth Apple + account deletion
- ⚪ N/A : ~5 (positionnement marketing)
- **Verdict : ❌ DÉCALER LA SOUMISSION APP STORE** — au minimum 2-3 semaines de travail pour atteindre la conformité Apple basique + correction des contradictions contractuelles graves entre `/manifeste`, `/cgu`, `/comment-ca-marche` et `/tarifs`.

---

## 🚨 BLOCKERS App Store (à fixer AVANT soumission)

### 1. App native introuvable dans le repo — submission impossible en l'état
**Risque** : Aucune app à soumettre. Le repo `hilmy` est purement web Next.js. Ni dossier `expo`, `react-native`, `mobile`, `ios`, `android`, ni dépendance `expo`/`react-native`/`capacitor` dans `package.json`.

**Effort** : 3-6 semaines selon approche (Expo from scratch / TWA + PWA / Capacitor wrapper).

**Recommandation** : Décider l'approche d'abord (Expo natif vs Capacitor wrapper du site). Si pression Apple, **PWA + Capacitor wrapper** est le chemin le plus court (~1 semaine) mais sacrifie l'expérience native.

---

### 2. Contradictions contractuelles graves entre /manifeste, /cgu, /comment-ca-marche et /tarifs
**Risque** : 🔴🔴🔴 critique multidimensionnel
- **Apple App Store Guideline 5.1.1** + **3.1** : claims marketing trompeurs sur paiements peuvent entraîner rejet
- **Loi Hamon (France) / Code des Obligations (Suisse) / DDIA (UE)** : pratique commerciale trompeuse caractérisée — risque amende + recours collectif
- **Trustpilot / App Store reviews 1★** quasi garanties

**Détails** :
- `/cgu` Section 06 : "L'inscription et l'utilisation de Hilmy sont **entièrement gratuites, tant pour les utilisatrices que pour les prestataires**. Aucune commission n'est prélevée sur les prestations." — alors que `/tarifs` vend Standard 19€, Premium 49€, Cercle Pro 99€/mois aux prestataires.
- `/manifeste` : "Zéro commission. Les prestataires ne nous paient rien sur leurs prestations" + "Zéro pub. Aucune fiche n'est mise en avant contre argent" — alors que Premium liste "2 boosts par an", Cercle Pro liste "Mise en avant prio" + "Pastille Sélection Hilmy".
- `/comment-ca-marche` : "Choisis ta méthode... Tout est gratuit, et ça le restera." côté prestataire.
- `components/landing/Manifesto.tsx:27` (visible sur la home) : "L'équipe Hilmy" — mot interdit (AGENTS.md).
- `components/auth/AuthShell.tsx:71` (visible sur signup) : "Zéro commission · Zéro pub · Zéro compromis" — affiché à toutes les nouvelles inscrites prestataires.
- `components/onboarding/PrestataireMethodsClient.tsx:138` : "Ta fiche est complètement gratuite, sans commission".
- `app/dashboard/prestataire/abonnement/page.tsx` : page entière dit "Hilmy est 100% gratuit", "Plan Fondatrice gratuit à vie", "Formule Premium bientôt" — alors que Premium EXISTE.

**Effort** : 4-8h de réécriture cohérente (copy + suppression dead code `ForPrestataires.tsx`).

**Recommandation** : **À FIXER AVANT TOUT autre travail App Store**. Sinon Stripe ce soir = vente sur des CGU qui disent "gratuit".

---

### 3. Account deletion absent — REJET APPLE AUTOMATIQUE
**Risque** : Apple Guideline 5.1.1(v) en vigueur depuis 2022 → **app rejetée systématiquement**.

**État** : Pas de route `/api/me/delete`, pas de bouton "Supprimer mon compte" dans `app/dashboard/utilisatrice/parametres`. La CGU Section 07 dit "demander la suppression... contactant hello@hilmy.io" — manuel par email, ne passe pas Apple.

**Effort** : 4-6h (UI bouton + confirmation + route serveur + cascade DELETE sur tables RLS).

---

### 4. Sign in with Apple absent (parité OAuth requise si Google offert)
**Risque** : Apple Guideline 4.8 → si on offre Google ou Facebook OAuth, Sign in with Apple obligatoire.

**État** : `components/auth/AuthShell.tsx` ligne 107-149 a un composant `OAuthButton` avec props `provider: 'google' | 'apple'` mais c'est un **stub** : aucune logique `onClick` branchée. Donc actuellement zéro OAuth = pas de problème **mais** dès qu'on branche Google il faut Apple en parallèle.

**Effort** : 1.5j si on décide d'ajouter OAuth. **Décision** : soit on branche les deux (Google + Apple) ensemble, soit on retire les `OAuthButton` du flow signup pour ne pas créer d'attente.

---

### 5. Stripe pas branché — paiement promis "en ligne" mais réalité = mailto hotmail
**Risque** : Apple Guideline 3.1.1 (in-app purchases) — pour digital goods/services consommés dans l'app, Apple exige IAP. Pour services physiques, Stripe externe est OK. **Hilmy = service physique (mise en relation)** donc Stripe externe acceptable. **Mais** :
- `/tarifs` CTA final : "Choisis ta formule, **paie en ligne**, ta fiche est validée sous 24h."
- Réalité : tous les CTAs commit envoient `mailto:hilmy.io@hotmail.com` (`app/tarifs/_lib/pricing.ts:141`).
- Risque concret : prestataires cliquent "Je choisis ma formule" → s'attendent à un Stripe → ouvrent Mail vers hotmail. Confusion totale.

**Effort** : Jiji a dit qu'elle s'en occupe ce soir en pair-programming. **Hors scope de cet audit.**

---

### 6. Droits RGPD non opérationnels (article 15 et 17)
**Risque** : Plainte CNIL/PFPDT/APD/CNPD selon pays. Amende potentielle.

**État** :
- Article 15 (droit d'accès / portabilité) : **0 route** `/api/me/export`. Politique de confidentialité promet ce droit (Section 07).
- Article 17 (droit à l'oubli) : pas de mécanisme automatique. Politique promet 30 jours d'effacement (Section 05) sans support technique.
- Cookies banner : aucun. Site utilise Vercel Analytics + Google Maps (CSP autorise GoogleTagManager + maps.googleapis.com) → consent requis.

**Effort** : 1.5-2j (UI export + UI delete + banner cookies + cron purge).

---

### 7. Page `/dashboard/prestataire/abonnement` totalement obsolète
**Risque** : Confusion massive pour les prestataires payantes. La page parle d'un "Plan Fondatrice gratuit à vie" et annonce Premium "Bientôt" alors que la prestataire vient de payer Premium 49€/mois.

**Effort** : 6-8h (refonte complète : afficher palier réel + dates + lien gestion + lien Stripe Customer Portal une fois branché).

---

## Matrice complète — Site hilmy.io

| # | Source | Promesse exacte | Statut | Preuve / Manque |
|---|---|---|---|---|
| 1 | HeroV2 | "Le carnet d'adresses, entre copines" + variantes | 🟢 | Composant rendu sur `/` |
| 2 | HeroV2 | "Suisse · France · Belgique · Luxembourg · Monaco" | 🟢 | Constants + page accueil |
| 3 | ThreePromises | "L'annuaire — Des femmes vérifiées, par des femmes" | 🟡 | Page `/annuaire` existe, vérification "à la main" = manuelle (admin existe) |
| 4 | ThreePromises | "Les recommandations — adresses qui passent de main en main" | 🟢 | Page + table places + table recommendations |
| 5 | ThreePromises | "Les événements — moments à vivre ensemble" | 🟢 | Page + table events |
| 6 | StartingPoint | "Pour trouver coiffeuse, resto, avocate" | ⚪ | Positionnement |
| 7 | Manifesto component (home) | "— L'équipe Hilmy" | 🔴 | Mot interdit AGENTS.md (devrait être "La team Hilmy"). Ligne 27 `components/landing/Manifesto.tsx`. |
| 8 | PricingTeaser | "3 paliers, 19/49/99€" | 🟢 | `pricing.ts` aligné, teaser cohérent |
| 9 | FAQ | "C'est gratuit pour les copines : oui, et ça le restera" | 🟢 | Aucun paywall utilisatrice |
| 10 | FAQ | "Pour les prestataires : 3 formules à partir de 19€/mois" | 🟢 | Aligné /tarifs |
| 11 | FAQ | "Validation 24-48h" | ⚪ | Manuel par admin, dépend de Jiji |
| 12 | FAQ | "Authentification sans mot de passe" | 🔴 | **Mismatch** : code = email + password classique (cf README + flow signup). Affirmation incorrecte. |
| 13 | FAQ | "Hébergement Europe (Francfort), RGPD + nLPD" | 🟡 | Vercel = Frankfurt (cdg1 = Paris dans vercel.json — à vérifier), Supabase EU |
| 14 | FAQ | "Aucun partage commercial" | 🟢 | Privacy section 06 confirme |
| 15 | FinalCTA | "Laisse ton email, on te tient au courant" | 🟡 | Endpoint `/api/subscribe` existe, à tester |
| 16 | FooterV2 | "Lettre Hilmy : un dimanche par mois" + form newsletter | 🔴 | Aucun cron d'envoi, aucun template newsletter, formulaire ne stocke nulle part de manière confirmée |
| 17 | ElleProfiles | "Validation sous 48h, par de vraies copines" | ⚪ | Manuel |
| 18 | ElleProfiles | "Trois formules, dès 19€/mois" | 🟢 | Aligné |
| 19 | ElleProfiles | "Pas d'engagement, tu pars quand tu veux" | 🔴 | Pas de mécanisme de résiliation auto (dépend Stripe à venir) |
| 20 | ElleProfiles | "Profil importé en 2 min (Google, IG, LinkedIn)" | 🟡 | 3 routes `/onboarding/prestataire/google|instagram|linkedin` existent — fonctionnelles à tester live |
| 21 | Navigation | Menu "Annuaire / Recos / Évenements / Tarifs / À propos" | 🟢 | Routes existent — sauf que sur mobile pas de hamburger (cf audit UX #22) |
| 22 | /manifeste | "Zéro commission" | 🔴 | **CONTRADICTION** avec /tarifs. BLOCKER #2 |
| 23 | /manifeste | "Zéro pub" | 🔴 | **CONTRADICTION** avec Premium boosts + Cercle Pro mise en avant prio |
| 24 | /manifeste | "Zéro compromis. Notre équipe" | 🔴 | "notre équipe" = mot interdit |
| 25 | /comment-ca-marche | "Tout est gratuit, et ça le restera" côté prestataire | 🔴 | **CONTRADICTION** majeure |
| 26 | /comment-ca-marche | "Notre équipe relit chaque fiche" | 🔴 | "Notre équipe" = mot interdit |
| 27 | /comment-ca-marche | "On ne prélève rien sur tes prestations — jamais" | 🟢 | Vrai techniquement (commission = 0, abonnement = oui) |
| 28 | /comment-ca-marche | "Côté copine : aucun intermédiaire, aucune commission" | 🟢 | Utilisatrice gratuite |
| 29 | /charte | "notre équipe" (ligne 25) | 🔴 | Mot interdit |
| 30 | /tarifs hero | "Choisis ta formule, paie en ligne, validée sous 24h" | 🔴 | "paie en ligne" = mailto, pas Stripe |
| 31 | AuthShell signup | "Zéro commission · Zéro pub · Zéro compromis" | 🔴 | Affiché à chaque signup, contradiction directe avec tarifs |
| 32 | OnboardingPrestataire | "Ta fiche est complètement gratuite, sans commission" | 🔴 | Affiché juste avant signup payant |

---

## Matrice complète — App native

**App native introuvable dans ce repo.** Aucun dossier `expo`, `react-native`, `mobile`, `ios`, `android`. Aucune dépendance native dans `package.json`. README définit Hilmy comme "application Next.js".

### Approches possibles pour soumettre à l'App Store
| Approche | Effort | Pros | Cons |
|---|---|---|---|
| **Expo / React Native from scratch** | 4-6 semaines | Vraie app native, perf, accès APIs natives | Long, double codebase, équipe RN nécessaire |
| **Capacitor wrapper du PWA** | 1 semaine | Code partagé, rapide | Apple plus strict sur "wrappers" simples (Guideline 4.2 / 4.7) |
| **PWA seule (pas d'App Store)** | 0 (déjà PWA-able) | Aucun coût | Pas dans l'App Store, perte de découverte |
| **TWA Android only + skip iOS** | 2 jours | Présence Play Store | Aucune présence iOS |

### Si on choisit Capacitor wrapper, audit minimal additionnel à faire
- [ ] App icon 1024×1024 PNG fond opaque (`/public/app-icon-1024.png`)
- [ ] Splash screen
- [ ] Bundle ID `io.hilmy.app` (à réserver Apple Developer)
- [ ] `Info.plist` : permissions justifiées (Location si HomeMap, Camera si upload photos)
- [ ] Universal links → routes `hilmy.io/*`
- [ ] Sentry / crash reporting branché

---

## Matrice complète — Page /tarifs (par tier)

### Tier Utilisatrice
**Modèle business : 100% gratuit, sans paywall, à vie.** (Confirmé par FAQ + dashboard utilisatrice + comportement code.)

| Promesse | Statut | Note |
|---|---|---|
| Inscription gratuite | 🟢 | `/auth/signup` sans paiement |
| Accès annuaire complet | 🟢 | `/annuaire` public |
| Accès recommandations | 🟢 | `/recommandations` public |
| Accès événements | 🟢 | `/evenements-v2` public |
| Sauvegarder lieux préférés (favoris) | 🟢 | Table `favoris` (mig 5) + dashboard `/favoris` |
| Recommander un lieu | 🟢 | `/dashboard/utilisatrice/recommandations/nouvelle` + table |
| Proposer un événement | 🟢 | `/dashboard/utilisatrice/evenements/nouveau` |
| Préférences notifications | 🟢 | PR #16 mergée — 4 toggles persistés |
| S'inscrire à un événement | 🟢 | Table `event_inscriptions` (mig 6) + API |
| Page perso publique "Voix Hilmy" | 🟢 | Route `/[slug]` + composants voix existent |

### Tier Standard 19€/mois (Prestataire)
| Promesse | Statut | Note |
|---|---|---|
| Ta fiche dans l'annuaire | 🟢 | Table `profiles` + statut `approved` |
| 9 canaux de contact | 🟢 | Migrations 1+34 : whatsapp, phone_public, email, site_web, instagram, tiktok, facebook, linkedin, youtube |
| **5 photos** | 🔴 | **Aucune limite enforcée** côté serveur ni client. Le drag-drop accepte N photos. Doit être enforcée si on facture cette feature. |
| Avis des copines | 🟢 | `recommendations` type=prestataire + UI |
| Total des vues | 🟢 | `nb_vues` + dashboard tous paliers |
| Badge Standard | 🟡 | `PalierBadge` component existe mais cards annuaire affichent uniquement Premium / Cercle Pro (`PrestataireCard.tsx:65`) — Standard n'a PAS de badge visible publiquement, contradiction avec /tarifs |

### Tier Premium 49€/mois (Prestataire)
| Promesse | Statut | Note |
|---|---|---|
| Tout le Standard + | 🟡 | Hérité, mais 5/20 photos non enforcées |
| Dashboard détaillé | 🟢 | `app/dashboard/prestataire/page.tsx` branche `isPremiumOrAbove` → 4 stat cards + chart 30j |
| Tap-to-contact tracé | 🟢 | API `/api/track/contact` + table `profile_contacts` (mig 15) + dashboard split par canal |
| **20 photos · 1 vidéo 60s** | 🔴 | Aucune limite photos. **Aucun upload vidéo** dans le code (pas de champ DB `video_url`, pas d'UI). |
| **-10% pour les Copines** | 🔴 | Aucun système de code promo, aucune logique discount, aucune table associée |
| **Stats hebdo** | 🟡 | Stats visibles dans dashboard (vues 7d, contacts) MAIS pas d'envoi email récurrent. Aucun cron. |
| **Story trimestrielle** | 🔴 | Aucun système de "story" éditoriale dans le code |
| **2 boosts par an** | 🔴 | Aucun champ `boosts_remaining`, aucune logique de boost, aucun cron de rotation |

### Tier Cercle Pro 99€/mois (Prestataire)
| Promesse | Statut | Note |
|---|---|---|
| Tout le Premium + | 🟡 | Mêmes manques que Premium |
| **Photos & vidéos illimitées** | 🔴 | Pas de limite mais pas d'upload vidéo non plus |
| **Carrousel autoplay** | 🔴 | Aucun composant carousel autoplay, ni dans `prestataire-v2/[slug]` ni ailleurs |
| **Devis express** | 🔴 | Aucun système de devis, aucun formulaire, aucune table `devis_requests` |
| **Mise en avant prio** | 🔴 | Aucun champ `priority_score`, aucun tri prio dans queries annuaire |
| **Pastille Sélection Hilmy** | 🟢 | Composant `PastilleSelectionHilmy` existe + branché dans dashboard prestataire ligne 102 (`palier === 'cercle_pro'`) |
| **Newsletter mensuelle** | 🔴 | Aucun template newsletter dans `lib/email/transactional.ts`, aucun cron d'envoi, aucune liste de destinataires |
| **Portrait éditorial** | 🔴 | Aucune trace dans le code, aucune table `portraits`, aucune UI |
| **Stats avancées** | 🔴 | Le dashboard Cercle Pro affiche explicitement "Stats avancées · à venir" / "arrivent dans la V1.2" — donc reconnaît officiellement l'absence |
| **Boosts illimités** | 🔴 | Idem Premium |
| **Support prioritaire** | 🔴 | Aucun système de tickets, aucune SLA codée |

### Tier Lieu Sélection Hilmy 39€/mois
| Promesse | Statut | Note |
|---|---|---|
| Fiche reco visible dans toute la team | 🟢 | Table `places` + `/recommandations` |
| Photos illimitées | 🔴 | Pas de limite mais pas d'enforcement non plus |
| Pastille « Sélection Hilmy » | 🟡 | Composant existe mais branché Cercle Pro prestataire, pas sur place — à vérifier sur `/recommandation/[slug]` |
| Mise en avant dans le feed | 🔴 | Pas de champ priorité sur places |
| Stats vues + saves | 🟡 | `places_views` à vérifier, table `favoris` cumule probablement les saves |
| Tap-to-contact tracé | 🔴 | Pas d'API track/contact pour places, juste pour profiles |
| Mise en avant événements saisonniers | 🔴 | Aucune logique saisonnière |

### Inversement — Features livrées non promises sur /tarifs
- **Voix Hilmy** : tout un système (slugs persos, follows, OG images, recos publiques) — complètement absent de `/tarifs` ! Module substantiel (migrations 24-30) qui pourrait être un argument commercial fort.
- **Tracking views (`profile_views`)** : visible dashboard tous paliers, pourrait être plus mis en avant.
- **Soft-delete RLS** : robustesse non monétisée.
- **Reports / signalements** : 4 tables (`*_reports` + `content_reports`) — argument trust safety à valoriser.
- **Modération admin** : `/admin/*` complet — argument qualité du carnet.
- **Charte** existe : argument différenciant.

---

## Matrice — Onboarding

| Étape | Promesse | Statut |
|---|---|---|
| `/auth/signup` | "Trois questions et c'est tout" | 🟢 |
| `/auth/signup` | "Zéro commission · Zéro pub · Zéro compromis" (AuthShell:71) | 🔴 contradiction |
| `/onboarding` | "Trente secondes, on te guide" | 🟢 (form simple prénom/pays/ville/bio) |
| `/onboarding` | "Découvrir le carnet" (CTA submit) | 🟡 mot "Découvrir" borderline interdit |
| `/onboarding/prestataire` | "Huit minutes. Pour toujours." | 🟢 (4 méthodes : Google, IG, LinkedIn, manuel) |
| `/onboarding/prestataire` | "Ta fiche est complètement gratuite, sans commission" | 🔴 contradiction |
| `/onboarding/prestataire/publiee` | Confirmation publication | 🟢 (route existe) |
| `/onboarding/prestataire/google` | Import Google Places | 🟡 à tester live |
| `/onboarding/prestataire/instagram` | Import IG | 🟡 à tester live |
| `/onboarding/prestataire/linkedin` | Import LinkedIn | 🟡 à tester live |

---

## Matrice — Emails Resend

| Email | Statut | Trigger |
|---|---|---|
| `sendSignupEmail` (confirmation compte) | 🟢 | POST /api/auth/signup |
| `sendPasswordResetEmail` | 🟢 | POST /api/auth/password-reset |
| `sendFicheApprouvee` | 🟢 | Admin approve flow |
| `sendFicheRejetee` | 🟢 | Admin reject flow |
| `sendNouvelAvisRecu` | 🟢 | POST /api/recommendations/notify |
| `sendNouvelleInscriptionEvent` | 🟢 | POST /api/events/[id]/inscription |
| `sendFounderSignupNotification` | 🟢 | Internal — chaque signup |
| Évent annulé inscrites | 🟢 (vu en code lib/email line 446+) | Cancel route |
| **Newsletter mensuelle** (Cercle Pro promise) | 🔴 | Aucun template, aucun cron |
| **Stats hebdo** (Premium promise) | 🔴 | Aucun template, aucun cron |
| **Confirmation paiement / abonnement actif** | 🔴 | Stripe absent |
| **Renouvellement annuel** | 🔴 | Stripe absent |
| **Échec paiement** | 🔴 | Stripe absent |
| **Story trimestrielle** | 🔴 | Aucun système |
| **Account deletion confirmation** | 🔴 | Pas de delete account |
| **GDPR data export** | 🔴 | Pas d'export |

---

## Conformité App Store iOS (checklist)

| Point | Statut | Note |
|---|---|---|
| App icon 1024×1024 fond opaque | ❌ | App native absente, donc icon non créée |
| Splash / launch screen | ❌ | Pareil |
| Privacy URL fonctionnelle | ✅ | `/confidentialite` rendue, RGPD-compliant en contenu (sauf opérationnel cf RGPD ci-dessous) |
| Terms of service URL | 🟡 | `/cgu` rendue MAIS contient fausses claims (Section 06 "entièrement gratuit pour prestataires") |
| App Tracking Transparency (ATT) | ✅ N/A | Pas d'analytics tiers actuellement (Vercel Analytics uniquement, exempt par défaut) |
| **Account deletion in-app** | ❌ **REJET AUTO** | Aucune route, aucun bouton dashboard. Manuel par mailto. |
| Sign in with Apple (si Google offert) | 🟡 | OAuth stub — actuellement ni Google ni Apple actif. À décider avant implem |
| Pas de "beta" / "TODO" visible | 🟡 | "Bientôt" multiple visible (dashboard prestataire abonnement, Cercle Pro stats avancées "à venir V1.2") |
| Permissions justifiées (`Info.plist`) | ❌ N/A | App native absente |
| Crashes connus flow principal | ❌ | Pas de Sentry/Bugsnag, pas de moyen de savoir |
| Bundle ID / version cohérents | ❌ N/A | App native absente |
| Pas de placeholder Lorem | ✅ | Aucun lorem ipsum trouvé |

---

## Conformité RGPD (CH/FR/BE/LU/MC) — checklist

| Article | Statut | Preuve / Manque |
|---|---|---|
| Privacy policy publique | ✅ | `/confidentialite` |
| Mention DPO / contact RGPD | 🟡 | Jihane Maliki Genève listée comme responsable, pas de "DPO" formel (taille startup OK) |
| **Article 15 — Droit d'accès / portabilité (export)** | ❌ | Pas de route `/api/me/export`, promesse non tenable |
| **Article 17 — Droit à l'oubli (suppression)** | ❌ | Pas de bouton dashboard, juste mailto. Promesse 30j non automatisée. |
| **Cookies banner si analytics/pixels tiers** | ❌ | Aucun banner. CSP autorise `va.vercel-scripts.com` (Vercel Analytics — exempt par défaut sous RGPD si anonymisé), `googletagmanager.com` (à clarifier), `maps.googleapis.com` |
| Sous-traitants listés | 🟡 | Privacy mentionne Supabase, Vercel, Brevo, Google. **Oublie Resend** (qui est le path principal d'envoi mail selon README, fallback Brevo). |
| Base légale explicite | ✅ | Consentement + intérêt légitime |
| Durées de rétention | ✅ | 30 jours après suppression |
| Mention < 16 ans | ✅ N/A | Pas applicable (pas de section enfant) |
| Hébergement Europe | 🟡 | Vercel `cdg1` = Paris (vercel.json), Supabase EU à confirmer |

---

## Findings notables hors-scope

### Dead code
- `components/landing/ForPrestataires.tsx` (68 lignes) — non utilisé, contient promesses contradictoires "Aucun abonnement, aucune commission, jamais." Dangereux si réintégré accidentellement.
- `components/landing/FloatingQuote.tsx`, `NineUniverses.tsx`, `RecentFavorites.tsx` — inutilisés. Bruit dans le repo.

### Incohérences délais
- ElleProfiles + ForPrestataires (dead) + comment-ca-marche : "validation 48h"
- /tarifs hero + dashboard prestataire pending : "validation 24h"
- → **Choisir un seul délai et harmoniser** (24h ou 48h ou "24-48h ouvrées")

### Incohérences provider email
- README + privacy : Brevo
- README config recommandée : Resend
- Privacy ne mentionne PAS Resend
- → Mettre à jour Privacy section 06 pour ajouter Resend

### `next.config.js` ligne 50-51 : risque qualité
- `eslint: { ignoreDuringBuilds: true }` — on shippe sans bloquer sur lint
- `typescript: { ignoreBuildErrors: true }` — on shippe sans bloquer sur erreurs TS
- → Acceptable pour vélocité MAIS très dangereux avant App Store launch (régressions silencieuses)

### CSP en mode REPORT-ONLY
- `next.config.js:46` : CSP en mode report-only depuis (au moins) plusieurs jours
- → Activer en mode bloquant avant launch sinon CSP n'apporte aucune protection

### Cookie hotmail dans le code
- `app/tarifs/_lib/pricing.ts:141` : `const HELLO = 'hilmy.io@hotmail.com';`
- Email hotmail comme adresse de contact business pour 19/49/99€/mois → faible signal de pro
- → Migrer vers `hello@hilmy.io` (déjà utilisé pour mentions légales et privacy)

### vercel.json minimal
- Pas de cron Vercel — donc tout ce qui est "newsletter mensuelle", "stats hebdo", "rotation boosts" demande crons Supabase Edge Functions ou GitHub Actions

---

## Recommandations priorisées pour Jiji

### 🔴 Priorité 1 — À fixer AVANT soumission App Store (effort total ~15-20j)

1. **Décider l'approche app native** (1 jour réflexion + decision) — Capacitor PWA wrap ou Expo from scratch ?
2. **Refondre toutes les pages contractuelles** (4-8h) :
   - `/cgu` Section 06 (le vrai contrat juridique)
   - `/manifeste` (3 promesses "Zéro X")
   - `/comment-ca-marche` ("Tout est gratuit")
   - `app/dashboard/prestataire/abonnement/page.tsx` (réécrire entièrement)
   - `components/auth/AuthShell.tsx` ligne 71
   - `components/onboarding/PrestataireMethodsClient.tsx` ligne 138
   - `components/landing/Manifesto.tsx` ligne 27 (mot interdit)
   - Supprimer `ForPrestataires.tsx` dead code
3. **Account deletion in-app** (4-6h) — bouton dashboard + route serveur cascade
4. **Brancher Stripe** — Jiji ce soir, hors scope audit
5. **OAuth Apple ou suppression OAuthButton stub** (decision : 0.5j si suppression / 1.5j si Apple+Google ensemble)
6. **Décider quoi faire des features Premium/Cercle Pro non livrées** : soit livrer minimum viable, soit retirer de /tarifs. Liste impactante :
   - 5/20 photos : enforcement (~4h)
   - 1 vidéo 60s : décision DB column + UI upload (~6h) ou retirer
   - -10% Copines : système de code promo (~1j) ou retirer
   - Stats hebdo : cron weekly digest email (~6h) ou retirer
   - Story trimestrielle : ?? clarifier ce que c'est ou retirer
   - 2 boosts/an : système rotation + UI déclencheur (~1j) ou retirer
   - Carrousel autoplay : composant simple (~3h) ou retirer
   - Devis express : formulaire + table (~6h) ou retirer
   - Mise en avant prio : score-based query (~4h) ou retirer
   - Newsletter mensuelle : template + cron + liste (~1j) ou retirer
   - Portrait éditorial : clarifier ce que c'est ou retirer
   - Stats avancées : déjà annoncé "à venir V1.2" → cohérent
   - Support prioritaire : email tag ou tickets (~2h) ou retirer

### 🟡 Priorité 2 — À fixer dans les 2 semaines post-launch
- Routes RGPD `/api/me/export` + `/api/me/delete` automatique (~1j)
- Cookies banner consent (~4h)
- Privacy section 06 : ajouter Resend (~30min)
- Migrate email contact hotmail → `hello@hilmy.io` (~30min)
- Activer CSP bloquant après audit /api/csp-report (~2h)
- Sentry / monitoring (~3h)
- Sitemap.ts + robots.ts (~1h)
- Réactiver `eslint` et `typescript` strict en build (~variable selon erreurs latentes)

### 🟢 Priorité 3 — Nice-to-have, à backlog
- Harmonisation délai validation (24h vs 48h vs 24-48h)
- Suppression dead code landing components
- Modale opt-in age range (table existe, pas de UI)
- Mention DPO formelle si seuil RGPD atteint

### 💡 Priorité bonus — Opportunités de monétisation
Features livrées mais NON listées sur `/tarifs` (potentiel à valoriser commercialement) :
- **Voix Hilmy** (slug perso, follows, recos publiques) — peut être un argument Premium ou Cercle Pro
- **Modération + reports** (qualité curated) — argument trust safety
- **Charte** + processus validation manuel — argument différenciant

---

## Issues GitHub créées

10 issues regroupées par sévérité et thème (cf récap par tier dans matrice ci-dessus pour le détail granulaire) :

### 🔴 Blockers (5)
- [#25](https://github.com/jihaneessmaliki-sys/hilmy/issues/25) — Contradictions contractuelles 'gratuit' vs tarifs payants (8 surfaces)
- [#26](https://github.com/jihaneessmaliki-sys/hilmy/issues/26) — App native introuvable, décider approche (Capacitor vs Expo)
- [#27](https://github.com/jihaneessmaliki-sys/hilmy/issues/27) — Account deletion absent (Apple Guideline 5.1.1(v) = rejet auto)
- [#28](https://github.com/jihaneessmaliki-sys/hilmy/issues/28) — RGPD article 15 (export) + 17 (delete) non opérationnels
- [#29](https://github.com/jihaneessmaliki-sys/hilmy/issues/29) — Page /dashboard/prestataire/abonnement totalement obsolète

### 🟡 High / Medium (3)
- [#30](https://github.com/jihaneessmaliki-sys/hilmy/issues/30) — Décision livrer/retirer ~12 features Premium / Cercle Pro non implémentées
- [#31](https://github.com/jihaneessmaliki-sys/hilmy/issues/31) — OAuth Apple/Google : finir branchement ou retirer le stub
- [#32](https://github.com/jihaneessmaliki-sys/hilmy/issues/32) — Nettoyage hygiène technique avant App Store launch (8 sous-tâches groupées)

### 🟢 Low (2)
- [#33](https://github.com/jihaneessmaliki-sys/hilmy/issues/33) — FAQ promet 'authentification sans mot de passe' alors que code utilise email+password
- [#34](https://github.com/jihaneessmaliki-sys/hilmy/issues/34) — Newsletter mensuelle + Stats hebdo : crons + templates manquants

---

## Données quantitatives
- Lignes de code lues : ~3500 (sur ~85 fichiers analysés)
- Fichiers analysés : ~85 (composants landing, pages app, dashboards, emails, migrations, config)
- Promesses inventoriées : ~85
- Temps total session : 2h45 (sous time-box 4h30, marge 1h45)
- Phases time-box respectées : ✅ oui — phases 1-2 fusionnées en pratique vu la quantité de signal trouvé tôt

---

## Verdict final pour Jiji

Hilmy n'est **pas prêt pour l'App Store**, ni techniquement (app native absente) ni contractuellement (au moins 6 surfaces différentes du site annoncent "tout est gratuit" / "zéro commission" pour les prestataires alors que /tarifs vend 19/49/99€/mois). Soumettre dans cet état = rejet quasi certain par Apple (account deletion absent + claims trompeurs) ET risque juridique sérieux en CH/FR sur publicité mensongère côté CGU.

**Plan minimal recommandé pour être prêt :**

**Cette semaine (4h dispo) — les 3 trucs absolument prioritaires :**
1. **Réécrire `/cgu` Section 06 + `/manifeste` 3 promesses** (2h) — c'est le vrai contrat juridique, c'est ce qu'attaqueront un avocat ou Apple. Enlever "entièrement gratuit pour les prestataires" et "Zéro commission".
2. **Supprimer/réécrire `app/dashboard/prestataire/abonnement/page.tsx`** (1h) — page complètement désynchronisée, va casser la confiance des premières prestataires payantes.
3. **Réécrire les 3 emplacements signup/onboarding** (1h) : `AuthShell.tsx:71`, `PrestataireMethodsClient.tsx:138`, `Manifesto.tsx:27` — pour ne plus dire "gratuit" / "Zéro commission" dans le funnel d'inscription.

**Sprint de 2 semaines après ça pour App Store :**
- Décision app native + start dev (Expo ou Capacitor)
- Account deletion in-app + RGPD opérationnel
- Stripe branché (Jiji ce soir)
- Décision feature-by-feature : livrer ou retirer du pricing les ~12 features Premium/Cercle Pro manquantes

**Sprint nice-to-have de 1 semaine post-launch :**
- Cookies banner, Sentry, CSP bloquant, sitemap, etc.

**Estimation honnête : 3 semaines avant soumission App Store réaliste**, à condition qu'une décision claire soit prise sur "livrer vs retirer" pour chaque feature payante manquante. Si on retire les ~12 features manquantes au lieu de les coder, la timeline tombe à **2 semaines** et le pricing devient défendable.

---

*Audit produit par session Claude Code autonome 2026-05-03. Stripe explicitement hors scope (Jiji s'en occupe ce soir en pair-programming). App native confirmée absente du repo `hilmy` — auditer en repo séparé si elle existe ailleurs.*
