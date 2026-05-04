# Migrations SQL Phase 4 — 2026-05-04

## TL;DR
Les 2 migrations SQL Phase 4 ont été exécutées en prod Supabase (ref `qrlvjwqanixkhopedqqw`) à 14:49 et 14:51 UTC. Aucune erreur. Tables `promo_codes` (12 colonnes, 1 policy SELECT public, seed COPINE10 actif) et `devis_requests` (12 colonnes, 4 policies INSERT/2×SELECT/UPDATE, no DELETE, RLS on) confirmées en place. PR #48 et PR #50 mergées juste après. Sync local OK — Jiji a maintenant les 2 fichiers de migration sur sa branche main.

## Pré-check
Avant exécution, vérifié qu'aucune des 2 tables ne préexistait :
```sql
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('promo_codes', 'devis_requests');
-- []
```
→ Safe à créer.

---

## Migration 35 — `promo_codes`

### Exécution
- **Source** : `git show origin/feat/promo-codes-copine10:supabase/migrations/35_promo_codes.sql` (115 lignes)
- **Commande** : `bash scripts/run-migration.sh /tmp/35_promo_codes.sql`
- **Réponse** : `HTTP 201 ✅ succès`
- **Timestamp** : 2026-05-04 ~14:49 UTC

### Vérifications post-exécution

#### Schéma — 12 colonnes
| Colonne | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| code | text | NO |
| discount_pct | integer | NO |
| applies_to_palier | text | NO |
| valid_from | timestamptz | NO |
| valid_until | timestamptz | YES |
| max_uses | integer | YES |
| current_uses | integer | NO |
| active | boolean | NO |
| notes | text | YES |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

#### RLS
- `relrowsecurity = true` sur la table
- 1 policy : `promo_codes_public_read_active` (SELECT public limité aux codes actifs avec `valid_until IS NULL OR > now()` ET `valid_from <= now()`)
- INSERT/UPDATE/DELETE → aucune policy → réservés au service-role (admin)

#### Seed COPINE10
| Champ | Valeur |
|---|---|
| code | `COPINE10` |
| discount_pct | 10 |
| applies_to_palier | premium |
| valid_until | 2027-05-04 14:49:56 UTC |
| max_uses | null (illimité) |
| current_uses | 0 |
| active | true |

→ Code valide 1 an exactement à partir de l'exécution.

### Status table promo_codes : ✅ **CRÉÉE et OPÉRATIONNELLE**

