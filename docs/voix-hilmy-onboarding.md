# Voix Hilmy — Onboarding admin

> **Stub initialisé au commit 3 du brief Voix Hilmy.**
> Le contenu opérationnel complet (template SQL d'activation, vérifications
> à faire avant activation, liste des slugs réservés, procédure de
> désactivation, FAQ admin) est ajouté au commit 13.
>
> Cette section "Limitations Phase 1 / dette technique" est créée tôt
> pour ne pas perdre les décisions prises pendant l'implémentation des
> migrations 24-27.

## ⚠️ Pré-requis avant d'activer une Voix en DB

**Ne PAS activer (`is_voix_hilmy = true`) une Voix tant que les commits
4 ET 10 du brief Voix Hilmy ne sont pas en prod.**

Risque sinon : le bouton Suivre sur la page perso appelle l'endpoint
`POST /api/voix/{slug}/follow` qui n'existe qu'à partir du commit 10.
Avant ça, une copine qui teste verra le bouton flicker (état optimiste
puis revert silencieux quand le 404 revient). UX cassée pour la
fonctionnalité phare de la viral loop.

Workaround si on veut tester l'OG / la page sans la fonctionnalité
Suivre : activer en DB, ne PAS partager le lien aux copines, cleanup
après tests.

## ✏️ Conventions de rédaction des Voix

### Bio et comments — pas de guillemets de citation

