# Audit Performance — Hilmy · Mai 2026

**Auditeur :** Claude (claude-sonnet-4-6) — analyse statique du code source  
**Date :** 2 mai 2026  
**Stack :** Next.js 16.2.3 (App Router) · Supabase · Vercel · Google Places API

> ⚠️ **Périmètre** : cet audit est une analyse statique du code source. Les métriques Lighthouse, TTFB réels et tailles de bundles compilés n'ont pas été mesurés (pas d'accès au runtime). Les estimations sont basées sur le code et les fichiers statiques.

---

## Résumé exécutif

### Score Lighthouse estimé (page home)
> **Non mesurable sans runtime.** Outil recommandé : `npx unlighthouse --site hilmy.io` ou PageSpeed Insights sur mobile 3G simulé.

Estimation qualitative depuis le code :
- **Performance mobile** : 🔴 ~45–60 / 100 (vidéo 3.1 MB, images 1.5–1.8 MB non optimisées, pages list sans SSR)
- **Performance desktop** : 🟡 ~65–75 / 100
- **LCP** : probablement dominé par la vidéo hero + images promesse non compressées
- **CLS** : probablement correct (fonts via `next/font`, layout stable)
- **FID / INP** : probablement impacté par le bundle `framer-motion` + `motion` chargé sur la home

### Top 3 quick wins (impact immédiat)

| # | Action | Fichier(s) | Impact estimé |
|---|--------|-----------|---------------|
| 1 | **Ajouter `vercel.json` avec `regions: ["cdg1"]`** | À créer | −100 à −200 ms TTFB pour les utilisatrices EU |
| 2 | **Compresser les 3 images promesse (1.5–1.8 MB → <200 KB)** | `public/images/promesse-*.jpg` | −LCP significatif |
| 3 | **Réduire les weights Fraunces à `["300"]` uniquement** | `app/layout.tsx` | −font payload, FCP amélioré |

---

## Findings par axe

---

### Axe 1 — Bundle JavaScript

#### État actuel
- `app/page.tsx` : Server Component ✅ — pas de `"use client"`, pas de JS inutile
- `app/layout.tsx` : Server Component ✅ — mais fait `supabase.auth.getUser()` à chaque requête (cf. Axe 6)
- Landing : **5 composants `"use client"`** sur ~10 composants de la home

#### Problèmes identifiés

**1.1 Composants client sur la home qui pourraient être refactorés**

| Composant | Fichier | Raison client | Peut être SC ? |
|-----------|---------|---------------|----------------|
| `HeroV2` | `components/landing/HeroV2.tsx` | `motion/react`, `useState`, `useEffect` | ❌ Non (animations JS) |
| `Navigation` | `components/landing/Navigation.tsx` | `useSession`, scroll listener | ❌ Non (interactif) |
| `FAQ` | `components/landing/FAQ.tsx` | `useState` (accordion open/close) | ⚠️ Partiellement (structure SC + accordéon CC) |
| `FinalCTA` | `components/landing/FinalCTA.tsx` | À vérifier | ⚠️ Possiblement SC |
| `FooterV2` | `components/landing/FooterV2.tsx` | À vérifier | ⚠️ Possiblement SC |

**1.2 Double déclaration `framer-motion` + `motion`**

`package.json` liste les deux :
```json
"framer-motion": "^12.38.0",
"motion": "^12.38.0"
```
Depuis la v12, `framer-motion` est un alias de `motion` — même package. Les imports sont mélangés :
- `HeroV2.tsx` : `from 'motion/react'`
- `FAQ.tsx`, `FadeInSection.tsx`, etc. : `from 'framer-motion'`

Bundler identique ou non selon la config. Risque de tree-shaking sous-optimal. À unifier.

**1.3 `recharts` non lazy-loadé**

`recharts` (~400 KB gzippé) est importé directement dans `components/dashboard/Charts.tsx`, lui-même importé dans `app/dashboard/prestataire/page.tsx`. Pas de `dynamic()` — le bundle recharts est inclus dans le chunk de ce dashboard.

**1.4 Pas de code splitting sur les pages list**

