# 03 — Validation fonctionnelle (étape 3)

Date : 2026-10-16 · Environnement : backend `node dist/main` (:3000), frontend `vite` (:5173), Baserow 2.4.1 local (:8088), données du seed (36 cas, puis +1500 pour le volume). Statuts : voir [SUIVI.md](SUIVI.md). Captures : [captures/](captures/).

> Les tests navigateur ont été faits sur l'application servie par `vite dev` (pas sur un build Docker). La date « du jour » de la machine est le 16/10/2026, **après** la semaine configurée (21-27/09) : les événements de la semaine sont donc « passés » par défaut.

## 1. Checklist utilisateur final

| # | Point | Résultat | Statut | Preuve |
|---|---|---|---|---|
| 1 | Accueil (`/`) | Charge, titre/texte/CTA viennent de `/api/config`, cartes d'événements affichées avec pictos/couleurs Baserow | FAIT | `captures/01-accueil-config-lgsv.png` |
| 2 | Carte (`/carte`) + clusters (1500 événements) | Tuiles OpenFreeMap OK, clusters, marqueurs, ~921 événements « passés inclus » | FAIT | `captures/02-carte-clusters-liste.png` |
| 3 | Encarts DOM-TOM | 5 encarts (Guadeloupe 3, Martinique 2, Guyane 3, Réunion 4, Mayotte 3) + « Métropole » | FAIT | `captures/02-…` |
| 4 | Filtres : période (3 modes), partenaires, type, thématiques, public, code postal, région, « événements passés » | Panneau complet, options **issues de Baserow** (couleurs/pictos), compteurs cohérents (52 à venir → 921 avec passés → 729 pendant la semaine → 105 « Festival ») | FAIT | `captures/03-filtres.png` ; JOURNAL |
| 5 | Liste (`/evenements`) + recherche + filtres | Charge, compteur « N événements trouvés » | FAIT | snapshot `/evenements` |
| 6 | Détail (`/evenement/:id`) cas nominal | Dates, lieu, accessibilité, partenaires, format, tarif OK ; fuseau correct (16:00Z → 18:00) | FAIT | JOURNAL |
| 7 | Détail : sans format (`E15`) | Pas de plantage ; section « FORMAT » vide | PARTIEL | JOURNAL |
| 8 | Détail : sans date (`E16`) | Affiche **« Invalid Date »** (détail, liste, carte) | PAS FAIT (bug) | `captures/…` ; JOURNAL |
| 9 | Détail : sans titre (`E17`) | Repli « Événement sans titre » (repli codé en dur dans le backend, `baserow.service.ts:333`) | PARTIEL | JOURNAL |
| 10 | Détail : adresse invalide (`E13`) | Affiche l'adresse brute, événement absent de la carte (lat/lng 0) | FAIT | JOURNAL |
| 11 | Détail : en ligne (`E02`) | « Événement en ligne », bouton d'accès | FAIT | JOURNAL |
| 12 | Détail : fin avant début (`E26`) | Affiche « 25 Sept. Au 24 Sept. 20:00 - 11:00 » (incohérent, aucune validation) | PAS FAIT | JOURNAL |
| 13 | Contenu HTML/script dans titre/description (`E21`) | Rendu en texte (React échappe) ; pas d'exécution | FAIT | JOURNAL |
| 14 | Format avec picto inexistant / couleur invalide (`E28`,`E29`) | Icône de repli (globe) et couleur grise de repli, pas de plantage | FAIT | `captures/03-filtres.png` |
| 15 | Partage / « Me localiser » / recherche d'adresse | Non exécutés (géolocalisation navigateur, API BAN côté client) | NON VÉRIFIÉ | |
| 16 | Responsive mobile | Non testé | NON VÉRIFIÉ | |
| 17 | Page d'accueil sans config (backend KO) | Affiche les **clés brutes** (`ctaText`, `mainTitle`…) : aucun texte par défaut côté front | PAS FAIT (dégradation) | snapshot de l'accueil avec config invalide |

## 2. Modération (côté modérateur)

| Test | Résultat | Statut | Preuve |
|---|---|---|---|
| Filtre « Accepté » seulement | `GET /api/events` exclut refusés, en attente **et modération vide** | FAIT | JOURNAL (étape 2) |
| Passer un événement « En attente » → « Accepté » dans Baserow | Visible **après redémarrage** du backend (31 → 32). Dans le même processus : toujours 31 (`Cache hit (prod, âge: 1s)`) ; le TTL est de 5 min (`events.service.ts:26`), **aucun endpoint d'invalidation** (`invalidateCache()` existe mais n'est branché nulle part) | PARTIEL | JOURNAL |
| Contournement public `?devMode=true` | Renvoie refusés/en attente + e-mails/téléphones, sans authentification | PAS FAIT (faille) | JOURNAL |
| `BASEROW_MODERATION_FIELD_ID` absent | Le filtre est **silencieusement ignoré** (`if (!devMode && moderationFieldId)`, `baserow.service.ts:215`) → tous les événements deviennent publics | PAS FAIT (fail-open) | lecture de code ; scénario non exécuté → NON VÉRIFIÉ à l'exécution |

## 3. Robustesse à un changement de structure Baserow

