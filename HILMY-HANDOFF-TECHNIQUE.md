# HILMY — Handoff technique

> Document de passation pour reprendre le dev sans perdre de contexte.
> **Dernière mise à jour :** 18 avril 2026, fin de journée (Chantiers 1→4).

---

## 1. État actuel du produit

| Item | Valeur |
|---|---|
| **URL preview en cours** | https://hilmy-cuemsthgn-jihaneessmaliki-7138s-projects.vercel.app |
| **hilmy.io (prod)** | Tourne encore sur l'ancienne prod (deploy du 2026-04-16). **Aucun `vercel --prod` depuis la journée du 18/04.** |
| **Branche git active** | `main` |
| **Dernier commit** | `1bfd35b feat: new landing page + category/journal/contact/manifeste pages + simplified password reset` (avant la journée du 18/04) |
| **État working tree** | **Massivement dirty** — tous les chantiers 1→4 sont en uncommitted changes. À committer en premier avant tout nouveau travail. |
| **Build status** | ✅ `npm run build` passe, zéro erreur, zéro warning |
| **Typecheck** | ✅ `npx tsc --noEmit` clean |

### ⚠️ Action immédiate conseillée

Avant toute autre chose dans une nouvelle session, **commit le travail existant** en chunks logiques :
- Chantier 1 (reskin V2 + redirects + cleanup)
- Chantier 2 (flows utilisatrice : event creation, inscription, avis)
- Chantier 3 (4 bugs post-tests : suppression, multi-RS, cliquables, avis inline)
- Chantier 4 (reset password fix + admin retrait publications)

---

## 2. Architecture technique

### Stack

| Composant | Version / détail |
|---|---|
| Next.js | **16.2.3** — App Router, Server Components, Route Handlers, motion package (pas framer-motion) |
| React | 19.2.4 |
| TypeScript | ^5 — strict, build check skipped (`ignoreBuildErrors: true`), typecheck manuel via `npx tsc --noEmit` |
| Tailwind | v4 (`@tailwindcss/postcss`), `@theme inline` dans globals.css (pas de tailwind.config.ts) |
| Supabase | `@supabase/ssr 0.10.2` + `@supabase/supabase-js 2.103.0` — SSR client pattern |
| Email | Brevo via `nodemailer` 8.0.5, SMTP port 587 smtp-relay.brevo.com |
| Google | Places API (New) via REST `places.googleapis.com/v1` |
| Hébergement | Vercel (serverless + edge middleware) |
| Animations | `motion` 12.38.0 (nouveau package, import `motion/react`) |
| Charts | `recharts` 3.8.1 (dashboard presta) |
| Icônes | `lucide-react` 1.8.0 (sans brand icons → SVG inline pour IG/LinkedIn/TikTok/etc.) |

### Structure des dossiers

```
app/
├── (legal)/            CGU, mentions, confidentialité, cookies (charte V2)
├── admin/              dashboard admin protégé (is_admin)
├── annuaire/           listing prestataires public
├── api/                route handlers (21 routes, voir §4)
├── auth/               signup, login, reset, callback
├── dashboard/
│   ├── prestataire/    dashboard pro (layout + 6 sous-pages)
│   └── utilisatrice/   dashboard membre (layout + 6 sous-pages)
├── evenement-v2/[slug] fiche événement publique
├── evenements-v2/      listing événements public
├── onboarding/         creation user_profile + wizard prestataire (manuel/google/insta/linkedin)
├── prestataire-v2/[slug] fiche prestataire publique + /avis/nouveau
├── recommandation/[slug] fiche lieu recommandé publique
├── recommandations/    listing lieux
└── [pages contenu]     manifeste, charte, comment-ca-marche, contact
    + 5 redirect legacy pages (inscription, connexion, etc.)

components/
├── auth/               AuthShell, OAuthButton, AuthField
├── dashboard/          Sidebar, DashboardHeader, StatCard, Charts, EmptyState
├── google/             PlaceAutocomplete (v2 autocomplete)
├── landing/            Navigation (variant solid/transparent), HeroV2, FooterV2,
│                       Manifesto, FAQ, ThreePromises, NineUniverses, ElleProfiles,
│                       RecentFavorites, ForPrestataires, StartingPoint, FloatingQuote,
│                       FinalCTA, PrestataireMethodsClient (→ onboarding choice)
├── onboarding/         OnboardingShell, MethodCard, ImportLoader, PreviewScreen
├── ui/                 button, badge, input, textarea, label, select, card, dialog,
│                       sheet, avatar, separator, GoldLine, HilmyButton, SectionHeader,
│                       FadeInSection
└── v2/                 ContentPageShell, LegalSection, PageShell, PageHero, FiltersBar,
                        PrestataireCard, LieuCard, EvenementCard, FavoriteButton,
                        LaunchEmptyState, LiveStates, EventInscriptionCTA, SocialChannelsButtons,
                        AvisFormBody, AvisInlineCTA, AvisSection, ConfirmModal, MotifModal

lib/
├── admin/              guard.ts (requireAdmin helper pour API admin)
├── auth/               redirect-origin.ts (getRequestOrigin)
├── email/              transactional.ts (templates Brevo — NE PAS TOUCHER signup/reset existants)
├── google/             places.ts (searchPlaces, getPlaceDetails)
├── supabase/           client.ts, server.ts, admin.ts (service_role), session.ts,
│                       types.ts, queries/ (events, places, prestataires, recommendations,
│                       favoris, event_inscriptions)
├── constants.ts        LAUNCH_MODE, CATEGORIES, PAYS, EVENT_TYPES, REC_TAGS, labels
├── mock-data.ts        (legacy, encore importé pour villesSuggestions + types MockX)
└── social-channels.ts  définition 9 canaux prestataire avec toUrl() + ctaLabel
```

