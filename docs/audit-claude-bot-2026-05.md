# Audit du travail de Claude Code GitHub — Mai 2026

**Auditrice :** Claude Code (audit critique adversarial)
**Date :** 3 mai 2026
**Périmètre :** PRs #5, #7 (mergées) + livrables annoncés "PR #8" (audit UX)
**Branche d'audit :** `audit/claude-bot-review`

---

## TL;DR

Le bot GitHub livre du **code propre, fonctionnel, qui compile** sur PR #5 et #7 — mais ses **fixes sont partiels** (route fantôme `/proposer-un-evenement` corrigée dans 5 fichiers, oubliée dans `proxy.ts:41`) et **laisse des incohérences** (commentaire stale sur `pays` après mig 32, pas de rollback file, colonne `pays` ajoutée mais pas mise dans le SELECT). **PR #8 (audit-ux) introuvable** sur le repo : ni la branche `claude/issue-8-20260502-2217`, ni le fichier `docs/audit-ux-2026-05.md` n'existent — Volet 3 partiellement skip-é, audit du substitut `audit-perf-2026-05.md` (branche `claude/issue-9`) à la place. Recommandation : **bot OK pour fixes ciblés + migrations simples, à NE PAS laisser merger sans review humaine**, surtout sur fixes "find-and-replace" multi-fichier.

---

## 🚨 Bugs critiques en prod

**Aucun bug critique en prod** dans les PRs #5 et #7 mergées. Aucune fuite de données, aucune régression de build, aucune clé exposée.

⚠️ **Bug latent (cosmétique, pas en prod) à signaler côté audit-perf** :

- **`proxy.ts:41`** liste encore `/proposer-un-evenement` dans `protectedPaths`. Ce n'est **pas une route existante** (cf. `ls app/proposer-un-evenement* → no matches`). Pas de bug fonctionnel direct (la liste matche un préfixe inexistant → personne ne tombe dessus), mais c'est de la cruft + signal que la PR #10 (cf. branche `claude/issue-10-20260502-2234`) qui propose de fixer les CTAs `/proposer-un-evenement` **rate** ce 6e fichier.

---

## PR #5 — Migration 32 : ajout colonne pays sur profiles

### Ce qui est bien

- ✅ Migration **idempotente** : `ADD COLUMN IF NOT EXISTS` ([supabase/migrations/32_add_pays_to_profiles.sql:12](supabase/migrations/32_add_pays_to_profiles.sql:12))
- ✅ `NOTIFY pgrst, 'reload schema';` présent ([32_add_pays_to_profiles.sql:15](supabase/migrations/32_add_pays_to_profiles.sql:15)) — bonne pratique pour PostgREST cache
- ✅ Header de doc clair (contexte du bug, fix, non-destructif)
- ✅ Type `TEXT` (non contraint) — cohérent avec la colonne `ville` existante
- ✅ Build Next.js compile sans erreur (`npm run build` → `✓ Compiled successfully in 2.8s`)

### Ce qui est problématique

#### 1. Pas de fichier rollback (rupture du pattern récent)

Toutes les migrations **24 à 31** ont un `_rollback.sql` jumeau. Migration 32 n'en a pas.

```
supabase/migrations/24_voix_hilmy_rollback.sql
supabase/migrations/25_voix_hilmy_follows_rollback.sql
…
supabase/migrations/31_delete_recommendations_rls_rollback.sql
supabase/migrations/32_add_pays_to_profiles.sql  ← rollback manquant
```

**Impact** : si un jour la fondatrice veut rollback (peu probable pour un ADD COLUMN, mais le pattern est établi), elle doit improviser le SQL. Pour cohérence : ajouter `32_add_pays_to_profiles_rollback.sql` avec `ALTER TABLE public.profiles DROP COLUMN IF EXISTS pays;`.

#### 2. `pays` n'a PAS été ajouté à `PRESTATAIRE_SELECT`

