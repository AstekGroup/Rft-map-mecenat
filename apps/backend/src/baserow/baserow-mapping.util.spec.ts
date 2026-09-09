import {
  mapLinkedRow,
  mapModality,
  extractImageUrl,
  computeIsDuringWeek,
  parseDateTime,
  buildOrganizerContact,
  buildAccessibilityInfo,
} from './baserow-mapping.util';
import { BaserowAttachment, type BaserowRecord } from './baserow.types';
import { LinkedTableRow } from '@make-map/types';

describe('mapModality', () => {
  it('mappe Présentiel', () => {
    expect(mapModality({ id: 1, value: 'Présentiel' })).toBe('presentiel');
  });

  it('mappe Distanciel', () => {
    expect(mapModality({ id: 1, value: 'Distanciel' })).toBe('distanciel');
  });

  it('mappe En ligne vers distanciel', () => {
    expect(mapModality({ id: 1, value: 'En ligne' })).toBe('distanciel');
  });

  it('mappe Hybride vers présentiel', () => {
    expect(mapModality({ id: 1, value: 'Hybride' })).toBe('presentiel');
  });

  it('retourne presentiel par défaut si undefined', () => {
    expect(mapModality(undefined)).toBe('presentiel');
  });
});

describe('extractImageUrl', () => {
  it('retourne undefined si pas de pièces jointes', () => {
    expect(extractImageUrl(undefined)).toBeUndefined();
    expect(extractImageUrl([])).toBeUndefined();
  });

  it('retourne le thumbnail card si disponible', () => {
    const attachments: BaserowAttachment[] = [];
    const item: BaserowAttachment = {
      url: 'https://example.com/original.jpg',
      filename: 'image.jpg',
      thumbnails: {
        card: { url: 'https://example.com/card.jpg', width: 400, height: 300 },
      },
    };
    attachments.push(item);
    expect(extractImageUrl(attachments)).toBe('https://example.com/card.jpg');
  });

  it("retourne l'URL directe si pas de thumbnail", () => {
    const attachments: BaserowAttachment[] = [];
    const item: BaserowAttachment = {
      url: 'https://example.com/image.jpg',
      filename: 'image.jpg',
    };
    attachments.push(item);
    expect(extractImageUrl(attachments)).toBe('https://example.com/image.jpg');
  });
});

describe('computeIsDuringWeek', () => {
  it('retourne true pour une date pendant la semaine (25 sept - 4 oct 2026)', () => {
    expect(computeIsDuringWeek('2026-09-25T10:00:00.000Z')).toBe(true);
    expect(computeIsDuringWeek('2026-09-30T14:00:00.000Z')).toBe(true);
    expect(computeIsDuringWeek('2026-10-04T20:00:00.000Z')).toBe(true);
  });

  it('retourne false pour une date avant la semaine', () => {
    expect(computeIsDuringWeek('2026-09-24T23:59:59.000Z')).toBe(false);
  });

  it('retourne false pour une date après la semaine', () => {
    expect(computeIsDuringWeek('2026-10-05T00:00:00.000Z')).toBe(false);
  });

  it('retourne false si undefined', () => {
    expect(computeIsDuringWeek(undefined)).toBe(false);
  });
});

describe('parseDateTime', () => {
  it('retourne des chaînes vides si undefined', () => {
    expect(parseDateTime(undefined)).toEqual({ date: '', time: '' });
  });

  it('parse une date ISO valide', () => {
    const result = parseDateTime('2026-05-20T14:00:00.000Z');
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('retourne des chaînes vides pour une date invalide', () => {
    expect(parseDateTime('not-a-date')).toEqual({ date: '', time: '' });
  });
});

describe('buildOrganizerContact', () => {
  it('concatène prénom et nom', () => {
    expect(buildOrganizerContact('Jean', 'Dupont')).toBe('Jean Dupont');
  });

  it('retourne juste le prénom si pas de nom', () => {
    expect(buildOrganizerContact('Jean', undefined)).toBe('Jean');
  });

  it('retourne juste le nom si pas de prénom', () => {
    expect(buildOrganizerContact(undefined, 'Dupont')).toBe('Dupont');
  });

  it('retourne undefined si les deux sont absents', () => {
    expect(buildOrganizerContact(undefined, undefined)).toBeUndefined();
  });
});

describe('buildAccessibilityInfo', () => {
  it('joint les modalités avec une virgule', () => {
    expect(
      buildAccessibilityInfo([
        { id: 1, value: "Rampe d'accès" },
        { id: 1, value: 'Ascenseur' },
      ]),
    ).toBe("Rampe d'accès, Ascenseur");
  });

  it('retourne undefined si tableau vide', () => {
    expect(buildAccessibilityInfo([])).toBeUndefined();
  });

  it('retourne undefined si undefined', () => {
    expect(buildAccessibilityInfo(undefined)).toBeUndefined();
  });
});

describe('mapLinkedRow', () => {
  it('mappe les lignes liées en utilisant la map de ligne', () => {
    const linkedTableRowMap = new Map<string, LinkedTableRow>([
      ['1', { id: '1', name: 'Partner 1', logoUrl: 'logo1.png' }],
      ['2', { id: '2', name: 'Partner 2', logoUrl: 'logo2.png' }],
    ]);
    const record = {
      id: 1,
      Partenaires: [
        { id: 1, value: 'Partner 1' },
        { id: 2, value: 'Partner 2' },
      ],
    } as BaserowRecord;
    const result = mapLinkedRow(record, 'Partenaires', linkedTableRowMap);
    expect(result).toEqual([
      { id: '1', name: 'Partner 1', logoUrl: 'logo1.png' },
      { id: '2', name: 'Partner 2', logoUrl: 'logo2.png' },
    ]);
  });

  it('retourne un tableau vide si pas de lignes liées', () => {
    const linkedTableRowMap = new Map<string, LinkedTableRow>([
      ['1', { id: '1', name: 'Partner 1', logoUrl: 'logo1.png' }],
    ]);
    const record = {
      id: 1,
      Partenaires: [],
    } as BaserowRecord;
    const result = mapLinkedRow(record, 'Partenaires', linkedTableRowMap);
    expect(result).toEqual([]);
  });

  it('filtre les lignes liées non trouvées', () => {
    const linkedTableRowMap = new Map<string, LinkedTableRow>([
      ['1', { id: '1', name: 'Partner 1', logoUrl: 'logo1.png' }],
    ]);
    const record = {
      id: 1,
      Partenaires: [
        { id: 1, value: 'Partner 1' },
        { id: 999, value: 'Partner Not Found' },
      ],
    } as BaserowRecord;
    const result = mapLinkedRow(record, 'Partenaires', linkedTableRowMap);
    expect(result).toEqual([
      { id: '1', name: 'Partner 1', logoUrl: 'logo1.png' },
    ]);
  });

  it('retourne un tableau vide si champ indéfini', () => {
    const linkedTableRowMap = new Map<string, LinkedTableRow>([
      ['1', { id: '1', name: 'Partner 1', logoUrl: 'logo1.png' }],
    ]);
    const record = {} as BaserowRecord;
    const result = mapLinkedRow(record, 'Partenaires', linkedTableRowMap);
    expect(result).toEqual([]);
  });
});
