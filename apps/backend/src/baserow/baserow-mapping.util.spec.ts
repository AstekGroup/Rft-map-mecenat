import {
  mapLinkedRow,
  mapModality,
  isFreeTariff,
  mapReferenceRecord,
  extractImageUrl,
  computeIsDuringWeek,
  parseDateTime,
  isEndBeforeStart,
  parseCapacity,
  buildOrganizerContact,
  buildAccessibilityInfo,
} from './baserow-mapping.util';
import { BaserowAttachment, type BaserowRecord } from './baserow.types';
import type {
  BaserowReferenceFields,
  EventModality,
  LinkedTableRow,
} from '@make-map/types';

describe('mapModality', () => {
  // Valeurs de la liste de choix : elles viennent de la config (`baserow.mapping.modality`).
  const MODALITY_MAP: Record<string, EventModality> = {
    'Sur place': 'presentiel',
    'À distance': 'distanciel',
    Mixte: 'presentiel',
  };

  it('traduit les valeurs de la config', () => {
    expect(mapModality({ id: 1, value: 'Sur place' }, MODALITY_MAP)).toBe(
      'presentiel',
    );
    expect(mapModality({ id: 1, value: 'À distance' }, MODALITY_MAP)).toBe(
      'distanciel',
    );
    expect(mapModality({ id: 1, value: 'Mixte' }, MODALITY_MAP)).toBe(
      'presentiel',
    );
  });

  it('ne reconnaît pas une valeur absente de la config, la signale et retombe sur présentiel', () => {
    const onUnmapped = jest.fn();
    expect(
      mapModality({ id: 1, value: 'Présentiel' }, MODALITY_MAP, onUnmapped),
    ).toBe('presentiel');
    expect(onUnmapped).toHaveBeenCalledWith('Présentiel');
  });

  it('retourne presentiel sans signalement si le champ est vide', () => {
    const onUnmapped = jest.fn();
    expect(mapModality(undefined, MODALITY_MAP, onUnmapped)).toBe('presentiel');
    expect(onUnmapped).not.toHaveBeenCalled();
  });
});

describe('isFreeTariff', () => {
  it('est gratuit si le tarif porte la valeur « gratuit » de la config', () => {
    expect(isFreeTariff({ id: 1, value: 'Offert' }, 12, 'Offert')).toBe(true);
  });

  it("est gratuit s'il n'y a pas de montant", () => {
    expect(isFreeTariff(undefined, undefined, 'Offert')).toBe(true);
    expect(isFreeTariff({ id: 2, value: 'Payant' }, 0, 'Offert')).toBe(true);
  });

  it('est payant si le tarif est autre et que le montant est renseigné', () => {
    expect(isFreeTariff({ id: 2, value: 'Payant' }, 15, 'Offert')).toBe(false);
  });
});

