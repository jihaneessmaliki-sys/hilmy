# Refonte UX card TeamCherche (mode connected) — 2026-05-05

## Fichiers modifiés (2)

| Path | Type | Changements |
|---|---|---|
| `components/landing/TeamCherche.tsx` | Edit `TeamCherchePrivate` uniquement | Intro module + titre split "Cherche"+objet + bouton CTA contextuel. `TeamCherchePublic` (PR #63) intact. |
| `app/je-cherche/nouvelle/_components/NouvelleDemandeForm.tsx` | Edit label + placeholder + helper | Label "Titre" → "Tu cherches quoi ?" / placeholder objet / helper italique |

## Avant / Après visuel

### Avant
- Eyebrow `ÉVÉNEMENTIEL`
- Titre seul `Décoratrice` (ambigu : on lit "elle est décoratrice")
- Compteur mort `0 reco`
- Aucun CTA visible
- Pas d'intro module

### Après (capture preview mobile 375px ci-dessous)
- Eyebrow `ÉVÉNEMENTIEL` (intact)
- **Titre split** : `Cherche` (Fraunces 300 italic, or #C9A961) + `Une décoratrice` (Fraunces 300 normal, vert #0F3D2E, line-clamp-2 break-words)
- **Bouton CTA contextuel** :
  - 0 réponse → bouton plein vert `Réponds à Jij →` (full-width)
  - ≥1 réponse → bouton outline `1 réponse · Réponds aussi →` ou `4 réponses · Réponds aussi →`
- **Intro module** sous le H2 : `Tu cherches une adresse ? Demande à la team.` (vert/70%, 14-15px DM Sans)

### Capture preview mobile 375px (preuve visuelle)
Capture prise sur preview locale via une page temporaire `app/preview-teamcherche-tmp/page.tsx` (créée pour tester sans session prestataire/utilisatrice, supprimée avant le commit). 

L'image rendue confirme :
- ✅ Header `LE FEED DES COPINES` + `La team _cherche_…` intacts
- ✅ Intro `Tu cherches une adresse ? Demande à la team.` présente sous le H2
- ✅ Card 1 (Jij, Fribourg, 0 réponse) : eyebrow `ÉVÉNEMENTIEL` + titre split + bouton plein vert `Réponds à Jij →`
- ✅ Card 2 (Sara, Lausanne, 1 réponse) : titre split + bouton outline `1 réponse · Réponds aussi →`
- ✅ Card finale `À TOI / Demande à la team / + POSTER MA DEMANDE` (intacte vs spec, hors périmètre)

> ⚠️ Note sur la page preview : Next App Router exclut les dossiers préfixés `_` du routing → 1ère tentative `app/_preview-teamcherche/` a renvoyé 404. Renommé en `app/preview-teamcherche-tmp/` pour test, puis supprimé avant le commit final. Aucun reste dans la PR mergée.

## URL preview Vercel
- Preview locale : `http://localhost:62394/preview-teamcherche-tmp` (page temp supprimée)
- Preview Vercel automatique sur la PR : déclenchée par le push GitHub
- Page réelle après merge : `https://hilmy.io/accueil` (auth-required) — visible aux copines connectées

## PR + statut merge
- **PR** : [#65](https://github.com/jihaneessmaliki-sys/hilmy/pull/65) — `fix(je-cherche): refonte UX card TeamCherche connected (intro + titre split + CTA)`
- **Statut** : ✅ **Mergée auto** à 2026-05-05T13:06:53Z
- **Commit merge** : [`685e8c1`](https://github.com/jihaneessmaliki-sys/hilmy/commit/685e8c1)
- **Verdict** : 🟢 SAFE — UI seule sur sous-composant connected, variant public intact, pas de touche auth/Stripe/EMAIL_FROM

## Convention "préfixe Cherche" + cohérence form
**Règle V1** : le champ `title` en BDD contient **uniquement l'objet** de la demande (`"Une décoratrice"`, `"Un photographe mariage"`, `"Un coach sportif"`). Le préfixe `"Cherche "` est ajouté en **display uniquement** sur les cards (pas en DB).

**Cohérence form `/je-cherche/nouvelle`** pour cadrer la copine :
- Label : `Tu cherches quoi ?`
- Placeholder : `Une décoratrice, un photographe, un coach…`
- Helper italique : `Juste l'essentiel — pas besoin d'écrire « je cherche », on s'en occupe.`

**Documenté en commentaire** dans `TeamCherche.tsx` (ligne ~165) pour qu'on s'y tienne. Si V2 ouvre le champ à des phrases libres, refacto possible : ajouter une logique d'extraction d'objet (NLP) ou retirer le préfixe `"Cherche "` du display.

## Garanties
- ✅ `TeamCherchePublic` (variant `public` PR #63) intact — vérifié par lecture de section non touchée + grep
- ✅ Card finale "À TOI / Demande à la team" intacte
- ✅ H2 + eyebrow `LE FEED DES COPINES` intacts
- ✅ Système d'auth intact
- ✅ `EMAIL_FROM` dans `lib/email/transactional.ts` intact
- ✅ Build OK local 67/67 pages
- ✅ Page preview temporaire supprimée avant commit (`git status` propre)
