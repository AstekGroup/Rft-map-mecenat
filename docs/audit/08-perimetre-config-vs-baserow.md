# 08 — Périmètre : ce qui vit dans la config, dans Baserow, dans le code

Date : 2026-10-16 · Complète [04-cartographie.md](04-cartographie.md) et [SYNTHESE.md](SYNTHESE.md) · Statuts : voir [SUIVI.md](SUIVI.md).
Les constats viennent de la lecture du code et de `app.config.json` (chemins `fichier:ligne`). Rien n'a été exécuté pour ce document : ce qui n'est pas relu dans le code est marqué `NON VÉRIFIÉ`.

> **Décisions de périmètre prises le 2026-10-16 (par toi)**
> 1. Le **wording de l'interface** (boutons, placeholders, messages, titres de sections génériques) **reste en dur** dans le code, en français. Seuls les **titres et noms de l'événement** (ex. « La Grande Semaine Végétale » → « Les Journées de la Réparation ») sont pilotés par la config.
> 2. Les **fonctionnalités ne sont pas activables/désactivables** pour le moment. Pistes pour plus tard : des flags de config, ou une activation **déduite des données** (ex. pas d'événement en ligne dans la base → on désactive automatiquement les fonctions « en ligne »).
> 3. **Pas de migration de données** Airtable → Baserow : on repart d'une base vide avec le nouveau schéma. Le **déploiement** n'est pas à l'ordre du jour.

---

## 1. Les quatre zones (règle de décision)

| Zone | Qui la modifie, quand | Ce qu'on y met |
|---|---|---|
| **Fichier de config** (`app.config.json`) | Équipe produit/dev, **à la création d'une carte**, rarement ensuite | Identité et titres de l'événement, dates, design, correspondance avec le schéma Baserow, comportement des filtres |
| **Baserow** | Organisateurs, modérateurs, admin de la base, **sans déploiement** | Événements, référentiels (formats, publics, thématiques, partenaires) avec leurs couleurs, pictos, logos |
| **Code (en dur, assumé)** | Développeurs | Wording générique de l'interface, logique, comportements, géographie de référence |
| **Variables d'environnement** | Exploitation | Jeton, URL et **identifiants** des tables Baserow, CORS, ports, mode dev |

Arbre de décision pour trancher un cas nouveau :

1. Est-ce un **secret** ou un **identifiant d'infrastructure** ? → **Env**.
2. Est-ce du **contenu saisi** ou un **référentiel métier** que des non-développeurs doivent pouvoir changer (une nouvelle thématique, une couleur de format, un logo de partenaire) ? → **Baserow**.
3. Est-ce **propre à l'événement** (son nom, ses dates, sa charte, le nom d'une colonne Baserow) et décidé une fois par carte ? → **Config**.
4. Est-ce du **wording d'interface générique** (« Voir la carte », « Réinitialiser les filtres », placeholder) ou de la logique ? → **Code**, en français.
5. Est-ce une **fonctionnalité à activer/désactiver** ? → **Différé** (voir §6).

Cas limite assumé : `texts.home` contient à la fois du **contenu de marque** (`mainTitle`, `mainDescription`, `infoTitle`, `infoDescription`) et du **wording** (`ctaText`, `seeAll`, `nearbySubtitle`, `sectionPresentiel`, `editionLabel`). On laisse l'existant tel quel. **Règle pour la suite** : on n'ajoute pas de nouvelles clés de wording à la config ; on n'en retire pas non plus.

---

## 2. Matrice complète : où vit chaque élément

Légende : ✅ conforme à la cible · ⚠️ partiel · ❌ pas conforme · ➖ hors périmètre/différé.

### 2.1 Identité et titres de l'événement → **Config**

