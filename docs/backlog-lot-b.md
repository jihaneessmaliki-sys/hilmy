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