[lib/supabase/queries/prestataires.ts:18-49](lib/supabase/queries/prestataires.ts:18) liste les colonnes sélectionnées pour toutes les requêtes prestataires. **`pays` n'y figure pas** — donc tous les rendus côté front (annuaire, fiche, similaires) restent ignorants du pays nouvellement stocké. Le bot a fait le strict minimum pour débloquer l'insert mais n'a pas raccordé la chaîne complète.

#### 3. Commentaire stale dans `lib/supabase/types.ts`

[lib/supabase/types.ts:59-60](lib/supabase/types.ts:59) :
```ts
// Localisation — colonnes optionnelles (pays/region/code_postal/zone_intervention
// n'existent PAS encore dans la table profiles ; ajoutées via ALTER future si besoin).
```

Le commentaire **dit explicitement que `pays` n'existe pas** alors qu'il existe maintenant. Idem pour [lib/supabase/queries/prestataires.ts:14-17](lib/supabase/queries/prestataires.ts:14) :
```ts
// ⚠️ On ne sélectionne que les colonnes qui existent vraiment dans la DB.
// Les champs pays/region/code_postal/zone_intervention du type TS Prestataire
// sont absents de la table `profiles` actuelle…
```

Le bot a touché ce fichier dans PR #7 mais n'a pas pensé à mettre à jour le commentaire stale lié à PR #5.

### Colonnes manquantes potentielles dans `profiles` (audit élargi)

J'ai grep tous les `from('profiles').insert()` et `.update()` du repo et croisé avec les `ALTER TABLE public.profiles ADD COLUMN` des migrations.

**Colonnes envoyées par les onboardings et le dashboard fiche** :

| Colonne | Source insert/update | Confirmée existante en DB ? |
|---------|----------------------|-----------------------------|
| `user_id`, `nom`, `slug`, `categorie`, `ville`, `whatsapp`, `instagram`, `email`, `site_web`, `linkedin`, `services`, `galerie`, `photos`, `status`, `source_import`, `tagline`, `description`, `prix_from`, `devise` | google + manuel + dashboard | ✅ confirmé (migrations 01) |
| `pays` | google onboarding L149 | ✅ migration 32 |
| `phone_public` | manuel L205, dashboard L145 | ⚠️ **NON listé** dans les migrations 01-32 |
| `tiktok` | manuel L208, dashboard L147 | ⚠️ **NON listé** dans les migrations 01-32 |
| `facebook` | manuel L210, dashboard L149 | ⚠️ **NON listé** dans les migrations 01-32 |
| `youtube` | manuel L211, dashboard L150 | ⚠️ **NON listé** dans les migrations 01-32 |

