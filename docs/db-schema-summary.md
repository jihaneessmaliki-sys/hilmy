# Hilmy — DB schema summary

> Source de vérité résumée pour les futurs prompts. À donner à Claude/LLM
> pour éviter les erreurs de nommage de tables et de colonnes.
>
> Source : `supabase/migrations/01-41` + `lib/supabase/types.ts`.
> Dernière mise à jour : 2026-05-09 (post mig 41 Sélection Hilmy).

---

## ⚠️ CONVENTIONS PIÈGEANTES — à savoir AVANT de coder

| Concept produit | Nom de la table | Notes |
|---|---|---|
| **Prestataires** (commerces de l'annuaire) | `public.profiles` | **PAS `prestataires`**. Ne jamais référencer `prestataires(id)` dans une migration → `ERROR 42P01`. Toujours `public.profiles(id)`. |
| **Membres / utilisatrices** (les copines) | `public.user_profiles` | Différent de `profiles`. Une utilisatrice (côté communauté) ≠ une prestataire (côté annuaire). |
| **Lieux recommandés** | `public.places` | Le terme "lieu" en UI = `places` en BDD. |
| **Avis prestataire** | `public.recommendations WHERE type='prestataire'` | Pas de table `avis` dédiée. Polymorphique avec les recos lieux. |
| **Recommandations lieux** | `public.recommendations WHERE type='place'` | Idem polymorphique. |
| **Photos prestataire** | `public.profiles.galerie` (jsonb array d'URLs) | **PAS de table `prestataire_photos`**. Tableau JSONB inline. Aussi `profiles.photos` (text[] legacy compat). |
| **Photos lieu** | `public.places.photos` (jsonb) + `places.main_photo_url` | Idem inline JSONB. La colonne `places.photos` est très peu peuplée actuellement (les photos viennent surtout via `recommendations.photo_urls`). |
| **Owner d'un prestataire** | `profiles.user_id` = `auth.users.id` | Direct. 1 user → 0 ou 1 profile. |
| **Owner d'un lieu** | `places.created_by_user_id` = `auth.users.id` (mig 28) | "Créatrice de la ghost-fiche" — pas un vrai owner business. Pour Sélection Hilmy MVP, on assume que `created_by_user_id` est aussi le owner (décision Jiji A1, 2026-05-09). |
| **Founder** | `profiles.is_founder boolean` (mig 39) | `is_founder=true` ⇔ accès Cercle Pro effectif via `getEffectivePalier()` (lib/permissions.ts), même si `palier='standard'` en DB. |
| **Pattern admin RLS** | `auth.jwt() -> 'user_metadata' ->> 'is_admin'` cast boolean | Pas de table `admins` ni colonne `role`. Présent dans mig 06, 15, 41. |
| **Convention storage path** | `{user_id}/{nom-fichier}.ext` | Premier segment = UUID owner, validé par `storage_owner_from_path()` (mig 08). Tous les buckets HILMY utilisent ce pattern. |
| **NOTIFY pgrst, 'reload schema'** | À ajouter en fin de chaque migration | Sans ça, supabase-js ne voit pas les nouvelles colonnes/tables tant qu'il n'y a pas de redémarrage. |

---

## TABLES PRINCIPALES

### 🏢 `profiles` — fiches prestataires (= "prestataires" en UI)

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | gen_random_uuid() |
| `user_id` | uuid → `auth.users(id)` | NULLABLE (ghost prestataires) |
| `nom` | text | Nom commercial |
| `slug` | text unique | URL-friendly |
| `categorie` | text | 11 valeurs : `beaute`, `bien-etre`, `sante-mentale`, `sport-nutrition`, `enfants-famille`, `maison`, `cuisine`, `evenementiel`, `mode-style`, `business-juridique`, `conseilleres-de-marque` (mig 21) |
| `ville`, `pays`, `region`, `code_postal`, `zone_intervention` | text | Loca (mig 32 ajout `pays`) |
| `description`, `tagline` | text | Contenu éditorial |
| `whatsapp`, `phone_public`, `email`, `instagram`, `tiktok`, `facebook`, `youtube`, `linkedin`, `site_web` | text | 9 canaux contact (cf `lib/social-channels.ts`) |
| `services` | jsonb | Array de `{nom, prix, duree}` |
| `galerie` | jsonb | Array d'URLs photos (mig 01). **PAS table dédiée.** |
| `photos` | text[] | Legacy compat |
| `prix_from`, `prix_gamme`, `devise` | numeric/text | Tarifs |
| `status` | text | `pending`, `approved`, `rejected`, `ghost`, `paused` |
| `note_moyenne`, `nb_avis`, `nb_vues` | numeric/integer | Compteurs (triggers mig 07, 15) |
| `palier` | text default 'standard' | `standard`, `premium`, `cercle_pro` (mig 19) |
| `is_founder` | boolean default false | mig 39 — flag founder |
| `source_import`, `approved_at`, `admin_notes`, `created_at`, `updated_at` | | |

**Triggers actifs** :
- `bump_profile_nb_vues` (AFTER INSERT on `profile_views`) — incrémente `nb_vues`
- `auto_flag_founder` (BEFORE INSERT/UPDATE OF status) — auto-set `is_founder=true` si `app_config.founders_window_open=true`

### 🍽️ `places` — lieux recommandés

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `google_place_id` | text | Lien Google Places |
| `name`, `slug`, `description`, `address`, `city`, `region`, `country`, `latitude`, `longitude` | | |
| `google_category`, `hilmy_category` | text | 9 catégories : `restos-cafes`, `salons-the`, `boutiques`, `bien-etre`, `enfants`, `hebergements`, `sante`, `culturel`, `sport-nature` (mig 02 CHECK) |
| `main_photo_url` | text | Photo principale |
| `photos` | jsonb default '[]' | Galerie additionnelle (mig 02) |
| `created_by_user_id` | uuid → `auth.users(id)` ON DELETE SET NULL | mig 28 — créatrice ghost-fiche |
| `palier` | text default 'aucun' | `aucun` ou `selection_hilmy` (mig 41) |
| `nb_vues` | integer default 0 | Compteur (mig 41) — bumpé par trigger sur `place_views` |
| `created_at`, `updated_at` | timestamptz | |

**Triggers actifs** :
- `place_views_bump_nb_vues` (AFTER INSERT on `place_views`)
- RLS DELETE Cas C : owner peut delete sa fiche si pas d'autres recos dessus (mig 28)

### 👤 `user_profiles` — utilisatrices (membres communauté)

> ⚠️ Table créée hors migrations 01-15 (probablement signup flow Supabase Auth). Mig 17 ajoute des colonnes onboarding.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` UNIQUE | |
| `prenom`, `pays`, `ville`, `bio`, `avatar_url` | text | |
| `signupType` | text | |
| `univers_choisis` | text[] | mig 17, multi-univers (max 3 dropped mig 23) |
| `posture` | text | mig 17 |
| `onboarding_data`, `onboarding_completed_at` | jsonb / timestamptz | mig 17 |
| `preferences` | jsonb default '{}' | Préférences notifications etc. (mig 17/33) |
| `age_range` | text | mig 22, 5 valeurs `18-24` à `55+` |
| `is_voix_hilmy` | boolean | mig 24 — membre featured |
| `voix_hilmy_slug`, `voix_hilmy_bio`, `voix_hilmy_activated_at`, `voix_hilmy_featured_until` | | mig 24 |
| `expo_push_token` | text | Mobile push (hors migration tracée) |
| `created_at` | timestamptz | |

**Préférences notifications** (clés JSONB dans `preferences.notifications`) :
- `emailWeekly`, `emailEvenements`, `emailNouvelles`, `notifCommentaires` (mig 33)
- `statsHebdoPrestataire` (cron stats hebdo)

### 📅 `events` — événements

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` | Organisatrice |
| `prestataire_id` | uuid → `profiles(id)` ON DELETE SET NULL | Optionnel (mig 03) |
| `place_id` | uuid → `places(id)` ON DELETE SET NULL | Optionnel (mig 41) — pas de XOR avec prestataire_id |
| `title`, `slug`, `description`, `event_type` | text | `event_type` = free-text affiché (PAS le boost) |
| `boost_event_type` | text | mig 41, **DIFFÉRENT** de `event_type` — slug parmi 25 valeurs (CHECK) pour le système d'auto-boost lieu |
| `format` | text | `presentiel`, `en_ligne` |
| `visibility` | text default 'public' | `public`, `members_only` |
| `start_date`, `end_date` | timestamptz | |
| `country`, `region`, `city`, `address`, `online_link` | text | |
| `flyer_url` | text | Storage `event-flyers` |
| `external_signup_url` | text | |
| `price_type`, `price_amount`, `price_currency` | text/numeric | `gratuit` ou `payant` |
| `places_max`, `inscrites_count` | integer | RSVP capacity |
| `status` | text | `published`, `flagged`, `removed`, `past` |
| `registration_mode` | text | `internal`, `external`, `info_only` (mig 13) |
| `source_import`, `created_at`, `updated_at` | | |

### 💬 `recommendations` — recos (lieux + avis prestataires polymorphique)

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` | |
| `type` | text | `place` ou `prestataire` (XOR avec FK ci-dessous) |
| `place_id` | uuid → `places(id)` | NULL si `type='prestataire'` |
| `profile_id` | uuid → `profiles(id)` | NULL si `type='place'` |
| `comment` | text NULLABLE | (mig 09) |
| `rating` | integer | 1-5 |
| `tags`, `photo_urls` | text[] | |
| `price_indicator` | text | |
| `reponse_pro`, `reponse_date` | text/timestamptz | Si `type='prestataire'` (mig 04) |
| `status` | text | `published`, `flagged`, `removed` (mig 10 soft-delete) |
| `source_import` | text | mig 11 |
| `created_at`, `updated_at` | | |

**CHECK constraint** : `(type='place' AND place_id IS NOT NULL AND profile_id IS NULL) OR (type='prestataire' AND profile_id IS NOT NULL AND place_id IS NULL)`.

---

## TABLES TRACKING & STATS

### 👁️ `profile_views` (mig 15) — pageviews prestataires

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `profile_id` | uuid → `profiles(id)` ON DELETE CASCADE | |
| `viewer_id` | uuid → `auth.users(id)` ON DELETE SET NULL | NULL si anonyme |
| `viewed_at` | timestamptz | |
| `country`, `region`, `city`, `referer`, `user_agent_hash` | text | Géo via `x-vercel-ip-*` |

**RLS** : INSERT public ; SELECT owner du profile OU admin.

### 📞 `profile_contacts` (mig 15) — tap-to-contact prestataires

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `profile_id` | uuid → `profiles(id)` ON DELETE CASCADE | |
| `clicker_id` | uuid → `auth.users(id)` ON DELETE SET NULL | |
| `contact_type` | text CHECK | 9 valeurs : `whatsapp`, `phone`, `email`, `website`, `instagram`, `tiktok`, `linkedin`, `facebook`, `youtube` |
| `clicked_at`, country, region, city, referer | | |

### 👁️ `place_views` (mig 41) — pageviews lieux

> Mirror de `profile_views`, FK vers `places(id)`.

### 📞 `place_contacts` (mig 41) — tap-to-contact lieux

> Mirror de `profile_contacts`, FK vers `places(id)`.
> CHECK : 9 valeurs **différentes** de profile_contacts → `phone`, `website`, `email`, `instagram`, `tiktok`, `facebook`, `youtube`, `google_maps`, `whatsapp` (`google_maps` au lieu de `linkedin`).

---

## TABLES MEMBRES & GAMIFICATION

### ❤️ `favoris` (mig 05) — saves polymorphique

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` ON DELETE CASCADE | |
| `type_item` | text CHECK | `prestataire`, `lieu`, `evenement`, `recommendation` (mig 16 a ajouté la 4e valeur) |
| `item_id` | uuid | **Pas de FK** — polymorphique |
| `note_perso` | text | |
| `created_at` | | |
| UNIQUE | (user_id, type_item, item_id) | Pas de doublons |

**RLS owner-only** sur `user_id = auth.uid()` (mig 05). Triggers gamif filtrent `type_item='recommendation'` early return.

### 🎯 `point_events` (mig 16) — gamification

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` | |
| `event_type` | text | Ex: `reco_published`, `event_published`, `reco_saved_by_other` |
| `source_id` | uuid | ID polymorphique de l'item source |
| `points` | integer | |
| `created_at` | | |

**Triggers actifs** : INSERT auto sur `recommendations` published, `events` published, et sur `favoris` (filtré `type_item='recommendation'` only).

### 🔔 `notifications` (mig 18) — notifications utilisatrices

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` | |
| `type` | text | Ex: `reco_sauvegardee` |
| `payload` | jsonb | Variable par type |
| `read_at`, `created_at` | | |

### 👥 `voix_hilmy_follows` (mig 25) — follow Voix Hilmy

| Colonne | Type | Notes |
|---|---|---|
| `follower_user_id` | uuid → `auth.users(id)` ON DELETE CASCADE | |
| `voix_user_id` | uuid → `auth.users(id)` ON DELETE CASCADE | UNIQUE pair |
| `created_at` | | |

---

## TABLES MODÉRATION & MISC

### 🚩 `content_reports` (mig 20) — signalements polymorphique

| Colonne | Type | Notes |
|---|---|---|
| `target_type` | text | `place`, `prestataire`, `recommendation`, `event` |
| `target_id` | uuid | Pas de FK — polymorphique |
| `user_id` | uuid → `auth.users(id)` | UNIQUE (user_id, target_type, target_id) |
| `motif` | text | |
| `status` | text | `pending`, `dismissed`, `actioned` |
| `created_at`, `updated_at` | | |

**Trigger** : auto-hide cible si ≥3 signalements.

### 🎟️ `event_inscriptions` (mig 06) — RSVP

| Colonne | Type | Notes |
|---|---|---|
| `event_id` | uuid → `events(id)` ON DELETE CASCADE | |
| `user_id` | uuid → `auth.users(id)` | |
| `status` | text | `inscrite`, `annulee`, `liste_attente` |

**Trigger** : maintient `events.inscrites_count`.

### 🔍 `demandes` + `demande_responses` + `demande_signalements` + `demande_response_thanks` (mig 38) — Module "Je cherche"

Feed communautaire de demandes/recos entre membres.

| Table | Rôle | FK clés |
|---|---|---|
| `demandes` | Posts publics des copines | `user_id → auth.users` |
| `demande_responses` | Recos en réponse à une demande | `demande_id → demandes`, `prestataire_id → profiles`, `user_id → auth.users` |
| `demande_signalements` | Modération communautaire | XOR demande_id/response_id |
| `demande_response_thanks` | "Merci copine" sur une reco | `(user_id, response_id)` UNIQUE |

**View** : `demandes_feed` (JOIN avec `user_profiles` pour prenom + avatar).

### 💵 `devis_requests` (mig 36) — Devis Express Cercle Pro

| Colonne | Type | Notes |
|---|---|---|
| `prestataire_id` | uuid → `profiles(id)` ON DELETE CASCADE | |
| `user_id` | uuid → `auth.users(id)` ON DELETE CASCADE | |
| `prenom`, `email`, `telephone`, `message` | text | Snapshot saisie form |
| `status` | text CHECK | `pending`, `replied`, `ignored`, `archived` |
| `email_sent_at`, `email_error` | | Trace email best-effort |

**RLS** : INSERT auth (`user_id=auth.uid()`), SELECT user OU prestataire owner, UPDATE prestataire owner.

### 🎁 `promo_codes` (mig 35, désactivés mig 40)

| Colonne | Type | Notes |
|---|---|---|
| `code` | text UNIQUE (case-insensitive) | |
| `discount_pct` | integer | |
| `applies_to_palier` | text | `all`, `standard`, `premium`, `cercle_pro` |
| `valid_from`, `valid_until` | timestamptz | |
| `max_uses`, `current_uses` | integer | |
| `active` | boolean | |
| `notes` | text | |

Seed `COPINE10` désactivé mig 40 (2026-05-08).

### ⚙️ `app_config` (mig 39) — config singleton

| Colonne | Type | Notes |
|---|---|---|
| `id` | boolean PK CHECK (id=true) | Singleton |
| `founders_window_open` | boolean default true | Active le trigger auto-flag founder |
| `stripe_live` | boolean default false | À flipper quand Stripe LIVE branché |
| `updated_at` | | |

### ⚙️ `events_config_admin` (mig 41) — config auto-boost

| Colonne | Type | Notes |
|---|---|---|
| `event_type` | text UNIQUE CHECK | 25 slugs (mig 41 PR-A) |
| `boost_enabled` | boolean | |
| `boost_days_before` | integer 0-365 | |
| `boost_until_event_end` | boolean | |

**RLS** : SELECT public, INSERT/UPDATE/DELETE admin only.

---

## VUES SQL

### `voix_hilmy_public` (mig 26)
JOIN `user_profiles` filtré sur `is_voix_hilmy=true AND voix_hilmy_featured_until > now()` → expose `user_id`, `prenom`, `slug`, `bio`, `recos_count`, `followers_count`. Sécurité INVOKER=false.

### `voix_hilmy_recos_public` (mig 27, étendue mig 30)
Recos publiées par une Voix Hilmy active, jointe avec `places` ou `profiles` selon `type`. Edge case : place_*/profile_* NULL si l'autre côté.

### `demandes_feed` (mig 38)
Demandes publiques + JOIN `user_profiles` (prenom, avatar).

---

## STORAGE BUCKETS (mig 08 + futurs)

| Bucket | Public | Size limit | MIME types |
|---|---|---|---|
| `prestataire-photos` | true | 5 MB | jpeg, png, webp |
| `recommendation-photos` | true | 5 MB | jpeg, png, webp |
| `event-flyers` | true | 8 MB | jpeg, png, webp, pdf |
| `user-avatars` | true | 2 MB | jpeg, png, webp |

**Convention path** : `{user_id}/{nom-fichier}.ext` — **OBLIGATOIRE** pour passer les policies RLS owner-only via `storage_owner_from_path()` (helper SQL mig 08). Ne pas utiliser `videos/{prestataire_id}/...` ou similaire.

**Policies RLS** : tous les buckets HILMY partagent le même set (4 policies génériques) qui matchent sur `bucket_id IN (...)` + `storage_owner_from_path(name) = auth.uid()`. Pour ajouter un nouveau bucket : étendre l'array des `bucket_id IN (...)` dans les 4 policies (cf [supabase/migrations/08_storage.sql](supabase/migrations/08_storage.sql)).

---

## TABLES UTILISÉES PAR LE CODE MAIS HORS MIGRATIONS TRACÉES

> Ces tables ont été créées via Supabase Dashboard direct OU dans un setup initial pré-mig-01. À traiter avec précaution.

- `auth.users` — schéma standard Supabase Auth
- `user_profiles` — création initiale hors mig 01-15 (cf comment dans mig 17 : *"table existante créée hors migrations"*)
- `recommendation_likes` — utilisée dans `app/prestataire-v2/[slug]/page.tsx` mais pas trouvée dans les migrations 01-41. **À vérifier** : table créée à la main ou migration manquante.

---

## ORDRE CHRONOLOGIQUE DES MIGRATIONS

| # | Sujet | Tables touchées |
|---|---|---|
| 01 | ALTER profiles (annuaire) | profiles |
| 02 | ALTER places (lieux V2) | places |
| 03 | ALTER events (V2) | events |
| 04 | ALTER recommendations (réponse pro + check XOR) | recommendations |
| 05 | CREATE favoris | favoris |
| 06 | CREATE event_inscriptions | event_inscriptions |
| 07 | counters triggers (nb_avis, note_moyenne) | profiles |
| 08 | Storage buckets + RLS générique | storage.buckets, storage.objects |
| 09 | recommendations.comment NULLABLE | recommendations |
| 10 | RLS soft-delete | profiles, places, events, recommendations |
| 11 | recommendations.source_import | recommendations |
| 12 | events.source_import | events |
| 13 | events.registration_mode | events |
| 15 | tracking : profile_views + profile_contacts | profile_views, profile_contacts, profiles |
| 16 | gamification sprint 1 (point_events + triggers) | point_events, favoris (CHECK extension), recommendations, events |
| 17 | onboarding utilisatrice | user_profiles |
| 18 | notifications | notifications |
| 19 | profiles.palier (display only marketing) | profiles |
| 20 | content_reports | content_reports |
| 21 | profiles.categorie ajout `conseilleres-de-marque` | profiles |
| 22 | user_profiles.age_range | user_profiles |
| 23 | drop user_profiles.univers_max3 | user_profiles |
| 24 | voix_hilmy : 5 colonnes user_profiles | user_profiles |
| 25 | voix_hilmy_follows | voix_hilmy_follows |
| 26 | view voix_hilmy_public | (view) |
| 27 | view voix_hilmy_recos_public | (view) |
| 28 | places.created_by_user_id + RLS DELETE Cas C | places |
| 29 | voix_hilmy.bio required | user_profiles |
| 30 | view voix_hilmy_recos_public extend | (view) |
| 31 | recommendations RLS DELETE | recommendations |
| 32 | profiles.pays | profiles |
| 33 | user_profiles.preferences (notifications) | user_profiles |
| 34 | profiles missing columns | profiles |
| 35 | promo_codes (+ seed COPINE10) | promo_codes |
| 36 | devis_requests | devis_requests |
| 38 | je_cherche : 4 tables + view + 3 triggers | demandes, demande_responses, demande_signalements, demande_response_thanks, demandes_feed |
| 39 | founders system : app_config + profiles.is_founder + trigger | app_config, profiles |
| 40 | désactivation seed COPINE10 | promo_codes |
| 41 | Sélection Hilmy foundations | places (palier, nb_vues), events (boost_event_type, place_id), place_views, place_contacts, events_config_admin |

> Migration 14 et 37 manquantes (gaps historiques, pas de problème).

---

## RAPPELS SÉCURITÉ — patterns établis

- **RLS toujours activée** sur les nouvelles tables, via `ALTER TABLE x ENABLE ROW LEVEL SECURITY`.
- **Pattern admin** : `coalesce(((auth.jwt() -> 'user_metadata') ->> 'is_admin')::boolean, false)`.
- **Owner-read** : `EXISTS (SELECT 1 FROM profiles p WHERE p.id = X.profile_id AND p.user_id = auth.uid())` ou équivalent pour places (`p.created_by_user_id`).
- **Tracking universal** : INSERT public via `with check (true)` sur les tables `*_views` / `*_contacts` (mig 15, 41). Le gating se fait au READ.
- **Ne JAMAIS** mettre `using (true)` sur SELECT pour des données sensibles (PII, contacts, paiements).
- **Service-role** = server-side ONLY. Acceptable dans les server components Next.js, jamais côté client.
- **Idempotence** obligatoire : `IF NOT EXISTS`, `DROP ... IF EXISTS` puis `CREATE`, `ON CONFLICT DO NOTHING`.

---

## RAPPEL HELPERS TS — à utiliser au lieu de lire les colonnes brutes

| Helper | Quand l'utiliser | Localisation |
|---|---|---|
| `getEffectivePalier(prestataire)` | Lire le palier prestataire **toujours** (mappe founder → cercle_pro) | `lib/permissions.ts` |
| `hasPremiumFeatures(prestataire)`, `hasCerclePro(prestataire)`, `isFounder(prestataire)` | Gating UI / API par palier | `lib/permissions.ts` |
| `getEffectivePalierLieu(place)`, `hasSelectionHilmy(place)`, `isSelectionHilmy(place)` | Gating lieu | `lib/permissions-lieux.ts` |
| `PHOTO_LIMIT[palier]`, `canUploadMorePhotos(palier, count)` | Cap photos prestataire | `lib/palier-limits.ts` |
| `EVENT_TYPE_LABELS`, `EVENT_TYPES_BY_CATEGORY`, `isEventType(value)` | 25 slugs boost lieu | `lib/event-types.ts` |
| `extractTrackingMeta(request)`, `isValidUuid(s)`, `isValidContactType(s)`, `isValidPlaceContactType(s)` | API routes tracking | `lib/tracking.ts` |
| `addFavori(typeItem, itemId)`, `removeFavori`, `isFavori` | Save/unsave côté client | `lib/supabase/queries/favoris.ts` |
| `requireUser()`, `requireUserProfile()`, `requirePrestataire()` | Auth gate server components | `lib/supabase/session.ts` |
| `getMyOwnedPlaces(userId)`, `getOwnedPlaceById(userId, placeId)` | Dashboard owner lieu | `lib/supabase/queries/places.ts` |

---

## CONVENTIONS DE MIGRATION

1. Numérotation séquentielle continue (sauf gaps historiques 14, 37).
2. Header doc : nom + date + tables touchées + idempotence + rollback.
3. Toujours `IF NOT EXISTS` sur ALTER, CREATE, INSERT.
4. RLS systématique sur les nouvelles tables avec policies explicites.
5. Comments SQL via `comment on column public.X.y is '...';`.
6. **`NOTIFY pgrst, 'reload schema';`** en fin de migration.
7. Bloc `-- ROLLBACK` en commentaires bas de fichier (drop dans ordre inverse).
8. Application via `bash scripts/run-migration.sh chemin/fichier.sql` (lit `.env.local`, POST à Supabase Management API).
9. Aucun environnement local Supabase dans le repo (pas de Docker, pas de `supabase/config.toml`). Les migrations s'appliquent **directement en prod** après backup manuel.
