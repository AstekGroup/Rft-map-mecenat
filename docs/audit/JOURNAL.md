# JOURNAL — commandes exécutées et preuves

Format : date · répertoire · commande · extrait de sortie · lecture.

## Session 1 — 2026-10-16

### Inventaire (étape 0)

- `git checkout -b audit/bilan-refonte` → `Switched to a new branch 'audit/bilan-refonte'`.
- `node -v` → `v22.21.0` ; `pnpm -v` → `9.0.0` (conforme à `packageManager: pnpm@9.0.0`).
- `docker --version` → `Docker version 26.1.1, build 4cf5afa`.
- `docker info` → `error during connect: ... open //./pipe/docker_engine: The system cannot find the file specified.` : **démon Docker arrêté**. Docker Desktop installé (`C:\Program Files\Docker\Docker\Docker Desktop.exe` présent). Lancement demandé via `Start-Process`.
- `git status --short` → ` D DEVPLAN.md` et `?? "astek-jnr-map COMPARATIF/"`.
- `Test-Path astek-jnr-map` → `False` (le dossier cité dans le snapshot git initial n'existe plus).
- `git log --oneline -15` (main) : dernier commit `114aeb3 update backend/frontend README`.
- Branches distantes non mergées : `add-dynamic-filters` (8), `modify-audiences-filters` (9), `modif_audience_filters` (1), `Refonte-Unification-du-panneau-latéral` (1), `Refonte-Unifier-les-outils-de-la-carte-MAP` (1) (commits en avance sur main, via `git rev-list --count main..origin/<b>`).

### Lancement (étape 1)

- `pnpm install` → `Done in 33.6s` ; ensuite `git status` : ` M pnpm-lock.yaml` (lockfile modifié : `lucide-react` ^0.468.0 → 1.58.0, bloc `apps/map-interactive` supprimé). Non commité.
- `pnpm build` → `Failed: @make-map/frontend#build` ; erreurs :
  `src/types/event.ts(12,37): error TS2305: Module '"@make-map/types"' has no exported member 'EventTheme'.` (idem `EventType`, `EventFormat`, `TargetAudience`). Effet de bord : `apps/frontend/index.html` modifié par `update-index-html.cjs` (revert fait).
- `tsc -p tsconfig.json --noEmit` (frontend) → 4 erreurs (mêmes).
- `pnpm --filter @make-map/frontend exec vite build` → `✓ built in 18.58s` (index 1 439 kB).
- `pnpm --filter @make-map/backend build` → exit 0.
- `pnpm --filter @make-map/backend test` → `Test Suites: 4 passed, 4 total / Tests: 61 passed, 61 total`.
- `pnpm --filter @make-map/frontend test` → `Test Files 4 passed (4) / Tests 58 passed (58)`.
- `eslint "{src,test}/**/*.ts"` (backend, sans --fix) → `2115 problems (2105 errors, 10 warnings)` dont 2051 `Delete ␍ prettier/prettier` (CRLF).
- `pnpm --filter @make-map/frontend lint` → `ESLint couldn't find an eslint.config.(js|mjs|cjs) file.`
- `node dist/main` (backend, sans .env) → log `Configuration chargée depuis ...\app.config.json (profil: lgsv)` ; `GET /api/health` 200 ; `GET /api/config` 200 ; `GET /api/events` 500 :
  `Error: Configuration Baserow manquante. Vérifiez BASEROW_API_TOKEN, BASEROW_API_URL et BASEROW_EVENT_TABLE_ID.` ; `GET /api/events/themes` 200 `[]` (+ WARN `Configuration manquante pour la table BASEROW_THEMATIQUES_TABLE`).
- Revue statique deploy : `deploy/docker-compose.prod.yml:46-49` `AIRTABLE_API_KEY=...` ; Dockerfiles sans `COPY app.config.json`.

### Baserow local + seed (étape 2)

- `docker compose -f deploy/baserow-local/docker-compose.yml up -d` → conteneur `lgsv-baserow-local` ; version relevée : `docker exec lgsv-baserow-local cat /baserow/backend/src/baserow/version.py` → `VERSION = "2.4.1"` (image épinglée dans le compose).
- `node scripts/seed-baserow/seed.mjs` (1re exécution) → `Compte admin créé`, `Workspace "LGSV" créé`, `Base "LGSV test" créée`, 5 × `Table "..." créée`, `36 événements insérés`, `.env` écrit. (Un premier essai a échoué : `Cannot read properties of undefined (reading 'id')` car aucun workspace n'existait après l'inscription ; corrigé dans le script.)
- `node scripts/seed-baserow/seed.mjs --bulk=1500` (2e exécution, idempotence) → `Connecté avec le compte admin existant`, aucune « créée », `1536 événements insérés (36 cas manuels + 1500 générés)`.
- Backend relancé avec le `.env` généré : `GET /api/events?devMode=true` → 1536 événements en 51 s (log : `Géocodage de 1357 adresses...`, `1536 événements prêts (1356 géocodés)`). `GET /api/events` → 1250 événements en 28 s, 0 événement refusé/en attente/sans modération.
- `GET /api/events/formats` → 9 lignes (dont 2 `[TEST]`), `/partners` 6 (logos `http://localhost:8088/media/thumbnails/small/...`), `/themes` 5, `/publics` 5.
- Événement 37 (E01) → `time: 18:00` pour 16:00Z ; événement 63 (E27) → `2026-09-22 00:30` ; événement 51 (E15) : `type` absent du JSON ; événement 49 (E13) : `latitude: 0, region: "Inconnue"`.

### Validation fonctionnelle (étape 3)

- `vite --port 5173` + backend :3000 ; navigateur intégré. `/` → cartes d'événements ; `/carte` → `canvas:7, markers:21`, `GET https://tiles.openfreemap.org/planet` → 200.
- Filtres (CDP) : « Réinitialiser » → Métropole 52 / Réunion 4 ; « Afficher les événements passés » → 921 / 37 ; + « Pendant La Grande Semaine Végétale » → 729 / 26 ; + « Festival » → 105 / 1.
- Détails (`history.pushState` + popstate) : 37, 38, 49, 53, 57, 62, 63, 64, 65 rendus sans plantage ; 52 (sans date) → texte `Invalid Date` ; 62 → `Vendredi 25 Septembre 2026 Au Jeudi 24 Septembre 2026 20:00 - 11:00`; 57 → `<b>`/`<script>` rendus en texte, `hasScriptTag:false`.
- Robustesse schéma (`robustness.mjs`, 36 lignes) : baseline 31/36 ; `rename-city` → `city=''` ; `rename-format` → `type=''` ; `rename-moderation` → 31/36 inchangé ; `delete-moderation` → `api/events = HTTP 500`, log `ERROR_FILTER_FIELD_NOT_FOUND ... The field 711 was not found in the table.` ; `devMode` = 36.
- Modération : avant patch 31 ; `PATCH row 1678 200` ; même processus 31 (`Cache hit (prod, âge: 1s)`) ; après redémarrage 32.
- Iframe : serveur Node :5500 + `<iframe src="http://localhost:5173/carte">` → carte fonctionnelle. `rg -i "x-frame|frame-ancestors|content-security|postMessage|iframe" apps deploy scripts` → seul `apps/frontend/nginx.conf:23` (commentaire).
- 2e config : `APP_CONFIG_PATH=docs/audit/fixtures/app.config.second-map.json` → `/api/config` renvoie `profile: autre-evenement-test`, `eventDates 2026-11-10..16` ; `/api/events` 32, `duringWeek 0` ; accueil bleu Poppins/Inter, textes modifiés. Incident de test : un fichier écrit avec BOM UTF-8 → `Erreur lors du chargement de la config: Unexpected token 'ï»¿'` (le backend démarre quand même) ; un autre fichier mal encodé (PowerShell) a donné `0 enregistrements` (filtre sur `AcceptÃ©`) : erreurs de manipulation de ma part, pas du projet, mais révélatrices de l'absence de validation de la config.

## Étape 4 — Cartographie statique (2026-10-16)

Commandes (depuis la racine, `rg` + script Node `%TEMP%\strs.cjs` pour compter les textes JSX) :
- `rg -n -i "#[0-9a-f]{3,6}|rgba?\(" apps/frontend/src` → 10 fichiers, `#D4DDE2` dans 6 (EventListView:68, HomePage:13, EventFiltersBar:326, EventMarker:26, FilterPanel:172, EventCard:32), `Badge.tsx:24-25`, `iconResolver.ts:32`.
- `rg -n "navigator\.(geolocation|share|clipboard)"` → seul `SearchOverlay.tsx:129` (géolocalisation) ; aucun partage.
- `rg -n "2026|2025"` → `Footer.tsx:37`, `EventListView.tsx:88,108` ; backend `baserow-mapping.util.ts:72-73`.
- `rg -n -i "semaine|lgsv|végétal|jnr"` → Header/Footer/EventListView/useConfig/EventFiltersBar/FilterPanel (voir 04 §2).
- Comptage textes JSX : `TOTAL 122 fichiers 19` (EventDetailPage 32, FilterPanel 15, Header 9, Sidebar 9…).
- `rg -n "fm\.\w+ \|\| '" baserow.service.ts` → 17 lignes (289-377).
- `node -e` sur `app.config.json` → clés racine `profile, app, theme, texts, filters, baserow` ; `texts` = `meta`(5) + `home`(10) ; pas de `features`/`map`.
- `rg import.meta.env|process.env` → front : seul `VITE_API_URL` ; `VITE_MAPTILER_KEY` jamais lu.
- COMPARATIF : matrice de mots-clés (ShareEventButton 2→0, isTrophy 9→0, TrophyBadge 6→0, LabelLogos 6→0, visibleOnMap 3→0, requiresRegistration 2→0, organizerType 3→0, EventHeroImage 2→0, RouteErrorPage 2→0, eventSearch 2→0…) ; routes COMPARATIF `@Get()`, `partners`, `stats`, `:id`.
- Limites : regex de textes approximative ; seule 1 copie sur 5 disponible.

### Cartographie statique (étape 4)

- Lecture : `app.config.json`, `shared/types/src/app-config.ts`, `ConfigProvider.tsx`, `useConfig.ts`, `tailwind.config.ts`, `Header/Footer`, `MapView`, `DOMTOMInset`, `MapStyleSelector`, `baserow.service.ts`, `baserow-mapping.util.ts`, `update-index-html.cjs`.
- `rg '<Header|<Footer|import .*(Header|Footer)' apps/frontend/src` → 0 résultat (composants non utilisés).
- `rg 'baserow.mapping|showPastEvents|texts.(map|list|detail|filters|footer)|config.map'` → seules lectures : `showPastEvents` (état local `useEvents.ts:36`, pas la config) ; `mm` défini `baserow.service.ts:264` jamais appelé.
- `rg -o 'font-(poppins|inter)' apps/frontend/src` → 56 ; `rg -i poppins apps/frontend/src/styles apps/frontend/tailwind.config.ts` → 0.
- `rg -o 'fm\.\w+ \|\| ' baserow.service.ts` → 29 replis codés en dur.
- Heuristique `Select-String` des textes JSX en dur → 58 dans 17 fichiers (approximatif).
- Aucune modification de code applicatif.

## Étape 5 — Branches non mergées (2026-10-16)

- `git fetch --all --prune` ; `git branch -r --no-merged main` → 5 branches (Refonte-Unification-du-panneau-latéral, Refonte-Unifier-les-outils-de-la-carte-MAP, add-dynamic-filters, modif_audience_filters, modify-audiences-filters).
- `git rev-list --count main..origin/<b>` / `origin/<b>..main` → Refonte-* : +1/0 ; add-dynamic-filters +8/−13 ; modify-audiences-filters +9/−13 ; modif_audience_filters +1/−4.
- `git cherry -v main origin/<b>` → tous « - » (SHA différents) ; `git log main --format=...` retrouve les mêmes sujets (d00a0cd, 67c540e, 1d96c80, 9653974, d10f931, 78d304d, 2af2855, 02d9da7).
- `git show --stat` b0c9d79 vs d00a0cd → identiques (25 fichiers, +398/−393) ; `useEvents.ts` lignes +/- identiques : True.
- `git diff --stat origin/modif_audience_filters origin/modify-audiences-filters` → vide (arbres identiques).
- `git merge-tree --write-tree origin/Refonte-Unification… origin/Refonte-Unifier…` → `0a9d1beefd3f…` (aucun conflit).
- Tests des branches non exécutés ; PR ouvertes non vérifiées.
- git ls-tree -d main apps/ → seulement apps/backend et apps/frontend ; 645aa73 (2026-07-16) « remove unnecessary folders » = équivalent de f885037 : apps/map-interactive absent de main (AGENTS.md/CLAUDE.md y font pourtant référence).

## Étape 6 — AGENTS.md (2026-10-16)

- Lecture de AGENTS.md (racine, frontend, backend, shared/types, deploy), CLAUDE.md, `package.json` (scripts `map:dev`, `install:map` obsolètes).
- `rg "@(Get|Controller)\("` → routes réelles : /api/config, /api/events, /partners, /themes, /formats, /publics, /:id, /api/health.
- Variables lues par le backend : BASEROW_API_URL/TOKEN/EVENT_TABLE_ID/MODERATION_FIELD_ID/PARTNERS|THEMATIQUES|FORMATS|PUBLICS_TABLE_ID, PORT, CORS_ORIGIN, APP_CONFIG_PATH.
- `git diff --stat` des 5 AGENTS : +134 / −76 ; diff complet : docs/audit/06-agents.diff. Appliqué dans l'arbre de travail, non commité.

### Étape 5 — complément : 2e passe avec merge d'essai (2026-10-16, ~12:55)

Remplace la mention « Tests des branches non exécutés » de la section ci-dessus pour les 2 branches `Refonte-*`.

- `git fetch --prune` ; `git rev-list --left-right --count main...origin/<b>` (main en retard / branche en avance) : add-dynamic-filters 13/8 ; modify-audiences-filters 13/9 ; modif_audience_filters 4/1 ; Refonte-Unification-du-panneau-latéral 0/1 ; Refonte-Unifier-les-outils-de-la-carte-MAP 0/1.
- `git cherry main origin/<b>` : les 3 branches anciennes → uniquement des `-` (patchs déjà dans main) ; les 2 branches Refonte → `+ cb28e29` et `+ 7c8bca1`.
- `git merge-tree --write-tree main origin/<b>` : conflits pour les 3 anciennes (29 / 14 / 5 fichiers), exit=0 pour les 2 Refonte.
- Worktree jetable sur main (`git worktree add --detach`), merge des 2 Refonte sans conflit (`d1e31fd`), `pnpm install` 23 s, `vitest` frontend `Test Files 5 passed, Tests 61 passed` ; `tsc` → les 4 mêmes erreurs TS2305 qu'en étape 1. Suppression du worktree : `git worktree remove --force` → `Filename too long` ; désenregistré (`git worktree list`), résidu dans %TEMP%.
- Incident de coordination : pendant cette 2e passe, une autre session avait déjà écrit `05-branches.md`, `06-agents.*` et `07-plan-de-suite.md`. Mon `Write` de `05-branches.md` a **écrasé** sa version (non versionnée, non récupérable). Le contenu actuel est donc la version « 2e passe » ; la 1re passe subsiste via sa section JOURNAL ci-dessus (dont : arbres de `modif_audience_filters` et `modify-audiences-filters` identiques, ajouté dans 05). Les modifications des 5 `AGENTS.md` viennent de l'étape 6 de l'autre session, pas de cette passe.

## Session 3 — Jalon J1 : A1, A5, A6 (2026-10-16, ~13:00-13:15)

- A1 : retrait de `EventTheme/EventType/EventFormat/TargetAudience` de `apps/frontend/src/types/event.ts`. `tsc --noEmit` a alors révélé 4 erreurs masquées (`MapPage.tsx:3,160,164,186,190` et `EventsListPage.tsx:3,141,145` : imports + casts inutiles, `toggleType`/`toggleAudience` prennent un `string`) → retirés. `tsc` exit 0 ; `pnpm build` (turbo) `Tasks: 3 successful, 3 total` (1er succès du bilan) ; `update-index-html.cjs` a de nouveau modifié `apps/frontend/index.html` → `git checkout --` fait.
- A5 : `events.controller.ts` : `?devMode=true` honoré seulement si `ALLOW_DEV_MODE=true` et `NODE_ENV!=production` (sinon ignoré + WARN). `.env.example` documenté ; `seed.mjs` écrit `ALLOW_DEV_MODE=true` dans le `.env` local.
- A6 : `baserow.service.ts` `fetchRecords` : hors devMode sans `BASEROW_MODERATION_FIELD_ID` → erreur explicite (fail-closed) ; réponse 400 `ERROR_FILTER_FIELD_NOT_FOUND` → erreur explicite.
- Tests : backend `Test Suites: 5 passed, Tests: 69 passed` (61 + 8 : nouveau `baserow.service.spec.ts`, controller) ; frontend `Tests 58 passed` ; `nest build` exit 0.
- Vérification réelle (backend `node dist/main` sur Baserow local, base à 36 lignes) : sans `ALLOW_DEV_MODE` → `/api/events` 32 et `?devMode=true` 32 + log `?devMode=true ignoré` ; avec `ALLOW_DEV_MODE=true` → 32 et 36 ; `BASEROW_MODERATION_FIELD_ID` absent → `HTTP 500` + log `BASEROW_MODERATION_FIELD_ID manquant : publication refusée` (avant : tout publié). Cas « champ supprimé » : couvert par test unitaire, **non rejoué en réel**.
- Note : la base locale contient 36 lignes (les 1500 générées ont disparu après `robustness.mjs`) ; 32 acceptées = 31 + l'événement « [EN ATTENTE] À modérer 1 » passé à Accepté lors de l'étape 3.
- Env du shell nettoyé (variables `BASEROW_*`, `PORT`, `APP_CONFIG_PATH` injectées pour les tests).

## Plan de refonte — Session 0 : GitHub CLI (2026-10-16)

- `gh --version` : absent. `winget install --id GitHub.cli -e` → `gh version 2.102.0`. Le PATH du terminal ouvert n'est pas rechargé (à rouvrir).
- `gh auth status` : connecté à `github.com`, compte `ClementTro`, jeton avec `repo` et `read:org`, protocole Git `ssh` côté `gh`. `gh repo view AstekGroup/Rft-map-mecenat` : `viewerPermission: ADMIN`, branche par défaut `main`.
- `gh pr list --state all` : PR #7 et #8 ouvertes (branches `Refonte-*`, à intégrer en session 2) ; #3, #5, #6 mergées ; #4 fermée ; #1, #2 mergées.

## Plan de refonte — Session 1 : base Git (2026-10-16)

- Sauvegarde : branche `wip/audit-snapshot` (commit `4b57932`, 39 fichiers), poussée. **À conserver jusqu'à la session 2** : elle contient les 5 `AGENTS.md` modifiés, volontairement non repris en session 1.
- `git push` en HTTPS : le premier push est resté bloqué sur une demande d'identifiants (terminal non interactif). Contournement limité à la commande : `git -c credential.helper= -c "credential.helper=!gh auth git-credential" push …`. Aucun réglage git global modifié. Le droit d'écriture est confirmé (`git ls-remote --heads origin wip/audit-snapshot` → `4b57932`).
- `develop` créée depuis `main` (`114aeb3`) et poussée. 6 branches de travail poussées, 6 PR vers `develop` : #9 `chore/gitattributes`, #10 `fix/build-types`, #11 `fix/moderation-devmode` (2 commits), #12 `chore/baserow-local` (2 commits, à merger après #11), #13 `docs/audit-refonte` (3 commits + mise à jour du suivi), #14 `chore/lockfile` (2 commits : lockfile, suppression de `package-lock.json`).
- Choix par défaut appliqués : 5 captures commitées (1,8 Mo) ; `06-agents.diff` non repris ; `package-lock.json` supprimé.
- Vérification d'intégration (branche jetable `develop` + 6 branches fusionnées, supprimée ensuite) : `pnpm build` `Tasks: 3 successful, 3 total` ; `pnpm test` frontend 58 passés, backend 69 passés ; `git diff` de cette fusion contre le snapshot : seulement les 5 `AGENTS.md` (reportés), `06-agents.diff` (retiré) et `PLAN-SESSIONS.md` (ajouté).
- Limites connues constatées (inchangées) : `pnpm lint` échoue côté frontend (pas de configuration, `exit code 2`) ; le lint backend avec `--fix` a modifié des fichiers (fins de ligne) → modifications écartées via `git stash` puis supprimées ; `pnpm build` réécrit `apps/frontend/index.html` (script non idempotent, traité en session 3).
- Dossier `astek-jnr-map COMPARATIF/` : absent du dépôt (`Test-Path` → `False`), donc hors de l'index.
- Non fait (dépend du merge par le propriétaire) : merge des PR, suppression de `wip/audit-snapshot`, PR `develop` → `main`, tag `v0.1.0`.