### Variables d'environnement

| Variable | .env.local | Vercel prod | Vercel preview | Vercel dev | Usage |
|---|:---:|:---:|:---:|:---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | ✅ | URL Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | ✅ | Client public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ✅ | ✅ | Admin client (server-only) |
| `SUPABASE_ACCESS_TOKEN` | ✅ | ❌ | ❌ | ❌ | PAT Management API (local seulement) |
| `BREVO_SMTP_USER` | ✅ | ❌ | ✅ | ✅ | Login SMTP Brevo (login technique `a3f0f6001@smtp-brevo.com`, pas Gmail) |
| `BREVO_SMTP_KEY` | ✅ | ❌ | ✅ | ✅ | Clé API SMTP Brevo |
| `EMAIL_FROM` | ✅ | ✅ | ✅ | ✅ | `Hilmy <jihane.ess.maliki@gmail.com>` |
| `GOOGLE_PLACES_API_KEY` | ✅ | ✅ | ✅ | ✅ | Places API (New) |
| `NEXT_PUBLIC_SITE_URL` | ✅ (localhost) | ❌ **manquant** | ✅ (hilmy.vercel.app) | ❌ | Utilisé par emails transactionnels pour les CTAs |
| `NEXT_PUBLIC_LAUNCH_MODE` | ✅ (`live`) | ❌ **manquant** | ✅ (`live`) | ✅ (`live`) | Feature flag — "mock" ou "live" |
| `FOUNDER_NOTIFICATION_EMAILS` | ✅ | ✅ | ✅ | ✅ | jihane.ess.maliki@gmail.com — notif founders |
| `ANTHROPIC_API_KEY` | ❌ | ✅ | ❌ | ❌ | Hérité V1, probablement plus utilisé |
| `NEXT_PUBLIC_APP_URL` | ❌ | ✅ | ❌ | ❌ | Hérité V1, à cleanup |
| `RESEND_API_KEY` | ❌ | ✅ **(=`""`, casse les emails)** | ❌ | ❌ | **À SUPPRIMER avant promote prod** |

---

## 3. Schéma de base de données Supabase

Projet ref : `qrlvjwqanixkhopedqqw`
Site URL : `https://hilmy.io`
Redirect URLs configurés : `hilmy.io/auth/callback`, `hilmy.io/**`, `*.vercel.app/auth/callback`, `localhost:*/auth/callback`, `localhost:3000/auth/callback` (redondant, à cleanup)

### Table `profiles` (prestataires — 8 rows seed)
| Colonne | Type | NOT NULL | Notes |
|---|---|:---:|---|
| id | uuid | ✅ | PK |
| user_id | uuid | — | FK auth.users (nullable pour ghost profiles) |
| nom, slug, categorie, ville | text | ✅ | slug unique partial, categorie CHECK 10 valeurs |
| description, tagline | text | — | |
| whatsapp | text | ✅ | |
| phone_public | text | — | Stage 11 (multi-RS) |
| instagram, tiktok, linkedin, facebook, youtube, email, site_web | text | — | canaux de contact |
| services, galerie | jsonb | ✅ | default `[]` |
| photos | text[] | — | legacy (col parallèle à galerie) |
| prix_from | numeric(10,2) | — | |
| prix_gamme | text | — | CHECK `€`, `€€`, `€€€` |
| devise | text | — | CHECK `CHF`, `EUR`, default CHF |
| source_import | text | — | CHECK `google_places`, `instagram`, `linkedin`, `manuel` |
| status | text | ✅ | CHECK `pending`, `approved`, `rejected`, `ghost`, `paused` |
| admin_notes | text | — | motif de rejet/retrait |
| approved_at | timestamptz | — | |
| note_moyenne, nb_avis, nb_vues | num/int | ✅ | stats, maintenues par trigger |

**Contraintes CHECK spéciales** :
- `profiles_ville_length_check` : 2 ≤ `char_length(ville)` ≤ 80 (assouplie Stage 8, avant limité aux villes suisses)
- `profiles_categorie_check` : 10 slugs valides (beaute, bien-etre, sante-mentale, sport-nutrition, enfants-famille, maison, cuisine, evenementiel, mode-style, business-juridique)
- **Pas de colonne `pays`** dans profiles (pas encore ajoutée — pays uniquement dans user_profiles)