Scénarios exécutés avec `scripts/seed-baserow/robustness.mjs` (backend redémarré à chaque fois ; résultat sur `GET /api/events` et `?devMode=true`).

| Scénario | Résultat | Statut |
|---|---|---|
| Renommer `Ville du lieu` → `Ville` | **Aucune erreur**, mais `city` devient vide pour tous les événements (dégradation silencieuse, aucun warning) | PARTIEL |
| Renommer `Format` → `Formats` (nom du défaut codé en dur) | **Aucune erreur**, mais `type` devient vide pour tous les événements. Le repli `fm.format \|\| 'Formats'` n'aide pas car la config fournit `Format` | PARTIEL |
| Renommer le champ de modération | **Sans effet** (le filtre est basé sur l'ID de champ) | FAIT |
| Supprimer le champ de modération | `GET /api/events` → **HTTP 500** (`ERROR_FILTER_FIELD_NOT_FOUND`), `devMode` reste OK : site public cassé sans message utile | PAS FAIT |
| Table liée absente / ID manquant | Avertissement + liste vide, pas de crash (`fetchLinkedTableMap`) ; mais les filtres se vident | PARTIEL |

Constat transverse : **aucun contrôle de schéma au démarrage** (ni `GET /api/database/fields/table/:id/` pour valider que les champs du `fieldMapping` existent, ni mode dégradé explicite). Les valeurs absentes sont silencieusement vides.

## 4. Intégration iframe (WordPress)

| Test | Résultat | Statut | Preuve |
|---|---|---|---|
| Carte embarquée dans une page d'une autre origine (`localhost:5500` → `localhost:5173/carte`) | S'affiche et fonctionne (CORS backend ouvert `*`) | FAIT | `captures/04-iframe-wordpress-sim.png` |
| En-têtes `X-Frame-Options` / CSP `frame-ancestors` | **Aucun** en dev. En production, `nginx.conf:23` dit « XFO et CSP gérés par Caddy », mais le `Caddyfile` n'en définit aucun → embarquable par **n'importe quel site** (pas de restriction au domaine WordPress) | PAS FAIT | `apps/frontend/nginx.conf`, `deploy/Caddyfile` ; en-têtes de `vite` listés (Vary, Content-Type…) |
| Mode « embed » (masquer en-tête, hauteur auto, `postMessage`) | Aucun code dédié (`rg iframe/postMessage/frame` = 0 résultat) | PAS FAIT | `rg` |
| Mise en page dans 620 px de haut | Sidebar fixe à ~40 % de la largeur, utilisable mais pas adaptée | PARTIEL | `captures/04-…` |

## 5. Test clé « N cartes » : seconde configuration

Fichier : `docs/audit/fixtures/app.config.second-map.json` (généré par `make-second-config.cjs` : autre profil, autres dates 10-16 nov., couleurs bleues, polices Poppins/Inter, autres textes). Lancement : backend avec `APP_CONFIG_PATH=<fichier>` ; **aucune modification de code**.

| Aspect | Résultat | Statut | Preuve |
|---|---|---|---|
| Couleurs primaires (CSS variables) | Appliquées (en-tête bleu, liens, pictos) | FAIT | `captures/05-accueil-seconde-config.png` |
| Polices | Poppins/Inter chargées via `googleFontsUrl` | FAIT | idem |
| Textes de la page d'accueil | Appliqués (titre, description, CTA, « Session 2026 ») | FAIT | idem |
| Dates de l'événement côté backend | `isDuringWeek` recalculé avec 10-16 nov. (0 événement « pendant la semaine ») | FAIT | JOURNAL |
| Couleur d'accent jaune du CTA | **Reste jaune d'origine** : `accent-yellow` n'est pas pilotable (non présent dans `theme.colors` du JSON, valeur de repli Tailwind) | PARTIEL | capture |
| `index.html` (title, meta, favicon) | **Non piloté à l'exécution** : généré à la compilation depuis le `app.config.json` racine (`update-index-html.cjs`), non idempotent ; titre « title » en dev | PARTIEL | `apps/frontend/scripts/update-index-html.cjs` |
| Sélection de la config | Uniquement par `APP_CONFIG_PATH` côté backend ; le front n'a pas de notion de profil ; un build front = une carte | PARTIEL | `config.service.ts:19` |
| Config invalide (BOM UTF-8) | Erreur journalisée puis **démarrage quand même** ; ensuite 500 sur `/api/events` | PAS FAIT (fail-late) | JOURNAL |
| Données Baserow d'une autre carte | Même tables via les mêmes variables d'env : N cartes = N déploiements (backend + env) ; pas d'entrée de config pour les IDs de tables | PARTIEL | `baserow.service.ts` |

**Verdict** : le principe « 1 code, N configs » fonctionne pour le **thème, les textes et les dates** (preuve exécutée). Il ne couvre pas encore : features activables, `index.html`, sélection de profil côté front, identifiants Baserow par carte, accents de couleur.

## Limites

- Navigateur : seul Chromium intégré à l'IDE, pas de test Safari/Firefox/mobile.
- Build de production (Docker) non exécuté (`NON VÉRIFIÉ`), voir [01-lancement.md](01-lancement.md).
- Géolocalisation, partage, recherche d'adresse client : `NON VÉRIFIÉ`.
