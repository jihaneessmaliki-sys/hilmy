# Discovery + Gap Analysis app native Hilmy — 2026-05-05

> Rapport read-only. Aucune modification de code dans cette mission.

## 🗺️ Localisation du code

| Champ | Valeur |
|---|---|
| **Path** | `/Users/jina/Desktop/hilmy-mobile/` |
| **Git remote** | `https://github.com/jihaneessmaliki-sys/hilmy-mobile.git` (repo séparé du repo web) |
| **Branche** | `main` (fetch + push origin) |
| **Dernier commit** | `4b39c5a chore(mobile): install expo-dev-client pour builds EAS dev client` |
| **Dernière activité** | ~1er mai 2026 (4 jours avant cet audit) |

### Pourquoi `hilmy-mobile/` et pas `hilmy-app/`
2 candidats trouvés sur le Desktop :
- ✅ `/Users/jina/Desktop/hilmy-mobile/` → splash `#F5F0E6` (crème Hilmy), Apple Team `47TC3ZQ294` ✅, plugin `expo-apple-authentication`, EAS UUID, owner `jijimapose`, modifs récentes (1er mai 2026)
- ❌ `/Users/jina/Desktop/hilmy-app/` → splash `#0B1426` (dark blue), permissions micro/audio "Brain Dump", plugin `expo-av`, dernière modif 7 avril 2026 → **prototype obsolète**, à archiver/supprimer (NB : ne pas le supprimer ici, à valider avec Jiji).

