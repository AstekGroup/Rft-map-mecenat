# AGENTS.md — `@make-map/types`

[← Instructions racine](../../AGENTS.md) · [Frontend](../../apps/frontend/AGENTS.md) · [Backend](../../apps/backend/AGENTS.md) · [Suivi de la refonte](../../docs/audit/SUIVI.md)

## Rôle

Package **`@make-map/types`** : contrat TypeScript partagé entre frontend et backend.

- `src/event.ts` : `Event`, `LinkedTableRow`, `EventModality`, GeoJSON (`GeoJSONEvent`, `EventsGeoJSON`), types de clustering (`ClusterFeature`, `MapFeature`, `isCluster`).
- `src/app-config.ts` : type **`AppConfig`** — le **schéma de la config d'une carte**. C'est le contrat central de la refonte « 1 code / N cartes ».

> Les types/énumérations métier d'avant la refonte (`EventType`, `EventFormat`, `TargetAudience`, `EventTheme`, labels et `REGIONS` figés) **n'existent plus ici** : les référentiels viennent de Baserow (`LinkedTableRow`). Ne pas les réintroduire sous forme d'énumérations en dur.

## Règles

1. **Toute clé de config** (titre, couleur, paramètre de carte, dates, correspondance Baserow) est **d'abord** ajoutée à `AppConfig`, puis lue par le front/back. Une clé non typée n'existe pas.
2. Le type `AppConfig` doit rester **fidèle à `app.config.json`** et à ce que le code lit réellement (aligné en session 4 : plus de `texts.map/list/detail/filters/footer`, de `AppConfigMap`, de `shadows`, de `filters.showPastEvents/defaultModality`). Ne pas ajouter de clé « pour plus tard » sans consommateur ; toute clé optionnelle a une **valeur par défaut documentée**.
3. **Correspondance Baserow** : `BaserowFieldMapping` (rôle de colonne → nom de colonne dans Baserow, toutes les clés obligatoires sauf `highlight`, rôle **optionnel** du « coup de cœur » : clé absente = fonctionnalité inactive, avertissement au démarrage) et `BaserowMapping` (colonnes des tables de référence, valeurs de la liste « modalité », valeur « gratuit » du tarif). Ajouter un rôle = l'ajouter dans le type, dans les configs (`app.config.json`, `docs/audit/fixtures/`) et dans la validation du backend.
4. **Pas de flags de fonctionnalités** (`features.*`) : décision du plan, on ne les ajoute pas.
5. Un champ `Event` optionnel (propre à une carte) est **optionnel** dans le type ; il est alimenté par le mapping Baserow si le champ est configuré.
6. Modifier le contrat ⇒ vérifier que **frontend et backend compilent** et que leurs tests passent.

## Commandes (depuis `shared/types`)

```bash
pnpm build
pnpm test    # Vitest : isCluster + contrat de types (tests/app-config.contract.test-d.ts)
pnpm lint    # tsc --noEmit sur src et tests
```

Depuis la racine : `pnpm build --filter=@make-map/types`. `pnpm test` à la racine couvre ce package (session 7).

**Contrat `AppConfig`** : `tests/app-config.contract.test-d.ts` compare, niveau par niveau, les clés de `app.config.json` et de `docs/audit/fixtures/app.config.second-map.json` au type `AppConfig` : toute clé de config inconnue du type, ou toute clé obligatoire du type absente de la config, fait échouer le test en nommant la clé. Ajouter une clé à `AppConfig` impose donc de l'ajouter aux deux configs. Les tests vivent dans `tests/` (hors `src/`, donc hors du `dist` publié).
