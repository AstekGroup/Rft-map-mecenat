# 02 — Baserow local et données de test (étape 2)

Date : 2026-10-16 · Statuts : voir [SUIVI.md](SUIVI.md) · Preuves : [JOURNAL.md](JOURNAL.md)

## Ce qui a été livré

| Livrable | Chemin |
|---|---|
| Baserow local (Docker, version **2.4.1**, port **8088**) | `deploy/baserow-local/docker-compose.yml` |
| Script de seed idempotent (Node, zéro dépendance) | `scripts/seed-baserow/seed.mjs` |
| Schéma réel créé (JSON, généré) | `scripts/seed-baserow/out/schema.json` (gitignoré) |
| `.env` backend généré (IDs de tables/champ + jeton) | `apps/backend/.env` (gitignoré) |

## Procédure

```bash
# 1. Démarrer Baserow (premier démarrage ~2-3 min)
docker compose -f deploy/baserow-local/docker-compose.yml up -d

# 2. Créer schéma + données : 1000 événements au total par défaut (36 cas limites + 964 générés
#    pour le clustering). --total=N change le total ; --bulk=N fixe le nombre de générés.
node scripts/seed-baserow/seed.mjs

# 3. Backend + frontend
pnpm back:dev   # (ou pnpm --filter @make-map/backend build puis node apps/backend/dist/main)
pnpm front:dev

# Réinitialisation complète : supprime le volume Baserow
docker compose -f deploy/baserow-local/docker-compose.yml down -v
```

- Interface Baserow : `http://localhost:8088` — compte `admin@lgsv.local` / `Lgsv-Local-2026!` (local uniquement ; surchargeable via `BASEROW_LOCAL_EMAIL`/`BASEROW_LOCAL_PASSWORD`).
- **Idempotence vérifiée** : 1re exécution crée workspace, base `LGSV test`, 5 tables ; 2e exécution (avec `--bulk=1500`) détecte l'existant (aucun « créée »), vide et recharge les lignes (1536 événements). Les IDs de tables et de champ de modération restent stables.
- **Exception documentée** : ce script écrit dans Baserow (création de schéma, lignes). La règle « Baserow en lecture seule » de [AGENTS.md](../../AGENTS.md) vise le **backend de l'application** ; ce script cible une instance Docker locale jetable. Un garde-fou à ajouter au backlog : refuser toute URL non `localhost`.

## Schéma créé (déduit du code, 5 tables)

La vérité d'exécution des noms de champs est `app.config.json > baserow.fieldMapping` (les `fm.x || 'défaut'` du backend en sont des repli codés en dur). Types = **déduits** : aucune capture de la vraie base n'est disponible → tout type marqué `~` est `NON VÉRIFIÉ` face à la production.

| Table | Champs | Types choisis | Source de la déduction |
|---|---|---|---|
| **Formats**, **Publics**, **Thématiques** | `Nom` (primaire), `Picto`, `Couleur` | texte, **multiple select** ×2 (`Picto[0].value`, `Couleur[0].value`) | `BaserowLinkedTableRecord` + `baserow.service.ts:162-175` |
| **Partenaires** | `Nom` (primaire), `Logo` | texte, fichier | idem |
| **Événements** | `Nom de l'événement` (primaire) ; `Description` ; `Date de début/fin de l'événement` ; `Format`, `Public`, `Thématique`, `Partenaires` (liens) ; `Type de l'événement` ; `Visuel de l'évènement` ; adresse, code postal, ville, `Lieu` ; structure, animateur (prénom, nom, e-mail), liens, tel, site ; `Capacité…` ; `Tarif`, `Montant` ; `Modération de l'événement` ; `Visibilité sur la cartographie` | texte, long texte, date+heure ISO, **link_row** (sans champ inverse), **single select** (Présentiel/Distanciel/Hybride), fichier, multi-select (accès), nombre, single select (`Gratuit`/`Payant`), single select (`Accepté`/`Refusé`/`En attente`), `~` single select (`Oui`/`Non`) | `fieldMapping`, `baserow.types.ts`, `baserow-mapping.util.ts` |
| Champs « formulaire » en plus | `Respect de la charte`, `Avez-vous quelque chose à ajouter ?`, `Téléphone de l'animateur` | boolean, long texte, texte | `BaserowRecord` ; vérifie que les champs non mappés sont ignorés |

Points d'ambiguïté (à confirmer sur la vraie base) :
- **Noms des champs liés** : `fieldMapping` dit `Format`/`Public`/`Thématique` (singulier) alors que `baserow.types.ts` et les défauts du service disent `Formats`/`Publics`/`Thématiques` (pluriel). Le seed suit `fieldMapping`. `NON VÉRIFIÉ` pour la vraie base.
- **Type du champ de modération** : le type TS dit `string`, le filtre est `filter__field_<id>__contains_word`. Seed en single select ; filtre fonctionnel (voir ci-dessous).
- **`Visibilité sur la cartographie`** : mappé (`visibility`) mais **jamais lu** par `transformRecord` (`baserow.service.ts:268-378`) : type sans enjeu côté code actuel.

