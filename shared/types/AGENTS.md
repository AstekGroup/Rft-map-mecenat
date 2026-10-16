# AGENTS.md — `@make-map/types`

[← Instructions racine](../../AGENTS.md) · [Frontend](../../apps/frontend/AGENTS.md) · [Backend](../../apps/backend/AGENTS.md) · [Suivi de la refonte](../../docs/audit/SUIVI.md)

## Rôle

Package **`@make-map/types`** : contrat TypeScript partagé entre frontend et backend.

- `src/event.ts` : `Event`, `LinkedTableRow`, `EventModality`, GeoJSON (`GeoJSONEvent`, `EventsGeoJSON`), types de clustering (`ClusterFeature`, `MapFeature`, `isCluster`).
- `src/app-config.ts` : type **`AppConfig`** — le **schéma de la config d'une carte**. C'est le contrat central de la refonte « 1 code / N cartes ».

> Les types/énumérations métier d'avant la refonte (`EventType`, `EventFormat`, `TargetAudience`, `EventTheme`, labels et `REGIONS` figés) **n'existent plus ici** : les référentiels viennent de Baserow (`LinkedTableRow`). Ne pas les réintroduire sous forme d'énumérations en dur.

## Règles

1. **Toute clé de config** (titre, couleur, paramètre de carte, dates, correspondance Baserow) est **d'abord** ajoutée à `AppConfig`, puis lue par le front/back. Une clé non typée n'existe pas.
2. Le type `AppConfig` doit rester **fidèle à `app.config.json`** et à ce que le code lit réellement. Écart connu (le type prévoit `texts.map/list/detail/filters/footer`, `AppConfigMap`, `borderRadius`, `shadows`, `showPastEvents`, `defaultModality`, que le JSON ne fournit pas) : alignement prévu en session 4. Ne pas ajouter de clé « pour plus tard » sans consommateur ; toute clé optionnelle a une **valeur par défaut documentée**.
3. **Pas de flags de fonctionnalités** (`features.*`) : décision du plan, on ne les ajoute pas.
4. Un champ `Event` optionnel (propre à une carte) est **optionnel** dans le type ; il est alimenté par le mapping Baserow si le champ est configuré.
5. Modifier le contrat ⇒ vérifier que **frontend et backend compilent** et que leurs tests passent.

## Commandes (depuis `shared/types`)

```bash
pnpm build
```

Depuis la racine : `pnpm build --filter=@make-map/types`. Limite : `pnpm test` à la racine **ne couvre pas** ce package.
