# 07 — Plan de suite priorisé (étape 7)

Date : 2026-10-16. Chaque item renvoie à un **constat prouvé** : `01`…`06` = livrables de [docs/audit/](.) (statuts et preuves : voir [SUIVI.md](SUIVI.md), commandes dans [JOURNAL.md](JOURNAL.md)).
Échelle : **Valeur** H/M/B · **Effort** S (≤ ½ j) / M (1-3 j) / L (> 3 j) · **Risque** de régression ou d'incertitude H/M/B.

## ⚠️ Révision de périmètre (2026-10-16, décidée par le propriétaire du projet)

Ce plan a été écrit avant les précisions suivantes. Elles **prévalent** sur le texte ci-dessous ; détail dans [08-perimetre-config-vs-baserow.md](08-perimetre-config-vs-baserow.md).

| Item | Nouveau statut | Raison |
|---|---|---|
| **A3, A4, A7** (déploiement Baserow, config dans les images, `frame-ancestors`) | **DIFFÉRÉ** | Le déploiement n'est pas à l'ordre du jour ; pas de migration de données, on repart d'une base vide |
| **A2** (lockfile) | Conservé, **hors Docker** | Hygiène locale (`pnpm install` modifie le lockfile) |
| **B1** (bloc `features`) | **DIFFÉRÉ** | Pas de fonctionnalités activables pour l'instant ; piste ultérieure : activation déduite des données (08 §6) |
| **B4, B6** (profil au runtime, IDs de tables en config) | **DIFFÉRÉ** | Dépendent du mode d'hébergement (Q5) |
| **B3** | **Recadré** | Retirer du type `AppConfig` ce qui est hors périmètre (`texts.map/list/detail/filters/footer`, `AppConfigMap` non branché) et brancher le reste (`filters.showPastEvents`, `defaultModality`, `baserow.mapping`) |
| **C1** | **Élargi** | Titres, badge « LGSV 2026 », libellés de repli, un seul champ pour le nom de l'événement, sort du code mort (`Header`, `Footer`, `mockEvents.ts`) |
| **C2** (≈ 122 textes UI en config) | **ANNULÉ** | Le wording de l'interface reste en dur |
| **C8** | **Élargi** | Inclut les champs des tables de référence (`Nom`, `Logo`, `Picto`, `Couleur`, `baserow.service.ts:165-173`) et les valeurs de listes de choix (`baserow.mapping`) |
| **E6** (accueil sans config) | Conservé | Concerne les titres de marque, pas le wording |
| **Filtres** | **NOUVEAU chantier** | Voir 08 §3 (T1 à T11, Q-F1 à Q-F7) |
| **D1–D6** | **DIFFÉRÉ** | Dépend de Q4 et des fonctionnalités activables |

## Bilan en une page

- **La refonte est bien engagée mais incomplète.** Fait et prouvé : backend Baserow lecture seule, config servie par API, thème et polices par config, référentiels (formats, publics, thèmes, partenaires) issus de Baserow, **une 2ᵉ config change thème, polices, textes d'accueil et dates sans toucher au code** (03).
- **Les trois vrais manques** : (1) le **déploiement n'est pas migré** (Airtable, pas de config dans les images) et `pnpm build` casse ; (2) il **n'y a pas de socle « fonctionnalités par carte »** (aucun bloc `features`) ; (3) beaucoup de **marque/textes/couleurs/noms de champs restent en dur** (04).
- **Deux risques de sécurité/fiabilité** : `?devMode=true` public et filtre de modération qui s'ignore si le champ manque (03 §2).
- **Comparaison avec la copie JNR** : la plupart des écarts sont des fonctions propres à JNR ou des refactorings ; seulement **partage** et **page d'erreur de routes** manquent côté générique (04 §3). Les 4 autres copies n'ont pas été analysées (**non vérifié**).

## Décisions à prendre par toi (bloquent certains items)