## Jeux de données (cas limites) — 36 événements + 964 générés (1000 au total par défaut)

| Catégorie | Cas (clé du seed) |
|---|---|
| Modération | Accepté ×31, Refusé (`R01`,`R02`), En attente (`P01`,`P02`), **modération vide** (`P03`, cas « formulaire non traité ») |
| Modalité | présentiel, distanciel/en ligne (`E02`), **Hybride** (`E03`) |
| Dates | pendant la semaine, hors semaine avant/après (`E05`,`E06`), multi-jours (`E04`), **sans date** (`E16`), **fin avant début** (`E26`), **fuseau** 22h30Z = 00h30 Paris (`E27`) |
| Géographie | DOM-TOM ×5 (`E07`-`E11`), Corse (`E12`), **adresse invalide** (`E13`), **adresse vide + ville/CP** (`E14`) |
| Données manquantes | **sans format** (`E15`), **sans titre** (`E17`), sans image ni description (`E20`), e-mail animateur seul (`E23`), capacité 0 (`E25`) |
| Contenu | titre/description très longs + `<script>` + HTML (`E21`), doublons de titre (`E30`,`E31`) |
| Liens/relations | multi thèmes/publics/partenaires (`E22`), partenaire sans logo, **format avec picto inexistant + couleur invalide** (`E28`), **format sans picto ni couleur** (`E29`) |
| Tarif | payant 15 € (`E18`), gratuit implicite (`E19`) |
| Volume | 964 générés par défaut (`--total=1000`) : ~80 % acceptés, ~12 % en attente, ~8 % refusés ; 30 villes (dont DOM-TOM) × 6 numéros de rue (adresses BAN réelles) |

## Résultat de validation de l'étape (critère « terminé »)

| Vérification | Résultat | Statut | Preuve |
|---|---|---|---|
| `GET /api/events?devMode=true` | **1536** événements, 1356 géocodés sur 1357 adresses (1 échec = `E13`, attendu) | FAIT | JOURNAL (session 1, étape 2) |
| `GET /api/events` (sans devMode) | **1250** événements, aucun « REFUSÉ / EN ATTENTE / MODÉRATION VIDE » → filtre de modération OK | FAIT | idem |
| Référentiels | `/api/events/formats` 9, `partners` 6, `themes` 5, `publics` 5 ; picto/couleur remontés tels quels (y compris les valeurs invalides `IconeQuiNexistePas` / `rouge`) | FAIT | idem |
| Fuseau | `E01` 16:00Z → `18:00` (Europe/Paris) ; `E27` → `2026-09-22 00:30` | FAIT | idem |
| Temps de réponse à froid | ~51 s (`devMode`, 1357 géocodages BAN séquentiels), puis ~28 s pour la 1re requête « prod » (cache distinct) | **Risque** | JOURNAL |

## Premiers constats issus de l'API (à approfondir en étape 3)

| Constat | Statut | Preuve |
|---|---|---|
| `GET /api/events?devMode=true` est **public** : contourne la modération et expose événements refusés/en attente + e-mails/téléphones | PAS FAIT (faille) | `events.controller.ts:23-27` (aucune garde) ; 1536 vs 1250 en réponse |
| `type` (format) **absent du JSON** pour `E15` (sans format) alors que le type TS le déclare obligatoire → risque de plantage front | NON VÉRIFIÉ côté UI (étape 3) | JOURNAL |
| `capacity` renvoyé en **chaîne** (`"25"`) alors que le type est `number` | PARTIEL | JOURNAL |
| `Hybride` est aplati en `presentiel` ; la visio d'un hybride est conservée mais le type n'est pas exprimé | PARTIEL | `baserow-mapping.util.ts:7-12` |
| Pas de validation `fin < début` ; date vide → `date: ""` | PAS FAIT | `E26`, `E16` |
| Cold start 30-50 s et 4 caches distincts par table, sans endpoint d'invalidation | Risque | `events.service.ts` ; JOURNAL |
| Picto/couleur invalides sont servis tels quels (la validation est déléguée au front : `iconResolver.ts`) | PARTIEL | JOURNAL ; `utils/iconResolver.ts` |

## Limites / suites

- Le seed ne reproduit pas la **vraie** base (non fournie). Demander une capture ou un export de schéma réel pour lever les `NON VÉRIFIÉ` ci-dessus.
- Les URLs d'images sont absolues vers l'hôte Baserow (`http://localhost:8088/media/...`) : OK en local, à prévoir en prod (CSP, domaine Baserow).
