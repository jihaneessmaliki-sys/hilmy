# Curation Hilmy · Scripts & workflow

> Tout le contenu éditorial posté par **Équipe Hilmy** (compte `hilmy.io@hotmail.com`, user_id `9c51573b-6e39-4bd1-b83a-612f9c5b665d`) passe par ces scripts. Jamais de modif manuelle en DB — toujours via un dry-run validé.

## Infrastructure

- Colonne `recommendations.source_import` (text, default `'user'`) ajoutée par migration [`11_recommendations_source_import.sql`](supabase/migrations/11_recommendations_source_import.sql).
- Le compte Équipe Hilmy est un utilisateur normal (`signupType=member`, pas admin).

## Lancer le batch initial (déjà fait le 2026-04-19)

```bash
# 1. S'assurer que le compte Équipe Hilmy existe (idempotent)
node --env-file=.env.local scripts/hilmy-curation/ensure-team-account.mjs

# 2. Chercher 30 lieux via Google Places (répartition géo/cat pré-câblée)
node --env-file=.env.local scripts/hilmy-curation/search-places.mjs
# → écrit scripts/hilmy-curation/candidates.json

# 3. Produire le dry-run avec commentaires voix Sara (option A)
node --env-file=.env.local scripts/hilmy-curation/build-dry-run.mjs
# → écrit scripts/hilmy-curation/dry-run.json + DRY-RUN-BATCH-1.md

# 4. Après validation humaine du MD, insérer en prod
node --env-file=.env.local scripts/hilmy-curation/insert-batch-1.mjs
```

Tag : `source_import = 'hilmy_curation_batch_1'`.

## Ajout récurrent (chaque lundi matin)

Un seul script autonome : [`scripts/hilmy-curation/weekly-add.mjs`](scripts/hilmy-curation/weekly-add.mjs).

### Usage

```bash
# Dry-run par défaut (ne touche pas à la DB)
node --env-file=.env.local scripts/hilmy-curation/weekly-add.mjs \
  --type=place --count=3 --city=Paris --category=restos-cafes
```

- Lit Google Places avec des queries pré-câblées par catégorie.
- Filtre qualité : rating ≥ 4.0, reviews ≥ 50, businessStatus OPERATIONAL.
- Anti-doublons : check `google_place_id` déjà en DB avant insert.
- Templates de commentaires voix Sara (option A : aucun détail fabriqué).
- Écrit `scripts/hilmy-curation/weekly-YYYY-MM-DD.json` pour revue.

### Options