### Distinction MaPose ≠ Hilmy
- **MaPose** : 3 dossiers présents (`Mapose Apple/`, `Mapose Google Play/`, `MaPose-général/mapose-app/`) — couleurs crème/or différentes (#FAF8F4/#9A7040/#2C2416)
- **Hilmy mobile** : palette validée (#F5F0E6/#0F3D2E/#C9A961), bundle `io.hilmy.app`, slug `hilmy-mobile`

---

## 🩺 Santé technique

| Item | Valeur | Statut |
|---|---|---|
| Node | v25.9.0 | ✅ moderne |
| npm | 11.12.1 | ✅ moderne |
| Expo SDK | 54.0.33 | ✅ récent (RN 0.81.5) |
| React | 19.1.0 | ✅ |
| React Native | 0.81.5 | ✅ |
| TypeScript | 5.9.2 | ✅ strict via `tsconfig.json` |
| Expo Router | 6.0.23 (typed routes) | ✅ moderne |
| EAS CLI version requise | `>= 16.0.0` | ✅ |
| `npx expo-doctor` | **Non lancé** dans cet audit (read-only mission, pas d'install/build) | ⚠️ À faire en début de prochaine session de build |
| `npm outdated` | **Non lancé** (idem) | ⚠️ À faire avant App Store push |

**Stack confirmée** : Expo Router (typed routes) + Supabase JS 2.49.4 + React Native 0.81.5 + Expo SDK 54.

**Polices** : Fraunces + DM Sans + Playfair Display via `@expo-google-fonts/*` ✅ charte Hilmy respectée.

**Pas de Sentry / monitoring** détecté côté app — à confirmer avec Jiji avant App Store.

---

## 📱 Écrans présents (44 routes Expo Router)

### Auth (5 écrans)
| Route | Statut UI | Remarques |
|---|---|---|
| `(auth)/welcome.tsx` | ✅ Complet (389 LOC) | Landing pré-auth |
| `(auth)/login.tsx` | ✅ Complet (128 LOC) | Email + mot de passe + **Sign in with Apple** branché via `<AppleSignInButton />` |
| `(auth)/signup.tsx` | ✅ Complet (259 LOC) | Idem login + Apple |
| `(auth)/check-email.tsx` | ✅ Complet | Confirmation email après signup |
| `(auth)/complete-profile.tsx` | ✅ Complet | Post-signup setup |

### Onboarding (6 écrans + sous-flow prestataire)
- `onboarding/posture.tsx`, `premier-post.tsx`, `toi.tsx`, `univers.tsx`, `ville.tsx`
- `onboarding/prestataire/{index, manuel, publiee}.tsx`

### Tabs (5 + sous-routes)
- `(tabs)/annuaire.tsx` — feed prestataires
- `(tabs)/recos/index.tsx` + `recos/voix/[slug].tsx` + `recos/voix/index.tsx` — Voix Hilmy + recos lieux
- `(tabs)/accueil.tsx` — home connectée (custom HomeTabButton centré)
- `(tabs)/evenements.tsx` — feed événements
- `(tabs)/profil.tsx` — profil user

### Pro (8 écrans, espace prestataire)
- `(pro)/dashboard.tsx`, `fiche.tsx`, `avis.tsx`, `become.tsx`, `paywall.tsx`, `profil.tsx`, `approved.tsx`

### Détails / création / divers
- `prestataire/[slug].tsx` — fiche prestataire publique
- `evenement/[slug].tsx` — détail événement
- `create/{index, lieu, evenement, avis-prestataire}.tsx`
- `pepites-du-mois.tsx`, `welcome-plus.tsx`, `hilmy-plus.tsx`, `notifications.tsx`, `favoris.tsx`, `post-auth.tsx`, `index.tsx`

**Total ~44 routes** + `src/` 9 dossiers de composants/lib (auth, gamification, places, cards, voix, onboarding, ui, queries, utils).

**Lignes de code totales app + src** : 19 705 LOC.

---

## 🔍 Parité Web vs App

| Feature | Web (hilmy.io) | App native | Gap |
|---|---|---|---|
| **Auth signup/login email** | ✅ | ✅ | aligné |
| **Sign in with Apple** | 🟡 stub `AuthShell` | ✅ branché `AppleSignInButton` (commit `f0b87c9`) | **app en avance sur web** ⚠️ |
| **Annuaire prestataires (liste + filtres)** | ✅ | ✅ `(tabs)/annuaire.tsx` | aligné |
| **Fiche prestataire (détail + photos + galerie autoplay Cercle Pro)** | ✅ (galerie autoplay PR #42) | 🟡 `prestataire/[slug].tsx` présent — autoplay carrousel Cercle Pro **à vérifier sur device** | partiel |
| **Recommandations lieux (liste + création)** | ✅ | ✅ `(tabs)/recos/` + `create/lieu.tsx` | aligné |
| **Voix Hilmy** | ✅ | ✅ `recos/voix/[slug].tsx` | aligné |
| **Événements (liste + détail + création)** | ✅ | ✅ `(tabs)/evenements.tsx` + `evenement/[slug].tsx` + `create/evenement.tsx` | aligné |
| **Module Je cherche complet** (PRs #56-62, livré 4 mai web) | ✅ | ❌ **AUCUNE TRACE** dans `app/` ni `src/` (grep `je-cherche\|TeamCherche\|demandes` = 0 résultat) | 🔴 **GAP CRITIQUE** |
| **TeamCherche carrousel home** (PR #58 + #65 + #67) | ✅ sur `/accueil` | ❌ accueil tab existe mais pas de section TeamCherche | 🔴 **GAP CRITIQUE** |
| **Dashboard prestataire** (stats Premium PR #49, stats avancées PR #51, devis PR #50) | ✅ | 🟡 `(pro)/dashboard.tsx` présent mais **ne lit pas** `devis_requests`, `profile_views`, ni stats avancées | partiel |
| **Limites photos par palier (Standard 5 / Premium 20 / Cercle Pro illimité PR #41)** | ✅ via `lib/palier-limits.ts` | ❌ pas de palier-limits dans l'app, paywall affiche "Photos illimitées (gratuit = 5)" — **copy obsolète** | 🔴 **GAP CRITIQUE** |
| **Code promo COPINE10** (PR #48, mig 35) | ✅ champ `/tarifs` | ❌ aucune trace `promo_codes` | 🔴 |
| **Devis Express Cercle Pro** (PR #50, mig 36) | ✅ | ❌ aucune trace `devis_requests` | 🔴 |
| **Stats hebdo email Premium** (PR #49) | ✅ cron Vercel | N/A (côté serveur, pas app) | n/a |
| **Stats avancées Cercle Pro** (PR #51) | ✅ `/dashboard/prestataire/stats-avancees` | ❌ pas dans `(pro)/dashboard.tsx` | 🔴 |
| **Tarifs Standard 19 / Premium 49 / Cercle Pro 99** | ✅ `/tarifs` | ❌ paywall présente une **copy générique obsolète** ("Featured placement", "1 évent promo / mois") qui ne mentionne pas les paliers à 19/49/99€ | 🔴 **GAP CRITIQUE** |
| **Stripe / paiements** | 🟡 mailto only (pas LIVE) | ❌ aucun Stripe natif | 🟡 cohérent (Stripe non-LIVE) |
| **Notifications in-app** | ✅ table notifications + page parametres | ✅ `notifications.tsx` + `<NotifBell />` realtime | aligné |
| **Push notifications (overlay banner OS)** | n/a | 🟡 hook `useNotificationsListener` est **STUB no-op** documenté V1.1, `expo-notifications` **NON installé** | 🔴 **GAP** |
| **Profil utilisateur** | ✅ `/dashboard/utilisatrice/profil` | ✅ `(tabs)/profil.tsx` | aligné |
| **Favoris** | ✅ `/dashboard/utilisatrice/favoris` | ✅ `app/favoris.tsx` | aligné |
| **Page admin signalements Je cherche** (PR #61) | ✅ `/admin/je-cherche-signalements` | ❌ admin web only — l'app native ne vise pas l'admin (cohérent) | n/a (intentionnel) |
| **Pages légales (Privacy / CGU / Mentions / Cookies)** | ✅ refonte mai 2026 | ❌ aucune route legal dans l'app, aucune URL `hilmy.io/confidentialit*` referencée | 🔴 **REQUIS App Store** |
| **Manifeste / charte / À propos** | ✅ | ❌ pas de route équivalente | 🟡 |
| **Gamification (paliers, badges, points)** | 🟡 web partiel | ✅ `src/components/gamification/{ProgressionCard, PaliersModal, NotifBell}.tsx` | **app en avance sur web** ⚠️ |

**Bilan** : ~70% de parité sur les fonctionnalités historiques. ~0% sur les features livrées web entre 4-5 mai 2026 (Phase 4 + Phase 6). Ces 5 jours d'écart représentent **8 features bloquantes**.

---

## 🔔 Push notifications

### État actuel
- `expo-notifications` : **NON installé** dans `package.json`
- Hook `src/hooks/useNotificationsListener.tsx` : **STUB no-op** documenté
- Commentaire interne du fichier explique :
  > V1.0 — STUB no-op. Le système de notifs locales OS (overlay banner iOS) est différé à V1.1 : il nécessite la config APNs côté Apple Developer (Push Notifications capability + aps-environment entitlement sur le provisioning profile EAS) qui n'a pas été provisionnée pour le RDV investisseur. Le rebuild échouait sur : "Provisioning profile doesn't support Push Notifications capability"
  > V1.1 (après config APNs) : Réinstaller expo-notifications, restaurer le subscribe + scheduleNotificationAsync sur palier_franchi + reco_sauvegardee. Voir l'historique git : commit 871e111 a le code complet à restaurer.

### Réalisme : ce qu'il manque pour activer push
1. **Apple Developer** :
   - Activer **Push Notifications** capability sur l'App ID `io.hilmy.app`
   - Créer un **APNs Auth Key** (.p8) ou APNs Cert (Production + Development)
   - Re-générer le Provisioning Profile avec `aps-environment` entitlement
2. **EAS** :
   - Configurer `eas credentials` pour pousser la nouvelle clé APNs
   - Re-build via `eas build --profile production` avec le profile mis à jour
3. **Code app** :
   - Réinstaller `expo-notifications`
   - Restaurer le contenu du commit `871e111` (subscribe + `scheduleNotificationAsync`)
   - Ajouter `registerForPushNotificationsAsync()` au mount + stocker `expo_push_token` dans `user_profiles`
4. **Backend** :
   - Migration : colonne `user_profiles.expo_push_token TEXT NULL`
   - Edge Function Supabase / cron Vercel qui POST vers `https://exp.host/--/api/v2/push/send` quand :
     - Nouvelle réponse Je cherche → push à la demandeuse
     - Demande résolue → push aux répondeuses
     - (Optionnel) Nouvelle adresse dans la ville de l'user
5. **Android** :
   - FCM **non configuré** dans `app.json` (`android.googleServicesFile` absent)
   - À ajouter pour parité Android (Apple-only acceptable V1.0 si décision business)

**Effort estimé total push** : ~2-3 jours (1j Apple + APNs + EAS, 1j code app + backend, 0.5j tests).

---

## 🚀 App Store readiness

| Item | Statut | Détail |
|---|---|---|
| Bundle Identifier | ✅ | `io.hilmy.app` (cohérent iOS + Android) |
| Version | ⚠️ | `1.0.0` dans `app.json` (jamais incrémenté) |
| Build number | ✅ via EAS | `appVersionSource: "remote"` + `production.autoIncrement: true` dans `eas.json` |
| Apple Team ID | ✅ | `47TC3ZQ294` |
| EAS projectId | ✅ | UUID `09809102-ae2f-46e3-907d-32dea0d630b7` |
| EAS profiles | ✅ | dev / dev-device / preview / production |
| EAS submit production iOS | ✅ | `appleTeamId: 47TC3ZQ294` configuré |
| App Icon 1024×1024 | ✅ | `assets/images/icon.png` (PNG 1024×1024 8-bit RGB non-interlaced — vérifié) |
| Splash screen | ✅ | `assets/images/splash.png` (18KB), background `#F5F0E6` |
| Sign in with Apple | ✅ | `usesAppleSignIn: true` + plugin `expo-apple-authentication` + `<AppleSignInButton />` branché login + signup |
| Privacy Policy URL | ❌ | Aucune URL legal dans l'app, à pointer vers `https://hilmy.io/confidentialite` lors du submit App Store Connect |
| Terms / EULA URL | ❌ | Idem `/cgu` à fournir dans App Store Connect |
| App Tracking Transparency (ATT) | ✅ N/A | Pas d'analytics tiers IDFA-based dans l'app |
| Account Deletion in-app | ❌ | Aucun bouton "Supprimer mon compte" trouvé. **Apple Guideline 5.1.1(v) = REJET AUTO depuis 2022** si présent côté signup |
| `ITSAppUsesNonExemptEncryption` | ✅ | `false` dans `app.json` (pas de chiffrement custom) |
| `NSPhotoLibraryUsageDescription` | ⚠️ | `expo-image-picker` installé mais permission text non vérifié — à confirmer avant submit |
| `NSCameraUsageDescription` | ⚠️ | Idem |
| Modes "beta" / "TODO" visibles user | 🟡 | Paywall obsolète (cf B1 ci-dessous) à reword avant submit |

**Verdict App Store readiness pure : 11/16 ✅, 4 ⚠️/❌ à fixer avant submit**.

---

## 🛡️ Sécurité

| Check | Statut |
|---|---|
| Pas de `service_role` hardcodé | ✅ Vérifié grep — aucune occurrence dans `app/` ni `src/` |
| Variables env via `EXPO_PUBLIC_*` | ✅ `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GAMIFICATION_ENABLED`, `EXPO_PUBLIC_HILMY_WEB_API_URL` |
| Anon key publique côté client = OK | ✅ comportement attendu (préfixe `EXPO_PUBLIC_`) |
| `expo-secure-store` installé | ✅ pour tokens session |
| `RLS` Supabase respectées | ✅ même DB que web — l'app utilise les mêmes policies |
| Storage permissions | ⚠️ `expo-image-picker` installé, permissions texte à confirmer dans `infoPlist` |
| `.env` git-ignored | ✅ vérifié `.gitignore` |
| Logs PII | ⚠️ non audité dans cette mission |

---

## 🎯 Gaps critiques (à fixer pour V1.0 = parité + push + App Store)

### 🔴 BLOQUANTS App Store / business

1. **Paywall paliers obsolète** · `app/(pro)/paywall.tsx` · **Bloquant**
   - Copy actuelle : "Featured placement", "Photos illimitées (gratuit = 5)", "1 événement promo / mois", "Support prioritaire" — **rien à voir** avec Standard 19€/Premium 49€/Cercle Pro 99€ validés web
   - Risque : prestataires qui paient via web puis ouvrent l'app voient des promesses différentes → confusion + risque RGPD/conso
   - Effort : ~6-8h (refonte écran complet + lecture `palier` depuis profile + copy alignée /tarifs)

2. **Module Je cherche complet absent** · `app/` (à créer) · **Bloquant si on annonce l'app**
   - Web a livré le module 4 mai (PRs #56-62) puis refonte UX 5 mai (#63/#65/#67) → **5 jours d'écart**
   - Tables prod `demandes`, `demande_responses`, `demande_signalements`, `demande_response_thanks` existent mais **0 lecture/écriture** côté app
   - Effort : ~2-3 jours (5 écrans : feed, détail, création, réponse, modal signalement) + composants + types + RLS-aware queries
   - **Sans ce module, l'app livre une version d'avant le pivot UX du 4 mai** — incompatible avec le storytelling marketing actuel

3. **Account Deletion in-app** · à créer · **REJET APPLE AUTO**
   - Apple Guideline 5.1.1(v) en vigueur depuis 2022 : si signup → must have delete account in-app
   - L'app web a le même gap (tracé dans audit précédent)
   - Effort : ~4-6h (UI + server action + cascade soft-delete)

4. **Privacy Policy + Terms URL** · à pointer dans App Store Connect · **Required Apple submit**
   - Web a `/confidentialite`, `/cgu`, `/mentions-legales`, `/cookies`
   - Pas de fix code app nécessaire, juste fournir les URLs lors du submit
   - Effort : ~5 min côté Connect

### 🟡 GAPS importants V1.1

5. **Push notifications** · 2-3j (cf section dédiée) · pas bloquant V1.0 mais critique pour engagement
6. **Limites photos par palier dans l'app** · `app/(pro)/fiche.tsx` ou similaire · ~4h · à porter de `lib/palier-limits.ts` web
7. **Devis Express + Stats avancées Cercle Pro** · ~1.5j · porter PR #50 + #51 dans l'app
8. **Code promo COPINE10** · ~3h · UI saisie côté paywall app après refonte (item #1)
9. **Pages légales in-app ou WebView** · ~2h · option WebView vers `hilmy.io/confidentialite`

### 🟢 NICE-TO-HAVE

10. **TeamCherche carrousel sur l'accueil** · 4h · cohérence visuelle avec home web
11. **Sentry / monitoring** · 2h · alerte crash production
12. **`expo-doctor` + `npm outdated`** · 30min · santé deps avant submit

---

## 🗓️ Plan de bataille proposé

### Phase 1 — Parité critique (W1, ~5 jours)
1. **Refonte paywall paliers** (Standard/Premium/Cercle Pro à 19/49/99€) — 1j
2. **Module Je cherche** (5 écrans + types + queries) — 2.5j
3. **Account deletion in-app** (UI + cascade) — 0.5j
4. **Limites photos par palier** + intégration `palier-limits.ts` — 0.5j
5. **Pages légales WebView** + URLs Apple Connect — 0.5j

### Phase 2 — Premium features + push (W2, ~5 jours)
1. **APNs setup** (Apple Developer + EAS credentials) — 0.5j
2. **expo-notifications + push code** (subscribe + register token + handlers) — 1.5j
3. **Devis Express + Stats avancées Cercle Pro** dans `(pro)/dashboard.tsx` — 1.5j
4. **Code promo dans paywall app** — 0.5j
5. **Sentry + monitoring** — 0.5j
6. **`expo-doctor` + maj deps + smoke tests** — 0.5j

### Phase 3 — TestFlight + App Store soumission (W3, ~3 jours)
1. **Build EAS production** + upload TestFlight — 0.5j
2. **Tests internes TestFlight** (5 testeurs, 2 jours feedback) — 2j
3. **Soumission App Store + métadonnées** — 0.5j (privacy URL, terms URL, screenshots, app preview, copy store)

---

## ⏱️ Estimation totale

**~13 jours de Claude Code Mac autonome** pour atteindre App Store soumission.

Répartition :
- **8 jours code** (Phase 1 + Phase 2)
- **3 jours TestFlight + retours** (Phase 3, dépend du temps de feedback Jiji + testeurs)
- **2 jours buffer** (conflits Supabase, RGPD, métadonnées App Store, recettes finales)

**Bottleneck identifiés** :
- Apple Developer setup APNs (humain, pas Claude) → ~1h Jiji
- Tests TestFlight nécessitent Jiji ou des testeurs manuels → ~2j calendrier hors dev
- Réviewer Apple : 24-48h en moyenne post-submit

**Calendrier réaliste si Jiji disponible 4h/semaine pour validation TestFlight** :
- W1 (Phase 1) : code parité critique → preview EAS interne testable
- W2 (Phase 2) : push + premium features → preview EAS final
- W3 (Phase 3) : build prod + soumission → review Apple
- → **App Store live ~3 semaines calendaires** à partir du début Phase 1.

---

## 🟢 Points positifs (rare dans un audit, mais à noter)

- Stack moderne **Expo SDK 54 + RN 0.81 + Expo Router typed** — pas de dette technique
- **Sign in with Apple branché** côté app (login + signup) — l'app est en avance sur le web !
- **Gamification déjà implémentée** (paliers, badges, points, NotifBell) — l'app est aussi en avance là-dessus
- **EAS configuré proprement** (4 profils, autoIncrement build, appleTeamId) — pipeline build solide
- **Repos web et app séparés** — bon découplage architectural
- **0 service_role exposé** — sécurité crédentials propre
- **Polices Hilmy (Fraunces + DM Sans)** correctement chargées via `@expo-google-fonts`