**RLS** :
- Read : public peut voir `status='approved'` (fiches approuvées publiques)
- Read : prestataire peut voir son propre profil (y compris non-approved)
- Insert : authenticated + own user_id, OU ghost (status='ghost' sans user_id)
- Update : prestataire peut modifier son propre profil

---

### Table `user_profiles` (utilisatrices — 7 rows)
| Colonne | Type | NOT NULL |
|---|---|:---:|
| id, user_id | uuid | ✅ |
| prenom, pays, ville | text | ✅ |
| signupType | text | — | `member` ou `provider` |
| bio, avatar_url | text | — |
| created_at | timestamptz | — |

**RLS** : select_all (tous peuvent lire les prénoms pour afficher les avis), insert_own, update_own.

---

### Table `places` (lieux recommandés — 9 rows seed)
| Colonne | Type | NOT NULL |
|---|---|:---:|
| id, name, address, city, country, latitude, longitude, hilmy_category | * | ✅ |
| google_place_id, slug, description, main_photo_url, region | * | — |
| photos (jsonb, default `[]`), google_category | * | — |

**CHECK** : `places_hilmy_category_check` = 9 valeurs (restos-cafes, salons-the, boutiques, bien-etre, enfants, hebergements, sante, culturel, sport-nature)

**RLS** : authenticated peut read + insert.

---

### Table `events` (événements — 5 rows seed)
| Colonne | Type | NOT NULL | Notes |
|---|---|:---:|---|
| id, user_id, title, description, event_type, format, start_date, flyer_url, status, visibility, inscrites_count | * | ✅ | `user_id` FK auth.users requis |
| end_date, country, region, city, address, online_link, external_signup_url, price_type, price_amount, price_currency, slug, places_max, prestataire_id | * | — | |
| admin_notes | text | — | Stage 12 (motif retrait admin) |

**CHECK** :
- `event_type` : atelier, conference, brunch, sport, soiree, retraite, marche, masterclass, autre
- `format` : presentiel, en_ligne
- `visibility` : public, members_only
- `status` : published, flagged, removed, past
- `price_type` : gratuit, payant
- `places_max >= 1` si non-null, `inscrites_count >= 0`

**RLS** : public read si `status='published'`, owner create/update/delete.

---

