import type { BaserowFieldMapping } from '@make-map/types';
import { buildTestConfig } from '../../test/test-config';
import {
  checkEventColumns,
  checkReferenceColumns,
  normalizeColumnName,
  suggestColumn,
} from './baserow-schema.util';

const FIELD_MAPPING: BaserowFieldMapping =
  buildTestConfig().baserow.fieldMapping;
const ALL_COLUMNS = ['id', 'order', ...Object.values(FIELD_MAPPING)];

describe('checkEventColumns', () => {
  it('ne signale rien quand toutes les colonnes de la config existent', () => {
    expect(checkEventColumns(ALL_COLUMNS, FIELD_MAPPING)).toEqual([]);
  });

  it('ignore les colonnes en trop (champs de formulaire non utilisés)', () => {
    expect(
      checkEventColumns(
        [...ALL_COLUMNS, 'Respect de la charte'],
        FIELD_MAPPING,
      ),
    ).toEqual([]);
  });

  it('nomme la colonne absente, son rôle dans la config et la conséquence', () => {
    const columns = ALL_COLUMNS.filter((c) => c !== FIELD_MAPPING.city);
    const messages = checkEventColumns(columns, FIELD_MAPPING);

    expect(messages[0]).toContain(`« ${FIELD_MAPPING.city} »`);
    expect(messages[0]).toContain('baserow.fieldMapping.city');
    expect(messages[0]).toContain('le champ sera vide');
  });

  it('propose la colonne renommée quand le nom est proche', () => {
    const columns = [
      ...ALL_COLUMNS.filter((c) => c !== FIELD_MAPPING.city),
      'commune du lieu',
    ];
    const messages = checkEventColumns(columns, FIELD_MAPPING);

    expect(messages[0]).toContain(
      'Colonne proche présente dans Baserow : « commune du lieu »',
    );
  });

  it('liste les colonnes non utilisées quand il en manque, pour repérer le renommage', () => {
    const columns = [
      ...ALL_COLUMNS.filter((c) => c !== FIELD_MAPPING.city),
      "Lieu de l'event",
    ];
    const messages = checkEventColumns(columns, FIELD_MAPPING);

    const last = messages[messages.length - 1];
    expect(last).toContain("colonnes de Baserow que la config n'utilise pas");
    expect(last).toContain("« Lieu de l'event »");
  });

  it('signale chaque colonne absente séparément', () => {
    const columns = ALL_COLUMNS.filter(
      (c) => c !== FIELD_MAPPING.title && c !== FIELD_MAPPING.startDate,
    );
    const missing = checkEventColumns(columns, FIELD_MAPPING).filter((m) =>
      m.includes('introuvable'),
    );
    expect(missing).toHaveLength(2);
  });

  it('distingue la casse et les accents (un nom doit être identique à celui de Baserow)', () => {
    const columns = ALL_COLUMNS.map((c) =>
      c === FIELD_MAPPING.city ? 'commune' : c,
    );
    const messages = checkEventColumns(columns, FIELD_MAPPING);
    expect(messages[0]).toContain('introuvable');
    expect(messages[0]).toContain('« commune »'); // proposé comme colonne proche
  });
});

describe('checkReferenceColumns', () => {
  const REF = buildTestConfig().baserow.mapping.referenceFields;

  it('ne signale rien quand les colonnes existent quelque part', () => {
    expect(
      checkReferenceColumns(
        [
          { label: 'FORMATS', columns: ['id', REF.name, REF.picto, REF.color] },
          { label: 'PARTENAIRES', columns: ['id', REF.name, REF.logo] },
        ],
        REF,
      ),
    ).toEqual([]);
  });

  it('exige la colonne du nom dans chaque table', () => {
    const messages = checkReferenceColumns(
      [
        { label: 'FORMATS', columns: ['id', REF.name, REF.picto, REF.color] },
        {
          label: 'PARTENAIRES',
          columns: ['id', 'Nom du partenaire', REF.logo],
        },
      ],
      REF,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('PARTENAIRES');
    expect(messages[0]).toContain('baserow.mapping.referenceFields.name');
  });

  it("signale un logo, un picto ou une couleur qu'aucune table ne contient", () => {
    const messages = checkReferenceColumns(
      [{ label: 'FORMATS', columns: ['id', REF.name, REF.picto] }],
      REF,
    );
    const text = messages.join('\n');
    expect(text).toContain('baserow.mapping.referenceFields.logo');
    expect(text).toContain('baserow.mapping.referenceFields.color');
    expect(text).not.toContain('baserow.mapping.referenceFields.picto');
  });

  it("ne dit rien quand aucune table n'a pu être lue (tables vides : contrôle impossible)", () => {
    expect(checkReferenceColumns([], REF)).toEqual([]);
  });
});

describe('suggestColumn et normalizeColumnName', () => {
  it("ignore la casse, les accents et le type d'apostrophe", () => {
    expect(normalizeColumnName('  Nom de l’ÉVÉNEMENT ')).toBe(
      "nom de l'evenement",
    );
    expect(suggestColumn("Nom de l'événement", ['nom de l’evenement'])).toBe(
      'nom de l’evenement',
    );
  });

  it('ne propose rien de trop éloigné', () => {
    expect(
      suggestColumn('Ville du lieu', ['Tarif', 'Montant']),
    ).toBeUndefined();
  });

  it('ne rapproche pas des noms trop courts', () => {
    expect(suggestColumn('Nom', ['Prénom du contact'])).toBeUndefined();
  });
});
