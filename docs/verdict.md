# Verdict — État de la refonte « 1 code, N cartes »

> Vérification du 2026-10-19 sur `origin/develop` au commit `2273bcb` (merge de la PR #39), dans un worktree propre (les fichiers locaux non commités `app.config.json` « Astek » et `app.config1.json` n'ont **pas** été pris en compte).
> Périmètre : PR [#21](https://github.com/AstekGroup/Rft-map-mecenat/pull/21) à [#39](https://github.com/AstekGroup/Rft-map-mecenat/pull/39), toutes mergées dans `develop`. Référentiel : la philosophie de `AGENTS.md` (8 principes) et `docs/audit/PLAN-SESSIONS.md`.
> Convention : chaque constat porte une preuve (`fichier:ligne` ou commande). « Non vérifié » quand je n'ai pas pu le confirmer.

## TL;DR

**Oui, le code respecte la philosophie, à quelques résidus près.** Le cœur de la refonte est fait : plus aucune marque ni nom de champ Baserow dans le code applicatif, config validée au démarrage, modération fail-closed, filtres unifiés, cas dégradés traités. `pnpm build`, `pnpm lint` et `pnpm test` sont verts (365 tests).

**Où on en est : environ 85 % de la refonte.** Les sessions 0 à 7 sont faites. Il reste :

1. **Le déploiement (session 8)** : aucune image Docker ne sait encore recevoir une config de carte. Tant que ce n'est pas fait, « N cartes » est vrai dans le code mais **pas livrable en production**.
2. **`main` n'a rien reçu** : `main` (branche par défaut, `114aeb3`, 2026-09-29) a 124 commits de retard sur `develop`. Toute la refonte n'existe que sur `develop`.
3. **Quelques résidus en dur** (couleurs de marque dans le popup de la carte, palette LGSV par défaut en CSS, README LGSV) et **trois écarts documentaires** (PR #38 mal décrite, `AGENTS.md` qui contredit le code sur les paramètres de carte, `SUIVI.md` pas à jour).
4. **Filet de sécurité affaibli** : les tests automatisés « deux cartes » ont été retirés (décision du propriétaire, PR #38). La règle « vérifié avec une seconde config » ne repose plus que sur une vérification manuelle.

## 1. Contrôles exécutés

| Commande (worktree `develop`) | Résultat |
|---|---|
| `pnpm install --frozen-lockfile` | OK |
| `pnpm build` | OK, `Tasks: 3 successful, 3 total` |
| `pnpm lint` | OK, 0 erreur, 3 avertissements connus (`MapView.tsx:79`, `:165`, `MapStyleSelector.tsx:12`) |
| `pnpm run test -- --force` | OK : `shared/types` 5 tests, backend 14 suites / 227 tests, frontend 10 fichiers / 133 tests |
| `gh pr list --state all` | PR #21 à #39 : toutes `MERGED` |
| `git rev-list --count origin/main..origin/develop` | `124` |

Non vérifié dans cette session : lancement réel avec le Baserow local et contrôle dans le navigateur (les sessions précédentes l'ont fait, preuves dans `docs/audit/JOURNAL.md`).

## 2. Checklist de la philosophie (`AGENTS.md`)

| # | Principe | Verdict | Preuve |
|---|---|---|---|
| 1 | **Un code, N cartes** (pas de branche, copie ni `if (carte === …)`) | ✅ Respecté dans le code | `rg -i "lgsv\|semaine\|végétal\|réparation\|jnr" apps shared` : rien dans le code actif (seulement `apps/backend/README.md:1`, `apps/frontend/README.md`, et `apps/frontend/index.html`, fichier généré et ignoré par git). Résidus de couleurs : voir §4. |
| 2 | **La config porte identité, titres, dates, design, mapping** | ✅ Respecté | `app.config.json` : nom écrit une fois (`app.name`), titres par gabarit `{{app.name}}` ; badge d'édition et période depuis la config (PR #22, #23). ⚠️ `AGENTS.md:10` dit que la config porte « centre, zoom, styles, clustering » alors que `AppConfigMap` a été retiré (PR #25) : la carte est dans le code (`shared/types/src/app-config.ts` ne contient aucune clé de carte). |
| 3 | **Wording générique en dur, en français** | ✅ Respecté | Ex. `FilterContent.tsx:21-22` (« Présentiel », « En ligne ») : libellés d'interface, pas de marque. |
| 4 | **Pas de flags de fonctionnalités** | ✅ Respecté | `rg "features"` : seules occurrences = GeoJSON (`features: GeoJSONEvent[]`) et les `AGENTS.md`. |
| 5 | **Aucun nom de champ Baserow hors mapping** | ✅ Respecté | `rg "fm\.\w+\s*\|\|\s*'" apps/backend/src` : 0 résultat (29 replis supprimés, PR #26). Colonnes de référence et valeurs de listes dans `baserow.mapping` ; identifiants de tables dans l'environnement. |
| 6 | **Référentiels depuis Baserow** | ✅ Respecté | `rg -i "atelier\|conférence\|tout public\|cuisine…" apps/*/src` : aucun libellé métier. Ordre des options = ordre Baserow (PR #30). |
| 7 | **Dégradation propre** | 🟡 Largement respecté | Config invalide : le backend refuse de démarrer avec la liste des erreurs (`config-validation.util.ts`, PR #27) ; colonne absente nommée au démarrage ; référentiel en erreur ≠ vide (502 + `/api/health` dégradé, PR #30) ; sans date masqué, fin avant début ignorée, plus d'`Invalid Date` (PR #32). Restes : voir §4. |
| 8 | **Codé en dur = refus en revue** | 🟡 Partiel | Aucun outil ne le détecte (le lint ne voit ni couleur ni marque) ; plus de modèle de PR ni de test « deux cartes » (PR #38). Repose entièrement sur la revue manuelle. |

Règles globales :

| Règle | Verdict | Preuve |
|---|---|---|
| Baserow en lecture seule, jeton côté backend | ✅ | Seed limité à l'instance Docker locale (`scripts/seed-baserow/`). |
| Modération fail-closed, `devMode` fermé en prod | ✅ | `baserow.service.ts:471-483` (ID ou valeur visible absents : rien n'est publié) ; `events.controller.ts:25-38` (`ALLOW_DEV_MODE=true` **et** hors production). |
| Airtable retiré | ✅ | `rg -i airtable` hors `docs/`, `resources/`, lockfile : 0 résultat. |
| Workflow Git | 🟡 | PR + merge commits vers `develop` : respecté. Mais `main` jamais mis à jour (124 commits de retard), ~25 branches de travail mergées **non supprimées** (locales et distantes, dont `wip/audit-snapshot`), et la PR #21 regroupe 5 sujets (contraire à « une PR par sujet », choix assumé dans `JOURNAL.md:135`). |

## 3. Checklist du plan (sessions 0 à 8)

| Session | Verdict | PR | Commentaire |
|---|---|---|---|
| 0 GitHub CLI | ✅ Faite | — | `gh` installé (`C:\Program Files\GitHub CLI\gh.exe`) et authentifié (il n'est pas dans le `PATH` du terminal courant). |
| 1 Base Git | ✅ Faite | #9 à #14 | Reste `develop` → `main` + tag `v0.1.0` (reporté par le propriétaire). |
| 2 Nettoyage et intégration | ✅ Faite | #21 | `CLAUDE.md` supprimé, Airtable retiré, code mort supprimé, branches `Refonte-*` intégrées. Reste : `App.tsx` mort (constaté en sessions 5 et 6, toujours présent), `scripts/deploy.sh:11` pointe vers `apps/map-interactive/dist` (prévu en session 8). |
| 3 Titres et identité | ✅ Faite | #22, #23, #24 | Le badge, les titres et les métas viennent de la config ; `index.html` généré depuis `index.template.html`. |
| 4 Mapping Baserow, validation | ✅ Faite | #25, #26, #27 | `AppConfig` aligné, replis supprimés, config et schéma contrôlés au démarrage. |
| 5 Filtres | ✅ Faite | #29, #30 | Une seule définition (`filterDefinitions.ts`), recherche multi-champs, recoupement, passés auto, format unique, ordre Baserow. |
| 6 Cas dégradés | ✅ Faite (restes mineurs) | #32 | Voir §4. |
| 7 Qualité | ✅ Faite | #33, #35, #36, puis #38 | ESLint front, lint back sans `--fix`, `shared/types` testé. Tests « deux cartes » (#34) et modèle de PR (#35) **ajoutés puis retirés** par #38 (décision du propriétaire, `PLAN-SESSIONS.md:230`). |
| Hors plan | ✅ | #37, #39 | Seed à 1000 événements (seed non relancée : non vérifié, dit la PR) ; test des métas indépendant du wording de la carte (#39, bon exemple de la philosophie). |
| **8 Déploiement** | ❌ **Pas faite** | — | Les `Dockerfile` (`apps/backend/Dockerfile`, `apps/frontend/Dockerfile`) ne mentionnent pas `app.config.json` (`rg app.config` : 0 résultat) ; `deploy/AGENTS.md:19` le reconnaît ; aucun `docker build` jamais lancé. |
| Amélioration « picto kebab-case » | ❌ Pas faite | — | Planifiée (`PLAN-SESSIONS.md`, section Améliorations). |
| Amélioration « retirer Modalité de la carte » | ❌ **Pas faite**, alors que la PR #38 l'annonce | — | Voir §4, point 1. |

## 4. Écarts constatés (à corriger)

Classés du plus important au moins important.

1. **La PR #38 ne fait pas ce que dit sa description.** Titre : « retirer le filtre Modalité de la carte et le modèle de PR » ; description : « le test deux cartes est conservé » et « le filtre Modalité disparaît du panneau de la carte ». Contenu réel (3 commits, 7 fichiers) : suppression des tests « deux cartes », du modèle de PR, et mise à jour des docs. Aucun fichier de filtre n'est touché : `rg surfaces apps/frontend/src` ne renvoie rien, le filtre Modalité est toujours sur la carte. Le code est conforme au plan (`PLAN-SESSIONS.md:230` décide le retrait des tests ; l'amélioration Modalité reste à faire), mais l'historique GitHub est trompeur. C'est exactement le type de perte de visibilité que la refonte veut éviter.
2. **Session 8 non faite** : pas de config dans les images, `scripts/deploy.sh` cassé (`apps/map-interactive/dist` n'existe plus), aucun `docker build` réel. Bloquant pour livrer une seconde carte.
3. **`main` à l'arrêt** depuis le 2026-09-29 : si la production se déploie depuis `main`, elle tourne avec le code d'avant la refonte (non vérifié : je n'ai pas accès à la production).
4. **Couleurs de marque en dur dans le popup de la carte** : `apps/frontend/src/components/UI/Badge.tsx:24-25` (`#F2EDE4`, `#1F7A3E`, vert et beige LGSV), utilisé par `EventPopup.tsx:30` (`variant="highlight"`). Une seconde carte afficherait le badge de format en vert LGSV. À remplacer par les variables de thème (`--color-surface-beige-rgb`, `--color-text-green-rgb` ou équivalent).
5. **Palette LGSV comme valeurs par défaut du thème** : `apps/frontend/src/styles/globals.css:11` (`--color-primary-rgb: 59 174 93`) et les replis de `apps/frontend/tailwind.config.ts:12-29`. La config les écrase (`ConfigProvider.tsx:61`), mais avant le chargement de `/api/config` ou si une couleur manque, la carte s'affiche en vert LGSV. Préférer une palette neutre.
6. **Cas dégradés restants** (relevés en session 6, confirmés par lecture) : `MapPage` et `EventsListPage` n'ont pas d'état d'erreur pour une config absente (leurs états `error` ne concernent que les événements, `MapPage.tsx:72`, `EventsListPage.tsx:80`) ; la page d'erreur de l'accueil s'affiche sans thème ; un événement sans format (E15) garde une section « Format » vide (`EventDetailPage.tsx:289-296`, pas de condition sur `event.type`). Comportement non rejoué dans le navigateur.
7. **Docs qui contredisent le code** : `AGENTS.md:10` (paramètres de carte dans la config, faux depuis la PR #25) ; `docs/audit/SUIVI.md:58` (« Prochaine action : merger la PR `chore/retrait-deux-cartes-pr-template` », déjà mergée) ; `README.md:1-5`, `PROJECT_VIBE_CONF.md`, `apps/frontend/README.md`, `apps/backend/README.md:1` présentent le projet comme « La Grande Semaine Végétale ».
8. **Hygiène du dépôt** : `apps/frontend/src/App.tsx` mort ; test e2e `apps/backend/test/app.e2e-spec.ts` périmé (constaté en session 7) ; ~25 branches mergées non supprimées ; 3 avertissements de lint sur les hooks.
9. **Filet « deux cartes » réduit à la main** : il reste des tests qui lisent la fixture (`config-validation.util.spec.ts`, `config-template.spec.ts`, contrat `shared/types`), mais plus rien ne vérifie automatiquement que titres, dates et thème changent avec la config. C'est une décision assumée ; le risque est qu'une régression de type « titre en dur » repasse sans être vue.

## 5. Verdict

**La philosophie est respectée dans le code applicatif.** Les principes 1 à 6 sont tenus et vérifiables par commande ; le principe 7 (dégradation propre) l'est pour tous les cas qui comptaient (modération, config invalide, schéma renommé, référentiel en panne, dates). Les écarts restants sont petits et localisés (un composant, des valeurs par défaut CSS, des README).

**La refonte n'est pas terminée tant que la session 8 n'est pas faite et que `develop` n'est pas sur `main`.** Aujourd'hui, on sait faire tourner N cartes en local avec un seul code ; on ne sait pas encore en déployer une.

Estimation d'avancement (jugement, pas une mesure) :

| Volet | Avancement |
|---|---|
| Code conforme à la philosophie | ~95 % (résidus §4 points 4 à 6) |
| Robustesse et cas dégradés | ~90 % |
| Qualité et outillage (build, lint, tests) | ~90 % (filet « deux cartes » manuel) |
| Documentation alignée sur le code | ~75 % (§4 point 7) |
| Déploiement et mise en production | ~10 % |
| **Global** | **~85 %** |

## 6. Suite recommandée (par priorité)

1. **Session 8 — déploiement** : fournir `app.config.json` aux images (volume ou `APP_CONFIG_PATH` côté backend, config passée au build front), corriger ou supprimer `scripts/deploy.sh`, lancer un vrai `docker build` puis `compose up` avec le Baserow local, vérifier les variables `BASEROW_*`. Faire l'essai avec deux configs (`app.config.json` et `docs/audit/fixtures/app.config.second-map.json`).
2. **`develop` → `main`** avec un tag (`v0.3.0`), une fois la session 8 validée.
3. **Petite PR « résidus en dur »** : `Badge.tsx` sur les variables de thème, palette neutre par défaut dans `globals.css` et `tailwind.config.ts`, section « Format » masquée sans format, état d'erreur config sur `MapPage` et `EventsListPage`.
4. **Petite PR « docs »** : corriger `AGENTS.md:10`, la « Prochaine action » de `SUIVI.md`, neutraliser les README et `PROJECT_VIBE_CONF.md` ; ajouter dans `SUIVI.md` une note sur l'écart de description de la PR #38 (ou modifier sa description sur GitHub).
5. **Améliorations du plan** : retrait de Modalité sur la carte, picto kebab-case.
6. **Ménage** : supprimer `App.tsx` et le test e2e périmé, supprimer les branches mergées (dont `wip/audit-snapshot`), demander l'accord pour les 3 branches obsolètes.
7. **À reconsidérer** : un garde-fou automatique minimal contre le codé en dur (ex. un test qui lance le `rg` de la checklist sur `apps/*/src`), puisque les tests « deux cartes » ont été retirés.