describe('mapReferenceRecord', () => {
  const FIELDS: BaserowReferenceFields = {
    name: 'Libellé',
    logo: 'Image',
    picto: 'Icône',
    color: 'Teinte',
  };

  it('lit les colonnes indiquées par la config', () => {
    const row = mapReferenceRecord(
      {
        id: 7,
        Libellé: 'Festival',
        Icône: [{ id: 1, value: 'PartyPopper' }],
        Teinte: [{ id: 2, value: '#E74C8C' }],
      },
      FIELDS,
    );
    expect(row).toEqual({
      id: '7',
      name: 'Festival',
      logoUrl: undefined,
      pictoName: 'PartyPopper',
      colorHexa: '#E74C8C',
    });
  });

  it("ignore les colonnes aux noms par défaut quand la config en désigne d'autres", () => {
    const row = mapReferenceRecord(
      { id: 1, Nom: 'Ancien nom', Libellé: 'Nouveau nom' },
      FIELDS,
    );
    expect(row.name).toBe('Nouveau nom');
  });

  it('retourne un nom vide si la colonne du nom est absente', () => {
    expect(mapReferenceRecord({ id: 3, Nom: 'Perdu' }, FIELDS).name).toBe('');
  });

  it('extrait le logo de la colonne configurée', () => {
    const row = mapReferenceRecord(
      {
        id: 4,
        Libellé: 'Partenaire',
        Image: [{ url: 'https://example.com/logo.png', filename: 'logo.png' }],
      },
      FIELDS,
    );
    expect(row.logoUrl).toBe('https://example.com/logo.png');
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
  const START = '2026-09-25';
  const END = '2026-10-04';

  // Heures locales (sans « Z ») : le jour calendaire ne dépend pas du fuseau de la machine.
  const during = (start: string | undefined, end?: string) =>
    computeIsDuringWeek(start, end, START, END);

  it('retourne true pour une date dans la période de la config', () => {
    expect(during('2026-09-25T10:00:00')).toBe(true);
    expect(during('2026-09-30T14:00:00')).toBe(true);
    expect(during('2026-10-04T20:00:00')).toBe(true);
  });

  it('retourne false pour une date avant la période', () => {
    expect(during('2026-09-24T23:30:00')).toBe(false);
  });

  it('retourne false pour une date après la période', () => {
    expect(during('2026-10-05T00:30:00')).toBe(false);
  });

  it('retourne false si undefined ou illisible', () => {
    expect(during(undefined)).toBe(false);
    expect(during('pas-une-date')).toBe(false);
  });

  it('compte un événement qui commence avant la période et la recoupe (recoupement, pas début seul)', () => {
    expect(during('2026-09-20T10:00:00', '2026-09-26T18:00:00')).toBe(true);
  });

  it('compte un événement qui commence dans la période et se termine après', () => {
    expect(during('2026-10-03T10:00:00', '2026-10-10T18:00:00')).toBe(true);
  });

  it('compte un événement qui englobe toute la période', () => {
    expect(during('2026-09-01T10:00:00', '2026-11-01T18:00:00')).toBe(true);
  });

  it('ne compte pas un événement entièrement avant ou après la période', () => {
    expect(during('2026-09-10T10:00:00', '2026-09-24T18:00:00')).toBe(false);
    expect(during('2026-10-05T10:00:00', '2026-10-08T18:00:00')).toBe(false);
  });

  it('compte un événement qui se termine le premier jour de la période, et un qui commence le dernier', () => {
    expect(during('2026-09-24T10:00:00', '2026-09-25T09:00:00')).toBe(true);
    expect(during('2026-10-04T23:00:00', '2026-10-05T08:00:00')).toBe(true);
  });

  it('traite une fin avant le début comme un événement ponctuel (fin ignorée)', () => {
    // Début avant la période, « fin » encore plus tôt : seul le début compte.
    expect(during('2026-09-20T10:00:00', '2026-09-18T10:00:00')).toBe(false);
    // Début dans la période, « fin » avant la période : seul le début compte, l'événement est dedans.
    expect(during('2026-09-30T10:00:00', '2026-09-10T10:00:00')).toBe(true);
    // Début après la période, « fin » dans la période : la fin invalide ne le fait pas entrer.
    expect(during('2026-10-10T10:00:00', '2026-09-28T10:00:00')).toBe(false);
  });

  it('ignore une date de fin illisible', () => {
    expect(during('2026-09-30T10:00:00', 'pas-une-date')).toBe(true);
    expect(during('2026-09-10T10:00:00', 'pas-une-date')).toBe(false);
  });

  it("suit les dates de la config (une autre carte, d'autres dates)", () => {
    expect(
      computeIsDuringWeek(
        '2026-11-12T10:00:00',
        undefined,
        '2026-11-10',
        '2026-11-16',
      ),
    ).toBe(true);
    expect(
      computeIsDuringWeek(
        '2026-09-30T10:00:00',
        undefined,
        '2026-11-10',
        '2026-11-16',
      ),
    ).toBe(false);
  });

  it('lève une erreur claire si les dates de la config manquent (pas de repli)', () => {
    expect(() =>
      computeIsDuringWeek(
        '2026-09-30T10:00:00',
        undefined,
        undefined,
        undefined,
      ),
    ).toThrow(/app\.eventDates\.weekStart/);
    expect(() =>
      computeIsDuringWeek('2026-09-30T10:00:00', undefined, START, ''),
    ).toThrow(/app\.eventDates\.weekEnd/);
  });

  it("lève l'erreur même pour un événement sans date (la config est en cause, pas la donnée)", () => {
    expect(() =>
      computeIsDuringWeek(undefined, undefined, undefined, undefined),
    ).toThrow(/app\.eventDates/);
  });

  it('lève une erreur claire si une date de la config est invalide', () => {
    expect(() =>
      computeIsDuringWeek(
        '2026-09-30T10:00:00',
        undefined,
        'pas-une-date',
        END,
      ),
    ).toThrow(/AAAA-MM-JJ/);
    expect(() =>
      computeIsDuringWeek(
        '2026-09-30T10:00:00',
        undefined,
        START,
        '2026-13-45',
      ),
    ).toThrow(/AAAA-MM-JJ/);
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

  it('lit la date et l’heure dans le même fuseau (Paris), quel que soit celui du serveur', () => {
    // 22h30 UTC le 21/09 = 00h30 à Paris le 22/09 (cas E27 du jeu de test).
    expect(parseDateTime('2026-09-21T22:30:00Z')).toEqual({
      date: '2026-09-22',
      time: '00:30',
    });
    // Heure d'hiver : 23h30 UTC = 00h30 à Paris le lendemain.
    expect(parseDateTime('2026-12-31T23:30:00Z')).toEqual({
      date: '2027-01-01',
      time: '00:30',
    });
    // En journée, la date ne change pas.
    expect(parseDateTime('2026-09-21T10:00:00Z')).toEqual({
      date: '2026-09-21',
      time: '12:00',
    });
  });
});

describe('isEndBeforeStart', () => {
  it('détecte une fin antérieure au début (jour ou heure)', () => {
    expect(
      isEndBeforeStart('2026-09-25T18:00:00Z', '2026-09-24T09:00:00Z'),
    ).toBe(true);
    expect(
      isEndBeforeStart('2026-09-25T18:00:00Z', '2026-09-25T09:00:00Z'),
    ).toBe(true);
  });

  it('accepte une fin égale ou postérieure', () => {
    expect(
      isEndBeforeStart('2026-09-25T09:00:00Z', '2026-09-25T09:00:00Z'),
    ).toBe(false);
    expect(
      isEndBeforeStart('2026-09-25T09:00:00Z', '2026-09-26T09:00:00Z'),
    ).toBe(false);
  });

  it("ne conclut rien si une des dates manque ou n'est pas valide", () => {
    expect(isEndBeforeStart(undefined, '2026-09-24T09:00:00Z')).toBe(false);
    expect(isEndBeforeStart('2026-09-25T09:00:00Z', undefined)).toBe(false);
    expect(isEndBeforeStart('2026-09-25T09:00:00Z', 'n’importe quoi')).toBe(
      false,
    );
  });
});

describe('parseCapacity', () => {
  it('garde un entier strictement positif, nombre ou texte numérique', () => {
    expect(parseCapacity(40)).toBe(40);
    expect(parseCapacity('40')).toBe(40);
    expect(parseCapacity(' 12 ')).toBe(12);
  });

  it('traite 0, vide, négatif, décimal et texte comme « non renseignée »', () => {
    for (const value of [0, '0', '', null, undefined, -3, 2.5, 'illimité', '12 places', NaN]) {
      expect(parseCapacity(value)).toBeUndefined();
    }
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
