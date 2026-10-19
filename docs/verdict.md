# Verdict final : état de la refonte « 1 code, N cartes »

> Vérification du 2026-10-19 sur la **pointe de la chaîne de PR** (branche `docs/verdict-final`, qui contient les PR [#42](https://github.com/AstekGroup/Rft-map-mecenat/pull/42) à [#48](https://github.com/AstekGroup/Rft-map-mecenat/pull/48) au-dessus de `develop` à `9cfcb45`, donc PR #21 à #41 comprises). Ces PR sont chaînées : chacune cible la précédente, à merger dans l'ordre.
> Convention : chaque constat porte une preuve (`fichier:ligne` ou commande). « Non vérifié » quand je n'ai pas pu le confirmer.
>
> **Ce document remplace la photo du 2026-10-19 prise sur `2273bcb`** (écarts et suite recommandée d'alors : historique git de `docs/verdict.md`). L'état courant est dans [audit/SUIVI.md](audit/SUIVI.md), le plan dans [audit/PLAN-FIN-REFONTE.md](audit/PLAN-FIN-REFONTE.md).

## TL;DR

**Le code respecte la philosophie. Il n'y a plus de résidu connu dans le code applicatif.** Marques, couleurs et noms de champs Baserow sont hors du code (recherches du §2), le filet « deux cartes » est rétabli, deux gardes-fous automatiques tournent à chaque `pnpm test`.

**Reste hors du plan actif** (décision du propriétaire) : le **déploiement** (session 8, aucune image Docker ne reçoit encore une config de carte) et `develop` vers `main` (124 commits de retard au 2026-10-19). « N cartes » est vrai en local, pas livrable en production.

## 1. Contrôles exécutés

Sur la branche `docs/verdict-final`, avec la configuration du dépôt :

| Commande | Résultat |
|---|---|
| `pnpm install --frozen-lockfile` | OK |
| `pnpm build` | OK, `Tasks: 3 successful, 3 total` |
| `pnpm lint -- --force` | OK, 0 erreur, **2** avertissements connus (`MapView.tsx`, hooks, documentés dans le code) ; ils étaient 3 |
| `pnpm run test -- --force` | OK : `shared/types` 5 tests, backend 15 suites / 236 tests, frontend 16 fichiers / 176 tests (**417 au total**, contre 365 avant la chaîne) |

Vérification dans le navigateur (Baserow local, seed de 1000 événements, backend et frontend de ce worktree) :

| Contrôle | Résultat |
|---|---|
| `/carte`, panneau Filtres | Période, Partenaires, Type d'événement, Thématiques, Public cible, Code postal, Région ; **pas de Modalité** ; bouton « Événements en ligne » présent |
| `/evenements` | Modalité présente (sélecteur Tous / Présentiel / En ligne) |
| `/evenement/1695` (sans format) | pas de section « Format », pas de pastille de format vide |
| Frontend sans backend joignable (`VITE_API_URL` faux, constaté par hasard) | `/carte` affiche « La carte est momentanément indisponible » avec bouton « Réessayer », en palette neutre |
| Seconde config (`APP_CONFIG_PATH` vers `docs/audit/fixtures/app.config.second-map.json`, sans toucher au code) | accueil « Les Journées du Test », « Session 2026 », thème bleu et police Poppins, textes de la seconde carte |

Non vérifié : le titre de l'onglet suit la config **à la compilation** (une compilation par carte, `index.html` généré) ; en `pnpm front:dev` il vient donc de `app.config.json` du dépôt, quelle que soit la config servie par le backend. Les suites de la chaîne n'ont pas été rejouées une à une sur chaque branche intermédiaire (seulement par chaque agent sur sa branche, puis sur la pointe).

## 2. Checklist de la philosophie (`AGENTS.md`)

| # | Principe | Verdict | Preuve |
|---|---|---|---|
| 1 | **Un code, N cartes** | ✅ Respecté | `rg -i "lgsv\|semaine\|végétal\|réparation\|jnr" apps shared -g '!*.md' -g '!index.html' -g '!node_modules'` : seulement deux tests qui **cherchent** ces mots (`pas-de-code-en-dur.spec.ts:20`, `deux-cartes.spec.tsx:164`). Seconde config vérifiée dans le navigateur (§1). |
| 2 | **La config porte identité, titres, dates, design, mapping** | ✅ Respecté | `app.config.json` : nom écrit une fois (`app.name`), gabarits `{{app.name}}` ; carte et régions dans le code (`AGENTS.md:10` corrigé à l'étape 0). |
| 3 | **Wording générique en dur, en français** | ✅ Respecté | Ex. `FilterContent.tsx` (« Présentiel », « En ligne »), `ConfigErrorState.tsx`. |
| 4 | **Pas de flags de fonctionnalités** | ✅ Respecté | `rg "features" apps shared -g '!*.md'` : seulement des `features` GeoJSON (`event.ts:60`, `useClusters.ts`). |
| 5 | **Aucun nom de champ Baserow hors mapping** | ✅ Respecté | `rg "fm\.\w+\s*\|\|\s*'" apps/backend/src` : 0 résultat. |
| 6 | **Référentiels depuis Baserow** | ✅ Respecté | Pas de libellé métier dans `apps/*/src` ; ordre des options = ordre Baserow. |
| 7 | **Dégradation propre** | ✅ Respecté pour les cas connus | Config invalide : le backend refuse de démarrer ; colonne absente nommée ; référentiel en erreur ≠ vide ; sans date masqué ; **config absente** : état d'erreur sur l'accueil, la carte et la liste (`ConfigErrorState.tsx`, `configIndisponible.spec.tsx`) ; **format absent** : section et pastille masquées (`formatAbsent.spec.tsx`). |
| 8 | **Codé en dur = refus en revue** | ✅ Outillé | `apps/frontend/tests/pas-de-code-en-dur.spec.ts` (marque et couleurs hexadécimales sur `apps/*/src` et `shared/types/src`, 0 faux positif) + tests « deux cartes » + modèle de PR. Seule couleur autorisée : `DEFAULT_FORMAT_COLOR` (`iconResolver.ts:6`, `rg -i "#[0-9a-f]{6}\b"` ne renvoie que cette ligne). |

Règles globales :

| Règle | Verdict | Preuve |
|---|---|---|
| Baserow en lecture seule, jeton côté backend | ✅ | Scripts d'écriture limités à `localhost` : `seed.mjs` et `robustness.mjs` refusent tout autre hôte (testé : `https://baserow.example.com`, `http://localhost.evil.com`, URL invalide). |
| Modération fail-closed, `devMode` fermé en prod | ✅ | `baserow.service.ts` (ID ou valeur visible absents : rien n'est publié) ; `events.controller.ts` (`ALLOW_DEV_MODE=true` **et** hors production). |
| Airtable retiré | ✅ | `rg -i -l airtable . -g '!docs' -g '!resources' -g '!pnpm-lock.yaml'` : aucun fichier. |
| Config Astek supprimée | ✅ | `git ls-files \| rg -i astek` : rien. |
| Workflow Git | 🟡 | PR + merge commits vers `develop` ; chaîne de PR de ce plan à merger dans l'ordre. `main` jamais mis à jour ; ~26 branches mergées non supprimées (liste donnée au propriétaire, aucune suppression sans accord). |

## 3. Plan de fin de refonte

| Étape | Verdict | PR |
|---|---|---|
| 0 Plan et nettoyage de `docs/` | ✅ | [#41](https://github.com/AstekGroup/Rft-map-mecenat/pull/41) (mergée) |
| 1 Tests « deux cartes » et modèle de PR rétablis | ✅ | [#42](https://github.com/AstekGroup/Rft-map-mecenat/pull/42) |
| 3 Résidus en dur (`Badge.tsx`, palette neutre, gris de repli unique) | ✅ | [#43](https://github.com/AstekGroup/Rft-map-mecenat/pull/43) |
| 4 Cas dégradés (config absente carte et liste, format absent) | ✅ | [#44](https://github.com/AstekGroup/Rft-map-mecenat/pull/44) |
| 5 README, `PROJECT_VIBE_CONF.md`, `AGENTS.md` neutres et exacts | ✅ | [#45](https://github.com/AstekGroup/Rft-map-mecenat/pull/45) |
| 6 Filtre Modalité retiré de la carte | ✅ | [#46](https://github.com/AstekGroup/Rft-map-mecenat/pull/46) |
| 6 Picto kebab-case | ✅ | [#47](https://github.com/AstekGroup/Rft-map-mecenat/pull/47) |
| 7 Ménage (code mort, gardes de seed, avertissement lint, garde-fou) | ✅ sauf suppression des branches (accord requis) | [#48](https://github.com/AstekGroup/Rft-map-mecenat/pull/48) |
| 8 Verdict final | ✅ | cette PR |
| Session 8 Déploiement, `develop` vers `main` | ❌ hors plan, non faits | — |

## 4. Écarts restants

Classés du plus important au moins important. Aucun ne touche la philosophie dans le code applicatif.

1. **Session 8 non faite** : pas de config dans les images Docker, `scripts/deploy.sh` vise `apps/map-interactive/dist` (inexistant), aucun `docker build` réel (`rg app.config apps/*/Dockerfile` : 0 résultat). Bloquant pour livrer une seconde carte.
2. **`main` à l'arrêt** depuis le 2026-09-29 : si la production se déploie depuis `main`, elle tourne avec le code d'avant la refonte (non vérifié : pas d'accès à la production).
3. **Branches** : liste des branches mergées (locales et distantes) donnée au propriétaire, **non supprimées** ; branches `add-dynamic-filters`, `modify-audiences-filters`, `modif_audience_filters` à supprimer seulement avec l'accord de leur auteur ; `wip/audit-snapshot` et `chore/retrait-deux-cartes-pr-template` (commit `425e487` jamais mergé) à trancher.
4. **Petits restes de cas dégradés** (constatés par l'agent de l'étape 4, non corrigés car hors plan) : pastille de format vide possible dans `HomePage`, `EventListView`, `EventCard` si `type.name` est vide ; `event.targetAudience.map(...)` sans garde dans `EventDetailPage`.
5. **2 avertissements ESLint** dans `MapView.tsx` (`onMoveEnd`, `viewport`) : volontairement gardés, les corriger change le comportement des hooks (commentaires dans le code).
6. **`supertest` et `@types/supertest`** restent dans `apps/backend/package.json` sans usage depuis la suppression du test e2e.
7. **Garde-fou « codé en dur »** : il couvre la marque et les couleurs hexadécimales, pas les noms de champs Baserow (déjà couverts par les tests backend) ni les polices.
8. **Schéma de la vraie base Baserow de production** : jamais fourni (non vérifié) ; les types du seed sont déduits du code.

## 5. Verdict

**La philosophie est respectée dans le code applicatif, et elle est maintenant gardée par des tests.** Les principes 1 à 8 sont tenus et vérifiables par commande ; le changement d'identité d'une carte à l'autre est vérifié dans le navigateur avec une seconde config, sans toucher au code.

**La refonte n'est pas terminée tant que la session 8 n'est pas faite et que `develop` n'est pas sur `main`** : on sait faire tourner N cartes en local avec un seul code, on ne sait pas encore en déployer une.

Estimation d'avancement (jugement, pas une mesure) :

| Volet | Avancement |
|---|---|
| Code conforme à la philosophie | ~100 % (écarts §4 points 4 et 5 mineurs) |
| Robustesse et cas dégradés | ~95 % |
| Qualité et outillage (build, lint, tests) | ~95 % (417 tests, deux gardes-fous) |
| Documentation alignée sur le code | ~95 % |
| Déploiement et mise en production | ~10 % |
| **Global (hors déploiement et passage sur `main`)** | **~95 %** |

## 6. Suite possible (hors plan actif)

1. Merger la chaîne #42 à #49 dans l'ordre (merge commit).
2. **Session 8** : config dans les images (volume ou `APP_CONFIG_PATH`, config passée au build du front), corriger ou supprimer `scripts/deploy.sh`, `docker build` et `compose up` réels avec deux configs ; voir `PLAN-SESSIONS.md`.
3. `develop` vers `main` avec un tag, une fois la session 8 validée.
4. Ménage des branches, avec l'accord du propriétaire (et de leurs auteurs pour les 3 branches obsolètes).
5. Restes de cas dégradés du §4 point 4.
