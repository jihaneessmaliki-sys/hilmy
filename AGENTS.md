
Copier

# Instructions Hilmy — Contexte et règles pour Claude
 
> Ce fichier est lu automatiquement par Claude Code (local + GitHub Actions).
> Il définit le contexte, les règles dures, et les standards de qualité.
> En cas de doute, demande avant d'agir.
 
---

## ⚠️ Distinction critique : `profiles` vs `user_profiles`

Deux tables distinctes existent — ne pas confondre :

- **`profiles`** = table **prestataires** (commerces référencés dans l'annuaire). Colonnes : `nom`, `ville`, `categorie`, `palier`, `status`, `services`, `tagline`, `is_founder`, etc.
- **`user_profiles`** = table **membres** (utilisatrices de la communauté Hilmy). Colonnes : `prenom`, `bio`, `avatar`, intérêts, `voix_hilmy`, `expo_push_token`, etc.

Toute migration / requête / server action doit cibler la bonne table selon le contexte (prestataire vs membre).

---
 
## ⚠️ This is NOT the Next.js you know
 
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
 
---
 
# 1. Contexte projet
 
## Identité
- **Nom** : Hilmy
- **Tagline** : "Les meilleures adresses, entre copines."
- **Concept** : Annuaire / réseau / média pour femmes francophones
- **Marchés** : Suisse, France, Belgique, Luxembourg, Monaco
- **URL prod** : hilmy.io (alias www.hilmy.io)
- **Statut** : Live depuis avril 2026
- **Founder** : Solo (Jihane Essmaliki, basée à Genève)
## Vision long terme
Construire une marque Kelly Massol-scale (200-500M€) via 4 layers multiplicatifs :
1. SaaS subscriptions (annuaire prestataires)
2. Marketplace commission (booking)
3. Média / audience
4. Événements IRL + content brand
## Modules actifs en prod
1. **Annuaire prestataires** — 9 catégories définies
2. **Recommandations** — bouche-à-oreille structuré entre copines (lieux + prestataires)
3. **Événements** — femmes-only, flyer obligatoire
Tous fonctionnels. Toute modif doit préserver le fonctionnement existant.
 
---
 
# 2. Stack technique
 
## Frontend
- **Next.js 14** (App Router)
- React Server Components quand pertinent
- Tailwind CSS
- TypeScript strict
- Hébergement : **Vercel uniquement** (PAS Netlify, PAS WordPress — tous deux abandonnés)
## Backend
- **Supabase** (DB Postgres + Auth + Storage)
- Project ref prod : `qrlvjwqanixkhopedqqw`
- URL : `https://qrlvjwqanixkhopedqqw.supabase.co`
- Buckets : `recommendation-photos`, `event-flyers`
- RLS activé sur toutes les tables sensibles
## Intégrations externes
- **Google Places API** (autocomplete + détails lieux)
- **Stripe** (paiements abonnements — en cours d'intégration)
- **Resend** (emails transactionnels)
## Conventions code
- TypeScript strict
- Composants en PascalCase
- Hooks en camelCase préfixés `use`
- Server actions pour mutations DB (pas d'API routes sauf si nécessaire)
- Toujours typer les retours Supabase via types générés (`supabase gen types typescript`)
- Pas de `any` sauf justification dans le commit
## Architecture du repo
- `/app` — routes Next.js App Router
- `/components` — composants React réutilisables
- `/lib` — utils, helpers, clients Supabase/Stripe/etc.
- `/public` — assets statiques
- `/supabase/migrations` — SQL migrations versionnées et numérotées
- `/scripts` — scripts one-off (seeds, migrations data)
- `/docs` — documentation interne
## Conventions de nommage
- Routes : kebab-case (`/mon-compte`, `/tarifs`, `/mon-espace`)
- Composants : PascalCase (`PrestataireCard.tsx`)
- Utils : camelCase (`formatPrice.ts`)
- Server actions : verbe + nom (`createRecommendation.ts`)
- Migrations SQL : numéro_descriptif (`19_palier_prestataires.sql`)
---
 
# 3. ⚠️ Règles à NE JAMAIS enfreindre
 
## 🔒 Auth system (CRITIQUE)
Le système d'inscription **email + password** ne doit **JAMAIS** être modifié sans validation explicite.
- Il fonctionne, il a été dur à construire.
- Toute nouvelle subscription form doit POST sur l'endpoint EXISTANT.
- Avant toute modif liée à l'auth : grep le repo pour identifier l'endpoint actuel et demander confirmation.
- Ne pas migrer vers magic link, OAuth, social login, ou autre sans validation.
- 2 utilisatrices existantes dans `user_profiles` doivent rester intactes.
- Le redirect post-onboarding doit pointer vers le dashboard, pas vers `/inscription`.
## 🔒 Clés et secrets (HISTORIQUE : la clé anon a déjà été leakée 1 fois)
- Ne JAMAIS hardcoder : clé Stripe, Supabase service_role, OpenAI, Google Places, Resend.
- Toutes les clés sensibles passent UNIQUEMENT par env vars Vercel.
- Ne jamais committer `.env`, `.env.local`, ou tout fichier contenant des secrets.
- Vérifier `.gitignore` à chaque PR : `.env*` doit y être listé.
- La clé `anon` Supabase peut être exposée côté client (préfixe `NEXT_PUBLIC_`, c'est son rôle).
- La clé `service_role` Supabase est **server-side ONLY** — jamais dans un composant client, jamais dans React Native, jamais dans le bundle browser.
- La clé `GOOGLE_PLACES_API_KEY` est **server-side ONLY** (pas de préfixe `NEXT_PUBLIC_`).
- Si tu détectes une clé hardcodée ou exposée dans le code ou l'historique git : **flag immédiatement comme critique** avant toute autre action.
## 🔒 Vidéo hero
`/public/videos/hero.mp4` = V1 finale validée (générée Veo 3.1 / Nim).
- Ne pas remplacer
- Ne pas supprimer
- Ne pas compresser sans demander
- Une V2 a été tentée via Higgsfield → distorsion des visages → on garde la V1
## 🔒 Catégories métier
9 catégories prestataires + 9 catégories lieux = définies en DB Supabase.
- Ne pas ajouter
- Ne pas renommer
- Ne pas supprimer
Sans validation explicite.
## 🔒 Pricing (validé stratégiquement)
 
### Prestataires
- **Standard** : 19€/mois · 3m 54€ · 6m 102€ · 1an 182€
- **Premium** : 49€/mois · 3m 139€ · 6m 264€ · 1an 470€ (LE PLUS CHOISI)
- **Cercle Pro** : 99€/mois · 3m 282€ · 6m 534€ · 1an 950€
### Lieux (Recommandations payantes)
- **Sélection Hilmy** : 39€/mois · 3m 110€ · 6m 210€ · 1an 374€
Ne pas modifier les prix, les noms de tiers, ni les durées sans validation explicite.

### Promo lancement -50% (en cours, jusqu'à la sortie de l'app mobile)
- Feature flag : `NEXT_PUBLIC_PROMO_LANCEMENT=true`
- Helpers : [lib/promo-lancement.ts](lib/promo-lancement.ts) (UI) + [lib/stripe-promo.ts](lib/stripe-promo.ts) (futur Stripe checkout)
- Coupon Stripe : `LANCEMENT50` (créé manuellement par Jiji dans le dashboard Stripe — **ne pas créer via API**)
- UI affecte : [/tarifs](app/tarifs) wizard + homepage [PricingTeaser](components/landing/PricingTeaser.tsx)
- **À désactiver le jour de sortie de l'app mobile** : passer la var à `false` (ou retirer) côté Vercel + `.env.local`. Aucune autre modif code nécessaire.
- Coexistence avec le système promo_codes Supabase : pendant la promo lancement, le champ « J'ai un code copine » est masqué (pas de stacking).
 
## 🔒 Workflow Git
- Toujours créer une nouvelle branche par tâche.
- JAMAIS de push direct sur `main` (branch protection activée de toute façon).
- JAMAIS de force push sur main.
- JAMAIS de rebase destructif sur main.
- Petite tâche = petite PR. Si ça grossit, découper.
- Toujours tester localement avant PR.
- Commits signés ou clairs (auteur identifiable).
---
 
# 4. 🛡️ Sécurité des données (NON NÉGOCIABLE)
 
## RLS Supabase — RÈGLE D'OR
 
**Toute table créée DOIT avoir RLS activé ET des policies explicites.**
 
```sql
-- Pattern obligatoire pour chaque CREATE TABLE
ALTER TABLE nom_table ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY "policy_descriptive_name" ON nom_table
  FOR SELECT USING (auth.uid() = user_id);
-- ou conditions spécifiques au cas d'usage
```
 
**Interdictions absolues :**
- ❌ `USING (true)` sauf pour des reads VRAIMENT publics (annuaire approved par exemple)
- ❌ Créer une table sans policies explicites définies dans la même migration
- ❌ Utiliser `service_role` côté client pour bypass RLS — toujours créer une vraie policy
**Avant tout `CREATE TABLE`, prévoir et écrire les policies RLS dans la même migration.**
 
## Migrations SQL
 
**Idempotence obligatoire :**
- Utiliser `CREATE TABLE IF NOT EXISTS`
- Utiliser `DROP POLICY IF EXISTS` avant `CREATE POLICY`
- Utiliser `CREATE INDEX IF NOT EXISTS`
- Utiliser `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
**Nommage :**
- Numéro séquentiel + descriptif court : `20_nouvelle_feature.sql`
- Suivre la séquence existante (vérifier la dernière migration en `/supabase/migrations/`)
**Migrations destructives (DROP, TRUNCATE, DELETE bulk) :**
- Toujours demander confirmation avant
- Toujours proposer un backup d'abord
- Préférer ALTER COLUMN à DROP COLUMN quand possible
## Storage buckets
 
**Pattern par défaut :**
- Bucket privé + signed URLs pour les contenus utilisateur (photos perso, docs)
- Bucket public uniquement pour les contenus genuinely publics (flyers events, photos lieux validés)
**Buckets actuels :**
- `recommendation-photos` : public (photos de lieux/prestataires recommandés publiquement)
- `event-flyers` : public (flyers d'événements à diffuser)
**Tout nouveau bucket :**
- Définir explicitement public/privé dans la création
- Définir des policies de Storage en parallèle des policies de tables
- Limiter la taille max upload (ex : 5MB pour images)
- Limiter les MIME types acceptés
## Validation côté serveur
 
**Jamais faire confiance aux données client.**
- Valider tout payload côté server action / API route avec **Zod**
- Sanitize les inputs string (XSS prevention)
- Vérifier les autorisations à chaque mutation, même si RLS est censée couvrir
- Limites de taille : descriptions max 2000 chars, titres max 200 chars, etc.
```typescript
// Pattern attendu pour toute server action
import { z } from 'zod';
 
const inputSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000),
  category: z.enum(['beaute', 'enfants', /*...*/]),
});
 
export async function createRecommendation(formData: FormData) {
  const parsed = inputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Invalid input' };
  // ... suite
}
```
 
## Stripe (paiements)
 
- **Webhook signatures** : vérification obligatoire avec `stripe.webhooks.constructEvent()`
- **Clé secrète** : `STRIPE_SECRET_KEY` server-side uniquement, jamais dans le bundle client
- **Webhook secret** : `STRIPE_WEBHOOK_SECRET` server-side uniquement
- Toujours stocker `stripe_customer_id` et `stripe_subscription_id` côté DB pour rapprochement
- Idempotence : utiliser des `idempotency_key` sur les calls API critiques
- Jamais de prix hardcodés côté client → toujours `price_id` Stripe + lookup côté serveur
- Logging des events webhook dans une table `stripe_events` pour audit + replay
## Authentification — sécurité avancée
 
- Sessions Supabase : durée par défaut acceptable (1h access token + refresh token long)
- Logout : doit clear tous les tokens côté client ET invalider session côté Supabase
- Reset password : flow Supabase standard, jamais d'implémentation custom
- Pas de stockage de mots de passe en clair NULLE PART
- Rate limiting sur `/auth/login` et `/auth/signup` (Supabase le gère par défaut, ne pas le contourner)
- Pas de mécanisme "remember me" custom
## Données personnelles & RGPD
 
**Définition PII Hilmy :**
- email, nom, prénom, téléphone, adresse, photo de profil, infos business prestataire
- ID Stripe customer
- IP logs
**Règles :**
- Ne jamais logger une PII en clair (logs Vercel, Sentry, etc.)
- Ne jamais inclure une PII dans une URL (params query) — utiliser POST + body
- Ne jamais exposer un email d'un user à un autre user sans consentement explicite
- Bouton "Supprimer mon compte" doit cascade : profil + recommandations + favoris + abonnement Stripe annulé
- Export RGPD : tout user doit pouvoir demander un export JSON de ses données
- Privacy policy à `/confidentialite` doit lister tous les sous-traitants (Supabase, Vercel, Stripe, Resend, Google Places)
**Cookies & tracking :**
- Pas de cookies tracking sans consentement explicite (banner)
- Analytics : Vercel Analytics ou Plausible (RGPD-friendly), pas Google Analytics par défaut
## Ghost profiles (mécanisme métier)
 
Hilmy a un système de **ghost profiles** : des fiches prestataires/lieux peuvent exister sans owner (créées via recommandations communautaires). Une vraie prestataire peut ensuite "claim" sa fiche.
 
**Règles sécurité ghost profiles :**
- Une fiche ghost ne contient JAMAIS de PII de la prestataire (juste nom commercial public, ville, catégorie)
- Pas d'email, pas de téléphone privé sur ghost
- Le claim nécessite vérification (email pro ou validation manuelle admin)
- Une fois claim, la prestataire devient owner et peut modifier — mais l'historique reste tracé
## Logs & monitoring
 
- Pas de PII dans les logs (Vercel, Sentry, console.log oubliés)
- Logs d'erreur doivent être actionnables : timestamp, route, user_id (ID seulement, pas email), stack trace
- Erreurs critiques (auth failed, payment failed, RLS bypass attempt) doivent alerter
- Vérifier qu'aucun `console.log(user)` ne traîne en prod
## CSP & Headers HTTP
 
Configurer dans `next.config.js` les headers de sécurité :
- `Strict-Transport-Security` : HTTPS only
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (anti-clickjacking)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` : à définir progressivement
## Audit avant chaque release
 
Checklist à passer avant tout déploiement majeur :
- [ ] Aucune clé secrète dans le diff
- [ ] Toutes les nouvelles tables ont RLS + policies
- [ ] Toutes les nouvelles routes ont validation Zod
- [ ] Pas de `service_role` côté client
- [ ] `.env*` toujours dans `.gitignore`
- [ ] Webhooks Stripe : signatures vérifiées
- [ ] Pas de `console.log` PII oublié
- [ ] Migration SQL est idempotente
---
 
# 5. Persona & ton (pour copies, UX writing, contenu)
 
## Public cible
**Sara**, 34 ans, francophone urbaine (Carouge, Lyon, Bruxelles, Lausanne…).
Femme active, mère ou pas, exigeante sur les recommandations.
Cherche du curé, de l'authentique, entre copines.
 
## Ton
- Tutoiement systématique
- Style copine : direct, chaleureux, pas corporate
- Phrases courtes
- Zéro jargon
## ❌ Mots INTERDITS dans toute copie
- "solution"
- "plateforme"
- "écosystème"
- "cliquez"
- "soumettre"
- "découvrez" (overused, faible)
- "expérience utilisateur"
- "ergonomie"
- "innovant"
- "leader"
- "waitlist", "coming soon" (jamais mentionner)
- jargon SaaS / startup générique
- emojis dans copies UI principales (réservé contextes très ciblés)
## ✅ Vocabulaire à utiliser
- team / la team
- copine / copines / entre copines
- adresses / les bonnes adresses
- pépites
- bons plans
- recommandations
- la vraie vie
- "Rejoins-nous" / "Je rejoins les filles"
- "Je partage une adresse"
- Pass Copine (pour pricing utilisatrices futures)
## CTAs
Format : invitation, pas injonction.
- ❌ "Cliquez ici"
- ❌ "S'inscrire"
- ✅ "Je rejoins les filles"
- ✅ "Je partage une adresse"
- ✅ "Rejoins la team"
## Exemples de tone of voice
 
❌ "Découvrez notre plateforme innovante de recommandations"
✅ "Les bonnes adresses des copines, enfin réunies"
 
❌ "Cliquez ici pour vous inscrire"
✅ "Rejoins la team"
 
❌ "Nous proposons une solution complète"
✅ "Tout ce qu'il te faut, au même endroit"
 
❌ "Soumettez votre établissement"
✅ "Partage ton adresse"
 
## Signature
- Email + footer : "La team Hilmy" (jamais "L'équipe Hilmy", jamais "cordialement")
---
 
# 6. Brand identity
 
## Couleurs
- **Vert principal** : `#0F3D2E`
- **Or** : `#C9A961`
- **Crème** : `#F5F0E6`
- Backgrounds neutres : variations de crème/blanc cassé
- Pas de gris bleuté froid, pas de noir pur (privilégier le vert très foncé)
## Typographie
- **Titres** : Fraunces light 300 (italic pour accents éditoriaux)
- **Texte courant** : DM Sans
- Pas de mélange avec d'autres fonts
- Pas d'utilisation de Bold sur Fraunces (rester en light)
## Style visuel
- Esthétique : élégante, naturelle, chaleureuse
- Pas de gradients flashy
- Pas d'illustrations cartoon
- Photos authentiques > stock photos
- Lignes fines or pour accents éditoriaux
- Beaucoup d'espace blanc, respiration
---
 
# 7. Tables Supabase (état actuel)
 
## Tables existantes en prod (NE PAS RECRÉER)
- `profiles` — prestataires (commerces de l'annuaire : nom, ville, categorie, palier, status, services, is_founder…)
- `user_profiles` — membres / utilisatrices de la communauté (prenom, bio, avatar, voix_hilmy, expo_push_token…)
- `places` — lieux (annuaire + recommandations)
- `recommendations` — recommandations communautaires
- `place_reports` — signalements lieux
- `recommendation_reports` — signalements recos
- `events` — événements
- `event_reports` — signalements events
- `waitlist` — liste d'attente legacy
- `notifications` — notifs push/email
## Migrations historiques importantes
- Migration 15 : tracking nb_vues fiches
- Migration 18 : notifications
- Migration 19 : palier prestataires (`palier text default 'standard'`)
## Tables prévues (à créer si besoin)
- `avis` — avis prestataires (par utilisatrices inscrites uniquement)
- `favoris` — favoris utilisatrices
- `admins` — table admins
- `stripe_events` — log events webhooks Stripe
- `subscriptions` — abonnements actifs (ou via Stripe customer metadata)
---
 
# 8. Conventions de PR
 
## Titre de commit (Conventional Commits)
Format : `type(scope): description`
 
Types acceptés :
- `feat` — nouvelle feature
- `fix` — bug fix
- `chore` — maintenance, dépendances
- `refactor` — refacto sans changement de comportement
- `style` — CSS / UI tweaks
- `docs` — documentation
- `db` — migrations Supabase
- `security` — fix sécurité (peut être urgent)
Exemples :
- `feat(annuaire): ajout filtre par ville`
- `fix(auth): correction redirect après login`
- `db: migration 32 — index sur recommendations.created_at`
- `security: rotate exposed Supabase anon key`
## Description de PR
Toujours inclure :
1. **Quoi** — ce qui change (1-2 phrases)
2. **Pourquoi** — la raison (contexte business ou technique)
3. **Comment tester** — étapes concrètes pour valider en local
4. **Risques** — ce qui peut casser, edge cases
5. **Sécurité** — si modif touche auth, RLS, secrets, paiements → flag explicite
## Taille des PR
- Idéal : <300 lignes diff
- Acceptable : <600 lignes
- Au-delà : découper en plusieurs PR
---
 
# 9. Quand demander avant d'agir
 
Toujours demander confirmation à l'utilisatrice avant :
- Toucher au système d'auth
- Modifier les prix ou les tiers
- Ajouter / supprimer / renommer des catégories
- Faire une migration DB destructive (DROP, TRUNCATE, DELETE bulk)
- Installer une nouvelle dépendance lourde (>500kb bundle)
- Refactor architectural majeur
- Modifier les policies RLS existantes
- Toucher au CI/CD ou aux env vars Vercel
- Supprimer ou remplacer des assets dans `/public`
- Modifier la structure des tables existantes (`profiles`, `user_profiles`, `places`, `recommendations`, `events`)
- Ajouter une nouvelle dépendance externe (API tierce)
- Modifier le schéma de `package.json` (engines, scripts critiques)
---
 
# 10. Définition de "fini"
 
Une tâche est terminée quand :
- ✅ Le code compile sans warning TS
- ✅ Les linters passent (`npm run lint`)
- ✅ Build production passe (`npm run build`)
- ✅ Testé manuellement en local sur le bon parcours
- ✅ Pas de `console.log` oublié
- ✅ Pas de clé secrète committée (vérifier le diff avant commit)
- ✅ Le copy respecte le ton (pas de mots interdits)
- ✅ Les nouvelles tables ont RLS + policies
- ✅ La PR a une description claire avec sections Quoi/Pourquoi/Test/Risques
- ✅ Si modif sécurité : checklist sécu passée
---
 
# 11. Workflow recommandé pour Claude
 
## Avant d'écrire du code
1. Lire ce fichier (AGENTS.md)
2. Comprendre la tâche : reformuler dans la PR description
3. Identifier les fichiers concernés (`grep`, `glob`)
4. Vérifier les migrations existantes si touche DB
5. Vérifier les env vars existantes si touche intégrations
## Pendant le code
1. Suivre les conventions du projet (regarder le code existant comme référence)
2. Petit scope, petite PR
3. Tester au fur et à mesure (`npm run dev`)
4. Pas d'over-engineering : faire le minimum qui résout le problème
## Avant de committer
1. Relire le diff complet
2. Chercher les secrets : `git diff | grep -i -E "key|secret|token|password"`
3. Build local : `npm run build`
4. Lint : `npm run lint`
5. Tester le parcours impacté
## Avant de pousser la PR
1. Description claire (Quoi / Pourquoi / Test / Risques)
2. Petits commits cohérents
3. Branch nommée clairement : `feat/annuaire-filtre-ville`, `fix/redirect-login`
---
 
# 12. Contact & escalade
 
Founder solo : décisions produit, design, business → toujours valider avec elle.
En cas de doute sur :
- Sécurité → STOP, demander avant d'agir
- Argent (pricing, Stripe, paiements) → STOP, demander
- Auth → STOP, demander
- Données utilisateurs → STOP, demander
Mieux vaut poser une question "évidente" que casser quelque chose en prod.
 
---
 
*Dernière mise à jour : mai 2026*
