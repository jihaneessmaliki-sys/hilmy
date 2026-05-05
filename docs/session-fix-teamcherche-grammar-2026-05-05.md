# Fix grammaire titre + capitalize first_name TeamCherchePrivate — 2026-05-05

## Fichiers modifiés (1)

| Path | Changements |
|---|---|
| `components/landing/TeamCherche.tsx` | +2 helpers (`capitalizeFirstName`, `formatTitle`) + refonte JSX titre 2 lignes étagées + appel helpers dans card + CTA |

## Capture preview Vercel

Capture mobile 375px validée sur preview locale via `app/preview-teamcherche-tmp/page.tsx` (page temp créée pour rendre TeamCherchePrivate avec 4 cas mock, supprimée avant le commit final).

L'image rendue confirme :
- ✅ "Cherche" (Fraunces 300 italic, or #C9A961, ~14-15px) **au-dessus** de
- ✅ "une décoratrice" (Fraunces 300 normal, vert #0F3D2E, ~20-22px, line-clamp-2)
- ✅ Bouton plein vert "Réponds à **J**ij →" avec J majuscule (alors que le prénom BDD était `"jij"` lowercase)
- ✅ Card 2 (Sara, 1 réponse) : bouton outline "1 réponse · Réponds aussi →" — comportement multi-réponses préservé

## Logique `formatTitle(rawTitle)` — cas couverts V1.0

| Input BDD | Détecté article ? | Output | Cas |
|---|---|---|---|
| `"Une décoratrice"` | ✅ Oui (`Une `) | `"une décoratrice"` | Nouveau form PR #65 |
| `"Décoratrice"` | ❌ Non — terminaison `-trice` → fém | `"une décoratrice"` | Héritage avant PR #65 |
| `"Photographe"` | ❌ Non — terminaison `-e` → fém | `"une photographe"` | Épicène, féminin par défaut audience Hilmy |
| `"Coach"` | ❌ Non — terminaison non-fém → masc | `"un coach"` | Épicène, masculin par défaut |
| `"Un coach"` | ✅ Oui (`Un `) | `"un coach"` | Nouveau form si saisi avec article |
| `"L'ostéopathe"` | ✅ Oui (`L'`) | `"l'ostéopathe"` | Élision gérée |
| `""` | — | `""` | Edge vide |

### Cas non couverts V1.0 (à itérer V1.5)
- **Mots masculins terminés par -e** : `"Notaire"` → heuristique dit fém `"une notaire"` (alors que masc usuel `"un notaire"` aussi correct). Acceptable car audience femmes utilise le féminin par défaut.
- **Mots féminins sans terminaison classique** : `"Star"` (`"une star"` attendu) → heuristique dit `"un star"`. Edge cases rares.
- **Pluriel** : `"Décoratrices"` → traité comme singulier (`"une décoratrices"`). Acceptable car titres BDD majoritairement au singulier.
- **Anglicismes** : `"Doula"`, `"Designer"` → heuristique imparfaite.

**Roadmap V1.5** (documentée en commentaire `TeamCherche.tsx:formatTitle`) :
- Option A : ajouter colonne `gender` optionnelle sur table `demandes` (migration légère, le form prend la décision côté UI)
- Option B : maintenir une liste `WORDS_WITH_KNOWN_GENDER` côté code pour les ~50 métiers fréquents Hilmy
- Option C : l'API ChatGPT/Mistral pour deviner le genre — overkill pour un titre 1-mot

## Logique `capitalizeFirstName(name)` — cas couverts

| Input BDD | Output |
|---|---|
| `"jij"` | `"Jij"` |
| `"MARIE"` | `"Marie"` |
| `"Sara"` | `"Sara"` (idempotent) |
| `"  jij  "` | `"Jij"` (trim) |
| `null` / `""` / `"   "` | `"la copine"` (fallback) |

## URL preview
- Preview locale : `http://localhost:62394/preview-teamcherche-tmp` (page supprimée avant commit)
- Page réelle après merge : `https://hilmy.io/accueil` (auth-required)
- Vercel preview automatique sur PR : déclenchée par le push GitHub

## PR + statut merge
- **PR** : [#67](https://github.com/jihaneessmaliki-sys/hilmy/pull/67) — `fix(je-cherche): grammaire titre + capitalize first_name TeamCherchePrivate`
- **Statut** : ✅ **Mergée auto** à 2026-05-05T13:20:33Z
- **Commit merge** : [`272d2ea`](https://github.com/jihaneessmaliki-sys/hilmy/commit/272d2ea)
- **Verdict** : 🟢 SAFE — display only, pas de touche BDD/auth/EMAIL_FROM, pas de migration

## Garanties (vs spec brief)
- ✅ Pas de migration BDD, pas de UPDATE
- ✅ Pas de touche auth/signup
- ✅ Pas de touche EMAIL_FROM
- ✅ TeamCherchePublic (PR #63) intact
- ✅ Card "À TOI" verte intacte
- ✅ H2 + eyebrow + intro module intacts
- ✅ Form `/je-cherche/nouvelle` intact (déjà aligné PR #65)
- ✅ Build OK 67/67 pages
- ✅ Page preview temp supprimée avant le commit final (`git status` propre)