**À vérifier en DB prod** : ces 4 colonnes (`phone_public`, `tiktok`, `facebook`, `youtube`) sont absentes de toute migration `*.sql` (j'ai vérifié avec `grep -rn "phone_public\|tiktok\|facebook\|youtube" supabase/migrations/*.sql | grep -v rollback` — aucun match en `ADD COLUMN`).

Deux explications possibles :
1. Elles existent déjà dans la table de base (créée hors migrations versionnées, ex. via UI Supabase) — auquel cas ce sont des dettes de versionning silencieuses
2. Elles n'existent **pas** et **chaque insert manuel + chaque update fiche depuis le dashboard renvoie probablement le même crash PostgREST que `pays`** — bug latent identique à celui que mig 32 vient de corriger

**Action recommandée** : `psql` direct sur prod pour vérifier `\d public.profiles`, et si ces colonnes manquent, créer une migration 33 pour les ajouter d'un coup. Le bot Claude n'a pas fait cet audit élargi alors que c'était l'occasion.

### Recommandations

1. **Ajouter le fichier rollback** : `32_add_pays_to_profiles_rollback.sql`
2. **Ajouter `pays` au `PRESTATAIRE_SELECT`** dans `queries/prestataires.ts`
3. **Mettre à jour les commentaires stale** dans `types.ts:59-60` et `queries/prestataires.ts:14-17`
4. **Audit élargi** : `psql` sur prod pour confirmer/infirmer la présence de `phone_public`, `tiktok`, `facebook`, `youtube`. Migration 33 si manquantes.

---

## PR #7 — Aperçu privé fiche prestataire en attente

### Ce qui est bien

- ✅ **Anti-leak correct** : [lib/supabase/queries/prestataires.ts:127-128](lib/supabase/queries/prestataires.ts:127) filtre par `slug` ET `user_id` — un user A ne peut pas voir la fiche pending d'un user B
- ✅ **`getPrestataireBySlug` (publique) garde son filtre** `status='approved'` à [queries/prestataires.ts:103](lib/supabase/queries/prestataires.ts:103) — pas de régression
- ✅ **`<TrackPageView>` désactivé en preview** ([app/prestataire-v2/[slug]/page.tsx:168](app/prestataire-v2/[slug]/page.tsx:168)) — pas de pollution des stats `nb_vues` quand la prestataire teste sa fiche
- ✅ **Badge "Profil vérifié" caché en preview** ([page.tsx:248](app/prestataire-v2/[slug]/page.tsx:248)) — anti-leak cosmétique : une fiche pending ne doit pas s'afficher comme vérifiée
- ✅ **`<FavoriteButton>` caché en preview** ([page.tsx:276](app/prestataire-v2/[slug]/page.tsx:276)) — cohérent (on ne favorise pas une fiche non publiée)
- ✅ **Bandeau respecte la palette** : `bg-or/10`, `border-or/30`, `text-vert`, `text-or-deep` — tokens brand corrects
- ✅ **Tutoiement + ton copine** : "ta fiche n'est pas encore en ligne. Seule toi peux la voir pour l'instant." — pas de mots interdits, registre Sara respecté
- ✅ **Build OK** (compile sans erreur ni warning TS critique sur le diff)

### Ce qui est problématique

#### 1. Logique de fallback légèrement bancale

[app/prestataire-v2/[slug]/page.tsx:92-104](app/prestataire-v2/[slug]/page.tsx:92) :
```ts
const { data: row, error } = await getPrestataireBySlug(slug)

let isPreview = false
let finalRow = row

if (!row && !error) {
  const { data: previewRow } = await getPrestataireBySlugForOwner(slug, user!.id)
  if (!previewRow) notFound()
  isPreview = true
  finalRow = previewRow
} else if (error || !row) {
  notFound()
}
```

L'`else if` est mort dans 99 % des cas : il ne se déclenche que si `error` est non-null ET `row` est non-null (improbable côté Supabase). C'est une condition rédigée à la main au lieu d'utiliser un switch propre. Pas un bug, mais code smell.

#### 2. `<AvisSection>` rendue en mode preview

[page.tsx:357-364](app/prestataire-v2/[slug]/page.tsx:357) — la section avis n'est **pas conditionnée** par `!isPreview`. En théorie, une fiche pending ne devrait pas avoir d'avis (les avis sont posés sur des fiches approved, et l'utilisatrice doit être inscrite). En pratique, si une fiche passe par `pending → approved → paused → pending` (suspendue par admin), elle peut avoir des avis legacy → la prestataire les voit en preview alors qu'elle ne devrait pas. Edge case mais réel.

#### 3. `<SocialChannelsButtons>` reçoit des champs undefined

[page.tsx:260-274](app/prestataire-v2/[slug]/page.tsx:260) passe `phone_public`, `facebook`, `youtube` au composant — mais ces colonnes **ne sont pas dans `PRESTATAIRE_SELECT`** (cf. queries/prestataires.ts:18-49). Donc `finalRow!.phone_public` etc. sont `undefined` au runtime, alors que TypeScript pense qu'elles sont là.

**Pré-existant** (pas introduit par PR #7), mais le bot a touché ce code et n'a pas vu le décalage. Cohérent avec l'audit élargi de PR #5 : ces colonnes manquent peut-être en DB aussi.

#### 4. Pas de robots `noindex` sur le mode preview

Une fiche pending ne devrait pas être indexable. Le bot n'a rien ajouté côté SEO. Si une URL fuite (ex. la prestataire poste l'URL preview sur Insta), Googlebot peut la crawler, prendre l'auth wall (redirect vers signup) en page principale et donc ce n'est pas indexé en pratique. Mais pour propreté : `<meta name="robots" content="noindex">` côté preview serait du `belt and suspenders`.

### Tests runtime effectués

**Build production** : `npm run build` → `✓ Compiled successfully in 2.8s`. Pas d'erreur TS, pas de warning critique sur le diff.

**Lint** : 773 erreurs ESLint et 8318 warnings — **toutes pré-existantes** (pas introduites par PR #7). Aucune erreur sur les 2 fichiers touchés.

**Test manuel runtime** : non effectué (dev server pas lancé pour ne pas écrire en DB locale, conformément aux contraintes de la mission). Tests à effectuer manuellement :
1. Connecté en compte prestataire `pending` → `/prestataire-v2/<son-slug>` doit afficher le bandeau
2. Déconnecté → même URL → 404 (bloqué avant `getPrestataireBySlugForOwner` par le `redirect` ligne 89)
3. Connecté en autre compte → URL d'un autre prestataire pending → 404 (validé par le code)
4. DevTools Network → vérifier qu'aucune query ne renvoie les data du compte 1 quand connecté en compte 2

### Vérifications anti-leak

| Vecteur | Statut |
|---------|--------|
| Bypass via slug d'un autre user | ✅ Bloqué par `eq('user_id', userId)` |
| Bypass via direct fetch RLS | ⚠️ Dépend de la RLS Supabase sur `profiles` — non auditée ici (out of scope PR #7), mais la query côté serveur passe par le client SSR authentifié, donc RLS s'applique |
| Bypass via vue cached Vercel | ✅ Page dynamique (auth check dans root layout → tout est `force-dynamic`) |
| Indexation Googlebot | ⚠️ Pas de `noindex` mais auth wall redirect côté Server Component avant le render → en pratique non-indexable |

### Recommandations

1. Conditionner `<AvisSection>` avec `!isPreview` (defense in depth)
2. Ajouter `pays`, `phone_public`, `tiktok`, `facebook`, `youtube` au `PRESTATAIRE_SELECT` (audit élargi)
3. Refactor logique fallback en switch propre (ou early-return)
4. Optionnel : `<head><meta name="robots" content="noindex" /></head>` quand `isPreview === true`

---

## PR #8 — Audit UX

### ⚠️ INTROUVABLE — branche & fichier inexistants

**La branche `claude/issue-8-20260502-2217` n'existe pas sur origin.**

```bash
$ git ls-remote origin 'refs/heads/*' | grep -E "issue-[0-9]+"
claude/issue-6-20260502-2157   # PR #7 (aperçu privé) — mergée
claude/issue-9-20260502-2229   # audit-perf
claude/issue-10-20260502-2234  # fix /proposer-un-evenement
claude/issue-11-20260502-2234  # persist notifs preferences
claude/issue-12-20260502-2241  # perf Vercel EU + Fraunces
```

Pas de `issue-8`. Et le fichier `docs/audit-ux-2026-05.md` n'existe sur **aucune** branche. Seul `docs/audit-perf-2026-05.md` (sur `claude/issue-9-20260502-2229`) ressemble à l'audit attendu.

**Hypothèses** :
- La branche audit-ux a été supprimée après abandon de la PR
- Confusion de numérotation côté utilisatrice (les PRs visibles sur le remote sont #1, #2, #5, #7, #13, #14)
- L'audit-perf est ce qui était à auditer

**Decision pragmatique** : j'audite l'audit-perf à la place + je vérifie les claims spécifiques que la fondatrice a citées dans son brief (route `/proposer-un-evenement`, toggles notifs, etc.). C'est cohérent avec ce que les branches `claude/issue-10` et `claude/issue-11` semblent avoir tiré comme fixes d'un audit antérieur (probablement le ux audit perdu).

### Précision factuelle de `audit-perf-2026-05.md` (substitut)

**Vérifications systématiques :**

| Claim audit | Réalité vérifiée | Verdict |
|-------------|------------------|---------|
| `framer-motion` ET `motion` dans package.json | ✅ Confirmé — les deux à `^12.38.0` | ✅ Exact |
| Fraunces chargée avec 4 weights inutiles | ✅ Confirmé `weight: ["300", "400", "500", "600"]` ([app/layout.tsx](app/layout.tsx)) | ✅ Exact |
| `promesse-annuaire.jpg` 1.6 MB | ✅ 1.6M | ✅ Exact |
| `promesse-evenements.jpg` 1.8 MB | ✅ 1.8M | ✅ Exact |
| `promesse-recos.jpg` 1.5 MB | ⚠️ 1.4M (audit dit 1.5 MB) | ⚠️ Mineur |
| `hero.mp4` 3.1 MB | ✅ 3.1M | ✅ Exact |
| Pas de `vercel.json` | ✅ Confirmé `ls vercel.json → No such file` | ✅ Exact |
| "1 balise `<img>` brute trouvée" dans `nouvelle/page.tsx:465` | ❌ **2 occurrences** : ligne 283 (place.photos[0]) ET ligne 465 | ❌ **Inexact** — l'audit a manqué une |
| Région Vercel default = `iad1` US East | ✅ Default Vercel sans `vercel.json` | ✅ Exact |
| 3 queries séquentielles dans fiche prestataire | ⚠️ **Faux** : il y a déjà `Promise.all` à [page.tsx:108-123](app/prestataire-v2/[slug]/page.tsx:108) sur 2 queries (similaires + avis), seules `getPrestataireBySlug` puis `recommendation_likes` sont sérielles. Donc 1 query séquentielle initiale + 2 en parallèle + 1 séquentielle finale = 3 round-trips, pas 3 séquentielles | ⚠️ **Imprécis** |

**Conclusion factuelle** : l'audit-perf est globalement **précis à ~90 %**. Quelques imprécisions mineures, pas de claim totalement faux. Pour les fact-checks demandés par la fondatrice :

#### Route `/proposer-un-evenement` — n'existe pas

```bash
$ ls app/proposer-un-evenement* → no matches
$ grep -rn "/proposer-un-evenement" --include="*.tsx" --include="*.ts"
proxy.ts:41
app/evenements-v2/page.tsx:181, 208, 299
app/dashboard/prestataire/evenements/page.tsx:42, 71
```

**6 occurrences au total** (pas 5 comme dit dans le brief utilisatrice). La PR `claude/issue-10-20260502-2234` corrige les 5 dans les pages user-facing **mais oublie `proxy.ts:41`**. C'est un fix incomplet si jamais cette PR est mergée telle quelle.

#### Toggles notifications non persistés

[app/dashboard/utilisatrice/parametres/page.tsx](app/dashboard/utilisatrice/parametres/page.tsx) (sur `main`) — confirmé :
```ts
// Préférences locales (placeholder — non persistées tant que la table
// user_preferences n'existe pas).
const [toggles, setToggles] = useState({ emailWeekly: true, … })
```
État local React, **rien en DB**. La branche `claude/issue-11-20260502-2234` propose un fix complet (migration 33 + table `notification_preferences` + refactor server/client component). À reviewer séparément.

### Erreurs d'analyse identifiées (audit-perf substitut)

#### 1. Recommandation contradictoire avec une règle dure d'AGENTS.md

L'audit-perf §3 (Vidéo hero) recommande "**encoder une version mobile plus légère (480p, <1.5 MB)**" et "**ajouter une source WebM**".

❌ **Violation potentielle** d'AGENTS.md §3 (Règles à NE JAMAIS enfreindre) : *"Vidéo hero `/public/videos/hero.mp4` = V1 finale validée (générée Veo 3.1 / Nim). Ne pas remplacer, ne pas supprimer, ne pas compresser sans demander"*. L'audit aurait dû flag cette règle et demander confirmation avant de proposer une refonte vidéo.

#### 2. "Auth check du root layout bloque tout le cache" — claim correct mais sous-mesuré

L'audit dit que le root layout fait `supabase.auth.getUser()` ce qui force-dynamic toute l'app. Vrai. Mais l'audit propose "extraire vers un composant `<AuthProvider>` chargé en lazy" — ça touche **directement le système d'auth** qui est en règle dure intouchable d'AGENTS.md §3. Le bot aurait dû flag "demander avant d'agir".

#### 3. Score Lighthouse "estimé" sans vraie data

L'audit annonce "Performance mobile : 🔴 ~45–60 / 100" sans aucune mesure. C'est un gut-feel. La fondatrice peut prendre cette estimation pour de l'argent comptant alors que c'est de la spéculation. L'audit le précise (« non mesurable sans runtime ») mais le **chiffre coloré rouge dans un résumé exécutif a un poids psychologique fort**.

### Manques (chantiers UX/non-couverts par l'audit-perf)

L'audit est un audit **performance**, donc les manques UX listés ci-dessous sont normalement hors scope. Mais comme la fondatrice attendait un audit UX :

- **Empty states** non audités (pages annuaire vides, dashboard sans données)
- **Loading states** non audités (skeletons existent ?)
- **Error boundaries** non audités
- **Accessibility** : aucun audit a11y (alt sur images, aria-labels, focus states, contraste)
- **SEO** : meta tags / sitemap / robots.txt non vérifiés
- **Mobile responsive** : audit visuel manquant (la perf mobile est citée mais pas l'UX mobile)
- **Auth wall sur fiches prestataires** : la fondatrice a flag dans son brief que c'est un **choix produit volontaire** (acquisition par engagement). Ni l'audit-perf ni les fixes derived ne discutent ça — ils n'avaient pas à le faire (out of scope perf), mais si l'audit-ux disparu le présentait comme un bug, c'était une erreur d'analyse contextuelle. **Impossible à vérifier sans le fichier**.

### Verdict : merger en l'état

**OUI avec corrections** sur l'audit-perf (qui est ce qui existe vraiment). Les 3 erreurs d'analyse ci-dessus doivent être annotées avant merge.

Si la fondatrice cherchait l'audit-ux : **NON, le fichier n'existe pas, à régénérer**.

---

## Recommandations meta pour les prochaines issues @claude

### Prompts à améliorer

#### Exemple 1 : prompt actuel pour le bot (probable)
> "Audit UX du repo Hilmy. Liste les frictions principales et propose des fixes."

**Problème** : trop ouvert, le bot peut générer du contenu qui contredit AGENTS.md (ex. recommandations sur la vidéo hero, sur l'auth, sur le pricing).

**Reformulation suggérée** :
> "Audit UX du repo Hilmy. Avant toute recommandation, lis AGENTS.md §3 (règles à ne jamais enfreindre) et flag explicitement toute reco qui touche : auth, pricing, catégories, vidéo hero, RLS Supabase. Pour ces sujets, ne propose RIEN sans avoir d'abord demandé confirmation à la fondatrice. Le rapport doit avoir une section finale 'Recos hors scope (AGENTS.md règles dures)' qui liste ce qui a été détecté mais pas proposé."

#### Exemple 2 : pour les fixes find-and-replace
**Prompt actuel probable** : "Fix les 5 CTAs cassés vers `/proposer-un-evenement`."

**Reformulation suggérée** :
> "Pour la chaîne `/proposer-un-evenement` : (1) compte le nombre d'occurrences avec `grep -rn`. (2) liste TOUS les fichiers avant de fix. (3) fix dans pages user-facing ET dans middleware/proxy/redirects/sitemap. (4) build local + check qu'aucune occurrence ne reste : `grep -rn "/proposer-un-evenement"` doit retourner 0 résultat avant commit. (5) si une occurrence reste après fix, expliquer pourquoi dans la PR."

### Garde-fous à ajouter dans `AGENTS.md`

À coller dans `AGENTS.md` après §11 (Workflow recommandé pour Claude) :

```markdown
---

# 11.bis Garde-fous spécifiques au bot GitHub @claude

## Avant toute PR du bot, le check-list suivant est OBLIGATOIRE

### Migrations SQL
- [ ] Fichier `_rollback.sql` jumeau créé (pattern depuis migration 24)
- [ ] Si nouvelle colonne ajoutée : la mettre AUSSI dans le SELECT centralisé concerné (ex: `PRESTATAIRE_SELECT` dans `lib/supabase/queries/prestataires.ts`)
- [ ] Si nouvelle colonne ajoutée : grep + update des commentaires stale dans `lib/supabase/types.ts` qui disent "n'existe pas encore"
- [ ] Audit élargi : grep `from('<table>').insert(` et `update(` pour lister TOUTES les colonnes envoyées par le code, et croiser avec les `ALTER TABLE` des migrations. Toute colonne non présente en migration mais utilisée en code = bug latent à signaler.

### Fixes find-and-replace multi-fichier
- [ ] Avant fix : `grep -rn "<chaîne>" --include="*.ts" --include="*.tsx"` → noter le nombre exact
- [ ] Inclure dans le scope : `proxy.ts`, `middleware.ts`, `next.config.js`, `app/sitemap.ts`, `app/robots.ts`, fichiers de redirect Vercel
- [ ] Après fix : re-grep → doit être 0
- [ ] PR description : copier/coller le grep avant + après

### Recommandations UX/perf qui touchent les règles dures
Toute reco qui touche : système d'auth, pricing, catégories métier, vidéo `/public/videos/hero.mp4`, RLS Supabase, secrets/clés env vars
→ NE PAS proposer en quick win. Les lister dans une section séparée "🔒 Recos bloquées par AGENTS.md règles dures — demander confirmation fondatrice avant tout PR" avec le lien vers la règle dure concernée.

### Audits / rapports markdown générés par le bot
- [ ] Toute affirmation "ligne X de fichier Y" doit être vérifiable : citer la ligne exacte et le contenu visible
- [ ] Tout chiffre (taille fichier, nombre d'occurrences, score perçu) doit citer la commande shell utilisée pour le mesurer, pas une estimation gut-feel
- [ ] Section "Limites de l'audit" obligatoire en début de doc : ce qui n'a PAS été mesuré et pourquoi
- [ ] Pas de note Lighthouse/score sans data réelle — utiliser "non mesuré, voir [outil]" plutôt qu'une estimation rouge/jaune/vert qui ferait croire à une vraie mesure
```

### Types de tâches à NE PAS confier au bot GitHub

| Tâche | Raison |
|-------|--------|
| **Modifications du système d'auth** | Règle dure AGENTS.md §3, le bot ne peut pas évaluer le contexte historique du système |
| **Refactos qui touchent root layout / middleware** | Impact transverse trop large pour PR ciblée — le bot peut casser caching, SSR, RLS |
| **Audits "stratégie produit"** | Le bot ne distingue pas un trade-off produit volontaire (ex. auth wall fiches) d'un bug — manque de contexte business |
| **Fixes find-and-replace sans grep complet préalable** | Le bot oublie systématiquement les références dans middleware/proxy/sitemap |
| **Toute migration DB destructive** (DROP, TRUNCATE) | AGENTS.md §3 — confirmation explicite obligatoire |
| **Recos sur la vidéo hero** | Règle dure — V1 figée |
| **Rotation/modification de clés/secrets** | Sécurité |

### Workflow d'amélioration

**Pour les PRs du bot, processus de review obligatoire :**

1. **Lecture humaine du diff complet** avant tout merge — le bot peut compiler sans warning et quand même rater un fichier secondaire (cf. `proxy.ts:41`).
2. **`grep -r` sur les chaînes touchées** dans toute la PR (ex: si le fix touche route X, grep X dans tout le repo et croiser avec les fichiers du diff).
3. **Test runtime sur le parcours impacté** — le `npm run build` clean ne garantit pas le bon fonctionnement runtime.
4. **Vérification des effets de bord sur les SELECT** quand une colonne est ajoutée/modifiée en DB.
5. **Squash merge** systématique pour garder une historique propre — le bot fait souvent plusieurs petits commits intermédiaires.
6. **Limite : 1 PR @claude open à la fois** sur ce repo — éviter la conflict multiplexée.
7. **Période de soak** : laisser une PR du bot 24h en review minimum avant merge sur main, pour tomber sur les edge cases que la lecture rapide rate.

---

*Audit généré le 3 mai 2026 — analyse statique du repo + tests build local. Pas d'accès runtime prod, pas d'accès DB prod.*
