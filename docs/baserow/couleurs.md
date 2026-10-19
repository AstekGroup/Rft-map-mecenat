# Couleurs des référentiels : choisir par son nom

Les tables **Formats**, **Publics** et **Thématiques** ont une couleur (pastille de la liste, marqueur de la carte, badge). Les admins la **choisissent par son nom** (« Orange mandarine ») dans une liste, sans taper de code hexadécimal.

## Comment ça marche

```
Table « Couleurs »            Formats / Publics / Thématiques
  Nom (principal)  Hexa         Couleur (lien, 1 seule valeur)  → choix de l'admin
  Orange mandarine #E8793A      Couleur (hexa) (recherche)      → lue par l'application
```

1. **Couleurs** : 100 couleurs nommées, administrées par les admins (ajouter une ligne = une nouvelle couleur proposée partout). Le code hexadécimal n'est saisi qu'ici, une fois par couleur.
2. **Colonne de choix** (type *Lien vers une autre table*, vers `Couleurs`, une seule valeur) : c'est elle que l'admin remplit. Son nom est libre : l'application ne la lit pas.
3. **Colonne de lecture** (type *Recherche* / lookup, via la colonne de choix, sur `Hexa`) : c'est elle que lit l'application. Son nom est celui de `baserow.mapping.referenceFields.color` dans `app.config.json` (par défaut `Couleur (hexa)`). Les admins peuvent la masquer dans leur vue.

Aucun code ni variable d'environnement n'est nécessaire pour ajouter une couleur : la table `Couleurs` n'est jamais lue directement, seule la recherche de chaque table l'est.

Le backend tolère un code saisi avec des espaces ou sans `#` (`E8793A` devient `#E8793A`). Tout autre code invalide (ex. `rouge`) donne la couleur de repli (gris) côté carte, sans erreur.

## Mise en place sur une vraie base Baserow (sans coupure)

À faire **avant** de changer `referenceFields.color` dans la config. Tant que la config pointe l'ancienne colonne `Couleur`, la carte continue de fonctionner.

1. **Créer la table `Couleurs`** : *Créer une table*, *Importer un fichier CSV*, choisir [`palette-couleurs.csv`](palette-couleurs.csv) (UTF-8, séparateur virgule, première ligne = en-têtes). Le champ principal est `Nom`, l'autre colonne `Hexa` (texte). Vérifier qu'il y a 100 lignes.
2. **Dans chacune des tables Formats, Publics, Thématiques** :
   1. Ne pas toucher à l'ancienne colonne `Couleur` (liste de choix contenant les codes).
   2. Ajouter une colonne **`Couleur (choix)`** : type *Lien vers une autre table*, table `Couleurs`, **décocher** « Créer un champ lié dans la table liée » et **décocher** « Autoriser plusieurs relations ».
   3. Ajouter une colonne **`Couleur (hexa)`** : type *Recherche*, via `Couleur (choix)`, champ `Hexa`.
   4. Pour chaque ligne, choisir la couleur dans `Couleur (choix)` (le code de l'ancienne colonne indique la couleur équivalente dans la palette).
3. **Contrôler** : la colonne `Couleur (hexa)` doit contenir un code pour chaque ligne qui avait une couleur.
4. **Mettre à jour la config** : `baserow.mapping.referenceFields.color` = `"Couleur (hexa)"` dans `app.config.json` de la carte, puis redéployer le backend. Au démarrage, le journal doit indiquer « toutes les colonnes de la config sont présentes ».
5. **Nettoyer** : supprimer l'ancienne colonne `Couleur`, puis, si on le souhaite, renommer `Couleur (choix)` en `Couleur` (l'application ne lit que `Couleur (hexa)`).

Si la config est déployée avant la création de `Couleur (hexa)` : aucune erreur 500, mais les couleurs passent au gris de repli et le journal nomme la colonne absente.

## Ajouter ou corriger une couleur

Dans la table `Couleurs` : ajouter une ligne (`Nom` parlant, `Hexa` au format `#RRGGBB`). Elle est proposée tout de suite dans les trois tables. Corriger le `Hexa` d'une ligne change la couleur partout où elle est utilisée (après l'expiration du cache de 5 minutes de l'API).

## Données de test

`node scripts/seed-baserow/seed.mjs` crée la table `Couleurs` depuis ce même fichier CSV et lie chaque référentiel de test à une couleur par son nom. La ligne `[TEST] Couleur invalide` (`rouge`) sert au cas limite « couleur invalide » (voir [../audit/BASEROW-LOCAL.md](../audit/BASEROW-LOCAL.md)). Relancé sur un ancien schéma local, le seed remplace l'ancienne colonne `Couleur` (liste de choix) par le lien.
