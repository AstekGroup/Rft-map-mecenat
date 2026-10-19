# Baserow local et données de test

Outil de développement : une instance Baserow **jetable en Docker** et un script qui la remplit. Ne jamais pointer ces scripts vers un Baserow réel (l'application, elle, ne fait que des `GET`). Preuves d'exécution : [JOURNAL.md](JOURNAL.md).

## Fichiers

| Élément | Chemin |
|---|---|
| Baserow local (Docker, version 2.4.1, port 8088) | `deploy/baserow-local/docker-compose.yml` |
| Seed idempotent (Node, zéro dépendance) | `scripts/seed-baserow/seed.mjs` |
| Tests de robustesse au schéma | `scripts/seed-baserow/robustness.mjs` |
| Schéma créé (généré, ignoré par git) | `scripts/seed-baserow/out/schema.json` |
| `.env` du backend (IDs de tables et de champ, jeton ; généré, ignoré par git) | `apps/backend/.env` |

## Procédure

```bash
# 1. Démarrer Baserow (premier démarrage : 2 à 3 minutes)
docker compose -f deploy/baserow-local/docker-compose.yml up -d

# 2. Créer le schéma et les données : 1000 événements au total par défaut
#    (36 cas limites + 964 générés pour le clustering).
node scripts/seed-baserow/seed.mjs
#    --total=N change le total ; --bulk=N fixe le nombre d'événements générés (prioritaire sur --total) ;
#    --config=chemin/vers/app.config.json seed le schéma d'une autre carte ; --no-env n'écrit pas apps/backend/.env.

# 3. Backend et frontend
pnpm back:dev    # http://localhost:3000
pnpm front:dev   # http://localhost:5173

# Réinitialisation complète (supprime le volume Baserow)
docker compose -f deploy/baserow-local/docker-compose.yml down -v
```

- Interface Baserow : `http://localhost:8088`, compte `admin@lgsv.local` / `Lgsv-Local-2026!` (local uniquement ; `BASEROW_LOCAL_EMAIL` et `BASEROW_LOCAL_PASSWORD` les remplacent). Base créée : « LGSV test ».
- Le seed est **idempotent** : relancé, il détecte l'existant, vide puis recharge les lignes ; les identifiants de tables et de champ restent stables.
- `robustness.mjs` refuse toute URL non locale ; `seed.mjs` ne le vérifie pas (`--url` ou `BASEROW_LOCAL_URL`) : ne jamais le pointer vers un Baserow réel. Un garde-fou équivalent dans `seed.mjs` est à ajouter (non fait).
- **Noms de colonnes et valeurs de listes de choix** : lus dans la config (`baserow.fieldMapping` et `baserow.mapping` de `app.config.json`, ou `--config`). Pour tester une autre carte : `node scripts/seed-baserow/seed.mjs --config=docs/audit/fixtures/app.config.second-map.json`, puis `APP_CONFIG_PATH=<chemin absolu de la même config>` côté backend.
- Seconde config de référence : `docs/audit/fixtures/app.config.second-map.json` (générée par `docs/audit/fixtures/make-second-config.cjs` à partir de `app.config.json`). Elle sert aux tests « deux cartes » et à la vérification manuelle d'un changement d'identité.

## Schéma créé (6 tables)

| Table | Contenu |
|---|---|
| Couleurs | palette de 100 couleurs nommées : `Nom` (primaire) et `Hexa`, chargée depuis [../baserow/palette-couleurs.csv](../baserow/palette-couleurs.csv) + une ligne de test `[TEST] Couleur invalide` (`rouge`) |
| Formats, Publics, Thématiques | colonnes de référence : nom (primaire), picto (liste à choix multiple), `Couleur` (lien vers `Couleurs`, choix de l'admin) et `Couleur (hexa)` (recherche du code, c'est la colonne lue par la config). Voir [../baserow/couleurs.md](../baserow/couleurs.md) |
| Partenaires | nom (primaire), logo (fichier) |
| Événements | un champ par rôle de `baserow.fieldMapping` : titre, description, dates, modalité, liens vers formats, publics, thématiques et partenaires, visuel, adresse, code postal, ville, lieu, organisateur et contacts, lien d'inscription, capacité, tarif, modération |
| Champs de formulaire en plus | quelques colonnes non mappées (charte, remarque libre, téléphone) : vérifient que les colonnes inconnues sont ignorées |

Les types sont **déduits du code**, pas relevés sur la vraie base (jamais fournie) : tout ce qui concerne la production est « non vérifié ». Le champ de modération est une liste de choix ; le backend filtre dessus par l'identifiant `BASEROW_MODERATION_FIELD_ID`.

## Cas limites du jeu de test (36 événements manuels)

| Catégorie | Cas (clé du seed) |
|---|---|
| Modération | acceptés ×31, refusés (`R01`, `R02`), en attente (`P01`, `P02`), modération vide (`P03`) |
| Modalité | présentiel, en ligne (`E02`), hybride (`E03`) |
| Dates | pendant la semaine, hors semaine avant et après (`E05`, `E06`), multi-jours (`E04`), sans date (`E16`), fin avant début (`E26`), fuseau 22h30Z = 00h30 Paris (`E27`) |
| Géographie | DOM-TOM ×5 (`E07` à `E11`), Corse (`E12`), adresse invalide (`E13`), adresse vide avec ville et code postal (`E14`) |
| Données manquantes | sans format (`E15`), sans titre (`E17`), sans image ni description (`E20`), e-mail animateur seul (`E23`), capacité 0 (`E25`) |
| Contenu | titre et description très longs avec `<script>` et HTML (`E21`), doublons de titre (`E30`, `E31`) |
| Relations | plusieurs thèmes, publics et partenaires (`E22`), partenaire sans logo, format avec picto inexistant et couleur invalide (`E28`, lié à la couleur de test `rouge`), format sans picto ni couleur (`E29`) |
| Tarif | payant 15 € (`E18`), gratuit implicite (`E19`) |
| Volume | 964 événements générés par défaut : environ 80 % acceptés, 12 % en attente, 8 % refusés ; 30 villes (dont DOM-TOM) |

Comportement attendu côté application (couvert par les tests et vérifié en sessions 5 et 6) : refusés, en attente et modération vide jamais publiés ; `E16` masqué et journalisé ; `E26` sans date de fin ; `E27` affiché le 22/09 à 00:30 ; `E13` non géocodé ; `E28` et `E29` avec icône et couleur de repli.

## Robustesse au schéma

`node scripts/seed-baserow/robustness.mjs <scénario>` modifie le schéma de la base locale pour vérifier que la carte avertit au lieu de renvoyer des données vides. Scénarios : `rename-city`, `rename-format`, `rename-moderation`, `delete-moderation`, `delete-title`, `restore` (remet les noms de `app.config.json` ; le seed complet reste la restauration de référence). Redémarrer le backend entre le scénario et la requête. Attendu : une colonne renommée ou supprimée est nommée dans les logs (avec la colonne proche suggérée), un champ de modération supprimé donne une erreur claire et un 500 générique côté client.

## Limites

- Le seed ne reproduit pas la vraie base de production.
- Premier chargement à froid lent (géocodage BAN séquentiel de plusieurs centaines d'adresses), puis cache de 5 minutes (30 secondes si un référentiel est en erreur) : un événement modéré apparaît après l'expiration du cache ou un redémarrage du backend.
- Les URL d'images sont absolues vers l'hôte Baserow (`http://localhost:8088/media/...`) : correct en local.
