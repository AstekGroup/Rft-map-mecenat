/**
 * Contrat « le type AppConfig reste fidèle aux fichiers de config ».
 *
 * Pour chaque config de carte (la config du dépôt et la fixture « seconde carte »), chaque niveau
 * de l'objet est comparé au type correspondant de `AppConfig` :
 *  - aucune clé de la config absente du type (clé sans consommateur, ou faute de frappe) ;
 *  - aucune clé obligatoire du type absente de la config.
 * Une dérive fait échouer `pnpm test` à la compilation, et l'erreur nomme la clé fautive.
 *
 * Les valeurs (formats de dates, couleurs, etc.) sont validées à l'exécution par le backend
 * (`validateAppConfig`) ; ici, seule la **forme** est contrôlée.
 */
import { expectTypeOf, test } from 'vitest';
import type { AppConfig } from '../src';
import mainConfig from '../../../app.config.json';
import lgsvConfig from '../../../app.config-LGSV.json';
import secondConfig from '../../../docs/audit/fixtures/app.config.second-map.json';

// Toute nouvelle config de carte à la racine (app.config-<CARTE>.json) doit être
// importée ici : le contrat refuse une carte dont la forme dérive du type AppConfig.

type RequiredKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K;
}[keyof T];

/** Écarts de forme entre la config `J` et le type `T`, au niveau `P` (union de messages). */
type Diff<J, T, P extends string> =
  | (Exclude<keyof J, keyof T> extends infer U
      ? U extends string
        ? `${P} : clé inconnue du type « ${U} »`
        : never
      : never)
  | (Exclude<RequiredKeys<T>, keyof J> extends infer M
      ? M extends string
        ? `${P} : clé obligatoire absente de la config « ${M} »`
        : never
      : never);

type Baserow = AppConfig['baserow'];
type Mapping = Baserow['mapping'];

type ShapeErrors<
  J extends {
    app: object;
    theme: object;
    texts: object;
    filters: object;
    baserow: { fieldMapping: object; mapping: { referenceFields: object } };
  },
> =
  | Diff<J, AppConfig, 'racine'>
  | Diff<J['app'], AppConfig['app'], 'app'>
  | Diff<J['theme'], AppConfig['theme'], 'theme'>
  | Diff<J['texts'], AppConfig['texts'], 'texts'>
  | Diff<J['filters'], AppConfig['filters'], 'filters'>
  | Diff<J['baserow'], Baserow, 'baserow'>
  | Diff<J['baserow']['fieldMapping'], Baserow['fieldMapping'], 'baserow.fieldMapping'>
  | Diff<J['baserow']['mapping'], Mapping, 'baserow.mapping'>
  | Diff<
      J['baserow']['mapping']['referenceFields'],
      Mapping['referenceFields'],
      'baserow.mapping.referenceFields'
    >;

test('app.config.json suit le type AppConfig', () => {
  expectTypeOf<ShapeErrors<typeof mainConfig>>().toBeNever();
});

test('la carte LGSV (app.config-LGSV.json) suit le type AppConfig', () => {
  expectTypeOf<ShapeErrors<typeof lgsvConfig>>().toBeNever();
});

test('la fixture « seconde carte » suit le type AppConfig', () => {
  expectTypeOf<ShapeErrors<typeof secondConfig>>().toBeNever();
});
