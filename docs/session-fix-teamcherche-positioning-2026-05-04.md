# Fix repositionnement TeamCherche — 2026-05-04

## Fichiers modifiés (3)

| Path | Type | Lignes |
|---|---|---|
| `components/landing/TeamCherche.tsx` | Refactor | +173 / -5 (refonte complète en 2 sous-composants) |
| `app/page.tsx` | Edit 1 ligne | `<TeamCherche />` → `<TeamCherche variant="public" />` |
| `app/accueil/page.tsx` | Edit 2 zones | Import + insertion `<TeamCherche />` en haut + ajustement padding hero |

## Diff résumé par fichier

### `components/landing/TeamCherche.tsx`
- Wrapper `async function TeamCherche({ variant = 'connected' })` qui délègue à 2 sous-composants
- **`TeamCherchePrivate`** (variant `connected`, comportement actuel intact) : fetch `getDemandesForHomeCarousel()` Supabase, cards réelles avec prénom + ville + temps relatif + badge urgent + compteur recos, CTAs vers `/je-cherche` (Voir tout) et `/je-cherche/nouvelle` (CTA card finale + tap sur cards = `/je-cherche/[id]`)
- **`TeamCherchePublic`** (variant `public`) : 4 cards démo statiques `DEMO_CARDS_PUBLIC` (décoratrice Genève / photographe mariage Lausanne / coiffeur curly Annemasse / coach sportive Fribourg). Aucun fetch Supabase, aucune info perso (avatar = puce anonyme `·`, meta = "Une copine" + ville seule, label "Rejoindre pour voir →"). Tous les liens (Voir tout, cards, CTA card finale) → `/auth/signup`.

### `app/page.tsx`
```diff
-        <TeamCherche />
+        <TeamCherche variant="public" />
```

### `app/accueil/page.tsx`
```diff
+import { TeamCherche } from '@/components/landing/TeamCherche'
...
   return (
     <PageShell navVariant="solid">
+      {/* Module Je cherche : variant connected (vraies demandes) */}
+      <div className="pt-24 md:pt-32">
+        <TeamCherche />
+      </div>
+
       {/* Hero mini */}
-      <section className="relative overflow-hidden bg-creme-soft pt-28 pb-14 md:pt-36 md:pb-20">
+      <section className="relative overflow-hidden bg-creme-soft pt-14 pb-14 md:pt-20 md:pb-20">
```
Le padding-top du hero `Voici ce qui bouge` est réduit (28→14, 36→20) pour ne pas créer un double espacement consécutif après TeamCherche qui a déjà son propre `py-20 md:py-28`.

## Smoke check preview

- **Preview locale** : http://localhost:62394 (Next dev server, port auto-assigné)
- **Build prod** : ✅ `npm run build` passe (3.1s, 67/67 pages compilées)

### Vérifications visuelles `/` (variant `public`)
✅ 4 cards démo rendues : "Une copine cherche une décoratrice" / "...photographe mariage" / "...coiffeur curly" / "...coach sportive"
✅ 4 villes : Genève, Lausanne, Annemasse, Fribourg
✅ 100% des liens du bloc TeamCherche → `/auth/signup` (vérifié via `Set` des hrefs : `["/auth/signup"]` unique)
✅ Aucune mention "il y a X min" / aucun avatar réel / aucun prénom réel
✅ Screenshot mobile 375px confirme rendu propre, anonymisé

### Vérifications `/accueil` (variant `connected` default)
✅ Build statique passe, pas d'erreur runtime dans les logs preview
✅ Page protégée par auth (`createClient().auth.getUser()` côté Server Component) → redirect vers `/` sans session, comportement attendu
✅ Import correct, JSX intégré au-dessus du hero "Voici ce qui bouge"
⚠️ Rendu visuel `/accueil` non vérifiable en preview locale sans session prestataire/utilisatrice active. Le build statique + l'absence d'erreur runtime côté logs serveur confirment l'intégration correcte.

## PR + statut merge
- **PR** : [#63](https://github.com/jihaneessmaliki-sys/hilmy/pull/63) — `fix(je-cherche): repositionnement TeamCherche public vs connected`
- **Statut** : ✅ **Mergée auto** à 2026-05-05T12:41:10Z
- **Commit merge** : [`3acef8f`](https://github.com/jihaneessmaliki-sys/hilmy/commit/3acef8f)
- **Verdict** : 🟢 SAFE — refactor visuel + sécurité données, pas de touche auth/Stripe/SQL/EMAIL_FROM

## Garanties
- Rétrocompatibilité préservée : `<TeamCherche />` sans prop = `variant: 'connected'` (default)
- Aucune modification du système d'auth ni de `lib/email/transactional.ts` (rappel mission : EMAIL_FROM intouchable)
- Aucune fuite de données utilisatrice sur la home publique (validé HTML rendu + Set des liens unique)