| Élément | Cible | État | Preuve / remarque |
|---|---|---|---|
| Nom complet (`app.name`) | Config | ⚠️ | Servi par `/api/config`. **Le nom est répété 7 fois** dans le JSON : `app.name`, `app.description`, `texts.meta.title`, `texts.meta.ogTitle`, `texts.home.mainTitle`, `texts.home.infoTitle`, libellé du mode `during-week`. Renommer l'événement = modifier 7 endroits (risque d'oubli). Piste : un seul champ + gabarit `{{app.name}}`. |
| Titre affiché dans les écrans | Config | ✅ | `getText('home','mainTitle')` : `HomePage.tsx:89`, `App.tsx:33`, `Sidebar.tsx:269`, `EventCard.tsx:131`, `EventPopup.tsx:71`, `EventDetailPage.tsx:154`. |
| Badge « LGSV 2026 » sur les cartes de la liste | Config (nom court + année) | ❌ EN DUR | `EventListView.tsx:88,108`. Devrait venir de `app.shortName` et de l'année de `eventDates`. |
| Nom court (`app.shortName`) | Config | ⚠️ | Dans le JSON, mais le badge ci-dessus ne l'utilise pas (usage ailleurs : `NON VÉRIFIÉ`). |
| Libellés de repli « Pendant la semaine de ... » | Config (nom de l'événement) | ❌ EN DUR | `FilterPanel.tsx:49`, `EventFiltersBar.tsx:89,128`. Repli utilisé si `filters.dateFilterModes` manque : il affiche « ... » à l'utilisateur. |
| Logo, nom dans l'en-tête, e-mail de contact, URL du site | Config | ❌ | `Header.tsx:18-21,37`, `Footer.tsx:13,24,37` : **composants jamais importés** (`rg` : aucune importation ni utilisation de `<Header`/`<Footer`) → code mort. Il n'y a **pas de clé de config** pour le logo ni l'e-mail de contact. À trancher : supprimer ces composants ou les brancher sur la config. |
| URL du site (`app.url`) | Config | ⚠️ | Dans le JSON ; usages côté front `NON VÉRIFIÉ`. |
| Métadonnées de page (titre, description, Open Graph, favicon) | Config | ⚠️ | Dans `texts.meta`, mais **écrites dans `index.html` à la compilation** par `update-index-html.cjs` (non idempotent, lit `app.config.json` racine). Le titre de l'onglet est donc fixé au build, pas à l'exécution. |
| Contenu de démonstration | — | ❌ code mort | `apps/frontend/src/data/mockEvents.ts` (contient « La Grande Semaine Végétale », `semaine-vegetale.fr`…) n'est importé nulle part. À supprimer. |
| Commentaire du type backend « Semaine de l'IA pour Tous » | — | ❌ reste de copie | `baserow.types.ts:68`. |

### 2.2 Dates de l'événement → **Config**

| Élément | Cible | État | Preuve / remarque |
|---|---|---|---|
| `app.eventDates.weekStart / weekEnd` | Config | ✅ | Lus par `AppConfigService.eventDates` → `baserow.service.ts:327`. |
| Valeurs par défaut si config absente | Erreur claire | ❌ | Repli `2026-09-25` / `2026-10-04` (`baserow-mapping.util.ts:72-73`) : trompeur (≠ dates du JSON). |
| Nom et période du mode « pendant l'événement » | Config | ⚠️ | Libellé en config (`dateFilterModes`) ; id de mode (`during-week`) en code. Voir §3 pour les limites. |

### 2.3 Design → **Config**

| Élément | Cible | État | Preuve / remarque |
|---|---|---|---|
| Couleurs principales | Config | ⚠️ | Le JSON ne définit que 3 couleurs (`primary`, `primary-dark`, `primary-light`) ; les autres (`accent-yellow`, `surface-beige`, `text-primary`…) viennent de **valeurs de repli Tailwind** non pilotables (preuve : 03 §5, l'accent jaune n'a pas changé avec la 2ᵉ config). |
| Polices | Config | ⚠️ | `theme.fonts` + `googleFontsUrl` ; `'Inter'` en dur dans `globals.css:34` ; le `<link>` des polices est écrit au build (comme les métas). |
| Rayons, ombres | Config | ❌ | Types `borderRadius` / `shadows` présents, absents du JSON, non lus ; ombres vertes en dur (`tailwind.config.ts:51-53`). |
| Couleur de repli `#D4DDE2` | Constante unique | ❌ | Répétée dans 6 fichiers (04 H9). |
| Couleurs de formats / thèmes | **Baserow** | ✅ | Champ `Couleur` de la table (voir §2.5). |

### 2.4 Carte (centre, zoom, fonds de carte) → **À trancher**

Tu n'as pas dit si ces paramètres doivent être pilotés. Comme toutes les cartes semblent viser la France (DOM-TOM compris), la valeur d'un pilotage est faible tant qu'il n'y a pas de carte hors France.

| Élément | État actuel | Option recommandée |
|---|---|---|
| Centre `[2.2137, 46.2276]`, zoom 5.5, bornes 3/18 | Dupliqués `MapView.tsx:290-291`, `DOMTOMInset.tsx:16-17` ; la branche `Refonte-Unifier-les-outils-de-la-carte-MAP` les met dans une constante unique `FRANCE_DEFAULT_VIEW` | **Code** (constante unique), surcharge optionnelle par config plus tard |
| Styles de fond de carte | 3 styles en dur (`MapStyleSelector.tsx`) | Code |
| DOM-TOM (liste, centres, zooms) | `DOMTOMInset.tsx:16-62` | Code (géographie de référence) |
| Géocodeur BAN (France) | `SearchOverlay.tsx:54`, `geocoding.service.ts` | Code |
| Type `AppConfigMap` (centre, zoom, styles, clustering) | Typé, jamais lu | **Le retirer du type** tant qu'on ne le branche pas (ne pas laisser une promesse non tenue) |

### 2.5 Schéma Baserow : correspondance et valeurs → **Config**

| Élément | Cible | État | Preuve / remarque |
|---|---|---|---|
| Noms des champs de la table Événements | Config (`baserow.fieldMapping`) | ⚠️ | 29 clés dans le JSON. Mais chacune a un **second nom en dur** en repli (`fm.x \|\| 'Ville du lieu'`, `baserow.service.ts:289-390`) : à supprimer, et à remplacer par une erreur claire si la clé manque. |
| **Noms des champs des tables de référence** (`Nom`, `Logo`, `Picto`, `Couleur`) | Config | ❌ EN DUR | `baserow.service.ts:165-173` (`record.Nom`, `record.Logo`, `record.Picto`, `record.Couleur`). **Absent de `fieldMapping` et de la cartographie 04** : constat nouveau. Une table de référence dont la colonne s'appelle autrement (ex. `Libellé`) ne se lit pas. |
| Noms des tables de référence | Env (IDs) | ⚠️ | Variables `BASEROW_*_TABLE_ID`, noms construits par concaténation `tableName + '_ID'` (`baserow.service.ts:127`) → introuvables par `rg`. |
| Champ de modération | Config (nom) + Env (ID) | ⚠️ | Valeur visible `moderationVisibleValue` en config, mais **l'identifiant** du champ en env (`BASEROW_MODERATION_FIELD_ID`) alors que le reste du mapping est par nom. Piste : résoudre l'ID à partir du nom via l'API de schéma au démarrage (réglerait aussi le cas « champ supprimé puis recréé »). Repli `'Accepté'` en dur (`baserow.service.ts:236`). |
| **Valeurs des listes de choix Baserow** (modalité : `Présentiel`, `Distanciel`, `En ligne`, `Hybride` ; tarif : `Gratuit`) | Config (`baserow.mapping`) | ❌ EN DUR | `baserow-mapping.util.ts:8-12` (`DEFAULT_MODALITY_MAP`), `baserow.service.ts:389` (`'Gratuit'`). Le type `baserow.mapping` existe, **n'est pas dans le JSON et n'est jamais lu** (`mm` défini ligne 278, jamais appelé). Une autre carte qui nomme l'option « À distance » serait lue comme présentielle sans erreur. |
| Lecture seule, jeton côté serveur | Code/Env | ✅ | — |

### 2.6 Données et référentiels → **Baserow**

| Élément | Cible | État | Preuve / remarque |
|---|---|---|---|
| Événements (formulaire public → modération) | Baserow | ✅ | Flux : formulaire → table → modérateur passe à « Accepté ». |
| Formats, publics, thématiques, partenaires (libellé) | Baserow | ✅ | 4 tables lues par `fetchLinkedTableMap`. |
| Couleur et picto d'un format | Baserow | ✅ | `Picto[0].value`, `Couleur[0].value` ; picto invalide → icône globe, couleur invalide → gris (03 §1 #14). |
| **Contrat du picto** | Documenter | ⚠️ | La valeur du champ `Picto` doit être **un nom d'icône `lucide-react`** exact (`iconResolver.ts:11-14`). Un nom inconnu se replie sur le globe. À écrire dans le guide de la base. |
| Logo d'un partenaire | Baserow | ✅ | Champ `Logo` (fichier). URL absolue vers l'hôte Baserow. |
| **Ordre d'affichage des options** | Baserow | ❌ | Les référentiels sont triés **par ordre alphabétique** côté backend (`baserow.service.ts:114-116`) : impossible de mettre « Autres » en dernier. Piste : colonne `Ordre` dans la table. |
| Format d'un événement | Baserow | ⚠️ | Une seule valeur retenue (`type: format[0]`, `baserow.service.ts:360`) même si la colonne Baserow permet plusieurs liens : les autres sont perdus **sans avertissement**. À trancher : colonne à choix unique, ou plusieurs formats par événement. |
| Régions | Code + géocodage | ➖ | Pas dans Baserow (déduites du code postal / du géocodage). Voir §3. |

### 2.7 Wording de l'interface → **Code, en dur (assumé)**

~122 textes dans 19 fichiers (04 §1), dont `EventDetailPage` (32), `FilterPanel` (15), `Header` (9), `Sidebar` (9). **Ce n'est plus une dette** : à l'exception de ce qui contient le nom de l'événement (§2.1), ces textes restent dans les composants. Le chiffre de 122 reste une estimation approximative (04).

### 2.8 Variables d'environnement → **Env**

| Variable | État |
|---|---|
| `BASEROW_API_URL`, `BASEROW_API_TOKEN`, `BASEROW_EVENT_TABLE_ID`, `BASEROW_PARTNERS_TABLE_ID`, `BASEROW_THEMATIQUES_TABLE_ID`, `BASEROW_FORMATS_TABLE_ID`, `BASEROW_PUBLICS_TABLE_ID`, `BASEROW_MODERATION_FIELD_ID` | ✅ documentées dans `.env.example` |
| `ALLOW_DEV_MODE` | ✅ (ajoutée en A5) |
| `APP_CONFIG_PATH`, `CORS_ORIGIN` | ⚠️ lues par le code, `CORS_ORIGIN`/`APP_CONFIG_PATH` absentes de `.env.example` (01) |
| `VITE_API_URL` | ✅ |
| `VITE_MAPTILER_KEY` | ❌ jamais lue : à supprimer des docs ou à brancher |

---

## 3. Les filtres (la partie délicate)

### 3.1 Inventaire : tous les filtres, d'où vient chaque donnée

Source : `useEvents.ts`, `FilterPanel.tsx`, `EventFiltersBar.tsx`.

| Filtre | Donnée de l'événement | Options proposées | Masqué quand | Titre du groupe | Remarque |
|---|---|---|---|---|---|
| **Recherche** | titre, description, ville, organisateur, région, lieu (`useEvents.ts:98-106`) | texte libre | jamais | placeholder en dur (2 textes différents) | La branche `Refonte-Unification` la limite au **titre** (Q3) |
| **Période** (3 modes) | `isDuringWeek` (calculé backend), ou dates de début/fin | `dateFilterModes` (**config**) | jamais | « Période » en dur | Voir T6 |
| **Événements passés** | date de fin vs horloge du navigateur | interrupteur | jamais | en dur | Défaut `false` ; `filters.showPastEvents` typé en config mais **jamais lu** |
| **Région** | `event.region` : déduite du code postal puis du géocodage | **liste en dur** (`useConfig.ts:39-58`) | jamais | « Région » en dur | France seulement (métropole + outre-mer) |
| **Code postal** | `postalCode` (champ mappé) | saisie 5 chiffres | jamais | en dur | Format français |
| **Modalité** (présentiel / en ligne) | dérivée du champ « Type de l'événement » via un tableau en dur | 2 boutons | n'existe **que dans `EventFiltersBar`** (liste), pas dans `FilterPanel` (carte) | en dur | La carte a à la place un bouton « événements en ligne » (`MapPage.tsx:132`) |
| **Format** (type d'événement) | table Formats (1 valeur) | **Baserow** (nom, picto, couleur) | **si la table est vide** (`availableFormats.length > 0`) | « Type d'événement » en dur | |
| **Thématiques** | table Thématiques (n valeurs) | **Baserow** | si vide | « Thématiques » en dur | |
| **Public cible** | table Publics (n valeurs) | **Baserow** | si vide | « Public cible » en dur | |
| **Partenaires** | table Partenaires (n valeurs) | **Baserow** (+ logos) | si vide | « Partenaires » en dur | |

### 3.2 Ce qui est déjà bien

- Les **options** des 4 filtres liés aux référentiels sont **lues dans Baserow** (libellé, couleur, picto, logo).
- Ces 4 filtres **se masquent tout seuls** quand leur table est vide (`FilterPanel.tsx:126,162,201,230`). C'est déjà, en petit, **le mécanisme que tu imagines pour plus tard** (« pas de données → on désactive ») : un précédent à étendre, pas à inventer.
- Les libellés des 3 modes de période viennent de la config.

### 3.3 Les points délicats

| # | Problème | Pourquoi c'est délicat | Preuve |
|---|---|---|---|
| **T1** | **Deux interfaces de filtres, deux listes différentes** : `FilterPanel` (carte) et `EventFiltersBar` (liste). Modalité seulement dans la barre ; calcul des « filtres actifs » différent ; mêmes replis dupliqués | Tout changement de filtre doit être fait deux fois et dérive. La branche `Refonte-Unification-du-panneau-latéral` unifie le comptage et le toggle « passés » mais pas la liste des filtres | `FilterPanel.tsx:52-61` vs `EventFiltersBar.tsx:92-102` ; 05 §3 |
| **T2** | **Chaque dimension de filtre est du code** : ajouter un référentiel (ex. « Labels ») impose de toucher variable d'env, appel `fetchLinkedTableMap`, endpoint, état `useEvents`, 2 composants, `transformRecord` et le type `Event` | « 1 code pour N cartes » est difficile si deux cartes n'ont pas les mêmes dimensions de filtrage | `baserow.service.ts:41-54`, `events.service.ts:68-128`, `useEvents.ts:7-22` |
| **T3** | **« Vide » et « en erreur » se confondent** : si une table de référence échoue à se charger, le backend renvoie une liste vide, et le filtre **disparaît sans signal** | Une panne Baserow ressemble à « cette carte n'a pas de thèmes ». À distinguer avant de généraliser l'auto-masquage | `baserow.service.ts:193` (retourne `new Map()` dans le `catch`) ; 03 §3 |
| **T4** | **Titre du groupe de filtre = concept métier** (« Thématiques », « Public cible », « Type d'événement ») mais en dur, alors que la table Baserow correspondante peut s'appeler autrement sur une autre carte (ex. « Catégories ») | Frontière floue entre wording générique (en dur, décidé) et vocabulaire d'événement. À trancher (Q-F2) | `FilterPanel.tsx:91,128,164,203,232,260,294` |
| **T5** | **Régions en dur, géographie française** : liste de 18 régions, groupe outre-mer, table département → région dans le backend ; code postal 5 chiffres | Si une carte n'a que des événements dans 3 régions, le filtre propose 18 régions dont 15 vides. Les régions ne viennent pas de Baserow mais du géocodage | `useConfig.ts:39-58`, `geocoding.service.ts:149+`, `FilterPanel.tsx:270` |
| **T6** | **Période incohérente entre modes**. « Pendant l'événement » utilise `isDuringWeek`, calculé côté backend **sur la date de début seule** ; le mode « dates personnalisées » utilise l'**intersection** début/fin. Un événement multi-jours commencé avant la semaine mais qui la recouvre n'est pas « pendant la semaine ». | Résultat différent selon le mode pour le même intervalle de dates | `baserow.service.ts:327` vs `eventDateRange.ts` (`eventIntersectsYmdRange`) ; lecture de code, **non exécuté** |
| **T7** | **« Événements passés » : après la fin de l'événement, la carte est vide par défaut.** Le défaut est `false` en dur, avec l'horloge du navigateur. Sur nos données de test (« aujourd'hui » = 16/10/2026, semaine = 21-27/09), il y a 52 événements à venir contre 921 avec les passés (03 §1 #4) | Après l'événement, la carte semble morte. Le défaut doit pouvoir être réglé **par carte** (`filters.showPastEvents` existe déjà dans le type, non branché) | `useEvents.ts:36`, `app-config.ts` (`showPastEvents`) |
| **T8** | **Modalité en dur et aplatie** : « Hybride » → présentiel ; les noms des options Baserow sont dans le code ; la modalité conditionne le géocodage (seuls les présentiels sont géocodés) et masque code postal/région dans la barre | Candidate numéro 1 à l'**auto-désactivation selon les données** (§6), mais touche 5 endroits | `baserow-mapping.util.ts:8-12`, `baserow.service.ts:68-70`, `EventFiltersBar.tsx:409,437`, `MapPage.tsx:132` |
| **T9** | **Format : une seule valeur retenue** alors que la colonne liée peut en contenir plusieurs ; le filtre « Format » est donc faux pour un événement multi-formats | Perte silencieuse de données | `baserow.service.ts:360` |
| **T10** | **Ordre des options non maîtrisé** (alphabétique) | Les organisateurs ne peuvent pas mettre « Autres » en dernier | `baserow.service.ts:114-116` |
| **T11** | État des filtres **non partageable** (seuls `q` et `modality` sont dans l'URL) | Mineur ; hors périmètre de la config | `EventsListPage.tsx:32-60` |

### 3.4 Proposition de répartition pour les filtres (à valider : voir Q-F1 à Q-F6)

| Aspect | Où | Détail |
|---|---|---|
| **Dimensions disponibles** (date, passés, région, code postal, modalité, format, thématiques, publics, partenaires, recherche) | **Code** | Ensemble **fixe**, on n'invente pas de filtres par carte pour l'instant |
| **Options** des filtres liés (libellés, couleurs, pictos, logos, **ordre**) | **Baserow** | Déjà vrai sauf l'ordre |
| **Quels filtres sont visibles** | **Config** (proposition) : une liste ordonnée de dimensions affichées. Plus tard : complétée par l'auto-masquage selon les données | Remplace les deux listes dupliquées par **une seule définition** lue par `FilterPanel` et `EventFiltersBar` |
| **Défauts** (`showPastEvents`, modalité par défaut) | **Config** | Déjà typés (`AppConfigFilters`), à brancher |
| **Libellés des modes de période** | **Config** | Déjà en place |
| **Titres de groupes** (« Thématiques », …) | **Code** par défaut, **ou** config (décision Q-F2) | |
| **Nom de l'option Baserow qui correspond à « en ligne »**, etc. | **Config** (`baserow.mapping`) | Remplace `DEFAULT_MODALITY_MAP` |
| **Liste des régions** | **Code** (géographie de référence) ; **affichage** limité aux régions qui ont des événements (idée, à valider) | |
| **Cohérence période** | **Code** : même règle d'intersection pour tous les modes | Corrige T6 |

Forme possible de la config (**proposition, non implémentée**) :

```json
"filters": {
  "defaultShowPastEvents": false,
  "defaultModality": "all",
  "visible": ["date", "partners", "format", "themes", "audiences", "postalCode", "region", "modality"],
  "dateFilterModes": [ { "mode": "all", "label": "..." }, { "mode": "during-week", "label": "..." }, { "mode": "custom", "label": "..." } ]
}
```

### 3.5 Décisions à prendre sur les filtres

| # | Question | Option recommandée |
|---|---|---|
| **Q-F1** | Ensemble de filtres **fixe** (la config ne fait que choisir lesquels sont visibles) ou **déclaratif** (la config décrit chaque filtre : source, champ, libellé, type) ? | **Fixe.** Le déclaratif est un chantier lourd (T2) qui n'est pas justifié tant que les cartes partagent les mêmes dimensions |
| **Q-F2** | Titres des groupes (« Thématiques », « Public cible »…) : en dur ou en config ? | **En dur** (cohérent avec ta règle sur le wording), sauf si une carte réelle les nomme autrement : à vérifier avec les 4 autres copies |
| **Q-F3** | Régions : liste complète en dur, ou limitée aux régions ayant des événements ? | Limitée aux régions présentes dans les données, avec la liste complète en code comme référence |
| **Q-F4** | Recherche : titre seul (branche Refonte) ou multi-champs (`main`) ? | Décision produit (= Q3). **Pas un sujet de config** |
| **Q-F5** | Défaut « événements passés » par carte, ou règle automatique (afficher les passés une fois l'événement terminé) ? | Config d'abord ; règle automatique ensuite |
| **Q-F6** | Fusionner `FilterPanel` et `EventFiltersBar` autour d'une définition unique ? | **Oui**, avant toute évolution des filtres (T1) |
| **Q-F7** | Format d'un événement : un seul format ou plusieurs ? | À fixer dans le **nouveau schéma** Baserow (T9) |

---

## 4. Le nouveau schéma Baserow : ce que ça change

Tu repars de **données vides** avec un **schéma modifié**, et **il n'existe pas de schéma cible** à fournir (décision du 2026-10-16). L'exigence est donc : **la carte doit fonctionner avec le schéma qu'on lui indique**.

- Le schéma de test de `scripts/seed-baserow/seed.mjs` est **déduit de l'ancien code** (02). Il sert de **référence de test**, pas de vérité sur la future base. Les points `NON VÉRIFIÉ` sur le schéma réel restent ouverts, sans bloquer.
- **Conséquence directe** : tout ce qui dépend d'un nom de colonne ou d'une valeur de liste de choix doit être **réglable dans la config** (`fieldMapping`, `baserow.mapping`), y compris pour les tables de référence (§2.5). Tant que ce n'est pas le cas, la carte ne fonctionne qu'avec **un seul** schéma possible (celui du code). C'est le **point central** de l'étape 3 du plan (§5).
- Le contrôle de schéma au démarrage (E1) devient le **filet de sécurité** : il dit précisément ce qui manque dans la base au lieu de produire des champs silencieusement vides (03 §3).
- Les points à fixer au moment de créer la vraie base restent valables à titre de **recommandations** : nom des champs de référence (§2.5), type du champ de format (T9), colonne `Ordre` (T10), type du champ de modération (liste de choix).

---

## 5. Plan d'action pour que cette répartition soit vraie

Ordre recommandé, du plus utile au moins urgent. Les items portent les identifiants de [07](07-plan-de-suite.md) quand ils existent.

| Étape | Contenu | Zone | Effort | Statut |
|---|---|---|---|---|
| **1** | **Titres et marque dans la config** : badge « LGSV 2026 » → `shortName` + année ; repli « Pendant la semaine de ... » ; suppression du repli de dates ; **un seul champ pour le nom de l'événement** (gabarit) ; décider du sort de `Header`/`Footer`/`mockEvents.ts` (code mort) | Config | S | À faire (C1, C7 révisés) |
| **2** | **Valider la config à l'exécution** (clés requises, formats de dates/couleurs) et **aligner type et JSON** : retirer du type ce qui est hors périmètre (`texts.map/list/detail/filters/footer`, `features` non défini, `AppConfigMap` non branché) et brancher ce qui l'est (`filters.showPastEvents`, `defaultModality`, `borderRadius`/`shadows` si voulu) | Config | M | À faire (B2, B3 révisés) |
| **3** | **Schéma Baserow** : supprimer les replis `fm.x \|\| '…'` ; ajouter les champs des tables de référence au mapping ; sortir les valeurs de listes de choix vers `baserow.mapping` ; contrôle de schéma au démarrage et message clair | Config + Baserow | M | À faire (C8, E1, E2) ; **dépend du schéma cible** |
| **4** | **Filtres** : décider Q-F1 à Q-F7 ; fusionner les deux interfaces ; corriger T3 (distinguer vide/erreur), T6 (période), T9 (format) ; brancher les défauts ; ordre des options | Config + Baserow + Code | M/L | À cadrer d'abord |
| **5** | **Corriger les bugs de données** : `Invalid Date`, fin < début, hybride, capacité en chaîne | Code | S | À faire (E3, E4) |
| **6** | **Hygiène** : police `Inter`, variable `VITE_MAPTILER_KEY`, `index.html` piloté sans rebuild (ou « 1 build par carte » documenté), lockfile, lint | Code | S | À faire (C4, C10, B5, A2, F1) |
| **Plus tard** | Auto-désactivation selon les données (§6) · déploiement · sélection de profil / hébergement multi-cartes (Q5) · parité fonctionnelle (D) · IDs de tables dans la config | — | — | Différé |

---

## 6. Plus tard : fonctionnalités activables

Pas à l'ordre du jour. On conserve la réflexion pour ne pas la perdre.

- **Piste A — flags de config** (`features.<nom>`, désactivé par défaut) : explicite, mais à maintenir à la main.
- **Piste B — activation déduite des données** (ton idée) : « si la base ne contient aucun événement en ligne, on masque automatiquement toutes les fonctions en ligne ». Le mécanisme existe déjà en petit pour les référentiels (§3.2). Candidates : **modalité / événements en ligne** (T8), **partenaires** (table vide), **images** (aucun événement avec visuel), **tarifs** (aucun événement payant), **régions** (limitées à celles qui ont des événements).
- **Garde-fous à prévoir avant** : distinguer « vide » de « en erreur » (T3) ; ne pas faire clignoter l'interface selon le moment où un modérateur accepte un événement ; calcul **côté backend** (un seul endroit) et exposé dans une réponse de configuration dérivée.
- Compatible avec la règle de dégradation propre : tout comportement automatique doit se journaliser.

---

## 7. Conséquences sur les autres documents

| Document | Ce qu'il faut ajuster |
|---|---|
| `AGENTS.md` racine (étape 6, **non commité**, à valider) | Principe 2 : « toutes les clés `texts.*`, pas de libellé en dur » → « titres et noms de l'événement en config ; **wording générique en dur, en français** ». Principe 3 : « toute nouvelle fonctionnalité est un flag » → « pas de flags pour le moment ; ne jamais coder `if (carte === …)` ; activation par flag ou par les données à décider plus tard ». Checklist : remplacer « Nouveau texte → clé `texts.*` » par « Nouveau **titre/nom d'événement** → config ». Garder : mapping Baserow, dégradation propre, test avec une seconde config. |
| `04-cartographie.md` | H21 (≈122 textes) : **reclassé « en dur assumé »**. Axe « Fonctionnalités on/off » : **différé** et non « PAS FAIT ». Ajouter le constat sur les champs des tables de référence (§2.5) |
| `07-plan-de-suite.md` | A2 (lockfile, hors Docker), A3, A4, A7 : **différés** (déploiement). B1 (`features`) : **différé**. C2 (textes UI) : **annulé** (remplacé par l'étape 1 ci-dessus). Voir la note de révision en tête de ce fichier |
| `06-agents.md` | Les points « tous les textes en config » deviennent caducs |