| # | Décision | Items concernés |
|---|---|---|
| Q1 | `primary` vaut `#AE3B5D` dans `app.config.json` mais `#3BAE5D` (vert) partout ailleurs : **faute de frappe ou choix volontaire ?** (06 §CLAUDE #5) | A8 |
| Q2 | `CLAUDE.md` : réduire (A), corriger (B) ou laisser (C) ? (06) | F4 |
| Q3 | Recherche **limitée au titre** (branche Refonte-Unification) : acceptable ? (05 §3) | A9 |
| Q4 | Quelles fonctions des copies dupliquées (JNR + les 4 autres) à réintégrer, et en quel ordre ? Fournir les 4 autres copies | D1–D6 |
| Q5 | Nombre de cartes visé à court terme et mode d'hébergement : **un déploiement par carte** (plus simple) ou **plusieurs cartes dans un même déploiement** ? | B4 |
| Q6 | Nom du bloc de fonctionnalités (`features`, proposé) | B1 |

---

## A. Bloquants de lancement et de déploiement (faire en premier)

| ID | Item | Constat prouvé | Valeur | Effort | Risque | Dépend de |
|---|---|---|---|---|---|---|
| A1 | ✅ **FAIT (2026-10-16)** — **Corriger `pnpm build`** : nettoyer `apps/frontend/src/types/event.ts:12` (types supprimés de `@make-map/types`) | 01 : `tsc -b` 4 erreurs ; `vite build` seul OK | H | S | B | — |
| A2 | **Resynchroniser le lockfile** (`pnpm-lock.yaml` périmé : `lucide-react`, entrée fantôme `map-interactive`) et trancher `package-lock.json` (doublon npm/pnpm) | 01 : lockfile modifié par `pnpm install` ; `--frozen-lockfile` dans les Dockerfiles | H | S | B | — |
| A3 | **Migrer le déploiement vers Baserow** : remplacer `AIRTABLE_*` par `BASEROW_*` dans `docker-compose.prod.yml` / `.env.prod.example`, scripts de déploiement | 01 §déploiement : `docker-compose.prod.yml:46-49` | H | M | M | A2 |
| A4 | **Fournir `app.config.json` aux images** (backend : copie ou volume + `APP_CONFIG_PATH` ; frontend : nécessaire à `update-index-html.cjs`) ; faire un **vrai `docker build` + `compose up`** de bout en bout | 01 : Dockerfiles sans config, config `null` → exception ; **non exécuté** (non vérifié) | H | M | M | A2, A3 |
| A5 | ✅ **FAIT (2026-10-16)** — **Fermer `devMode` en production** : désactiver ou protéger (jeton/variable d'env) | 03 §2 : renvoie refusés + e-mails/téléphones sans authentification | H | S | B | — |
| A6 | ✅ **FAIT (2026-10-16)** (champ supprimé : testé en unitaire, non rejoué en réel) — **Modération fail-closed** : si `BASEROW_MODERATION_FIELD_ID`/valeur absents → ne rien publier ; suppression du champ → erreur claire, pas de 500 opaque | 03 §2 (filtre ignoré silencieusement : lecture de code, **non exécuté**) ; 03 §3 (champ supprimé → 500) | H | S | B | — |
| A7 | **Embarquement WordPress sécurisé** : `Content-Security-Policy: frame-ancestors <domaine WP>` dans Caddy, corriger le commentaire de `nginx.conf` | 03 §4 : aucun XFO/CSP nulle part | H | S | B | A4 |
| A8 | **Valider/corriger la couleur `primary`** de la config (Q1) | 06 §CLAUDE #5 | M | S | B | Q1 |
| A9 | **Merger les 2 petites branches « Refonte »** après décision recherche (Q3) ; **supprimer** les 3 branches obsolètes (accord auteur) | 05 | M | S | B | Q3 |
| A10 | **Cache de modération** : exposer une invalidation protégée ou raccourcir/forcer le rafraîchissement ; documenter le délai (5 min / redémarrage) pour les modérateurs | 03 §2 : changement de modération visible seulement après TTL ou redémarrage ; `invalidateCache()` non branché | M | S | B | A5 |

**Jalon J1 « Prod saine »** : A1–A7 faits, un `docker compose up` de bout en bout vérifié, carte embarquée dans WordPress de test avec `frame-ancestors`.

---

## B. Socle multi-cartes (le cœur de la refonte)

| ID | Item | Constat prouvé | Valeur | Effort | Risque | Dépend de |
|---|---|---|---|---|---|---|
| B1 | **Bloc `features`** dans `AppConfig` + `app.config.json` + lecture côté front/back (flags **off par défaut**), avec helper `useFeature('nom')` | 04 §1 : aucun flag ; 04 §3 | H | M | M | Q6 |
| B2 | **Schéma de config validé à l'exécution** (zod ou équivalent) côté backend : clés requises, formats (dates, couleurs), valeurs par défaut explicites ; erreur claire si invalide | 04 §1 « Types ↔ config » ; 03 : fixture avec BOM/mojibake a produit des erreurs obscures | H | M | B | — |
| B3 | **Aligner `AppConfig` et le JSON** : soit brancher ce qui est typé (`map.*`, `texts.map/list/detail/filters/footer`, `borderRadius`, `shadows`, `showPastEvents`, `defaultModality`), soit retirer du type ce qui n'a pas de consommateur | 04 §1 : type plus riche que le JSON | H | M | B | B2 |
| B4 | **Choix de la config au runtime** : sélection de profil (variable d'environnement/domaine) côté backend et front ; si Q5 = multi-cartes dans un déploiement, `?carte=` ou sous-domaine → profil | 04 §1 : une config par processus ; 03 : testé via `APP_CONFIG_PATH` | H | M/L | M | B2, Q5 |
| B5 | **`index.html` piloté par la config sans rebuild** (métas, polices) ou rendu côté serveur léger ; sinon documenter « 1 build par carte » et rendre le script idempotent | 01 : script non idempotent ; 03 : métas/polices build-time | M | M | M | B4 |
| B6 | **IDs de tables Baserow dans la config de la carte** (et non en variables d'environnement par processus) | 04 §1 « Mapping Baserow » ; 01 | M | M | M | B2 |
| B7 | **Fonction « mode embed »** (iframe) : masquer en-tête/pied optionnels, hauteur adaptée, flag `features.embed` | 03 §4 : aucun code dédié ; 620 px de haut peu adapté | M | M | B | B1 |
| B8 | **Script de création d'une nouvelle carte** (copie d'un modèle de config + checklist) et documentation « créer une carte en 30 min » | Objectif de la refonte ; fixtures `docs/audit/fixtures/` | H | S | B | B3 |

**Jalon J2 « 2 cartes, 0 fork »** : deux profils servis par le même code, avec flags différents, vérifiés par un test automatisé de bout en bout (profil A vs profil B).

---

## C. Supprimer ce qui est codé en dur (04 §2)

| ID | Item (refs 04 §2) | Valeur | Effort | Risque | Dépend de |
|---|---|---|---|---|---|
| C1 | **Marque et coordonnées** (H1–H4) : logo, e-mail, URL, « LGSV 2026 », année → `app.*` / `texts.*` | H | S | B | B3 |
| C2 | **Textes UI** (H5, H21 ≈ 122 textes, 19 fichiers) → clés `texts.*`, avec repli lisible ; commencer par `EventDetailPage` (32), `FilterPanel` (15), `Header`/`Sidebar` (9 chacun) ; **afficher un repli au lieu de la clé brute** | H | L | B | B3 |
| C3 | **Couleurs de repli** (H7–H10) : une constante unique ; ombres/rayons depuis le thème | M | S | B | B3 |
| C4 | **Police** (H11) : retirer `'Inter'` du CSS | B | S | B | — |
| C5 | **Paramètres de carte** (H12–H14) : centre/zoom/bornes/styles/clustering depuis `config.map` ; DOM-TOM (liste, zooms) paramétrables ou désactivables (`features.domtom`) ; géocodeur BAN paramétrable si une carte hors France est envisagée | M | M | M | B3 ; lié à A9 (`FRANCE_DEFAULT_VIEW`) |
| C6 | **Régions et département→région** (H15) : sortir de `useConfig.ts` et `geocoding.service.ts` (données de référence versionnées ou table Baserow) | M | M | B | — |
| C7 | **Dates par défaut du backend** (H16) : supprimer le repli `2026-09-25/10-04` ; erreur claire si `eventDates` absent | M | S | B | B2 |
| C8 | **Noms de champs de repli** (H17–H19) : retirer `fm.x \|\| '…'`, convention `_ID`, titre de repli | H | M | M | B2, E1 |
| C9 | **`FALLBACK_LABELS` / `ENUM_MAP`** (H6) : supprimer les libellés LGSV ; modalités via config | M | S | B | B3 |
| C10 | **Variable morte `VITE_MAPTILER_KEY`** (H22) : la retirer des docs/Dockerfile ou la brancher réellement | B | S | B | — |

**Jalon J3 « Carte neutre »** : `rg -i "lgsv|semaine|végétal|#[0-9a-f]{6}"` dans `apps/frontend/src` ne remonte plus que les valeurs de repli centralisées.

---

## D. Parité fonctionnelle avec les anciennes copies (04 §3, décision Q4)

À faire **uniquement après B1** (flags), un flag par fonction, désactivée par défaut.

| ID | Fonction | Origine | Nature | Valeur | Effort | Risque |
|---|---|---|---|---|---|---|
| D1 | **Page d'erreur de routes** (`RouteErrorPage`) | COMPARATIF | Générique, sans flag | M | S | B |
| D2 | **Partage d'un événement** (`features.share`) | COMPARATIF | Générique | M | S | B |
| D3 | **Image d'en-tête** (`features.eventImage`) + champ mappé | COMPARATIF | Générique possible | M | M | B |
| D4 | **Statistiques** (`features.stats`, route `/api/events/stats`) | COMPARATIF | Optionnel | B | M | B |
| D5 | **Trophées, labels, visibilité sur la carte, inscription requise, type d'organisateur** (`features.*` + champs mappés optionnels) | COMPARATIF (spécifiques JNR) | Spécifique | selon Q4 | M/L | M |
| D6 | **Inventaire des 4 autres copies** (fonctions propres, champs, couleurs) → matrice complète | Non fournies : **non vérifié** | — | H | M | B |

---

## E. Robustesse Baserow et qualité des données (03 §1-3)

| ID | Item | Constat prouvé | Valeur | Effort | Risque | Dépend de |
|---|---|---|---|---|---|---|
| E1 | **Contrôle de schéma au démarrage** : lister les champs de la table, comparer au `fieldMapping`, journaliser les manquants (avertissement, pas de crash), exposer un état (`/api/health` détaillé) | 03 §3 : renommage → données vides sans erreur | H | M | B | B2 |
| E2 | **Mode dégradé explicite** (champ manquant → valeur vide documentée + avertissement) ; table liée absente → message dans les logs et filtre masqué plutôt que vide | 03 §3 | M | M | B | E1 |
| E3 | **Dates** : plus de `Invalid Date` (sans date → événement masqué ou libellé « date à confirmer ») ; refuser/signaler fin < début | 03 §1 #8, #12 | H | S | B | — |
| E4 | **Modalité hybride** : ne plus la rabattre sur présentiel ; capacité numérique (actuellement texte) | 02 (`baserow-mapping.util.ts:7-12` : hybride aplati ; `capacity` renvoyé en chaîne) | M | S | B | — |
| E5 | **Géocodage** : démarrage à froid 30-50 s (géocodage séquentiel) → parallélisme limité + cache persistant (fichier/Redis) + préchauffage ; marquer les adresses non géocodables | 02 : cold start 30-50 s (`events.service.ts`) ; 03 §1 #10 (adresse invalide `E13`) | M | M | M | — |
| E6 | **Écran d'accueil quand `/api/config` échoue** : état d'erreur propre (plus de clés brutes) | 03 §1 #17 | M | S | B | C2 |
| E7 | **Garde-fou du script de seed** : refuser toute URL non `localhost` ; documenter le compte local | 02 (exception « lecture seule ») | M | S | B | — |
| E8 | **Unifier les 4 caches TTL** et ajouter un indicateur de fraîcheur | 02 (4 caches distincts) ; 03 §2 | B | M | B | A10 |

---

## F. Tests, CI, documentation

| ID | Item | Constat prouvé | Valeur | Effort | Risque | Dépend de |
|---|---|---|---|---|---|---|
| F1 | **Configurer ESLint côté frontend** ; retirer `--fix` du script `lint` backend ; ajouter `.gitattributes` (`eol=lf`) pour supprimer les 2051 faux positifs CRLF | 01 | M | S | B | — |
| F2 | **Pipeline CI** (install `--frozen-lockfile`, build, lint, test, `docker build`) sur chaque PR ; ajouter `shared/types` au script `test` | 01 : test racine sans `shared/types` | H | M | B | A1, A2, F1 |
| F3 | **Tests E2E à partir des données de seed** (`scripts/seed-baserow`) : scénarios modération, schéma modifié (`robustness.mjs`), 2 profils de config | 02 ; 03 §3 | H | M | M | B4, E1 |
| F4 | **`CLAUDE.md`** : appliquer la décision Q2 ; **corriger `README.md`** (arborescence `map-interactive`, variables d'environnement, couleurs/dates) et `package.json` (scripts `map:dev`/`install:map`, description, keyword `airtable`) | 06 | M | S | B | Q2 |
| F5 | **Hygiène des PR** : modèle de PR avec la checklist « définition de terminé » ; convention de nommage de branches | 05 §4 ; 06 | M | S | B | — |
| F6 | **Mobile** : test responsive (non testé) ; accessibilité de base | 03 §1 #16 : **non vérifié** | M | M | B | — |

---

## Ordre recommandé et parallélisme

```
J1 Prod saine        : A1 → A2 → A3 → A4 → A7        (A5, A6, A8, A9, A10 en parallèle)
J2 2 cartes, 0 fork  : B2 → B3 → B1 → B4 → B8        (B5–B7 ensuite) ; C4, C10, E3, E7, F1, F5 en parallèle
J3 Carte neutre      : C1 → C3 → C7 → C8 → C2 ; C5, C6, C9 en parallèle
J4 Parité            : D6 d'abord (inventaire), puis D1, D2, D3… un flag à la fois
J5 Robustesse + CI   : E1 → E2 ; F2 dès A1/A2 faits ; F3 en fin de J2
```

Les familles **A** et **B** n'ont presque pas de dépendances croisées et peuvent être menées par **deux personnes/agents en parallèle**. Quick wins immédiats (≤ ½ j chacun, faible risque) : A1, A5, A6, A8, A9, C4, C10, E3, E7, F1.

## Risques transverses

- **Une seule des 5 copies** a été comparée : la parité fonctionnelle (D) peut être sous-estimée (D6).
- **`docker build`/`compose up` jamais exécuté** dans ce bilan : la liste A3–A4 est établie par lecture des fichiers.
- **Tests des 2 branches « Refonte »** : exécutés lors de la 2e passe de l'étape 5 (merge d'essai : 61/61 tests front, `tsc` sans nouvelle erreur) ; rendu visuel de la sidebar refondue non testé (05 §4).
- **Environnement de test** : Baserow local jetable, volume de 1536 événements ; le comportement sur le Baserow réel (volume, limites d'API, noms de champs réels) est **non vérifié**.
- **Fidélité visuelle** : les captures sont celles d'une carte en dev ; rendu mobile et navigateurs non testés.