Les pages `app/annuaire/page.tsx`, `app/recommandations/page.tsx`, `app/evenements-v2/page.tsx` sont entièrement `"use client"` — tout le code de la page (filtres, cartes, états, adaptateurs) est embarqué dans le bundle initial.

#### Recommandations
- Unifier les imports `framer-motion` / `motion` (choisir l'un des deux)
- Supprimer la dépendance redondante de `package.json`
- Wrapper `recharts` en `dynamic(() => import(...), { ssr: false })`
- Évaluer si `FooterV2` et `FinalCTA` peuvent devenir des Server Components

---

### Axe 2 — Images

#### État actuel
- `next/image` utilisé dans `ThreePromises.tsx` ✅ (avec `fill`, `sizes` corrects)
- 1 balise `<img>` brute trouvée : `app/dashboard/utilisatrice/recommandations/nouvelle/page.tsx:465`
- Images dans `public/images/` :

| Fichier | Taille | Usage |
|---------|--------|-------|
| `promesse-annuaire.jpg` | **1.6 MB** | ThreePromises (next/image ✅) + éventuels autres |
| `promesse-evenements.jpg` | **1.8 MB** | ThreePromises (next/image ✅) + **poster vidéo** ⚠️ |
| `promesse-recos.jpg` | **1.5 MB** | ThreePromises (next/image ✅) |
| `prestataire-atelier.jpg` | **1.5 MB** | Usage à vérifier |
| `hero.jpg`, `narrative.jpg`, `closing.jpg` | ~13 KB | Optimisées ✅ |

#### Problèmes identifiés

**2.1 Images JPG lourdes (1.5–1.8 MB) non compressées à la source**

`next/image` compresse et convertit en WebP/AVIF à la demande — mais seulement quand le composant `<Image>` est utilisé. La source reste 1.8 MB en mémoire côté serveur avant optimisation.

**2.2 Poster vidéo non optimisé**

`/images/promesse-evenements.jpg` (1.8 MB) est utilisé comme `poster` de la balise `<video>` dans `HeroV2.tsx` :
```tsx
poster="/images/promesse-evenements.jpg"
```
Un attribut `poster` d'une balise `<video>` n'est PAS traité par `next/image` — l'image brute de 1.8 MB est téléchargée par le navigateur avant que la vidéo ne joue.

**2.3 Formats modernes AVIF/WebP**

`next.config.js` ne configure pas explicitement `images.formats`. Next.js 16 utilise WebP par défaut, AVIF optionnel. À activer :
```js
images: { formats: ['image/avif', 'image/webp'] }
```

**2.4 `<img>` brute en dashboard**

`app/dashboard/utilisatrice/recommandations/nouvelle/page.tsx:465` utilise `<img>` brute. Mineur (dashboard, pas page publique).

#### Recommandations
- Recompresser à la source : `promesse-*.jpg` → cible <200 KB chacune (outil : `squoosh`, `imagemin`, ou Cloudflare Images)
- Créer un poster vidéo dédié, compressé à <50 KB (720×405px, JPEG 70%)
- Ajouter `images: { formats: ['image/avif', 'image/webp'] }` dans `next.config.js`
- Remplacer la `<img>` brute du dashboard par `next/image`

---

### Axe 3 — Vidéo hero

#### État actuel
- Fichier : `/public/videos/hero.mp4` — **3.1 MB**
- `preload="metadata"` ✅ (correct sur mobile et desktop)
- `poster="/images/promesse-evenements.jpg"` ✅ (fallback configuré)
- `autoPlay muted loop playsInline` ✅ (bonne pratique vidéo web)
- Deux balises `<video>` : une mobile (`.md:hidden`), une desktop (`.hidden.md:block`)

#### Problèmes identifiés

**3.1 Poster de 1.8 MB — critique**

Comme mentionné en Axe 2, le poster de la vidéo est un JPEG de 1.8 MB. Le navigateur le télécharge immédiatement avant même de commencer la vidéo. C'est potentiellement le LCP sur mobile.

**3.2 Double chargement vidéo sur certains breakpoints**

Les deux balises `<video>` (mobile et desktop) sont présentes dans le DOM simultanément. Bien que `display: none` cache l'une d'elles, certains navigateurs peuvent quand même initialiser le téléchargement de la vidéo cachée. Les deux tags référencent le même fichier `/videos/hero.mp4` — le cache navigateur limite l'impact, mais à surveiller.

**3.3 Pas d'alternative WebM**

Le format WebM (codec VP9 ou AV1) est 30–50% plus léger que MP4/H.264 pour une qualité équivalente. Aucun `<source>` WebM présent.

**3.4 Taille mobile vs desktop**

3.1 MB pour une vidéo hero loopée est raisonnable sur desktop, mais lourd pour mobile. Une version mobile 720p compressée serait idéale.

#### Recommandations
- Créer un poster dédié `public/images/hero-poster.jpg` compressé à <50 KB (720×405)
- Encoder une version WebM : `ffmpeg -i hero.mp4 -c:v libvpx-vp9 -crf 33 -b:v 0 hero.webm`
- Ajouter `<source src="/videos/hero.webm" type="video/webm" />` avant la source MP4
- Si possible, encoder une version mobile plus légère (480p, <1.5 MB)
- Mesurer la taille réelle téléchargée via DevTools Network (filtrer sur `media`)

---

### Axe 4 — Fonts

#### État actuel
- `Fraunces` + `DM_Sans` chargées via `next/font/google` ✅
- `subsets: ["latin"]` ✅ (subsetting actif)
- `display: "swap"` ✅ (évite le FOIT)
- Preload automatique via `next/font` ✅

```typescript
// app/layout.tsx:8-21
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],  // ⚠️ 4 weights
  style: ["normal", "italic"],
  display: "swap",
})
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],  // ⚠️ 4 weights
  display: "swap",
})
```

#### Problèmes identifiés

**4.1 Fraunces : 4 weights inutiles**

Le brand guide (AGENTS.md) spécifie : *"Titres : Fraunces light 300 (italic pour accents éditoriaux). Pas d'utilisation de Bold sur Fraunces (rester en light)"*. Charger les weights 400, 500 et 600 ajoute inutilement ~60–90 KB de fonts.

**4.2 DM_Sans : weights à vérifier**

DM Sans est le texte courant. Les weights 300/400/500 sont plausibles. Le 600 est moins certain — à vérifier dans les usages effectifs.

#### Recommandations
- Réduire Fraunces à `weight: ["300"]` et `style: ["normal", "italic"]`
- Auditer l'usage réel de DM Sans 300/600 (`grep -rn "font-semibold\|font-bold\|font-light" components/ app/`)
- Estimation de gain : réduction ~30–50% du payload fonts

---

### Axe 5 — Queries Supabase

#### État actuel — Indexes

Les indexes suivants sont en place (migrations) :
- `profiles` : `(categorie, approved)`, `(ville, approved)`, `(status)` ✅
- `events` : `(status, start_date)`, `(visibility, status)` ✅
- `places` : `(hilmy_category)`, `(city)` ✅
- `recommendations` : `(profile_id, status)`, `(place_id, status)`, `(user_id)` ✅

#### Problèmes identifiés

**5.1 Fetch-all sans pagination sur les 3 pages principales (CRITIQUE)**

Les trois pages de liste publiques font un `SELECT *` complet sans `LIMIT` :

| Page | Fichier | Requête |
|------|---------|---------|
| Annuaire | `app/annuaire/page.tsx:75-80` | `from('profiles').select(...).eq('status','approved')` — TOUT |
| Recommandations | `app/recommandations/page.tsx:63-68` | `from('places').select(...)` — TOUT |
| Événements | `app/evenements-v2/page.tsx:95-101` | `from('events').select(...).eq('status','published').gte('start_date', now)` — TOUT |

Le filtrage se fait **côté client** avec `useMemo` après réception de toutes les données. Au scale actuel (quelques dizaines de profils), c'est tolérable. Dès 200+ profils, les utilisatrices attendent plusieurs secondes.

**5.2 Pages list entièrement client-side (CRITIQUE)**

Les 3 pages de liste sont `'use client'` avec `useEffect` → `fetch`. Cela signifie :
- Pas de SSR → la page est vide à l'hydratation initiale (skeleton visible)
- Pas de cache Vercel/CDN possible sur le HTML
- Le navigateur doit télécharger JS → exécuter → fetch → render (3 waterfalls)

**5.3 Index manquant : `events.city`**

`getEventsByVille` (lib) et le filtre ville dans `evenements-v2` utilisent `.ilike("city", ville)`. Il n'y a pas d'index sur `events.city`. À ajouter.

**5.4 Page prestataire — 3 queries séquentielles potentielles**

`app/prestataire-v2/[slug]/page.tsx` appelle :
1. `getPrestataireBySlug()`
2. Query recommendations (avis)
3. `getPrestatairesByCategorie()` (similaires)

Si ces queries sont séquentielles (non parallélisées avec `Promise.all`), le TTFB de la fiche est la somme des 3 latences Supabase (~300–600ms).

#### Recommandations
- Ajouter `index.sql` migration pour `events.city`
- Passer les pages list en Server Components avec pagination côté serveur (`LIMIT 20 OFFSET n`)
- Utiliser les query params URL pour les filtres → le serveur filtre directement en DB (pas de fetch-all)
- Vérifier que les 3 queries de la fiche prestataire sont parallélisées (`Promise.all`)

---

### Axe 6 — Caching / SSR / ISR

#### État actuel

| Page | Rendu | Cache |
|------|-------|-------|
| `/` (home) | Server Component | ❌ Dynamique (auth check en layout) |
| `/annuaire` | `"use client"` | ❌ Aucun |
| `/recommandations` | `"use client"` | ❌ Aucun |
| `/evenements-v2` | `"use client"` | ❌ Aucun |
| `/tarifs` | Server Component | ⚠️ Probablement dynamique (auth check layout) |
| `/(legal)/*` | Server Component | ⚠️ Probablement dynamique (auth check layout) |
| `/accueil` | Server Component | ❌ `force-dynamic` explicite |
| `/admin` | Server Component | ❌ `force-dynamic` explicite |

#### Problèmes identifiés

**6.1 Root layout bloque tout le cache (CRITIQUE)**

```typescript
// app/layout.tsx:44-47
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

Cet appel lit les cookies de session → rend TOUTE l'application `force-dynamic`. Aucune page ne peut être mise en cache statiquement par Vercel, même `/tarifs` ou les pages légales qui n'ont aucun contenu dynamique.

**6.2 Pas de `export const revalidate` sur les pages statiques**

Pages sans données dynamiques qui pourraient être pré-rendues statiquement :
- `app/tarifs/page.tsx` — contenu 100% statique (prix définis dans le fichier)
- `app/(legal)/cgu/page.tsx`, `confidentialite`, `mentions-legales`, `cookies`
- `app/manifeste/page.tsx`
- `app/charte/page.tsx`
- `app/comment-ca-marche/page.tsx`

**6.3 Pas de `<Suspense>` sur les pages server-side avec fetch**

Les pages qui font des fetch côté serveur (fiche prestataire, fiche événement) n'utilisent pas de streaming SSR avec `<Suspense>`. Tout le HTML est bloqué jusqu'à la fin des queries.

**6.4 Pas d'ISR sur les pages de liste**

Les pages `/annuaire`, `/recommandations`, `/evenements-v2` ne bénéficient pas d'ISR. Même si elles passaient en Server Components, elles n'ont pas de `export const revalidate = 60` ou similaire.

**6.5 Vercel Analytics actif (bon)**

La CSP mentionne `va.vercel-scripts.com` — Vercel Analytics est configuré. C'est une solution analytics RGPD-friendly légère. ✅

#### Recommandations
- Extraire l'auth check du layout vers un composant `<AuthProvider>` chargé en lazy, pour que le layout root reste statique
- Ajouter `export const revalidate = false` (ou `export const dynamic = 'force-static'`) sur les pages légales et `/tarifs`
- Passer les pages de liste en Server Components avec `export const revalidate = 60`
- Wrapper les sections de données avec `<Suspense fallback={<Skeleton />}>` pour le streaming

---

### Axe 7 — Vercel / Infra

#### État actuel
- Pas de `vercel.json` trouvé dans le repo
- Pas de `middleware.ts` (Edge Middleware)
- Pas de configuration région explicite
- La région par défaut Vercel est `iad1` (US East — Virginie)

#### Problèmes identifiés

**7.1 Région default US — critique pour les utilisatrices EU**

Public cible : Suisse, France, Belgique, Luxembourg, Monaco. Toutes en Europe.

Distance géographique `iad1` (Virginie) → Paris : ~7000 km. RTT typique : 100–180 ms.
Avec TLS handshake : 300–500 ms avant le premier byte.

Région recommandée : `cdg1` (Paris) ou `fra1` (Frankfurt). Cela réduirait le TTFB de 100–200 ms.

**7.2 Supabase en EU (Frankfurt) → Vercel en US**

La DB Supabase est hébergée à Frankfurt (EU). Si Vercel tourne en US, chaque Server Action / Server Component qui query Supabase traverse l'Atlantique deux fois :

```
Browser (EU) → Vercel US (iad1) → Supabase Frankfurt (EU) → Vercel US → Browser (EU)
```

Latence Supabase depuis US : ~100–150 ms par query (vs ~10–30 ms depuis EU).

**7.3 Cold starts sur les Server Actions**

Sans Edge Middleware ni configuration Keep-Alive, les Server Actions (mutations : inscription, recommandation, etc.) peuvent subir des cold starts de 200–800 ms après une période d'inactivité.

**7.4 Pas d'Edge Middleware**

L'absence de `middleware.ts` signifie que la logique d'auth (redirect non-authentifiée → /connexion) se fait au niveau des Server Components. Ce n'est pas un problème de performance critique, mais l'Edge Middleware permettrait des redirects ultra-rapides (~5 ms vs ~200 ms Server Component).

#### Recommandations
```json
// vercel.json à créer
{
  "regions": ["cdg1"],
  "functions": {
    "app/**": { "maxDuration": 30 }
  }
}
```
- Créer `vercel.json` avec `regions: ["cdg1"]` pour co-localiser Vercel et Supabase Frankfurt
- Envisager `middleware.ts` pour les redirects auth (non-négociable pour les routes dashboard)
- Mesurer le TTFB avant/après avec PageSpeed Insights ou `curl -w "%{time_starttransfer}" hilmy.io`

---

### Axe 8 — Third-party scripts

#### État actuel

**Google Places API** : géré côté serveur via API routes (`/api/places/search`, `/api/places/details`) ✅  
Aucune lib Google Maps JS n'est chargée côté client — excellent choix architectural.

```typescript
// components/google/PlaceAutocomplete.tsx
// Utilise fetch('/api/places/search?q=...') → serveur → GOOGLE_PLACES_API_KEY (server-side only)
```

**Google Tag Manager** : présent dans la CSP (`https://www.googletagmanager.com`) mais non détecté dans `layout.tsx`. Soit absent du code, soit injecté via Vercel Edge Config ou variable d'env. À vérifier.

**Vercel Analytics** : dans la CSP ✅ — analytics RGPD-friendly

#### Problèmes identifiés

**8.1 GTM potentiellement chargé**

Si GTM est actif, il peut ajouter 50–150 ms de latence et déclencher d'autres scripts. Vérifier via DevTools Network tab → "3rd party" filter.

**8.2 Double package `motion` + `framer-motion`**

Déjà mentionné en Axe 1. Ces deux packages sont le même code en v12. L'import mixte (certains fichiers depuis `framer-motion`, d'autres depuis `motion/react`) peut empêcher le tree-shaking optimal.