### Table `recommendations` (avis — 1 row)
| Colonne | Type | NOT NULL | Notes |
|---|---|:---:|---|
| id, user_id, type, status | * | ✅ | |
| comment | text | ✅ | (mais l'UI permet rating-only depuis Bug #3 V2 — DDL à relaxer si nécessaire) |
| rating | int | — | 1-5 |
| place_id, profile_id | uuid | — | XOR selon type |
| tags | text[] | — | |
| price_indicator | text | — | €, €€, €€€ |
| photo_urls | text[] | — | |
| reponse_pro, reponse_date | * | — | réponse prestataire |
| admin_notes | text | — | motif retrait admin |

**CHECK** :
- `type` : place, prestataire
- `status` : published, flagged, removed
- `rating` : 1-5 ou null
- `type_coherent` : (type='place' ET place_id NOT NULL ET profile_id NULL) OR (type='prestataire' ET profile_id NOT NULL ET place_id NULL)
- `reponse_coherent` : reponse_pro et reponse_date tous deux null ou tous deux non-null

**RLS** : authenticated read si `status='published'`, create/update own.

⚠️ **À noter** : la colonne `comment` est actuellement NOT NULL, mais le form V2 (chantier 3 Bug #3) permet un avis rating-only. Si un user submit sans commentaire, l'insert échouera à cause de la contrainte. **Migration à faire** :
```sql
ALTER TABLE public.recommendations ALTER COLUMN comment DROP NOT NULL;
```

---

### Table `recommendation_likes` (0 rows — nouvelle Stage 11)
| Colonne | Type | NOT NULL |
|---|---|:---:|
| id, recommendation_id, user_id, created_at | * | ✅ |

Unique `(recommendation_id, user_id)`.
**RLS** : read auth-only, manage own only.

---

### Table `recommendation_reports` (0 rows — adaptée Stage 11)
| Colonne | Type | NOT NULL |
|---|---|:---:|
| id, recommendation_id, reporter_id | uuid | ✅ |
| reason | text | — | optionnel |
| status | text | ✅ | CHECK `pending`, `resolved`, `dismissed` |
| admin_notes, resolved_at | * | — |

Unique `(recommendation_id, reporter_id)`.
**RLS** : insert own, read own. Admin bypass via service_role.

---

### Table `event_inscriptions` (0 rows)
| Colonne | Type | NOT NULL |
|---|---|:---:|
| id, event_id, user_id, status, created_at, updated_at | * | ✅ |

**CHECK** : `status` in (`inscrite`, `annulee`, `liste_attente`)
**RLS** : self_read, self_insert, self_update, self_delete, organisateur_read, admin_read.

---

### Table `favoris` (0 rows)
| Colonne | Type | NOT NULL |
|---|---|:---:|
| id, user_id, type_item, item_id | * | ✅ |
| note_perso | text | — |

**CHECK** : `type_item` in (`prestataire`, `lieu`, `evenement`) — polymorphe.
**RLS** : self_read/insert/update/delete.

---

### Table `waitlist` (2 rows — legacy)
| Colonne | Type | NOT NULL |
|---|---|:---:|
| id, email | * | ✅ |
| created_at | timestamptz | — |

**RLS** : insert ouvert. Utilisée par `/api/subscribe`.

---

### Tables legacy (0 rows, pas branchées à l'UI)

- `event_reports` : `id, event_id, reporter_id, reason, created_at` (reason NOT NULL — à relaxer si on veut l'utiliser).
- `place_reports` : même schéma. RLS insert ouvert.

Ces 2 tables existent mais ne sont reliées à rien côté UI actuelle. Le système de signalement se fait pour l'instant via `recommendation_reports` uniquement.

---

## 4. Routes API (21)

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| POST | `/api/subscribe` | public | Insert email waitlist |
| GET | `/api/places/search?q=` | public | Google Places autocomplete |
| GET | `/api/places/details?place_id=` | public | Détails place via Google |
| POST | `/api/auth/signup` | public | Crée user + envoie email confirmation via Brevo |
| POST | `/api/auth/password-reset` | public | Génère token + email reset Brevo |
| POST | `/api/auth/resend-confirmation` | public | Renvoie lien magic pour email confirmation |
| POST | `/api/events/[id]/inscription` | user | Inscrit user à event + emails confirm + notif organisatrice |
| DELETE | `/api/events/[id]/inscription` | user | Annule inscription (status=annulee) |
| POST | `/api/events/[id]/cancel` | user (owner) | Organisatrice annule son event + emails aux inscrites |
| POST | `/api/events/notify-founder` | user (owner) | Best-effort notif founders à la création |
| POST | `/api/recommendations/[id]/like` | user | Toggle like, retourne `{liked, count}` |
| POST | `/api/recommendations/[id]/report` | user | Signale un avis |
| POST | `/api/recommendations/[id]/reply` | user (presta owner) | Réponse pro sur son propre avis |
| POST | `/api/recommendations/notify` | user (auteur) | Best-effort email "nouvel avis" à la prestataire |
| POST | `/api/admin/fiches/[id]/approve` | admin | Approve fiche + email prestataire |
| POST | `/api/admin/fiches/[id]/reject` | admin | Reject fiche + email |
| POST | `/api/admin/events/[id]/approve` | admin | Publie event |
| POST | `/api/admin/events/[id]/reject` | admin | Removes event (statut simple) |
| POST | `/api/admin/events/[id]/remove` | admin | **Stage 12** : motif obligatoire, soft delete + emails aux inscrites (source=admin) |
| POST | `/api/admin/recommendations/[id]/status` | admin | Change status (published/flagged/removed sans motif) |
| POST | `/api/admin/recommendations/[id]/remove` | admin | **Stage 12** : motif obligatoire, soft delete + admin_notes, marque reports pending → resolved |
| POST | `/api/admin/reports/[id]` | admin | Action signalement : `action=remove_reco` ou `dismiss` |

---

## 5. Routes pages

### Publiques (accessibles sans auth)
| Chemin | Rôle |
|---|---|
| `/` | Home V2 (12 sections landing) |
| `/annuaire` | Listing prestataires |
| `/recommandations` | Listing lieux |
| `/recommandation/[slug]` | Fiche lieu |
| `/evenements-v2` | Listing événements |
| `/evenement-v2/[slug]` | Fiche événement (adresse privée si non-inscrite) |
| `/prestataire-v2/[slug]` | Fiche prestataire (avis inline + multi-RS cliquables) |
| `/prestataire-v2/[slug]/avis/nouveau` | Form avis page (fallback pour signup → redirect) |
| `/manifeste`, `/comment-ca-marche`, `/charte`, `/contact` | Pages contenu V2 |
| `/cgu`, `/mentions-legales`, `/confidentialite`, `/cookies` | Legal V2 |
| `/auth/signup`, `/auth/login`, `/auth/mot-de-passe-oublie`, `/auth/reinitialiser-mot-de-passe`, `/auth/verify-email` | Flow auth |
| `/onboarding/prestataire` | Choix méthode création fiche |
| `/onboarding/prestataire/manuel` | Wizard 4 étapes |
| `/onboarding/prestataire/google` | Import Google Places |
| `/onboarding/prestataire/instagram`, `/onboarding/prestataire/linkedin` | Stubs "🚧 Bientôt" |
| `/onboarding/prestataire/publiee` | Succès création |
| `/auth/callback` | Callback auth — gère `token_hash` + `type` flow OTP (Stage 12 fix) |

### Protégées user (redirect `/auth/login` si non-auth)
| Chemin | Rôle |
|---|---|
| `/onboarding` | Création user_profile post-signup |
| `/dashboard/utilisatrice` | Accueil membre (3 stats + dernières sauvegardes + events à venir) |
| `/dashboard/utilisatrice/favoris` | Polymorphe (prestataire/lieu/evenement) |
| `/dashboard/utilisatrice/recommandations` | Liste + bouton Supprimer (Bug #6) |
| `/dashboard/utilisatrice/recommandations/nouvelle` | Form nouvelle reco lieu |
| `/dashboard/utilisatrice/evenements` | 3 sections : Tu organises / Inscrite / Sauvegardée |
| `/dashboard/utilisatrice/evenements/nouveau` | Form création event (5 sections) |
| `/dashboard/utilisatrice/profil` | Edit user_profiles + upload avatar |
| `/dashboard/utilisatrice/parametres` | Compte + signout |
| `/dashboard/prestataire` | Accueil presta (4 stats + sparkline + avis récents) |
| `/dashboard/prestataire/fiche` | Preview/edit inline + upload galerie + multi-RS |
| `/dashboard/prestataire/avis` | Liste + reponse_pro CRUD (filter tout/à répondre/répondu) |
| `/dashboard/prestataire/evenements` | Lecture seule à venir + passés |
| `/dashboard/prestataire/abonnement` | Page éditoriale Plan Fondatrice |
| `/dashboard/prestataire/parametres` | Toggle visible/pause + signout |

### Admin (protégé par `user.user_metadata.is_admin = true`)
| Chemin | Rôle |
|---|---|
| `/admin` | Tableau de bord (3 files queue + stats) |
| `/admin/prestataires-a-valider` | Approve/reject fiches pending |
| `/admin/evenements-a-valider` | Publier/retirer events (Stage 12 : bouton "Retirer" avec motif + emails inscrites) |
| `/admin/recommandations-a-moderer` | Signaler/rétablir/retirer (Stage 12 : bouton "Retirer" avec motif obligatoire) |
| `/admin/signalements` | Reports pending/resolved/dismissed (branché live Stage 11) |

### Redirects actifs (V1 → V2)

Dans `next.config.js` (HTTP 308) :

| Source | Destination |
|---|---|
| `/prestataires` | `/annuaire` |
| `/prestataire/:slug` | `/prestataire-v2/:slug` |
| `/bonnes-adresses` | `/recommandations` |
| `/lieu/:id` | `/recommandation/:id` |
| `/evenements` | `/evenements-v2` |
| `/evenement/:id` | `/evenement-v2/:id` |
| `/mon-compte` | `/dashboard/utilisatrice` |
| `/mon-profil-prestataire` | `/dashboard/prestataire` |
| `/recommander` | `/dashboard/utilisatrice/recommandations/nouvelle` |
| `/proposer-un-evenement` | `/dashboard/utilisatrice/evenements/nouveau` |
| `/categorie/:slug` | `/annuaire?categorie=:slug` |

Page-level redirects (server components `redirect()`) — plus anciens, fonctionnent aussi :
- `/inscription` → `/auth/signup`
- `/inscription-prestataire` → `/auth/signup?role=prestataire`
- `/connexion` → `/auth/login`
- `/mot-de-passe-oublie` → `/auth/mot-de-passe-oublie`
- `/reinitialiser-mot-de-passe` → `/auth/reinitialiser-mot-de-passe`

---

## 6. Flows utilisateur testés et validés (preview)

| Flow | Statut | Notes |
|---|---|---|
| Signup utilisatrice (email confirmation) | ✅ | Brevo envoie email, callback OTP flow (`token_hash + type=signup`) |
| Signup prestataire manuel (wizard 4 étapes) | ✅ | Insert profiles status='pending', `source_import='manuel'` |
| Signup prestataire Google Places | ✅ | Autocomplete + preview + insert status='pending' |
| Signup prestataire Instagram / LinkedIn | ⚠️ | Stubs "Bientôt" — CTA vers manuel |
| Reset password | ✅ | **Fixé Stage 12** : option A (token_hash direct, bypass Supabase verify hash fragment) |
| Login / logout | ✅ | |
| Création recommandation (nouvelle lieu) | ✅ | Autocomplete Google + upsert places + insert reco |
| Création événement | ✅ | 5 sections, validation live, upload flyer bucket event-flyers |
| Inscription événement | ✅ | POST API + toast + emails + refresh privacy adresse |
| Désinscription événement | ✅ | DELETE API |
| Privacy adresse événement | ✅ | Masquée pour non-inscrites, visible aux inscrites + organisatrice, incluse dans email confirmation |
| Laisser un avis (form inline sur fiche) | ✅ | 3 modes : note seule / commentaire seul / les deux. Non-auth → redirect signup |
| Like avis | ✅ | Toggle optimistic + compteur live |
| Signaler un avis | ✅ | Modal motif optionnel, insert `recommendation_reports` |
| Réponse prestataire à un avis | ✅ | Sur sa propre fiche, bouton "Répondre"/"Modifier ta réponse", `reponse_pro` + `reponse_date` |
| Suppression recos par user (RGPD) | ✅ | Soft delete `status='removed'` via RLS owner |
| Suppression event par user (organisatrice) | ✅ | POST `/cancel` avec `notify=true` si inscrites |
| Admin approve/reject fiches prestataires | ✅ | Email transactionnel Brevo envoyé |
| Admin approve/reject events | ✅ | |
| Admin retirer avis avec motif | ✅ | Stage 12, `admin_notes` stocké, reports liés passent en resolved |
| Admin retirer event avec motif | ✅ | Stage 12, email aux inscrites avec wording "équipe Hilmy" |
| Admin signalements liste | ✅ | Branché live, actions retirer-avis / classer-sans-suite |

---

## 7. Flows pas encore implémentés

| Item | Scope | Effort estimé |
|---|---|---|
| OAuth Google | Supabase dashboard : activer provider Google + client_id/secret. Code : remplacer stub `handleOAuth` dans `auth/signup/page.tsx` + `auth/login/page.tsx` par `supabase.auth.signInWithOAuth({provider:'google'})` | 0.5 j |
| OAuth Apple | + compte Apple Developer 99$/an, Service ID, JWT client_secret rotation | 1.5 j |
| Onboarding Instagram | Intégration Meta Graph API (bio + photo + posts) — complexe | 2 j |
| Onboarding LinkedIn | Intégration LinkedIn API | 2 j |
| Stripe paiement Premium | Pas encore nécessaire (Plan Fondatrice = 100% gratuit pour l'instant) | 2 j |
| Bannière cookies RGPD | Composant consent + persistent choice | 0.5 j |
| Export données RGPD | API route `/api/me/export` qui génère ZIP avec JSON de toutes les tables de la user | 1 j |
| Suppression compte user | UI dashboard + cascade delete (auth + user_profile + profiles si presta + recommendations + favoris + event_inscriptions) | 1 j |
| Pagination `/annuaire`, `/recommandations`, `/evenements-v2` | Infinite scroll ou pagination classique | 0.5 j |
| Recherche full-text (par nom prestataire, par event titre) | Postgres `tsvector` ou Supabase full-text | 1 j |
| Suite tests Playwright (5-10 flows critiques) | Smoke tests E2E | 2 j |
| Templates emails enrichis (rappel J-1 event, newsletter mensuelle) | Cron jobs Supabase Edge Functions ou Vercel Cron | 2 j |

---

## 8. Dette technique connue

### Code
- **`mock-data.ts`** : encore importé par 3 pages (`dashboard/utilisatrice/profil`, `onboarding`, `onboarding/prestataire/manuel`) uniquement pour `villesSuggestions`. Et par 3 composants V2 (`PrestataireCard`, `LieuCard`, `EvenementCard`) pour les types `Mock*` comme shape contract. À extraire dans `lib/cities.ts` + `lib/supabase/types.ts`.
- **`proxy.ts`** : `protectedPaths` contient encore `/prestataires`, `/bonnes-adresses`, `/lieu/`, `/recommander`, `/proposer-un-evenement`, `/mon-compte`, `/mon-profil-prestataire`. Tous redirigés par `next.config.js` donc middleware jamais atteint. Dead config harmless.
- **`/admin` sidebar** : pas de compteur "removed" par section (juste le pending/flagged). Bonus signal possible.
- **Supabase Auth URL Configuration** : contient encore `http://localhost:3000/auth/callback` redondant avec `http://localhost:*/auth/callback`. À cleanup pour lisibilité.
- **`recommendations.comment`** actuellement NOT NULL alors que le form V2 permet rating-only → migration `DROP NOT NULL` à prévoir (sinon crash sur insert avis rating-only).
- **`components/auth/AuthShell.tsx`** : `OAuthButton` a un prop `provider: 'google' | 'apple'` mais clic ne fait rien (stub `setError('OAuth arrive bientôt ✨')`). À brancher vraiment.

### Infrastructure
- **Wildcards Supabase Redirect URLs** : wildcard `*.vercel.app` bien configuré (Stage 12). Ne pas retirer.
- **`NEXT_PUBLIC_SITE_URL` sur Production** : **manquant**. À ajouter avant `--prod` (voir §9).
- **`NEXT_PUBLIC_LAUNCH_MODE` sur Production** : **manquant**. À ajouter (valeur `live`).
- **`RESEND_API_KEY` sur Production** : contient `""` (2 chars de guillemets) qui casse les emails. **À supprimer** (env ID `sNIKtkLwSvAnsGMx`).

---

## 9. Avant la première promotion prod

Checklist critique à faire absolument avant `vercel --prod` :

### Côté Vercel env vars (dashboard ou API)
- [ ] **Supprimer `RESEND_API_KEY`** sur scope `production` (ID `sNIKtkLwSvAnsGMx`) — contient `""` qui fait throw le code email et bloque Brevo fallback
- [ ] **Ajouter `NEXT_PUBLIC_SITE_URL=https://hilmy.io`** sur `production`
- [ ] **Ajouter `NEXT_PUBLIC_LAUNCH_MODE=live`** sur `production`
- [ ] **Ajouter `BREVO_SMTP_USER` + `BREVO_SMTP_KEY`** sur `production` (actuellement pas dans le scope prod — prod utilise Resend qui est cassé)
- [ ] Vérifier que `FOUNDER_NOTIFICATION_EMAILS=jihane.ess.maliki@gmail.com` est bien sur `production` (✅ déjà présent)
- [ ] Auditer et supprimer les env vars héritées V1 : `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL` (si non utilisées)

### Côté Supabase
- [ ] Vérifier `uri_allow_list` contient `https://*.vercel.app/auth/callback` (✅ déjà ajouté)
- [ ] Supprimer `https://hilmy-beige.vercel.app/auth/callback` si pas encore fait (redondant avec wildcard)
- [ ] Supprimer `http://localhost:3000/auth/callback` redondant (garder `localhost:*`)
- [ ] Nettoyer comptes de test Supabase Auth (`jihane.ess.maliki+test*@gmail.com`, `+hilmy*`, etc.) — peut se faire dans Authentication > Users

### Côté code
- [ ] Committer tout le travail uncommitted en chunks logiques (4 commits min, voir §11)
- [ ] Faire un `npm run build` final — doit être ✅
- [ ] Optionnel : migration `ALTER TABLE public.recommendations ALTER COLUMN comment DROP NOT NULL;` pour les avis rating-only

### Après promote
- [ ] Smoke test en prod des 10+ flows critiques sur `https://hilmy.io` (liste §6)
- [ ] Vérifier emails Brevo arrivent bien avec SITE_URL=hilmy.io dans les CTAs
- [ ] Marquer jihane admin en prod : `UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"is_admin":true}'::jsonb WHERE email='jihane.ess.maliki@gmail.com';`

---

## 10. Règles d'or pour toute session future

1. **Ne JAMAIS toucher au backend auth général** (middleware proxy.ts, auth-listener, RPC Supabase auth, routes `/api/auth/*` existantes) sans analyse préalable explicite. Les templates emails signup/reset existants sont sensibles — AJOUTER à `lib/email/transactional.ts` plutôt que modifier les fonctions existantes.
2. **Ne JAMAIS modifier `.env.local`** en local sans demander. Ajouter une variable si nécessaire, ne jamais changer les existantes.
3. **Ne JAMAIS lancer `vercel --prod`** sans validation explicite de l'utilisatrice. Toujours preview d'abord.
4. **Toujours soft delete** (`status='removed'`) plutôt que hard delete DELETE. La RGPD autorise soft (user voit que c'est supprimé, les data sont retirées de l'UI).
5. **Toujours migrations non-destructives** : `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS ... CREATE POLICY`. Ne JAMAIS `DROP TABLE`, `DROP COLUMN`.
6. **Toujours `npm run build`** avant deploy — pas de deploy sans build local ✅.
7. **Méthodique, chunks petits, commits séparés** : un chantier = plusieurs commits. Pas de mega-commit.
8. **Règle absolue charte V2** : vert `#0F3D2E`, or `#C9A961`, crème `#F5F0E6`, Fraunces (titres) + DM Sans (corps). `HILMY` en all caps dans les textes.
9. **Voix Sara** partout : tutoiement chaleureux, "entre copines", sans références temporelles (pas de "aujourd'hui" ou "ce soir"), sans anglicismes marketing.
10. **Diagnostic avant fix** quand un bug apparaît : lire le code, tracer le flow, identifier la root cause AVANT de proposer une correction. Pas de fix en aveugle.

---

## 11. Historique des chantiers — journée 18/04/2026

Tous les chantiers sont **en uncommitted changes** dans `main`. Il faudra committer en chunks logiques.

### Chantier 1 — Cohérence visuelle V1→V2 (matin)

| # | Item | Fichiers clés |
|---|---|---|
| 1A | Reskin 8 pages contenu + legal en charte V2 | `app/manifeste/`, `app/comment-ca-marche/`, `app/charte/`, `app/contact/`, `app/(legal)/cgu|mentions|confidentialite|cookies/`, `components/v2/ContentPageShell.tsx`, `LegalSection.tsx`, `components/landing/Navigation.tsx` (variant solid) |
| 1B | Redirects 308 V1→V2 | `next.config.js` (11 redirects) |
| 1C | Cleanup 31 fichiers morts | Supprimé : `app/hero-demo/`, `/hero-variants/`, `/plan/`, `/journal/`, 9 composants V1 racine, 7 landing orphelins, 10 pages V1 redirigées, Header/Footer V1 |
| 1D | Supprimer mock-data fallback | 6 pages publiques V2 nettoyées de `if (isMock())` |
| 1E | Fix `/rejoindre` manquante | `components/landing/Navigation.tsx` pointe vers `/auth/signup` |

**Commit suggéré** : `feat(v2): reskin charte V2 + redirects legacy + cleanup code mort (Chantier 1)`

---

### Chantier 2 — Flows critiques utilisatrice (mi-journée)

| # | Item | Fichiers clés |
|---|---|---|
| 2A | Creation événement V2 | `app/dashboard/utilisatrice/evenements/nouveau/page.tsx`, `app/api/events/notify-founder/route.ts`, update `lib/email/transactional.ts` (`sendNewEventToFounders`) |
| 2B | Inscription + privacy adresse | `components/v2/EventInscriptionCTA.tsx`, update `app/evenement-v2/[slug]/page.tsx`, `app/api/events/[id]/inscription/route.ts` (address in email), update `sendConfirmationInscriptionEvent` (eventVille + eventAdresse) |
| 2C | Avis prestataire (page dédiée) | `app/prestataire-v2/[slug]/avis/nouveau/` (page + AvisForm), `components/v2/AvisFormBody.tsx`, `components/v2/AvisInlineCTA.tsx` (modal) |

**Commit suggéré** : `feat(flows): création event + inscription event privacy + avis prestataire (Chantier 2)`

---

### Chantier 3 — Fixes post-tests (après-midi)

| # | Bug | Fix |
|---|---|---|
| Bug #6 | Suppression publications user (RGPD) | Soft delete recos + events, `components/v2/ConfirmModal.tsx`, `app/api/events/[id]/cancel/route.ts`, `sendEventCancelledEmail` template, section "Tu organises" dans `/dashboard/utilisatrice/evenements` |
| Bug #5 | Multi-RS prestataire | Migration DB (`facebook`, `youtube`, `phone_public` sur profiles), `lib/social-channels.ts`, update `onboarding/prestataire/manuel` + `dashboard/prestataire/fiche`, bug fix pré-existant `pays` non-existant dans insert |
| Bug #4 | RS cliquables sur fiche publique | `components/v2/SocialChannelsButtons.tsx` avec icônes SVG inline, remplace le panneau "Prendre contact" |
| Bug #3 | Avis inline (refondu V2) | Modal puis **bloc inline** direct dans section avis, + likes (`recommendation_likes` table), reports (`recommendation_reports` adaptée), reply inline, `components/v2/AvisSection.tsx`, APIs `/api/recommendations/[id]/like|report|reply`, admin `/signalements` branché live, `/api/admin/reports/[id]` |

**Commit suggéré** : `feat(moderation): avis inline + likes + reports + multi-RS + RGPD delete (Chantier 3)`

---

### Chantier 4 — Reset password + admin retrait (fin de journée)

| Sujet | Item | Fichiers clés |
|---|---|---|
| 1 | Fix reset password domaine dynamique | `lib/auth/redirect-origin.ts`, update 3 routes `password-reset`, `signup`, `resend-confirmation` (n'utilisent plus `NODE_ENV` hardcode) |
| 1 bis | Fix reset password token_hash flow | `app/api/auth/password-reset/route.ts` utilise `data.properties.hashed_token` et construit URL directe vers `/auth/callback?token_hash=X&type=recovery` (bypass Supabase implicit flow hash fragment) |
| 2 | Admin retrait publications avec motif | Migration DB (`admin_notes` sur events + recommendations), `components/v2/MotifModal.tsx`, `app/api/admin/recommendations/[id]/remove/route.ts`, `app/api/admin/events/[id]/remove/route.ts`, update `sendEventCancelledEmail` (param `source='organisatrice' \| 'admin'`), update 2 admin rowClients |

**Commit suggéré** : `fix(auth): reset password token_hash flow + feat(admin): retrait publications avec motif (Chantier 4)`

---

## 12. Informations complémentaires

### Commandes utiles

```bash
# Dev server local (port auto-assigné)
npm run dev

# Build (obligatoire avant deploy)
npm run build

# Typecheck
npx tsc --noEmit

# Deploy preview
vercel --yes

# Deploy prod (⚠️ pas sans validation)
vercel --prod

# Seed de données (idempotent)
node --env-file=.env.local scripts/seed-launch.mjs

# Query Supabase via Management API
curl -s "https://api.supabase.com/v1/projects/qrlvjwqanixkhopedqqw/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT ..."}'
```

### User admin

Pour se marquer admin :

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"is_admin":true}'::jsonb
WHERE email = 'jihane.ess.maliki@gmail.com';
```

Puis logout/login pour refresh la session.

### Seed

Script `scripts/seed-launch.mjs` (non committé) — 8 prestataires + 8 lieux + 4 événements répartis sur Genève, Paris, Lausanne, Bruxelles, Luxembourg, Monaco. Idempotent (supprime les slugs seed avant réinsertion). Utilise `user_id=79fbe5a3-2acb-4a2c-b111-004ad9f20548` (jihane) comme organisatrice des events seed.

### Contact externe

- **Email founders** : jihane.ess.maliki@gmail.com
- **Brevo SMTP user** : a3f0f6001@smtp-brevo.com (login technique, pas Gmail)
- **Site URL prod** : https://hilmy.io (Vercel prod deploy actuel = commit `1bfd35b` d'avant le 18/04)
- **Supabase project** : qrlvjwqanixkhopedqqw.supabase.co

---

*Fin du document. Dernière session : Sam 18 avril 2026, fin d'après-midi. Chantiers 1→4 bouclés, preview URL en cours : `https://hilmy-cuemsthgn-jihaneessmaliki-7138s-projects.vercel.app`. Prête pour validation des 3 derniers sujets (reset password + admin retrait), puis promote prod après checklist §9.*
