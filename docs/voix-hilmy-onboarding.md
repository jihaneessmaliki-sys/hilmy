# Voix Hilmy — Onboarding admin

> **Stub initialisé au commit 3 du brief Voix Hilmy.**
> Le contenu opérationnel complet (template SQL d'activation, vérifications
> à faire avant activation, liste des slugs réservés, procédure de
> désactivation, FAQ admin) est ajouté au commit 13.
>
> Cette section "Limitations Phase 1 / dette technique" est créée tôt
> pour ne pas perdre les décisions prises pendant l'implémentation des
> migrations 24-26.

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

### c) Linter Supabase 0010 flagué volontairement

La règle de lint `0010_security_definer_view` du dashboard Supabase
flagge `voix_hilmy_public` comme problématique. **C'est volontaire.**
Ne pas "fixer" cette alerte en repassant la vue en
`security_invoker = true` sans relire le contexte de la migration 26.

Raisons du choix `security_invoker = false` :
- Cohérence avec `get_featured_voix()` (migration 24, SECURITY DEFINER)
- Défense par column-whitelisting (la liste explicite du SELECT
  garantit la confidentialité quoi que fasse anon)
- Résilience si la RLS de `user_profiles` est durcie demain (cf. (a))
- Owner = postgres, donc bypass RLS du owner = comportement attendu

Le détail des 4 raisons est inline dans le fichier
`supabase/migrations/26_voix_hilmy_public_view.sql`. Ne pas dupliquer
ici — ce fichier sert uniquement de pointeur pour les futurs lecteurs
du dashboard Supabase.
