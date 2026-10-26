import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildTestConfig } from '../../test/test-config';
import {
  FIELD_MAPPING_KEYS,
  REFERENCE_FIELD_KEYS,
  validateAppConfig,
} from './config-validation.util';

/** Copie modifiable de la config de test, vue comme un objet quelconque. */
function configWith(mutate: (config: Record<string, any>) => void): unknown {
  const config = buildTestConfig() as unknown as Record<string, any>;
  mutate(config);
  return config;
}

describe('validateAppConfig', () => {
  it('accepte une config complète, sans erreur ni avertissement', () => {
    expect(validateAppConfig(buildTestConfig())).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it.each([
    'app.config.json',
    'docs/audit/fixtures/app.config.second-map.json',
  ])('accepte la config du dépôt %s', (file) => {
    const raw = JSON.parse(
      readFileSync(resolve(__dirname, '../../../../', file), 'utf-8'),
    );
    expect(validateAppConfig(raw).errors).toEqual([]);
  });

  it("refuse autre chose qu'un objet", () => {
    expect(validateAppConfig(null).errors).toHaveLength(1);
    expect(validateAppConfig([]).errors).toHaveLength(1);
    expect(validateAppConfig('texte').errors).toHaveLength(1);
  });

  it('liste toutes les sections absentes en une seule fois', () => {
    const { errors } = validateAppConfig({});
    const text = errors.join('\n');
    for (const section of ['app', 'theme', 'texts', 'filters', 'baserow']) {
      expect(text).toContain(section);
    }
  });

  describe('app', () => {
    it('exige le nom, le nom court et les dates', () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          c.app.name = '';
          delete c.app.shortName;
          delete c.app.eventDates;
        }),
      );
      expect(errors.join('\n')).toMatch(/app\.name/);
      expect(errors.join('\n')).toMatch(/app\.shortName/);
      expect(errors.join('\n')).toMatch(/app\.eventDates/);
    });

    it.each([
      '2026-9-21',
      '21/09/2026',
      '2026-13-45',
      '2026-02-30',
      20260921,
      '',
    ])('refuse la date %p', (value) => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          c.app.eventDates.weekStart = value;
        }),
      );
      expect(errors.join('\n')).toMatch(
        /app\.eventDates\.weekStart.*AAAA-MM-JJ/,
      );
    });

    it('refuse une fin avant le début', () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          c.app.eventDates = { weekStart: '2026-09-27', weekEnd: '2026-09-21' };
        }),
      );
      expect(errors.join('\n')).toMatch(/weekEnd.*avant weekStart/);
    });
  });

  describe('theme', () => {
    it.each(['rouge', '#12', '#GGGGGG', 'AE3B5D', 255])(
      'refuse la couleur %p',
      (value) => {
        const { errors } = validateAppConfig(
          configWith((c) => {
            c.theme.colors['primary-dark'] = value;
          }),
        );
        expect(errors.join('\n')).toMatch(
          /theme\.colors\.primary-dark.*hexadécimale/,
        );
      },
    );

    it('accepte les formats hexadécimaux courts et avec transparence', () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          c.theme.colors = { primary: '#abc', secondary: '#AABBCCDD' };
        }),
      );
      expect(errors).toEqual([]);
    });

    it('exige la couleur primaire et les polices', () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          c.theme.colors = {};
          c.theme.fonts = { heading: '' };
        }),
      );
      const text = errors.join('\n');
      expect(text).toMatch(/theme\.colors\.primary/);
      expect(text).toMatch(/theme\.fonts\.heading/);
      expect(text).toMatch(/theme\.fonts\.body/);
    });
  });

  describe('texts et filters', () => {
    it('exige les sections de textes et des chaînes', () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          delete c.texts.home;
          c.texts.meta.title = 12;
        }),
      );
      expect(errors.join('\n')).toMatch(/texts\.home/);
      expect(errors.join('\n')).toMatch(/texts\.meta\.title/);
    });

    it('vérifie les modes du filtre de période', () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          c.filters.dateFilterModes = [
            { mode: 'all', label: 'Toutes' },
            { mode: 'x' },
          ];
        }),
      );
      expect(errors.join('\n')).toMatch(/dateFilterModes\[1\]/);
    });
  });

  describe('baserow', () => {
    it.each(FIELD_MAPPING_KEYS)('exige le rôle fieldMapping.%s', (role) => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          delete c.baserow.fieldMapping[role];
        }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(`baserow.fieldMapping.${role}`);
    });

    it.each(REFERENCE_FIELD_KEYS)(
      'exige la colonne referenceFields.%s',
      (role) => {
        const { errors } = validateAppConfig(
          configWith((c) => {
            c.baserow.mapping.referenceFields[role] = ' ';
          }),
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(`baserow.mapping.referenceFields.${role}`);
      },
    );

    it('exige la valeur de modération visible', () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          delete c.baserow.moderationVisibleValue;
        }),
      );
      expect(errors.join('\n')).toMatch(/moderationVisibleValue/);
    });

    it('exige un tarif gratuit et une table de modalités valide', () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          delete c.baserow.mapping.tariffFreeValue;
          c.baserow.mapping.modality = { Mixte: 'hybride' };
        }),
      );
      const text = errors.join('\n');
      expect(text).toMatch(/tariffFreeValue/);
      expect(text).toMatch(/modality\["Mixte"\].*presentiel.*distanciel/);
    });

    it('refuse une table de modalités vide', () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          c.baserow.mapping.modality = {};
        }),
      );
      expect(errors.join('\n')).toMatch(/baserow\.mapping\.modality/);
    });

    it('ignore (avec avertissement) un rôle inconnu, par exemple une clé retirée du schéma', () => {
      const { errors, warnings } = validateAppConfig(
        configWith((c) => {
          c.baserow.fieldMapping.visibility = 'Visibilité sur la cartographie';
        }),
      );
      expect(errors).toEqual([]);
      expect(warnings.join('\n')).toMatch(/fieldMapping\.visibility.*inconnu/);
    });

    it('avertit quand deux rôles pointent vers la même colonne', () => {
      const { errors, warnings } = validateAppConfig(
        configWith((c) => {
          c.baserow.fieldMapping.city = c.baserow.fieldMapping.address;
        }),
      );
      expect(errors).toEqual([]);
      expect(warnings.join('\n')).toMatch(/plusieurs rôles \(address, city\)/);
    });

    describe('rôle optionnel highlight (coup de cœur)', () => {
      it("n'est pas un rôle obligatoire", () => {
        expect(FIELD_MAPPING_KEYS).not.toContain('highlight');
      });

      it('clé absente : aucune erreur, seulement un avertissement (fonctionnalité désactivée)', () => {
        const { errors, warnings } = validateAppConfig(
          configWith((c) => {
            delete c.baserow.fieldMapping.highlight;
          }),
        );
        expect(errors).toEqual([]);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toMatch(/fieldMapping\.highlight.*désactivée/);
      });

      it('nom vide ou non textuel : avertissement, jamais une erreur', () => {
        for (const value of ['  ', 42]) {
          const { errors, warnings } = validateAppConfig(
            configWith((c) => {
              c.baserow.fieldMapping.highlight = value;
            }),
          );
          expect(errors).toEqual([]);
          expect(warnings.join('\n')).toMatch(/fieldMapping\.highlight/);
        }
      });

      it('clé renseignée : ni erreur ni avertissement', () => {
        expect(validateAppConfig(buildTestConfig())).toEqual({
          errors: [],
          warnings: [],
        });
      });
    });

    it("refuse un nom de colonne qui n'est pas du texte", () => {
      const { errors } = validateAppConfig(
        configWith((c) => {
          c.baserow.fieldMapping.city = 42;
        }),
      );
      expect(errors.join('\n')).toMatch(/fieldMapping\.city.*42/);
    });
  });
});