#### Recommandations
- Vérifier si GTM est réellement chargé (DevTools → Network → filter "google")
- Si GTM absent : retirer `https://www.googletagmanager.com` de la CSP
- Unifier tous les imports sur `motion/react` et retirer `framer-motion` de `package.json`

---

## Plan d'action priorisé

### 🚀 Quick wins (< 30 min, impact fort)

| Priorité | Action | Fichier | Impact |
|----------|--------|---------|--------|
| 1 | Créer `vercel.json` avec `regions: ["cdg1"]` | `/vercel.json` | −100–200 ms TTFB pour toutes les pages EU |
| 2 | Réduire Fraunces à `weight: ["300"]` | `app/layout.tsx:8` | −30–50 KB fonts, FCP amélioré |
| 3 | Compresser `promesse-evenements.jpg` → <50 KB (poster vidéo) | `public/images/` | LCP mobile amélioré |
| 4 | Ajouter `images: { formats: ['image/avif', 'image/webp'] }` | `next.config.js` | Images CDN servies en AVIF |
| 5 | Supprimer `framer-motion` de `package.json` (garder `motion`) | `package.json` | Bundle plus propre |

### ⚙️ Optimisations moyennes (1–3h, impact fort)

| Priorité | Action | Fichier(s) | Impact |
|----------|--------|------------|--------|
| 6 | Compresser les 3 images `promesse-*.jpg` → <200 KB chacune | `public/images/` | −LCP, −payload initial |
| 7 | Créer poster vidéo dédié <50 KB + ajouter source WebM | `HeroV2.tsx`, `public/` | −30–50% poids vidéo |
| 8 | Wrapper `recharts` en `dynamic()` | `components/dashboard/Charts.tsx` | Recharts retiré du bundle initial |
| 9 | Ajouter `export const dynamic = 'force-static'` sur les pages légales et `/tarifs` | 6 fichiers | Pages légales servies depuis CDN |
| 10 | Ajouter migration SQL index sur `events.city` | `supabase/migrations/33_index_events_city.sql` | Filtre ville événements indexé |
| 11 | Vérifier parallélisation queries fiche prestataire avec `Promise.all` | `app/prestataire-v2/[slug]/page.tsx` | −100–300 ms TTFB fiche |