| Option | Obligatoire | Valeurs |
|---|---|---|
| `--type=place` | ✅ | seul `place` supporté en v1 (events = TBD) |
| `--count=N` | ✅ | 1..10 |
| `--city=X` | — | ex: `Paris`, `Genève`, `Bruxelles` (filtre géo sur l'adresse) |
| `--category=slug` | — | ex: `restos-cafes`, `bien-etre`, `culturel`, `boutiques`, `salons-the` (+ autres) |
| `--confirm` | — | insère réellement en DB après dry-run (sinon : dry-run seulement) |

### Exemples

```bash
# Cas type : 2 lieux à Paris, restos/brunchs — dry-run puis insert
node --env-file=.env.local scripts/hilmy-curation/weekly-add.mjs \
  --type=place --count=2 --city=Paris --category=restos-cafes

# Vérifier le fichier weekly-YYYY-MM-DD.json puis relancer :
node --env-file=.env.local scripts/hilmy-curation/weekly-add.mjs \
  --type=place --count=2 --city=Paris --category=restos-cafes --confirm

# Sans filtres : 3 lieux random (mix de villes & catégories couvertes)
node --env-file=.env.local scripts/hilmy-curation/weekly-add.mjs \
  --type=place --count=3
```

### Tag source_import pour l'ajout récurrent

Chaque run écrit `source_import = 'hilmy_curation_YYYY-MM-DD'` (date du jour), ce qui permet d'auditer et purger par run.

## Audit : lister les contenus déjà postés par Équipe Hilmy

SQL Supabase :

```sql
-- Nombre total de recos Équipe Hilmy
select count(*)
from recommendations
where user_id = '9c51573b-6e39-4bd1-b83a-612f9c5b665d';

-- Détail par batch (source_import)
select source_import, count(*) as n, min(created_at) as first, max(created_at) as last
from recommendations
where user_id = '9c51573b-6e39-4bd1-b83a-612f9c5b665d'
group by source_import
order by first desc;

-- Liste des lieux posés par Équipe Hilmy (batch par batch)
select r.source_import, r.rating, r.comment, p.name, p.city, p.hilmy_category
from recommendations r
join places p on p.id = r.place_id
where r.user_id = '9c51573b-6e39-4bd1-b83a-612f9c5b665d'
order by r.source_import desc, r.created_at desc;
```

## Purge : supprimer un batch

⚠️ **Destructif**. Utiliser uniquement si un batch contient du contenu incorrect.

```sql
-- Étape 1 : récupérer les place_ids du batch à purger
select place_id
from recommendations
where source_import = 'hilmy_curation_batch_1';  -- ← adapte le batch

-- Étape 2 : supprimer les recos du batch
delete from recommendations
where source_import = 'hilmy_curation_batch_1';

-- Étape 3 (optionnel) : supprimer les places orphelines créées par ce batch
--                        (attention : si une vraie user a recommandé le même lieu,
--                         la place reste partagée — ne la supprime PAS dans ce cas)
delete from places
where id in (
  -- places dont TOUTES les recos étaient du batch
  select place_id from recommendations_archive_pending
  where ... -- à construire manuellement selon le besoin
);
```

En pratique, préférer un soft-delete : `update recommendations set status='removed' where source_import=...`.

## Règles de contenu (voix Sara, option A)

Toutes les recos Équipe Hilmy doivent respecter :

1. ❌ **Pas de détails fabriqués** : noms de staff, plats spécifiques, interactions imaginées
2. ✅ **Infos Google Places vérifiables** : type de cuisine, quartier, note, nombre d'avis
3. ✅ **Tutoiement, ton chaleureux, phrases courtes**
4. ✅ **Ancrage communautaire** : "bulle féminine", "entre copines", "à glisser au carnet"
5. ✅ **Qualificatifs honnêtes** : chaleureux, cosy, réputé, bien noté
6. ❌ **Pas de superlatifs non justifiés** ("meilleur de X")
7. ✅ **Tags diet** (halal/végé/vegan/sans-gluten/casher) seulement si Google Places le confirme (`halal_restaurant`, `vegetarian_restaurant`, etc.) — jamais inventés

## Arbo des fichiers de curation

```
scripts/hilmy-curation/
├── ensure-team-account.mjs    # idempotent — crée/valide le compte Équipe Hilmy
├── search-places.mjs          # scan Google Places pour batch 1 (30 lieux)
├── build-dry-run.mjs          # joint candidats + commentaires hand-crafted → dry-run
├── insert-batch-1.mjs         # insère le dry-run batch 1 en prod
├── weekly-add.mjs             # ⭐ script récurrent (chaque lundi)
├── candidates.json            # sortie de search-places.mjs
├── dry-run.json               # sortie de build-dry-run.mjs
├── DRY-RUN-BATCH-1.md         # doc de revue humaine batch 1
└── weekly-YYYY-MM-DD.json     # dry-run pour un run récurrent
```

## Events (batch 1 + récurrent)

⏳ **Pas encore implémenté**. Contrairement aux places (Google Places API = source vérifiée), les events demandent une source fiable pour ne jamais inventer un événement qui n'existe pas.

Approche envisagée :
- Option A : l'utilisatrice fournit une liste d'URLs Eventbrite/Meetup/Instagram validées → script extrait métadonnées + reformule en voix Hilmy
- Option B : web search ciblé sur comptes Instagram/orgas connues (Womenwave, Les Premières, Ladies Driving Club…) avec WebFetch pour extraction structurée

À trancher avant d'écrire le script `events-add.mjs`.
