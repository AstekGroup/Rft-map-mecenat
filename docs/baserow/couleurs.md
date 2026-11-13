# Couleurs des référentiels : choisir une pastille

Les tables **Formats**, **Publics** et **Thématiques** ont une couleur (pastille de la liste, marqueur de la carte, badge). Les admins la choisissent **en un clic**, avec la pastille de couleur native de Baserow : aucun code hexadécimal à taper, aucune table supplémentaire, aucun plugin.

## Pour les admins : choisir la couleur d'une ligne

1. Cliquer dans la cellule `Couleur` de la ligne (par exemple le format « Atelier de cuisine »).
2. Choisir une option dans la liste : chaque option affiche sa pastille de couleur.
3. C'est tout. La carte prend la nouvelle couleur après l'expiration du cache de l'API (5 minutes) ou un redémarrage du backend.

Laisser la cellule vide donne la couleur de repli (gris) sur la carte.

## Ajouter une couleur ou changer une teinte

La colonne `Couleur` est une **liste de choix simple**. Pour proposer une nouvelle couleur :

1. Menu de la colonne `Couleur`, *Modifier le champ*.
2. *Ajouter une option*, lui donner un nom parlant (« Orange », « Vert sapin »...).
3. Cliquer sur le rond de couleur à gauche du nom et choisir la teinte.

**Seule la pastille compte** : le nom de l'option est libre et l'application ne le lit pas (sauf cas particulier ci-dessous). Changer la pastille d'une option change la couleur de toutes les lignes qui l'utilisent.

Conseil : pour des marqueurs lisibles sur la carte, choisir dans les **deux dernières lignes** du sélecteur (teintes « foncée » et « plus foncée ») ; les deux premières lignes sont très pâles.

### Cas particulier : couleur exacte de la marque

La palette Baserow est limitée (40 teintes dans le sélecteur, assez pastel). Si une couleur exacte est indispensable, nommer l'option par son code hexadécimal (`#E8793A`) : ce code est alors utilisé à la place de la pastille. C'est aussi ce qui garantit que les anciennes bases (options nommées par un code) continuent de fonctionner.

## Comment l'application lit la couleur

Pour chaque ligne, le backend prend l'option choisie dans la colonne nommée par `baserow.mapping.referenceFields.color` (`app.config.json`, `"Couleur"` par défaut) :

1. si le nom de l'option est un code hexadécimal valide (`#E8793A`, `E8793A`, `#abc`), ce code ;
2. sinon, la pastille de l'option (`dark-orange`, `muted-blue`...), traduite en code par la palette de Baserow (`apps/backend/src/baserow/baserow-palette.ts`) ;
3. sinon (cellule vide, pastille inconnue), aucune couleur : la carte affiche le gris de repli. Une pastille inconnue est signalée **une fois** dans les journaux du backend, avec le nom de la table.

La palette est celle de Baserow 2.4.1, identique pour toutes les cartes. **À chaque montée de version de Baserow**, vérifier qu'aucune pastille inconnue n'apparaît dans les journaux ; sinon, compléter `baserow-palette.ts` avec les codes de la nouvelle version.

## Migration d'une base existante (sans coupure)

Ancien schéma : colonne `Couleur` en liste de choix (souvent multiple) dont les options sont nommées par des codes (`#E8793A`). Il continue de fonctionner tel quel ; la migration est progressive.

1. *(Facultatif mais recommandé)* Convertir la colonne `Couleur` en **liste de choix simple** (*Modifier le champ*, type *Choix unique*). Baserow conserve les options ; vérifier ensuite qu'aucune ligne n'a perdu sa couleur. Le backend lit les deux types (première option d'une liste multiple).
2. Ajouter des options nommées (« Orange », « Bleu »...) avec leur pastille.
3. Remplacer progressivement, ligne par ligne, les anciennes options en code par les nouvelles.
4. Supprimer les anciennes options en code quand plus aucune ligne ne les utilise.

Aucun changement de config ni de déploiement n'est nécessaire : le nom de la colonne reste celui de `referenceFields.color`.

### Base passée par la table `Couleurs` (ancienne procédure)

Si la base a reçu la table `Couleurs`, une colonne de lien `Couleur` et une colonne de recherche `Couleur (hexa)` :

1. Garder `referenceFields.color` = `"Couleur (hexa)"` dans la config de la carte tant que la migration n'est pas finie (la recherche renvoie des codes, toujours lus).
2. Dans chaque référentiel, convertir la colonne `Couleur` en **liste de choix simple** (Baserow crée une option par couleur liée, nommée comme la ligne de `Couleurs`), puis donner à chaque option la pastille voulue.
3. Passer `referenceFields.color` à `"Couleur"` et redéployer le backend ; vérifier les couleurs sur la carte.
4. Supprimer les colonnes `Couleur (hexa)` puis la table `Couleurs`.

## Données de test

`node scripts/seed-baserow/seed.mjs` crée la colonne `Couleur` en liste de choix simple avec une quinzaine d'options nommées (pastilles des lignes « foncée » et « plus foncée » du sélecteur), plus une option nommée `#E74C8C` (ancien schéma, utilisée par le format « Festival ») et un format sans couleur (`[TEST] Format sans picto ni couleur`). Relancé sur un ancien schéma local (liste de choix multiple), le seed recrée la colonne au bon type ; sur une colonne déjà au bon type, il ajoute les options manquantes et aligne leurs pastilles.