### 🏗️ Refactos structurels (1+ jour)

| Priorité | Action | Impact |
|----------|--------|--------|
| 12 | **Extraire auth check du root layout** vers composant lazy → débloquer le cache static de toutes les pages non-auth | Fort — permet le caching CDN sur home, tarifs, etc. |
| 13 | **Passer `/annuaire`, `/recommandations`, `/evenements-v2` en Server Components** avec filtres via URL params + pagination serveur (LIMIT 20) | Très fort — SSR + cache + zéro blank page au load |
| 14 | **Créer `middleware.ts`** pour les redirects auth (routes dashboard) | Moyen — redirects 5x plus rapides |
| 15 | **Streaming SSR avec `<Suspense>`** sur les pages de détail (fiche prestataire, événement) | Moyen — TTFB perçu amélioré |

---

## Issues GitHub recommandées

Titres copy-paste-ready :

1. `[PERF] Créer vercel.json avec region cdg1 pour les utilisatrices EU`
2. `[PERF] Compresser les images promesse-*.jpg (1.5–1.8 MB → <200 KB chacune)`
3. `[PERF] Optimiser poster vidéo hero (1.8 MB → <50 KB) + ajouter source WebM`
4. `[PERF] Réduire weights Fraunces à ["300"] uniquement dans layout.tsx`
5. `[PERF] Passer les pages annuaire/recommandations/evenements en Server Components avec pagination`
6. `[PERF] Extraire auth check du root layout pour débloquer le cache statique`
7. `[PERF] Wrapper recharts en dynamic() pour retirer du bundle initial`
8. `[PERF] Ajouter export const dynamic = force-static sur les pages légales et /tarifs`
9. `[DB] Migration 33 — index sur events.city pour filtrage ville événements`
10. `[PERF] Unifier imports motion/framer-motion et supprimer la dépendance redondante`

---

## Outils pour mesurer

Ces éléments ne peuvent être mesurés que sur le site live :

- **Lighthouse CI** : `npx unlighthouse --site https://hilmy.io` — scan complet toutes les pages
- **PageSpeed Insights** : [pagespeed.web.dev](https://pagespeed.web.dev/) sur `/`, `/annuaire`, `/recommandations`
- **TTFB par région** : `curl -w "TTFB: %{time_starttransfer}s\n" -o /dev/null -s https://hilmy.io` depuis un VPS EU
- **Bundle analyzer** : `ANALYZE=true npm run build` (nécessite `@next/bundle-analyzer`)
- **Vercel Speed Insights** : activer dans le dashboard Vercel pour mesurer le TTFB réel par géographie

---

*Audit généré le 2 mai 2026 — analyse statique uniquement, sans accès au runtime de production.*
