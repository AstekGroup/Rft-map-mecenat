# SYNTHÈSE — Où en est la refonte ? (vision d'ensemble, v2)

> Condense tout le bilan (`00` à `08`, `SUIVI`, `JOURNAL`). Chaque ligne renvoie au document où se trouvent la preuve.
> Date : 2026-10-16 · Branche de travail : `audit/bilan-refonte` · Statuts : `FAIT` · `PARTIEL` · `PAS FAIT` · `EN DUR` · `DIFFÉRÉ` · `NON VÉRIFIÉ` (légende dans [SUIVI.md](SUIVI.md)).
>
> **v2 (même jour)** : révisée pour tenir compte de tes précisions de périmètre (ci-dessous). La v1 comptait comme « dettes » des choses que tu as décidé de laisser telles quelles ; elles sont reclassées. Le détail de « qui gère quoi » est dans [08-perimetre-config-vs-baserow.md](08-perimetre-config-vs-baserow.md).

---

## 0. Périmètre décidé (qui change la lecture du bilan)

| Sujet | Décision | Effet sur le bilan |
|---|---|---|
| **Déploiement** (Docker, Caddy, `frame-ancestors`, `AIRTABLE_*` du compose) | **Pas à l'ordre du jour** | Ce n'est plus un « bloquant ». Les items A3, A4, A7 sont **différés**. Le déploiement non migré reste un constat factuel, pas une priorité. |
| **Migration de données** Airtable → Baserow | **Aucune** : on repart d'une **base vide** avec un **nouveau schéma** | Le bilan ne porte pas sur la reprise de données. En revanche, le schéma de test (seed) est **déduit de l'ancien code** : il me faut le **schéma cible** pour le valider. |
| **Textes de l'interface** | **Seuls les titres/noms de l'événement** sont pilotés (ex. « La Grande Semaine Végétale » → « Les Journées de la Réparation »). Le **wording** (boutons, placeholders, messages…) **reste en dur**. | Les ≈ 122 textes UI ne sont **pas une dette**. L'ancien item C2 est **annulé**. |
| **Fonctionnalités activables/désactivables** | **Pas pour l'instant** ; à étudier ensuite. Piste : **activation déduite des données** (pas d'événement en ligne dans la base → on désactive toutes les fonctions « en ligne ») | L'absence de bloc `features` n'est plus un « manque » mais un choix **différé**. L'item B1 est différé. |
| **Filtres** | Sujet **délicat**, à cadrer | Section dédiée dans [08 §3](08-perimetre-config-vs-baserow.md) : 11 points délicats, 7 décisions. |

---

## 0 bis. Vue globale : FAIT / PAS FAIT face au périmètre décidé

Périmètre : **la carte doit fonctionner avec le schéma Baserow qu'on lui indique** (pas de schéma cible), **titres/identité, dates, design et mapping par la config**, **contenu et référentiels dans Baserow**, **wording, carte et régions dans le code**, **filtres à cadrer**. Hors périmètre : déploiement, migration de données, fonctionnalités activables, suppression du code mort.