Le frontend ajoute automatiquement les guillemets français `«&nbsp;…&nbsp;»`
autour de la bio (sur la page perso et l'OG image) et autour du
commentaire de chaque reco (sur la card et la page détail du lieu/pro).

**Si la Voix écrit `« j'adore »` dans sa bio ou son comment, le rendu
sera `« « j'adore » »` (double guillemet visible).**

À l'admin Hilmy lors de l'activation d'une Voix : relire la bio et,
si possible, les comments existants. Retirer les guillemets de
citation. Les guillemets dans le texte (citation à l'intérieur, ex:
`Sara m'a dit "essaie celui-ci"`) restent OK avec des guillemets
droits ou simples — c'est juste les `«…»` français en début/fin de
texte qui posent problème.

## Limitations Phase 1 / dette technique

À traiter post-Phase 1, hors scope de la livraison initiale Voix Hilmy.

### a) Policy `select_all` sur `user_profiles` à durcir

À la création de la feature Voix Hilmy (avril 2026), la table `user_profiles`
a une policy RLS `select_all` (`qual = true`, role `public`) qui rend
toutes les lignes lisibles par anon, toutes colonnes incluses (`age_range`,
`bio`, `posture`, etc.). Toute colonne ajoutée à `user_profiles` est donc
publique par défaut sauf si quelqu'un retire ou restreint cette policy.

**Hors-scope Voix Hilmy** : nécessite un audit RLS global de
`user_profiles` qui dépasse le périmètre de cette feature. La vue
`voix_hilmy_public` (migration 26) est volontairement
`security_invoker = false` pour rester fonctionnelle même quand cette
policy sera durcie — donc aucun risque de régression côté Voix Hilmy
quand le durcissement sera fait.

**Action recommandée Phase 2** : audit RLS user_profiles, remplacer
`select_all` par une policy explicite qui ne lit que les colonnes
strictement nécessaires aux vues publiques (par ex. `prenom`, `ville`
pour la liste des copines actives).

### b) `recos_count` via sub-query inline — à matérialiser au scaling

La vue `voix_hilmy_public` calcule `recos_count` via une sub-query
`SELECT COUNT(*) FROM recommendations WHERE user_id = ... AND
status = 'published'` exécutée à chaque appel, par Voix.

**Acceptable en Phase 1** (5-10 Voix × < 100 recos chacune = < 1000
counts cumulés, latence négligeable).

**À matérialiser** si on dépasse > 100 Voix ou > 1000 recos par Voix.
Deux options :

1. **Colonne dénormalisée** `recos_count INTEGER` sur `user_profiles`,
   maintenue par trigger sur `recommendations` (pattern déjà utilisé
   pour `note_moyenne` / `nb_avis` sur `profiles`, cf. migration 01).
2. **Vue matérialisée** rafraîchie périodiquement (cron) si la latence
   du trigger devient un problème.

### c) Linter Supabase 0010 flagué volontairement sur 2 vues

La règle de lint `0010_security_definer_view` du dashboard Supabase
flagge `voix_hilmy_public` (migration 26) ET `voix_hilmy_recos_public`
(migration 27) comme problématiques. **C'est volontaire pour les deux.**
Ne pas "fixer" ces alertes en repassant les vues en
`security_invoker = true` sans relire le contexte des migrations 26 et 27.

Raisons du choix `security_invoker = false` (identiques pour les 2 vues) :
- Cohérence avec `get_featured_voix()` (migration 24, SECURITY DEFINER)
  et `get_voix_followers_count()` (migration 25, SECURITY DEFINER)
- Défense par column-whitelisting (la liste explicite du SELECT
  garantit la confidentialité quoi que fasse anon)
- Résilience si la RLS de `user_profiles` / `recommendations` /
  `places` / `profiles` est durcie demain (cf. (a) et (e) ci-dessous)
- Owner = postgres, donc bypass RLS du owner = comportement attendu

Le détail des raisons est inline dans les fichiers
`supabase/migrations/26_voix_hilmy_public_view.sql` et
`supabase/migrations/27_voix_hilmy_recos_public.sql`. Ne pas dupliquer
ici — ces fichiers servent de pointeurs pour les futurs lecteurs
du dashboard Supabase.

### d) Grants par défaut sur le schéma `public` à auditer

Les nouvelles tables/vues créées dans le schéma `public` reçoivent
automatiquement TOUS les privileges (SELECT, INSERT, UPDATE, DELETE,
REFERENCES, TRIGGER, TRUNCATE) pour `anon`, `authenticated`,
`service_role` via un `ALTER DEFAULT PRIVILEGES` global Supabase.

Le `REVOKE ALL ... FROM public` de la migration 26 n'affecte pas ces
grants directs (revoke FROM `public` ≠ revoke des grants nominaux).

**Pourquoi c'est OK pour la vue `voix_hilmy_public` :**
- `TRIGGER` et `TRUNCATE` ne s'appliquent pas aux vues (no-op)
- `INSERT`, `UPDATE`, `DELETE` échouent à runtime sur cette vue car
  elle n'est pas "simple" (sub-queries + appels de fonction)
- Sécurité réelle portée par SECURITY DEFINER + column-whitelisting

**Mais à l'échelle du schéma c'est une dette :**
- Toute nouvelle table créée hérite de ces grants
- Si quelqu'un crée une table avec données sensibles sans set RLS
  strict, les grants permettent l'accès direct
- La protection RLS dépend de la discipline du créateur

**Action recommandée Phase 2 :**
- Audit global des grants sur le schéma `public` (toutes les tables,
  pas juste user_profiles)
- Décider d'une convention : revoquer explicitement les privileges
  d'écriture sur les vues SECURITY DEFINER ? Restreindre les defaults ?
- Documenter la convention retenue dans un ADR ou ce fichier

### e) Linter 0010 flagué volontairement sur voix_hilmy_recos_public

Pendant qu'on y est : le linter `0010_security_definer_view` flagge
aussi `voix_hilmy_recos_public` (mig 27) — **volontaire**, mêmes
raisons que pour `voix_hilmy_public` (cf. (c)).

À retenir pour Jiji ou un futur dev : si tu vois deux warnings
linter 0010 dans le dashboard Supabase, c'est attendu. Ne pas
"fixer" en repassant `security_invoker = true`.

**Bonus dette implicite à formaliser Phase 2** : `voix_hilmy_recos_public`
reproduit manuellement les filtres RLS publiques (`profile.status =
'approved'`, etc.). Si la convention de visibilité publique évolue
côté `recommendations` / `places` / `profiles`, il faut mettre à jour
la vue à la main → risque d'oubli → divergence entre RLS d'origine
et vue. À traiter par un ADR + un test de cohérence (cf. test (e)
de la section vérifs post-mig 27).

### f) Monitoring des orphelins LEFT JOIN dans voix_hilmy_recos_public

`getRecosByVoix` (lib/supabase/queries/voix.ts) skippe côté client
les rows où `place_id` est NULL (place supprimé après la reco) ou
`profile_id` est NULL (profile passé `status != 'approved'`). Le
compteur `recos_count` de `voix_hilmy_public` peut donc être > au
nombre de cards effectivement rendues sur la page perso.

**Acceptable Phase 1** : 5-10 Voix manuellement curées, peu probable
qu'on ait des orphelins. Mais ça mérite un monitoring quand on aura
plus de Voix.

**Action recommandée Phase 2 :**
- Logger un warning quand `getRecosByVoix` skip un row (ex: Sentry,
  PostHog, ou un endpoint custom `/api/log/voix-orphans`)
- Permet de détecter les places supprimés ou les profiles passés
  non-approved sur lesquels une Voix avait recommandé
- Workflow possible : alerter la Voix concernée pour qu'elle re-shoote
  sa reco sur un autre lieu/pro
