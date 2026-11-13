<!--
Titre de la PR : format Conventional Commits, `type(scope): sujet` (72 caractères max).
  Types : feat, fix, refactor, docs, chore, test. Scopes : front, back, types, config, docs, deploy, scripts.
Cible : `develop` (jamais `main` directement). Merge par merge commit.
Source de vérité de la checklist : `AGENTS.md` (« Définition de terminé »).
-->

## Objectif

<!-- Une idée par PR : quel problème règle-t-elle, et pourquoi ? -->

## Changements

<!-- Ce qui change, par zone (front, back, types, config, docs, deploy, scripts). -->

## Tests exécutés

<!-- Commandes lancées et résultat (pas de « devrait marcher »). Pour un cas dégradé : le scénario rejoué. -->

- [ ] `pnpm build` (racine)
- [ ] `pnpm lint` (racine) : 0 erreur
- [ ] `pnpm test` (racine)

## Checklist

- [ ] Aucun titre, nom de marque, date, e-mail/URL, couleur ou police propre à une carte dans le code (`rg -i "lgsv|semaine|végétal|#[0-9a-f]{6}"` sur les fichiers modifiés). Le wording générique de l'interface reste en dur.
- [ ] Aucun nom de champ Baserow ni valeur de liste de choix ajouté hors de la config ; aucun libellé de référentiel métier en dur.
- [ ] Nouveau **titre ou nom d'événement** : clé dans `texts.*` (type `AppConfig` + `app.config.json`), avec repli lisible si la clé manque ; le nom de l'événement n'est écrit qu'une fois (`app.name`), les autres titres passent par un gabarit.
- [ ] Pas de flag `features.*` ni de `if (carte === …)`.
- [ ] Cas dégradés couverts : donnée absente, champ renommé, config incomplète, API en erreur (pas de `Invalid Date`, pas de clé brute affichée, pas de 500 inutile).
- [ ] Types partagés (`shared/types`) mis à jour **avant** les consommateurs.
- [ ] Aucune variable d'environnement morte ou non documentée ; `.env.example` à jour.
- [ ] Si le changement touche l'identité ou la config : vérifié avec **une seconde config** (`docs/audit/fixtures/`), sans toucher au code (les tests « deux cartes » doivent rester verts).
- [ ] Docs concernées mises à jour (README de la zone, `docs/audit/SUIVI.md`).
- [ ] Commits atomiques en Conventional Commits, branche rebasée sur `develop`, aucun `--no-verify`.

## Points d'attention pour la revue

<!-- Compromis assumés (à inscrire aussi dans docs/audit/PLAN-SESSIONS.md), limites connues, ce qui n'a pas pu être vérifié. -->
