# Session Phase 1 — Quick wins Cercle Pro + Cleanup résiduel — 2026-05-04

## TL;DR
6 PRs mergées auto en autonomie. **4 features Premium/Cercle Pro maintenant live** (photos par palier, carrousel autoplay, mise en avant prio, support prioritaire). 5 surfaces contradictoires restantes de l'audit PR #35 fermées (charte, comment-ca-marche, dead code). Email contact harmonisé (hotmail → hello@). Phase 1 terminée en ~14 min sur 9h budgetées (rythme rapide vu le scope précis fourni). Phase 2 (Newsletter+Boosts) prête à démarrer.

## PRs créées + statut merge

| PR | Sous-tâche | Titre | Statut |
|---|---|---|---|
| [#41](https://github.com/jihaneessmaliki-sys/hilmy/pull/41) | A | feat(palier): limites photos par palier (Standard 5 / Premium 20 / Cercle Pro illimité) | ✅ Mergée 12:38:53 |
| [#42](https://github.com/jihaneessmaliki-sys/hilmy/pull/42) | B | feat(cercle_pro): carrousel autoplay sur fiche prestataire | ✅ Mergée 12:41:51 |
| [#43](https://github.com/jihaneessmaliki-sys/hilmy/pull/43) | C | feat(annuaire): tri par palier (Cercle Pro > Premium > Standard) | ✅ Mergée 12:43:55 |
| [#44](https://github.com/jihaneessmaliki-sys/hilmy/pull/44) | D | feat(cercle_pro): support prioritaire ([PRIORITAIRE] + SLA 12h + badge UI) | ✅ Mergée 12:45:44 |
| [#45](https://github.com/jihaneessmaliki-sys/hilmy/pull/45) | E | fix(content): cleanup /charte + /comment-ca-marche + dead code ForPrestataires | ✅ Mergée 12:48:35 |
| [#46](https://github.com/jihaneessmaliki-sys/hilmy/pull/46) | F | fix(contact): hilmy.io@hotmail.com → hello@hilmy.io (2 occurrences) | ✅ Mergée 12:50:31 |

Total : **~14 min** entre la 1ère PR et la 6ème (plus le triage initial). Bien sous la time-box 9h.

## Avant / Après par feature

### A. Photos par palier (PR #41)
**Avant** : aucune limite enforced. Une prestataire Standard pouvait uploader 50 photos.

**Après** :
| Palier | Limite | Affichage compteur |
|---|---|---|
| Standard | 5 photos | `3 / 5 photos` |
| Premium | 20 photos | `12 / 20 photos` |
| Cercle Pro | illimité | `14 photos · illimité` |

Bouton "Ajouter" visuellement disabled à la limite. Tentative au-delà = message d'erreur explicite invitant à upgrade.

**Architecture** : nouveau module `lib/palier-limits.ts` (single source of truth) avec `PHOTO_LIMIT`, `canUploadMorePhotos()`, `photoCountLabel()`. Réutilise le type `Palier` depuis `app/tarifs/_lib/pricing.ts`.

### B. Carrousel autoplay Cercle Pro (PR #42)
**Avant** : galerie statique grid 4 colonnes pour tous les paliers.

**Après** :
- Si `palier === 'cercle_pro'` ET ≥2 photos URL → `GalleryAutoplayCarousel` (auto-rotate 4s, pause hover, swipe mobile, indicateurs cliquables, click → lightbox existant)
- Sinon → fallback `PhotoGallery` existante (grille classique)

**Architecture** : composant maison `components/v2/GalleryAutoplayCarousel.tsx` (185 lignes). Pas de lib externe ajoutée (zéro ko bundle). Pure CSS scroll-snap + JS minimal. Respecte `prefers-reduced-motion` + Page Visibility API (pause si onglet en background).

### C. Tri annuaire par palier (PR #43)
**Avant** : tri unique par `approved_at desc`.

**Après** :
- Tri primaire : palier (cercle_pro=0 > premium=1 > standard=2)
- Tri secondaire : approved_at desc (héritage du tri serveur, préservé via stable sort ES2019)

**Vérifié en preview locale** : "Hilmy Demo · Cercle Pro" en 1ère position parmi 20 cards (vs avant où il était classé par approved_at).

**Architecture** : tri client après adaptation Supabase. Pas de migration SQL (Supabase ne supporte pas facilement ORDER BY CASE sans vue dédiée). `[...list].sort()` pour ne pas muter le retour Supabase.

### D. Support prioritaire Cercle Pro (PR #44)
**Avant** : aucune différenciation Cercle Pro vs autres paliers côté support. Tous les mailtos `Mon abonnement Hilmy`, SLA "24h ouvrées" partout.

**Après** (Cercle Pro uniquement) :
| Surface | Avant | Après Cercle Pro |
|---|---|---|
| Subject mailto | `Mon abonnement Hilmy` | `[PRIORITAIRE] Mon abonnement Hilmy` |
| SLA copy | "sous 24h ouvrées" | "sous 12h ouvrées (support prioritaire Cercle Pro)" |
| Badge UI | absent | `★ Support prioritaire` (or sur fond or/15) |
| CTA bouton | "Écrire à la team" | "Écrire à la team (prio)" |

Pour Standard/Premium : aucun changement.

**Pas de système de tickets** — le tag `[PRIORITAIRE]` dans le subject est filtrable côté inbox (Gmail filter, Resend rule) → matérialise le commitment SLA sans nouveau backend.

### E. Cleanup pages contradictoires (PR #45)
**3 fixes pour fermer les contradictions restantes** identifiées par l'audit PR #35 :

1. **`/charte` Section 04 réécrite** :
   - AVANT : "**Gratuité réelle**. Hilmy est gratuit. Pour les utilisatrices comme pour les prestataires…"
   - APRÈS : "**Modèle clair**. Utilisatrices 100% gratuit / prestataires abonnement plat dès 19€/mois sans commission" + lien `/tarifs`
   - Bonus ligne 25 : "notre équipe" → "la team Hilmy"

2. **`/comment-ca-marche`** :
   - Step 01 prestataire : "Tout est gratuit, et ça le restera" → "Trois formules d'abonnement à partir de 19€/mois, sans engagement (voir les tarifs)"
   - Step 02 : "Notre équipe" → "La team Hilmy"
   - Step 03 reformulé pour clarifier abonnement (oui) vs commission (non)

3. **Dead code supprimé** : `components/landing/ForPrestataires.tsx` (68 lignes inutilisées contenant "Aucun abonnement, aucune commission, jamais." — dangereux si réintégré).

### F. Email contact harmonisation (PR #46)
**2 occurrences remplacées** :
- `app/tarifs/_lib/pricing.ts:141` : `const HELLO = 'hilmy.io@hotmail.com'` → `'hello@hilmy.io'` (impacte tous les `buildMailtoPalier` + `buildMailtoLieu`)
- `app/tarifs/page.tsx:370` : CTA FAQ "Poser ma question"

Tous les CTAs commit pricing pointent maintenant vers `hello@hilmy.io`. Vérifié en preview : 0 occurrence hotmail dans le HTML rendu.

## Bugs / blockers rencontrés
**Aucun.** Build OK à chaque étape. Les pages prestataire (`/dashboard/prestataire/*`, `/prestataire-v2/[slug]`) ne sont pas testables visuellement en preview locale sans session prestataire active, mais :
- Build statique passe (compile + génération 64/64 pages)
- Pas d'erreur server-side dans les logs preview
- Logique dérivée de sources de vérité existantes (`PALIER_INFO`, `PRICING`, `palier`)
- L'annuaire a pu être testé visuellement et confirme le tri par palier fonctionnel

## ⚠️ Point d'attention pour Jiji avant Stripe
**PR #46 dépend de la boîte `hello@hilmy.io` étant monitorée.** Si elle ne l'est pas encore :
- Soit setup une redirection `hello@hilmy.io` → `hilmy.io@hotmail.com` au niveau du provider mail (Brevo/Resend/registrar)
- Soit revert PR #46 le temps du setup

À vérifier avant de pousser sur la prod (ou avant la session Stripe ce soir).

## Statut features Premium/Cercle Pro après Phase 1

| Feature | Palier | Statut avant Phase 1 | Statut après Phase 1 |
|---|---|---|---|
| Ta fiche dans l'annuaire | Tous | 🟢 | 🟢 |
| 9 canaux de contact | Tous | 🟢 | 🟢 |
| 5 photos | Standard | 🔴 | **🟢** ✅ PR #41 |
| Avis des copines | Tous | 🟢 | 🟢 |
| Total des vues | Tous | 🟢 | 🟢 |
| Badge Standard | Standard | 🟡 | 🟡 (badge volontairement non affiché en card annuaire) |
| Dashboard détaillé | Premium+ | 🟢 | 🟢 |
| Tap-to-contact tracé | Premium+ | 🟢 | 🟢 |
| **20 photos** | Premium | 🔴 | **🟢** ✅ PR #41 |
| 1 vidéo 60s | Premium | 🔴 | 🔴 (non scope Phase 1, lourd) |
| -10% pour les Copines | Premium | 🔴 | 🔴 (dépend Stripe) |
| Stats hebdo | Premium | 🟡 | 🟡 (Phase 2) |
| Story trimestrielle | Premium | 🔴 | 🔴 (spec à clarifier) |
| 2 boosts par an | Premium | 🔴 | 🔴 (Phase 2) |
| **Photos illimitées** | Cercle Pro | 🔴 | **🟢** ✅ PR #41 |
| Vidéos illimitées | Cercle Pro | 🔴 | 🔴 (idem vidéo Premium) |
| **Carrousel autoplay** | Cercle Pro | 🔴 | **🟢** ✅ PR #42 |
| Devis express | Cercle Pro | 🔴 | 🔴 (lourd, Phase 3+) |
| **Mise en avant prio** | Cercle Pro | 🔴 | **🟢** ✅ PR #43 |
| Pastille Sélection Hilmy | Cercle Pro | 🟢 | 🟢 |
| Newsletter mensuelle | Cercle Pro | 🔴 | 🔴 (Phase 2) |
| Portrait éditorial | Cercle Pro | 🔴 | 🔴 (production contenu) |
| Stats avancées | Cercle Pro | 🔴 (V1.2) | 🔴 (V1.2) |
| Boosts illimités | Cercle Pro | 🔴 | 🔴 (Phase 2) |
| **Support prioritaire** | Cercle Pro | 🔴 | **🟢** ✅ PR #44 |

**Bilan** : 5 features passées de 🔴 à 🟢 (4 nouvelles + 1 héritée du fait que photos illimitées Cercle Pro vient avec PR #41).

## Recommandations pour Phase 2

### Phase 2 idéale : Newsletter + Boosts (estimation 2-3j)

**1. Newsletter mensuelle Cercle Pro** (~1j)
- Nouveau template Resend (réutiliser `buildRichLayout` existant)
- Cron mensuel : Vercel Cron (ajouter `crons` dans `vercel.json`) ou GitHub Action sur `repository_dispatch` ou Supabase Edge Function (preferred pour ne pas exposer aux limites Vercel Hobby)
- Curated content : décision Jiji nécessaire — top 5 recos du mois ? prestataires nouvellement validées ? événements à venir ?
- Liste destinataires : initialement les utilisatrices avec opt-in `emailWeekly === true` (réutilisation du toggle existant)

**2. Système Boosts (2 par an Premium + illimités Cercle Pro)** (~1.5j)
Spec à arbitrer côté Jiji avant code :
- Durée d'un boost : 7j ? 30j ?
- Effet visible : bump dans l'ordre annuaire ? badge "Boostée" sur la card ? les deux ?
- DB : ajouter colonnes `profiles.boosts_remaining INT`, `profiles.last_boost_at TIMESTAMPTZ`, `profiles.boost_until TIMESTAMPTZ`
- UI : bouton "Booster ma fiche maintenant" dans dashboard prestataire avec compteur restant
- Cron annuel : reset `boosts_remaining = 2` chaque 1er janvier pour Premium (Cercle Pro reste à null = illimité)
- Tri annuaire : modifier `sortByPalierThenServerOrder` pour intégrer `boost_until > now()` comme tie-breaker primaire

### Phase 3 (lourde) : Devis express + Stats hebdo email + Vidéo upload (~3-4j)

**3. Devis express** (~6h)
- Migration : table `devis_requests` (user_id, prestataire_id, message, status, created_at) + RLS
- UI fiche prestataire : bouton "Demander un devis" (Cercle Pro only)
- Server action + email transactionnel vers prestataire
- Dashboard prestataire : section "Devis reçus"

**4. Stats hebdo email Premium** (~6h)
- Template Resend `sendStatsHebdoPrestataire`
- Cron hebdomadaire (lundi matin)
- Query agrégée 7j par prestataire Premium+
- Opt-in dans `/dashboard/prestataire/parametres` (à créer si absent)

**5. Vidéo 60s upload** (~6-8h)
- Migration : `profiles.video_url TEXT` + bucket `prestataire-videos` (storage policy + max size + mime allowlist)
- UI upload dashboard fiche prestataire (Premium = 1 vidéo, Cercle Pro = illimité)
- Validation durée côté client (HTMLVideoElement metadata) + double-check côté server
- Player intégré sur fiche publique

### Phase 4+ : à arbitrer ou retirer de /tarifs

- **Story trimestrielle Premium** : clarifier la spec ou retirer
- **Portrait éditorial Cercle Pro** : production de contenu humaine, pas du dev pur — décision business sur la fréquence et le format
- **Stats avancées Cercle Pro V1.2** : déjà annoncée comme "à venir" dans le dashboard, donc cohérent
- **-10% pour les Copines Premium** : dépend Stripe — coupon Stripe + UI génération + UI saisie. Faisable une fois Stripe branché.

## Sources de vérité maintenues
Cette session a renforcé 2 sources de vérité réutilisables :
1. **`lib/palier-limits.ts`** (créée Phase 1) — limites quantitatives par palier
2. **`app/tarifs/_lib/pricing.ts`** (existant) — montants + features par palier

Quand on ajoutera les boosts ou la vidéo en Phase 2-3, étendre ces deux fichiers en premier (single source of truth).

## Prochaine étape recommandée
Si Jiji dit "continue Phase 2" :
1. **Décision spec Boosts** (10 min : durée + effet visible + UI déclencheur)
2. **Décision contenu Newsletter mensuelle** (10 min : top 5 recos ? prestataires récentes ?)
3. **Implém Newsletter mensuelle** (~1j)
4. **Implém système Boosts** (~1.5j)

Si Jiji dit "Stripe d'abord" : Phase 1 est livrée, le pricing est défendable juridiquement (audit + fix juridique + Phase 1 cumulés). Stripe peut être branché en confiance.
