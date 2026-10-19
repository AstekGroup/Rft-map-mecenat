# SUIVI — Refonte « 1 code, N cartes »

> **À lire en début de session. À mettre à jour en fin de session.**
> État au **2026-10-19**, à la pointe de la chaîne de PR #42 à #49 (au-dessus de `develop` après la PR #41). Preuves : [JOURNAL.md](JOURNAL.md). Vérification complète : [../verdict.md](../verdict.md). Plan actif : [PLAN-FIN-REFONTE.md](PLAN-FIN-REFONTE.md). Plan historique et workflow Git : [PLAN-SESSIONS.md](PLAN-SESSIONS.md).

## Philosophie (rappel)

1 seul code pour N cartes · 1 fichier de config par carte (identité et titres, dates, design, correspondance Baserow) · référentiels et données dans Baserow · un changement de structure Baserow ne casse pas la carte. Détail : [../../AGENTS.md](../../AGENTS.md).

## Convention de preuve

Chaque constat porte une preuve : `fichier:ligne` ou commande exécutée. Sans preuve : « non vérifié ».

## Où on en est

Vérifié le 2026-10-19 sur la pointe de la chaîne (`docs/verdict-final`) : `pnpm build`, `pnpm lint` (0 erreur, 2 avertissements connus) et `pnpm run test -- --force` verts (`shared/types` 5 tests, backend 236, frontend 176), plus contrôle dans le navigateur avec le Baserow local et la seconde config. Avancement estimé : environ 95 % hors déploiement et passage sur `main` (déploiement ~10 %). Détail : [../verdict.md](../verdict.md).

| Session | État | PR |
|---|---|---|
| 0 GitHub CLI | faite | — |
| 1 Base Git | faite | #9 à #14 |
| 2 Nettoyage et intégration | faite | #21 (#15 à #20 fermées) |
| 3 Titres et identité par la config | faite | #22, #23, #24 |
| 4 Mapping Baserow, config validée | faite | #25, #26, #27, #28 |
| 5 Filtres | faite | #29, #30, #31 |
| 6 Cas dégradés | faite | #32 |
| 7 Qualité | faite ; tests « deux cartes » et modèle de PR retirés par #38, **retrait annulé** (rétablis à l'étape 1) | #33 à #36, #38 |
| Hors plan | seed à 1000 événements, test des métas, verdict | #37, #39, #40 |
| 8 Déploiement | **non faite, hors du plan actif** | — |

## Plan actif : PLAN-FIN-REFONTE.md

| Étape | Sujet | État |
|---|---|---|
| 0 | Plan dans le dépôt, nettoyage de `docs/`, config Astek supprimée | **fait** ([#41](https://github.com/AstekGroup/Rft-map-mecenat/pull/41), mergée) |
| 1 | Remettre les tests « deux cartes » et le modèle de PR | **fait** ([#42](https://github.com/AstekGroup/Rft-map-mecenat/pull/42)) |
| 3 | Résidus en dur (`Badge.tsx`, palette par défaut, gris de repli) | **fait** ([#43](https://github.com/AstekGroup/Rft-map-mecenat/pull/43)) |
| 4 | Cas dégradés restants (config absente sur carte et liste, section Format vide) | **fait** ([#44](https://github.com/AstekGroup/Rft-map-mecenat/pull/44)) |
| 5 | README et `PROJECT_VIBE_CONF.md` neutres | **fait** ([#45](https://github.com/AstekGroup/Rft-map-mecenat/pull/45)) |
| 6 | Filtre Modalité retiré de la carte ; picto kebab-case | **fait** ([#46](https://github.com/AstekGroup/Rft-map-mecenat/pull/46), [#47](https://github.com/AstekGroup/Rft-map-mecenat/pull/47)) |
| 7 | Ménage (`App.tsx`, e2e périmé, gardes de seed, lint, garde-fou) | **fait**, sauf suppression des branches (accord du propriétaire) ([#48](https://github.com/AstekGroup/Rft-map-mecenat/pull/48)) |
| 8 | Verdict final | **fait** (#49) |

**Prochaine action** : merger la chaîne #42 à #49 dans l'ordre (option « Create a merge commit », chaque PR cible la précédente ; après chaque merge, GitHub retarge la suivante vers `develop` si la branche mergée est supprimée, sinon changer la base à la main). Puis décider de la session 8 (déploiement) et du passage `develop` vers `main`, et valider la liste de branches à supprimer (voir JOURNAL).

## Décisions en vigueur

- **Hors du plan actif (2026-10-19)** : session 8 (déploiement) et `develop` vers `main` avec tags. On reste sur `develop`.
- **Tests « deux cartes » et modèle de PR (2026-10-19)** : remis (étape 1) ; leur retrait par #38 était une erreur. La vérification d'identité ou de config se fait avec `docs/audit/fixtures/app.config.second-map.json`.
- **Config Astek (2026-10-19)** : supprimée (essai local sans valeur).
- **Périmètre (2026-10-16)** : seuls les titres et noms de l'événement sont pilotés par la config, le wording de l'interface reste en dur ; pas de flags de fonctionnalités ; pas de schéma cible Baserow ; carte et régions dans le code ; Airtable retiré, pas de migration de données.
- Toutes les décisions détaillées : [PLAN-SESSIONS.md](PLAN-SESSIONS.md), section « Décisions prises ».

## Points ouverts

- **PR #38** : sa description annonçait le retrait du filtre Modalité de la carte, que son contenu ne faisait pas ; fait à l'étape 6 ([#46](https://github.com/AstekGroup/Rft-map-mecenat/pull/46)). Historique GitHub de #38 inchangé.
- `main` a 124 commits de retard sur `develop` (au 2026-10-19) : tout est sur `develop` ; le passage sur `main` est reporté.
- `supertest` et `@types/supertest` restent dans `apps/backend/package.json` sans usage (le test e2e a été supprimé à l'étape 7) : à retirer par `pnpm remove` si souhaité.
- Restes de cas dégradés non traités : pastille de format vide possible (`HomePage`, `EventListView`, `EventCard`) si `type.name` est vide ; `event.targetAudience.map` sans garde dans `EventDetailPage`.
- 2 avertissements ESLint gardés dans `MapView.tsx` (commentaires dans le code).
- Un test frontend sensible aux délais (`eventDateRange.spec.ts`) a expiré une fois en exécution parallèle lourde : à surveiller.
- `prettier` n'est pas idempotent sur un bloc de `baserow.service.degraded.spec.ts` : `pnpm lint:fix` peut demander deux passes.
- Le lint ne détecte ni couleur ni marque en dur : c'est `apps/frontend/tests/pas-de-code-en-dur.spec.ts` qui le fait (lancé par `pnpm test`).
- Schéma de la vraie base Baserow de production : jamais fourni (non vérifié) ; la carte doit fonctionner avec le schéma indiqué par la config.
- Branches obsolètes `add-dynamic-filters`, `modify-audiences-filters`, `modif_audience_filters` : accord de leur auteur requis avant suppression.
- Réglage GitHub à faire par le propriétaire : protéger `main` et `develop` (non vérifié).
