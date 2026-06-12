# Backlog — Lot B (profils + social)

## Flyers d'événements : re-key le storage (chemin sans user_id)

**Origine :** sous-lot A2-d. Découvert au test : le flyer d'un event est rangé sous
`event-flyers/<user_id>/<ts>.png` → afficher `flyer_url` fait **fuiter le user_id de
la créatrice** dans le HTML public anonyme.

**Décision A2-d :** flyer **omis** de la carte landing (bloc visuel sobre à la place).

**À faire en Lot B :**
- Re-key le storage des flyers vers un chemin **sans user_id** (ex. `event-flyers/<event_id>/…`
  ou un identifiant opaque), + migration / ré-upload des flyers existants.
- Corriger **la même fuite sur `/evenements-v2`** (la page rend déjà `flyer_url` avec le
  chemin user_id).
- Puis **réintroduire le flyer** sur la carte landing (réajouter `flyer_url` à
  `PUBLIC_EVENT_SELECT` + l'`<img>`).

## Attribution « Ajouté par [prénom] » sur les événements publics

**Origine :** sous-lot A2-d (bloc « Événements de la commu » sur la landing publique).
Shippé en Option A **sans attribution** : la carte affiche date + titre + ville, pas la créatrice.

**À faire en Lot B :**
- Surfacer « Ajouté par [prénom] » sur les events publics (landing + `/evenement-v2/[slug]`).
- Prérequis bloquant : **ne jamais mettre le prénom de quelqu'un dans le HTML public anonyme sans consentement**. Il faut d'abord :
  - un profil avec **pseudo public** choisi par l'utilisatrice ;
  - un **consentement explicite** sur ce qui est rendu public.
- Technique : `events.user_id` → join `user_profiles` (pas de FK directe, PostgREST n'auto-embed pas → fetch 2 temps ou vue dédiée), + chemin de lecture **anon-safe** du pseudo (vue ou RLS anon).
- Aujourd'hui `/evenements-v2` hardcode `organisatrice: 'HILMY'` — même bascule à prévoir là.

## Texte verbatim des recos sur la vitrine publique

**Origine :** sous-lot A2-b (bloc « Les copines recommandent » sur la landing publique).
Shippé en Option A **sans texte** : la carte affiche lieu + ville + catégorie + note, pas
le `comment` rédigé par la copine. La vue `recos_vitrine_public` (mig 63) n'expose
volontairement **ni `comment`, ni `user_id`, ni `photo_urls`**.

**À faire en Lot B :**
- Surfacer l'**extrait du texte** de la reco sur la carte vitrine (landing + détail lieu).
- Prérequis bloquants avant tout rendu public du texte :
  - **modération** du contenu — le `comment` peut contenir des mots à ne jamais rendre
    dans l'UI publique (ex. « halal » → règle CLAUDE.md : aucune référence Muslim/halal/Islam) ;
  - un **pseudo public** choisi par l'autrice (même brique que l'attribution events) ;
  - un **consentement explicite** sur la mise en avant publique de son témoignage.
- Technique : étendre la vue (ou une vue sœur) avec un `comment` **modéré/tronqué** +
  pseudo anon-safe ; ne jamais joindre le `comment` brut au HTML anonyme.

## A2-a-bis — Support `?q=` (et `?categorie=`) sur les événements

**Origine :** sous-lot A2-a (barre de recherche du hero, aiguilleur de destination).
La barre route vers `/annuaire?q=` (prestataires) et `/recommandations?categorie=…&q=`
(lieux). Pour les **événements**, la chip « Événements » fait une **navigation immédiate**
vers `/evenements-v2` **sans transmettre le terme** : la page events ne lit aujourd'hui
que `?seasonal=<slug>` (pas de `?q=` ni `?categorie=`).

**À faire (petit patch) :**
- Faire lire à `/evenements-v2` un param `?q=` (filtre texte client sur titre + ville +
  description) et éventuellement `?categorie=<event_type>`, sur le même modèle que les
  patchs annuaire/recommandations.
- Puis basculer la chip « Événements » du hero en mode **sélection + submit** (comme les
  autres chips) pour transmettre le terme tapé, au lieu de la navigation immédiate.