### PR mergée
[PR #48](https://github.com/jihaneessmaliki-sys/hilmy/pull/48) `feat(promo): code COPINE10 -10% Premium + UI tarifs + migration 35` → mergée à 2026-05-04T14:50:22Z, commit [`fbffa96a`](https://github.com/jihaneessmaliki-sys/hilmy/commit/fbffa96a932130dea0ecc209491bc6f7351c836a).

---

## Migration 36 — `devis_requests`

### Exécution
- **Source** : `git show origin/feat/devis-express-cercle-pro:supabase/migrations/36_devis_requests.sql` (146 lignes)
- **Commande** : `bash scripts/run-migration.sh /tmp/36_devis_requests.sql`
- **Réponse** : `HTTP 201 ✅ succès`
- **Timestamp** : 2026-05-04 ~14:51 UTC

### Vérifications post-exécution

#### Schéma — 12 colonnes
| Colonne | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| prestataire_id | uuid | NO |
| user_id | uuid | NO |
| prenom | text | NO |
| email | text | NO |
| telephone | text | YES |
| message | text | NO |
| status | text | NO |
| email_sent_at | timestamptz | YES |
| email_error | text | YES |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

#### RLS — 4 policies
| Policy | Cmd |
|---|---|
| devis_requests_user_insert | INSERT |
| devis_requests_user_select_own | SELECT |
| devis_requests_prestataire_select | SELECT |
| devis_requests_prestataire_update_status | UPDATE |

- `relrowsecurity = true` sur la table
- DELETE → aucune policy (cleanup admin uniquement via service-role)

### Status table devis_requests : ✅ **CRÉÉE et OPÉRATIONNELLE**

### PR mergée
[PR #50](https://github.com/jihaneessmaliki-sys/hilmy/pull/50) `feat(devis): Devis Express Cercle Pro + migration 36 + RLS` → mergée à 2026-05-04T14:51:12Z, commit [`06d5e888`](https://github.com/jihaneessmaliki-sys/hilmy/commit/06d5e888ae67dc181f678aaf1110f038535741bb).

---

## Sync local
`git pull origin main` exécuté → 12 fichiers ajoutés/modifiés sur main local (1391 insertions). Les fichiers de migration sont maintenant en local pour Jiji :
- `supabase/migrations/35_promo_codes.sql`
- `supabase/migrations/36_devis_requests.sql`

Fichiers temporaires `/tmp/35_*.sql` et `/tmp/36_*.sql` supprimés.

---

## Erreurs rencontrées
**Aucune.** Les 2 migrations ont rendu HTTP 201 du premier coup, et toutes les vérifications post-exécution sont passées sans incident.

---

## Bilan global Phase 4 (rappel)

| PR | Sujet | Verdict | Statut final |
|---|---|---|---|
| [#48](https://github.com/jihaneessmaliki-sys/hilmy/pull/48) | Code promo COPINE10 + migration 35 | 🟡→🟢 | ✅ Mergée 14:50 (après migration) |
| [#49](https://github.com/jihaneessmaliki-sys/hilmy/pull/49) | Stats hebdo email + cron Vercel | 🟢 | ✅ Mergée 13:12 (auto, pas SQL) |
| [#50](https://github.com/jihaneessmaliki-sys/hilmy/pull/50) | Devis express + migration 36 | 🟡→🟢 | ✅ Mergée 14:51 (après migration) |
| [#51](https://github.com/jihaneessmaliki-sys/hilmy/pull/51) | Stats avancées Cercle Pro | 🟢 | ✅ Mergée 13:23 (auto, pas SQL) |

**Les 4 features lourdes Phase 4 sont maintenant 100% live en prod.**

## Statut features Cercle Pro / Premium après cette session

8/11 features Cercle Pro/Premium promises sur `/tarifs` sont maintenant 🟢 live :
- ✅ Photos par palier (Phase 1)
- ✅ Carrousel autoplay (Phase 1)
- ✅ Mise en avant prio (Phase 1)
- ✅ Support prioritaire (Phase 1)
- ✅ Stats hebdo email (PR #49)
- ✅ Stats avancées (PR #51)
- ✅ Code promo COPINE10 (PR #48 + migration 35 ce coup-ci)
- ✅ Devis express (PR #50 + migration 36 ce coup-ci)

Restantes pour Phase 5 :
- 🔴 Vidéo 60s upload Premium / Vidéos illimitées Cercle Pro
- 🔴 2 boosts par an Premium / Boosts illimités Cercle Pro
- 🔴 Newsletter mensuelle Cercle Pro (les libellés `/tarifs` sont déjà suffixés `(dès mai 2026)` cf PR #53)
- 🔴 Story trimestrielle Premium / Portrait éditorial Cercle Pro (production éditoriale)

## ⚠️ Action Jiji restante (rappel session précédente)
**Configurer `CRON_SECRET` dans Vercel env vars** pour que le cron stats hebdo (PR #49) tourne effectivement chaque lundi 9h UTC :
```bash
openssl rand -base64 32
# puis Vercel UI → Settings → Environment Variables → CRON_SECRET
```
Sans cette var, le cron retourne 401 chaque lundi mais ne crash rien d'autre.

## Prochaine étape recommandée
Phase 5 (vidéo + boosts + newsletter mensuelle + portraits éditoriaux). Specs vidéo et boosts à arbitrer côté Jiji avant code (cf rapport [docs/session-phase-4-codables-2026-05-04.md](session-phase-4-codables-2026-05-04.md) section "Recos pour Phase 5").