| Axe | Statut | En une ligne | Détail |
|---|---|---|---|
| **La carte fonctionne** (lancement, API, carte, clusters, filtres, détail, iframe) | **FAIT** | Prouvé sur 1 536 événements de test ; 127 tests ; `pnpm build` corrigé | 01, 03 |
| **Modération sûre** | **FAIT** | Fail-closed, `devMode` fermé (non commité) | 03 §2 |
| **La carte fonctionne avec un autre schéma Baserow** | **PAS FAIT** | Noms de colonnes des tables de référence, valeurs de listes de choix et 29 replis de champs sont en dur ; **aucun contrôle de schéma**, les écarts donnent des données vides sans avertissement | 08 §2.5, 03 §3 |
| **Mapping Baserow dans la config** | **PARTIEL** | `fieldMapping` (29 clés) lu ; `baserow.mapping` typé mais ni dans le JSON ni lu | 08 §2.5 |
| **Référentiels dans Baserow** (libellés, couleurs, pictos, logos) | **FAIT** | Reste : ordre (alphabétique imposé), format unique par événement | 08 §2.6 |
| **Titres / identité par la config** | **PARTIEL** | `texts.meta` et `texts.home` pilotés ; reste le badge « LGSV 2026 », les libellés de repli, le nom répété 7 fois, `index.html` fixé au build | 08 §2.1 |
| **Dates par la config** | **PARTIEL** | `eventDates` lu ; repli trompeur `2026-09-25 / 10-04` | 08 §2.2 |
| **Design par la config** | **PARTIEL** | 3 couleurs + polices ; accents, ombres, rayons non pilotables | 08 §2.3 |
| **Une 2ᵉ carte sans toucher au code** | **FAIT** (design, textes d'accueil, dates) / **PARTIEL** (le reste) | Prouvé par test exécuté | 03 §5 |
| **Config validée** (clés requises, formats) | **PAS FAIT** | Une config invalide démarre puis fait des 500 ; clé manquante = clé brute affichée | 03 §5 |
| **Filtres** | **PARTIEL** | Fonctionnent ; 2 interfaces dupliquées, périodes incohérentes, vide ≠ erreur ; 7 décisions à prendre | 08 §3 |
| **Carte et régions dans le code** | **CONFORME** (décision) | Rien à faire ; une constante unique vient avec la branche `Refonte-Unifier-les-outils-de-la-carte-MAP` | 08 §2.4 |
| **Wording de l'interface** | **CONFORME** (décision) | Reste en dur ; `texts.*` existants conservés | 08 §2.7 |
| **Fonctionnalités activables** | **DIFFÉRÉ** | Piste : activation déduite des données | 08 §6 |
| **Déploiement / migration de données** | **DIFFÉRÉ** | Hors périmètre | 07 |
| **Suppression du code mort** | **HORS PÉRIMÈTRE** | `Header`, `Footer`, `mockEvents.ts` | 08 §2.1 |
| **`AGENTS.md`** (philosophie pour les agents) | **PARTIEL** | Écrit, **non commité**, contient 2 règles à corriger (§12) | 06 |
| **Bilan en 7 étapes** (+ périmètre config/Baserow) | **FAIT** | Documents `00` à `08` | SUIVI |

**Lecture** : la carte **fonctionne** et la base de la refonte est saine. Ce qui sépare le projet de son objectif est surtout **une chose** : rendre la carte **réellement indépendante du schéma Baserow** (mapping complet + contrôle de schéma + validation de la config), puis **sortir les titres de marque** du code et **cadrer les filtres**.

---

## 1. Le verdict en 30 secondes

| Question | Réponse |
|---|---|
| Le projet tourne-t-il ? | **Oui.** Backend, front, Baserow local, carte, clusters, filtres, DOM-TOM et iframe fonctionnent sur 1 536 événements de test. |
| Où en est la philosophie « 1 code / N cartes » ? | **Fondations posées, branchement incomplet.** Thème, polices, textes d'accueil, dates et noms de champs sont pilotés par la config (prouvé avec une 2ᵉ config). Il reste à sortir du code **la marque et les titres** (badge « LGSV 2026 », libellés de repli), à **supprimer les replis de champs Baserow**, à **valider la config** et à **cadrer les filtres**. L'ancien chiffre « ~40 % » (SUIVI) comptait les textes UI et les fonctionnalités comme manquants : avec ton périmètre il est trop pessimiste, **je ne le recalcule pas** (non mesuré). |
| « 1 config = 1 carte » est-il vrai en pratique ? | **Oui** pour design, textes de marque d'accueil et dates (test exécuté, aucune modification de code). **Non** pour les titres éparpillés dans le code et `index.html` (fixé à la compilation). |
| Le plus important maintenant | (1) **Titres et marque** dans la config ; (2) **validation de la config** et alignement type/JSON ; (3) **nettoyage du mapping Baserow** et contrôle de schéma contre le **nouveau schéma** ; (4) **cadrage des filtres**. |
| Le plus rassurant | Noyau sain : 127 tests verts, build corrigé, modération correcte, référentiels lus dans Baserow, aucune branche distante n'a de travail perdu. |
| Deux failles de sécurité | **Corrigées** pendant le bilan (`devMode`, modération), non commitées. |

### Tableau de bord chiffré

| Indicateur | Valeur | Source |
|---|---|---|
| Tests automatisés | **127 verts** (backend 69, frontend 58) | 01, JOURNAL session 3 |
| `pnpm build` | ✅ passe (corrigé en A1) ; échouait au début | JOURNAL |
| Événements de test | 1 536 chargés (1 250 publics) | 02 |
| Codé en dur répertorié (04 : 22 catégories) | **H21 reclassée « assumée »** (≈ 122 textes UI) ; **H20** réduite (plus de `features`/`texts.*` attendus) ; **H12-H15** (carte, régions) **à trancher** ; reste = marque, couleurs, dates, champs Baserow | 04, 08 |
| Nom de l'événement répété dans `app.config.json` | **7 fois** (renommer = 7 endroits) | 08 §2.1 |
| Clés `fieldMapping` / replis en dur correspondants | 29 / 29 (chaque clé a un second nom en dur) | `app.config.json`, `baserow.service.ts` |
| Code mort identifié | `Header.tsx`, `Footer.tsx`, `data/mockEvents.ts` (jamais importés) | 08 §2.1 |
| Filtres inventoriés | 10, dont 4 lus dans Baserow ; 11 points délicats | 08 §3 |
| Branches distantes non mergées | 5 (3 obsolètes, 2 à merger) | 05 |
| Copies dupliquées analysées | **1 sur 5** (JNR) | 04 |

---

## 2. Rappel de la philosophie (reformulée avec ton périmètre)

Une carte = un événement. **Un seul code** déploie N cartes. Ce qui est **propre à l'événement** (son nom et ses titres, ses dates, sa charte, la correspondance avec le schéma Baserow, le comportement des filtres) vit dans **un fichier de config par carte**. Ce qui est **du contenu et des référentiels** (événements, formats, thématiques, publics, partenaires, couleurs, pictos, logos) vit dans **Baserow**. Le **wording générique** de l'interface reste dans le code. Un changement de structure Baserow ne doit pas casser la carte.

---

## 3. Le bilan par principe

| # | Principe | État | Acquis | Reste à faire | Docs |
|---|---|---|---|---|---|
| 1 | **Un code, N cartes** | **PARTIEL** (testé) | Une 2ᵉ config (couleurs, polices, textes d'accueil, dates) charge sans toucher au code | Titres et marque encore dans le code ; `index.html` fixé au build ; **sélection du profil côté front** et **hébergement multi-cartes : différés** (déploiement) | 03 §5, 08 §2.1 |
| 2 | **Ce qui est propre à l'événement passe par la config** (titres, dates, design, mapping) | **PARTIEL** | Thème en variables CSS, polices, `texts.meta`, `texts.home`, dates, `fieldMapping` (29 clés) | Badge « LGSV 2026 » (`EventListView.tsx:88,108`) ; libellés « Pendant la semaine de ... » ; repli de dates ; 4 couleurs d'accent non pilotables ; rayons/ombres typés non lus ; nom répété 7 fois | 04, 08 §2 |
| 3 | **Fonctionnalités activables** | **DIFFÉRÉ** | Précédent : les 4 filtres de référentiel se masquent seuls si leur table est vide | À décider plus tard : flags de config ou activation déduite des données (08 §6) | 08 §6 |
| 4 | **Aucun nom de champ Baserow hors mapping** | **PARTIEL** | `fieldMapping` lu par `transformRecord` | 29 replis `fm.x \|\| '…'` à supprimer ; **champs des tables de référence** (`Nom`, `Logo`, `Picto`, `Couleur`) en dur (`baserow.service.ts:165-173`, **constat nouveau**) ; **valeurs des listes de choix** (`Présentiel`, `Gratuit`, `Accepté`) en dur, alors que `baserow.mapping` existe en type mais n'est ni dans le JSON ni lu | 04, 08 §2.5 |
| 5 | **Référentiels depuis Baserow** | **FAIT** (contenu) / **PARTIEL** (ordre, format) | Libellé, couleur, picto, logo lus dans Baserow ; options de filtres issues de la base | Ordre alphabétique imposé (pas de colonne `Ordre`) ; un seul format retenu par événement (`format[0]`, `:360`) ; `FALLBACK_LABELS` LGSV à nettoyer | 08 §2.6 |
| 6 | **Dégradation propre** | **PARTIEL** (en amélioration) | Modération fail-closed (A6), `devMode` fermé (A5), picto/couleur invalides repliés, HTML neutralisé | Champ renommé = données vides **sans avertissement** ; `Invalid Date` ; config invalide : démarre puis 500 ; **panne d'une table de référence = filtre qui disparaît sans signal** (08 T3) | 03, 08 §3.3 |
| 7 | **Codé en dur = refus en revue** | **POSÉ**, pas appliqué | Règle + checklist dans `AGENTS.md` ; dettes avec `fichier:ligne` | **Réviser la règle sur les textes** (08 §7) ; valider et commiter ; pas de CI | 06, 08 §7 |

**Lecture d'ensemble.** Le problème n'est pas un manque de briques mais des briques **posées sans être branchées** : `AppConfig` prévoit `map`, `texts.*` par page, `borderRadius`, `shadows`, `showPastEvents`, `defaultModality`, `baserow.mapping`, alors que ni le JSON ni le code ne les lisent. Avec ton périmètre, une partie de ces clés doit être **retirée du type** (`texts.map/list/detail/filters/footer`, `AppConfigMap`), le reste **branché** (`filters.showPastEvents`, `defaultModality`, `baserow.mapping`).

---

## 4. Ce qui a été fait, étape par étape

| Étape | Livrable | Résultat clé |
|---|---|---|
| **0 Inventaire** | [00](00-inventaire.md) | Branche d'audit ; outillage OK ; doc obsolète repérée (`map-interactive`, `DEVPLAN.md`, `BASEROW_TABLE_ID`). |
| **1 Lancement** | [01](01-lancement.md) | Tests verts, `vite build` OK, backend démarre. `pnpm build` KO (corrigé en A1). Lint front absent, lint back = bruit CRLF + `--fix`. |
| **2 Baserow + seed** | [02](02-baserow-seed.md) | Baserow 2.4.1 local ; seed idempotent (36 cas limites + 1 500) ; 1 536 événements, 1 250 publics ; fuseaux corrects. |
| **3 Validation** | [03](03-validation.md) | Carte, clusters, filtres, DOM-TOM, détail, iframe OK. Bugs : `Invalid Date`, fin < début, config invalide fail-late, cache sans invalidation. |
| **4 Cartographie** | [04](04-cartographie.md) | Grille « piloté par la config ? », 22 catégories de codé en dur, matrice COMPARATIF vs `main`. |
| **5 Branches** | [05](05-branches.md) | 3 obsolètes, 2 à merger (61/61 tests front en merge d'essai). |
| **6 AGENTS.md** | [06](06-agents.md) · [diff](06-agents.diff) | 5 fichiers réécrits, **non commités, à valider** (et à ajuster : 08 §7). |
| **7 Plan de suite** | [07](07-plan-de-suite.md) | Backlog A à F ; **révisé** par ton périmètre (note en tête de fichier). |
| **Session 3** | JOURNAL | A1, A5, A6 faits (build, `devMode`, modération). |
| **8 Périmètre config vs Baserow** | [08](08-perimetre-config-vs-baserow.md) | **Nouveau** : matrice des 4 zones, analyse des filtres, plan d'action. |

**Modifié dans le dépôt pendant le bilan** : ajouts (`docs/audit/`, `scripts/seed-baserow/`, `deploy/baserow-local/`), 5 `AGENTS.md`, et en session 3 du code ciblé (`types/event.ts`, `MapPage.tsx`, `EventsListPage.tsx`, `events.controller.ts` + spec, `baserow.service.ts` + nouveau spec, `.env.example`, `seed.mjs`). **Non commité, à séparer de la branche d'audit avant PR.** `pnpm-lock.yaml` modifié par `pnpm install` ; `DEVPLAN.md` supprimé. Aucun merge, push ni suppression de branche.

---

## 5. Ce qui marche (preuves)

| Domaine | Constat | Statut | Source |
|---|---|---|---|
| Tests et build | 127 tests, `nest build`, `vite build`, `pnpm build` (après A1) | FAIT | 01, JOURNAL |
| Backend | `/api/health`, `/api/config`, routes `events`, `partners`, `themes`, `formats`, `publics` | FAIT | 01 |
| Modération | Seuls les « Accepté » sont publics (1 536 → 1 250) | FAIT | 02, 03 §2 |
| Fuseaux | 16:00Z → 18:00 Paris ; 22:30Z → 00:30 | FAIT | 02 |
| Carte | Tuiles, clusters, marqueurs, 5 encarts DOM-TOM + métropole | FAIT | 03 §1 |
| Filtres | Période (3 modes), partenaires, type, thématiques, public, code postal, région, passés ; options issues de Baserow ; compteurs cohérents | FAIT | 03 §1 |
| Cas limites | En ligne, adresse invalide, HTML/`<script>` neutralisé, picto/couleur invalides repliés | FAIT | 03 §1 |
| Iframe | Embarquée depuis une autre origine | FAIT | 03 §4 |
| Seconde carte | Couleurs, polices, textes d'accueil, dates : **sans modifier le code** | FAIT | 03 §5 |

![Seconde config : même code, autre carte](captures/05-accueil-seconde-config.png)

---

## 6. Ce qui ne marche pas, reclassé selon ton périmètre

### 🟠 Prioritaire dans le périmètre (refonte « propre à l'événement »)

| Problème | Détail | Statut | Où |
|---|---|---|---|
| **Titres et marque en dur** | Badge « LGSV 2026 » (`EventListView.tsx:88,108`) ; libellés de repli « Pendant la semaine de ... » (`FilterPanel.tsx:49`, `EventFiltersBar.tsx:89,128`) ; nom de l'événement **répété 7 fois** dans le JSON | EN DUR | 08 §2.1 |
| **Dates de repli trompeuses** | `2026-09-25` / `2026-10-04` (`baserow-mapping.util.ts:72-73`), différentes des dates de la config | EN DUR | 04 H16 |
| **Config non validée** | Aucun schéma : clé manquante = `undefined` ou **clé brute affichée** ; config invalide = démarre puis 500 | PAS FAIT | 03 §5 |
| **Type ≠ JSON** | `AppConfig` plus riche que le JSON ; une partie est **hors périmètre** (à retirer), une partie **à brancher** | PARTIEL | 08 §5 |
| **Mapping Baserow** | 29 replis en dur ; champs de référence en dur ; valeurs de listes de choix en dur ; `baserow.mapping` jamais lu | EN DUR | 08 §2.5 |
| **Aucun contrôle de schéma** | Renommer `Ville du lieu` → `city` vide pour tous, sans avertissement | PAS FAIT | 03 §3 |
| **Filtres** | 2 interfaces dupliquées, périodes incohérentes, format unique, vide ≠ erreur, régions en dur… | PARTIEL | 08 §3 |
| **`index.html` fixé au build** | Titre d'onglet, métas, polices écrits à la compilation par un script non idempotent : le **titre de l'événement** n'est donc pas piloté à l'exécution | PARTIEL | 03 §5 |
| **Couleurs d'accent** | `accent-yellow`, ombres, `#D4DDE2` répété 6 fois : non pilotables | EN DUR | 04 H7-H10 |

### 🟡 Robustesse et qualité

| Problème | Détail | Item |
|---|---|---|
| `Invalid Date` (sans date) ; fin < début | Détail, liste, carte | E3 |
| Hybride aplati en présentiel ; capacité en chaîne | `baserow-mapping.util.ts:8-12` | E4 |
| Cold start 30–50 s ; 4 caches TTL distincts | Géocodage séquentiel | E5, E8 |
| Cache de modération | Visible après 5 min ou redémarrage ; `invalidateCache()` non branché | A10 |
| Accueil sans config | Affiche les clés brutes | E6 |
| Lint/CI | Lint front absent ; lint back avec `--fix` ; pas de CI | F1, F2 |
| Code mort | `Header`, `Footer`, `mockEvents.ts` | 08 §2.1 |

### ⚪ Différé : hors périmètre actuel (constat factuel, pas une priorité)

| Sujet | Constat | Item |
|---|---|---|
| **Déploiement non migré** | `docker-compose.prod.yml:46-49` passe `AIRTABLE_*` ; aucune variable `BASEROW_*` | A3 |
| **Config absente des images Docker** ; `docker build` jamais exécuté | NON VÉRIFIÉ | A4 |
| **Lockfile** pour `--frozen-lockfile` des Dockerfiles | À resynchroniser (reste utile en local) | A2 |
| **Embarquement non restreint** (aucun `frame-ancestors`) | Sécurité d'exploitation | A7 |
| **Fonctionnalités activables** | Voir §0 et 08 §6 | B1 |
| **Sélection de profil côté front**, **IDs de tables dans la config**, **hébergement multi-cartes** | Dépendent de Q5 (déploiement) | B4, B6 |
| **Parité avec les anciennes copies** | Dépend de Q4 | D1-D6 |

### ✅ Corrigés pendant le bilan (session 3, non commités)

| Item | Correction | Vérification |
|---|---|---|
| **A1** `pnpm build` | Types supprimés retirés de `types/event.ts` + 4 erreurs masquées dans `MapPage` / `EventsListPage` | `tsc` exit 0 ; build 3/3 |
| **A5** `devMode` public | Honoré seulement si `ALLOW_DEV_MODE=true` **et** `NODE_ENV≠production` | Rejoué en réel |
| **A6** Modération fail-open | Champ absent → erreur explicite ; champ supprimé → erreur claire | Rejoué (variable absente) ; champ supprimé : **test unitaire seulement** |

---

## 7. Le « codé en dur », reclassé

Détail avec `fichier:ligne` dans [04 §2](04-cartographie.md) et [08](08-perimetre-config-vs-baserow.md).

| Catégorie | Décision | Où | Action |
|---|---|---|---|
| **Titres, marque, coordonnées** | **À sortir** vers la config | `EventListView.tsx:88,108` (badge), libellés de repli, `Header`/`Footer` | Étape 1 de [08 §5](08-perimetre-config-vs-baserow.md#5-plan-daction-pour-que-cette-répartition-soit-vraie) |
| `Header.tsx`, `Footer.tsx`, `mockEvents.ts` | **Code mort** : supprimer (à confirmer) ou brancher | jamais importés (`rg` : aucune importation) | Décision |
| **Textes UI génériques** (≈ 122) | **Assumé en dur** | 19 fichiers | Aucune (annule C2) |
| **Couleurs de repli**, ombres, police `Inter` | **À centraliser** puis piloter si besoin | 6 fichiers, `tailwind.config.ts`, `globals.css:34` | C3, C4 |
| **Dates de repli** | **À supprimer** (erreur claire) | `baserow-mapping.util.ts:72-73` | C7 |
| **Champs Baserow de repli, champs de référence, valeurs de listes de choix** | **À sortir** vers `fieldMapping` / `baserow.mapping` | `baserow.service.ts:165-173,289-390`, `baserow-mapping.util.ts:8-12` | C8 + 08 étape 3 |
| **Carte** (centre, zoom, DOM-TOM, BAN) et **régions** | **À trancher** : recommandation = code, constante unique | `MapView`, `DOMTOMInset`, `useConfig.ts:39-58` | Q-C (ci-dessous) |
| `FALLBACK_LABELS` (libellés LGSV) | À nettoyer | `useConfig.ts:17-36` | C9 |
| `VITE_MAPTILER_KEY` | Variable morte | README, Dockerfile | C10 |

---

## 8. Config, Baserow, code : le plan d'ensemble (résumé)

Version complète, avec preuves : **[08-perimetre-config-vs-baserow.md](08-perimetre-config-vs-baserow.md)**.

| Zone | Contient | Modifié par |
|---|---|---|
| **Config** (`app.config.json`) | Nom et titres de l'événement ; dates ; couleurs, polices ; correspondance avec le schéma Baserow (`fieldMapping`, `baserow.mapping`, valeur de modération) ; comportement des filtres (modes de période, visibilité, défauts) | Équipe produit/dev, à la création d'une carte |
| **Baserow** | Événements ; formats, publics, thématiques, partenaires ; leurs libellés, couleurs, pictos (nom d'icône `lucide-react`), logos ; modération ; (à ajouter : ordre d'affichage) | Organisateurs et modérateurs, sans déploiement |
| **Code (en dur assumé)** | Wording générique de l'interface ; logique ; ensemble des dimensions de filtres ; géographie de référence (régions, DOM-TOM, géocodeur) | Développeurs |
| **Env** | Jeton, URL, identifiants de tables, champ de modération, CORS, mode dev | Exploitation |
| **Différé** | Activation de fonctionnalités (flags ou déduite des données) | — |

### Les filtres en bref (08 §3)

- **10 filtres** : recherche, période (3 modes), événements passés, région, code postal, modalité, format, thématiques, public, partenaires.
- **Déjà bon** : les options des 4 filtres de référentiel viennent de Baserow et **se masquent seules si la table est vide** : c'est le précédent de ton idée d'auto-désactivation.
- **Délicat** : (T1) deux interfaces dupliquées ; (T2) chaque dimension est du code ; (T3) **une table en erreur se confond avec une table vide** ; (T4) titres de groupes = concepts métier ; (T5) régions France en dur ; (T6) « pendant l'événement » = date de début seule, alors que « personnalisé » = intersection ; (T7) après l'événement, la carte est **vide par défaut** (52 à venir vs 921 avec les passés) ; (T8) modalité en dur et aplatie ; (T9) un seul format retenu ; (T10) ordre alphabétique imposé.
- **Proposition** : ensemble de dimensions **fixe** dans le code, **visibilité et défauts** en config, **options et ordre** dans Baserow, **une seule définition** partagée par les deux interfaces. À valider (Q-F1 à Q-F7).

---

## 9. Comparaison avec la copie « avant refonte » (JNR)

Une seule des 5 copies est dans le dépôt ; les 4 autres sont **non vérifiées**.

| Fonctionnalité JNR | Dans `main` ? | Nature | Proposition |
|---|---|---|---|
| Partage d'un événement | ❌ | Générique | À reprendre (D2) |
| Page d'erreur de routes | ❌ | Robustesse générique | À reprendre (D1) |
| Image d'en-tête, statistiques | ❌ | Optionnels | Plus tard |
| Trophées, labels, visibilité carte, inscription requise, type d'organisateur | ❌ | Spécifiques JNR | Selon Q4 |
| Géolocalisation « Me localiser » | ✅ (`SearchOverlay.tsx:129`) | Générique | Aucune perte |
| Recherche d'événements | ≈ (`SearchBar.tsx`) | Générique | Équivalence **non vérifiée** |

Conclusion : `main` n'a pas « tout perdu » ; les écarts sont des fonctions propres à JNR ou des extractions de code. Les ajouter proprement dépend de la décision **fonctionnalités activables** (différée).

---

## 10. Branches Git

| Branche | Verdict | Détail |
|---|---|---|
| `add-dynamic-filters`, `modify-audiences-filters`, `modif_audience_filters` | **OBSOLÈTES** | Commits déjà dans `main` sous d'autres hash ; à supprimer après accord de l'auteur. |
| `Refonte-Unifier-les-outils-de-la-carte-MAP` | **À MERGER** | Constante `FRANCE_DEFAULT_VIEW`. Petit, sans risque. |
| `Refonte-Unification-du-panneau-latéral` | **À MERGER après décision** | Unifie le comptage des filtres actifs et le toggle « passés » (utile pour T1). **Recherche limitée au titre** (Q3). Ajoute des textes UI en dur : **sans conséquence** avec ton périmètre. |

Merge d'essai des deux : aucun conflit, 61/61 tests front. Rendu visuel de la sidebar non testé.

---

## 11. Sécurité et fiabilité

| Risque | État |
|---|---|
| `?devMode=true` public | ✅ Corrigé (A5) |
| Modération ignorée si le champ manque | ✅ Corrigé (A6) |
| Iframe embarquable par n'importe quel domaine | ⚪ Différé (déploiement, A7) |
| CORS en production | NON VÉRIFIÉ |
| Seed qui écrit dans Baserow | Exception documentée ; garde-fou « refuser une URL non `localhost` » à ajouter (E7) |

---

## 12. `AGENTS.md` : à ajuster avant validation

Les 5 fichiers réécrits (étape 6, **non commités**) contiennent des règles **contraires à tes décisions** :

| Règle actuelle | Problème | Correction proposée |
|---|---|---|
| Principe 2 : « tout ce qui varie passe par la config : toutes les clés `texts.*`, pas de libellé en dur dans les composants » | Contredit « wording en dur » | « **Titres et noms de l'événement** en config ; **wording générique en dur, en français** » |
| Principe 3 : « toute nouvelle fonctionnalité est un flag `features.*` désactivé par défaut » | Contredit « pas de features pour l'instant » | « Pas de flags pour le moment ; **jamais de `if (carte === …)`** ; activation (flag ou déduite des données) à décider » |
| Checklist : « Nouveau texte → clé `texts.*` » et « Nouvelle fonctionnalité → flag, test des deux états » | Idem | « Nouveau **titre/nom d'événement** → config » ; retirer la ligne sur les flags |
| Backend : « pas de repli » | Reste vrai | Garder |

Détail de ces ajustements : [08 §7](08-perimetre-config-vs-baserow.md). **Je n'ai pas modifié `AGENTS.md`** (non validé, tu dois relire le diff) : dis-moi si tu veux que j'applique ces corrections.

`CLAUDE.md` : 11 incohérences (06), non modifié. Options : (A) le réduire à un renvoi vers `AGENTS.md` (recommandé), (B) le corriger, (C) le laisser.

---

## 13. Plan de suite révisé

Détail complet : [07](07-plan-de-suite.md) (note de révision en tête) et [08 §5](08-perimetre-config-vs-baserow.md).

| Priorité | Contenu | Items |
|---|---|---|
| **1** | **Titres et marque dans la config** ; supprimer repli de dates ; un seul champ pour le nom de l'événement ; décider du sort du code mort | C1, C7 |
| **2** | **Valider la config** à l'exécution et **aligner type et JSON** (retirer le hors-périmètre, brancher le reste) | B2, B3 |
| **3** | **Schéma Baserow** : supprimer les replis, mapping des tables de référence et des valeurs de listes de choix, contrôle de schéma au démarrage | C8, E1, E2 |
| **4** | **Filtres** : décisions Q-F1 à Q-F7, fusion des 2 interfaces, correctifs T3/T6/T9 | nouveau |
| **5** | **Bugs de données** : `Invalid Date`, fin < début, hybride, capacité | E3, E4 |
| **6** | **Hygiène** : police, variable morte, `index.html`, lockfile, lint, merge des 2 branches | C4, C10, B5, A2, F1, A9 |
| **Différé** | Déploiement (A3, A4, A7), fonctionnalités activables (B1), profil/multi-cartes (B4, B6), parité (D) | — |

---

## 14. Décisions qui t'attendent

| # | Question | Bloque |
|---|---|---|
| **V0** | Valider les `AGENTS.md` **après correction du §12** (relire `06-agents.diff`) | Philosophie opposable aux agents |
| ~~S1~~ | ~~Schéma cible Baserow~~ : **clos** : il n'y en a pas ; la carte doit fonctionner avec le schéma indiqué par la config (donc tout doit être mappable) | — |
| **Q1** | `primary` vaut **`#AE3B5D`** (rose) dans `app.config.json` alors que `#3BAE5D` (vert) partout ailleurs : faute de frappe ? | A8 |
| **Q2** | `CLAUDE.md` : réduire, corriger, laisser | F4 |
| **Q3 / Q-F4** | Recherche limitée au titre ? | Merge de la branche |
| ~~Q-C~~ | ~~Carte et régions~~ : **clos** : restent **dans le code** | — |
| **Q-F1 à Q-F7** | Filtres : ensemble fixe ou déclaratif, titres de groupes, régions, défaut « passés », fusion des deux interfaces, format unique ou multiple | Étape 4 |
| **Q4** | Fonctions des 4 autres copies à réintégrer (fournir les copies) | Parité |
| **Q5, Q6** | Hébergement multi-cartes ; mécanisme de fonctionnalités | **Différés** |
| ~~Q-X~~ | ~~Code mort~~ : **clos** : à supprimer, mais **hors périmètre** | — |

---

## 15. Ce qui reste NON VÉRIFIÉ

- **Les 4 autres copies** du projet.
- **Le schéma cible Baserow** (le seed est déduit de l'ancien code).
- `docker build` / `compose up` (différé).
- Mobile, Safari, Firefox ; partage ; « Me localiser » ; recherche d'adresse client.
- Comportement sur un **vrai** Baserow (volume, limites d'API).
- Suppression du champ de modération rejouée en réel (test unitaire seulement).
- Rendu visuel de la sidebar refondue ; PR ouvertes ; équivalence `SearchBar` / recherche JNR.
- **Nouveau (08)** : incohérence « pendant l'événement » (date de début) vs « personnalisé » (intersection) établie **par lecture de code**, non exécutée ; fuseau de la comparaison `isDuringWeek` autour de minuit non testé ; usages de `app.shortName` et `app.url` côté front non recensés.
- Comptage des textes (≈ 122) : approximatif, sans enjeu depuis la reclassification.

---

## 16. Prochaines actions recommandées

1. **Me dire si j'applique** les corrections du §12 à `AGENTS.md`, puis **relire et valider** (V0).
2. ~~Schéma cible Baserow~~ : clos (il n'y en a pas ; la carte doit fonctionner avec le schéma indiqué par la config).
3. **Trancher** les **décisions filtres** (Q-F1…Q-F7), surtout Q-F1 et Q-F6. (Code mort et carte/régions : clos.)
4. Lancer la priorité 1 (titres et marque), puis 2 et 3.
5. **Sortir les corrections de code** (A1, A5, A6) de la branche d'audit vers une PR dédiée.

---

## Annexe : index des documents

| Document | Contenu |
|---|---|
| [SUIVI.md](SUIVI.md) | État des étapes, décisions, prochaine action (début/fin de session) |
| [00-inventaire.md](00-inventaire.md) | Outillage, structure, écarts de doc |
| [01-lancement.md](01-lancement.md) | Commandes, variables d'environnement, déploiement |
| [02-baserow-seed.md](02-baserow-seed.md) | Baserow local, schéma de test, 36 cas limites |
| [03-validation.md](03-validation.md) | Tests fonctionnels, modération, robustesse, iframe, 2ᵉ config |
| [04-cartographie.md](04-cartographie.md) | Grille philosophie, 22 points codés en dur, matrice COMPARATIF |
| [05-branches.md](05-branches.md) | Branches, merge d'essai |
| [06-agents.md](06-agents.md) · [diff](06-agents.diff) | Réécriture d'`AGENTS.md`, incohérences de `CLAUDE.md` |
| [07-plan-de-suite.md](07-plan-de-suite.md) | Backlog priorisé A à F (révisé) |
| **[08-perimetre-config-vs-baserow.md](08-perimetre-config-vs-baserow.md)** | **Qui gère quoi : config, Baserow, code, env ; analyse des filtres ; plan d'action** |
| [JOURNAL.md](JOURNAL.md) | Commandes exécutées et extraits de sortie |
| [captures/](captures/) · [fixtures/](fixtures/) | Captures, 2ᵉ config de test |
