import {
  mapThemes,
  mapFormat,
  mapTargetAudience,
  mapModality,
  extractImageUrl,
  computeIsDuringWeek,
  parseAirtableDateTime,
  buildOrganizerContact,
  buildAccessibilityInfo,
} from './airtable-mapping.util';

describe('mapThemes', () => {
  it('mappe les thèmes exacts', () => {
    const result = mapThemes(['Cuisine végétale', 'Agriculture']);
    expect(result).toEqual(['cuisine-vegetale', 'agriculture']);
  });

  it('fait une correspondance floue (heuristique)', () => {
    expect(mapThemes(['Découverte culinaire', 'Agroécologie'])).toEqual([
      'cuisine-vegetale',
      'agriculture',
    ]);
    expect(mapThemes(['Nutrition santé', 'Climat'])).toEqual([
      'sante-nutrition',
      'climat-environnement',
    ]);
    expect(mapThemes(['Biodiversité locale'])).toEqual(['biodiversite']);
  });

  it('retourne "autre" pour des thèmes inconnus', () => {
    expect(mapThemes(['Thème mystère'])).toEqual(['autre']);
  });

  it('retourne ["autre"] si undefined ou vide', () => {
    expect(mapThemes(undefined)).toEqual(['autre']);
    expect(mapThemes([])).toEqual(['autre']);
  });

  it('supprime les doublons', () => {
    const result = mapThemes(['Cuisine végétale', 'Cuisine']);
    expect(result).toEqual(['cuisine-vegetale']);
  });
});

describe('mapFormat', () => {
  it('retourne la correspondance exacte', () => {
    const result = mapFormat('Conférence/webinaire/table-ronde');
    expect(result).toEqual({ format: 'conference', type: 'conference' });
  });

  it('retourne la correspondance exacte pour Atelier de cuisine', () => {
    expect(mapFormat('Atelier de cuisine')).toEqual({ format: 'atelier-cuisine', type: 'atelier-cuisine' });
  });

  it('retourne autre/autre pour une valeur inconnue', () => {
    expect(mapFormat('Format inconnu XYZ')).toEqual({ format: 'autre', type: 'autre' });
  });

  it('retourne autre/autre si undefined', () => {
    expect(mapFormat(undefined)).toEqual({ format: 'autre', type: 'autre' });
  });

  it('ne fait plus de correspondance floue (fuzzy) pour les anciens types', () => {
    const result = mapFormat('Atelier Cuisine');
    expect(result).toEqual({ format: 'autre', type: 'autre' });
  });

  it('mappe Festival correctement', () => {
    expect(mapFormat('Festival')).toEqual({ format: 'festival', type: 'festival' });
  });

  it('mappe Visite de jardin / potager ou cueillette vers type visite-jardin', () => {
    expect(mapFormat('Visite de jardin / potager ou cueillette')).toEqual({
      format: 'visite-jardin',
      type: 'visite-jardin',
    });
  });
});

describe('mapTargetAudience', () => {
  it('mappe "Tout public" correctement', () => {
    expect(mapTargetAudience(['Tout public'])).toEqual(['tout-public']);
  });

  it('mappe plusieurs publics valides', () => {
    const result = mapTargetAudience(['Scolaire', 'Professionnels']);
    expect(result).toEqual(['scolaires', 'professionnels']);
  });

  it('retourne tout-public si tableau vide', () => {
    expect(mapTargetAudience([])).toEqual(['tout-public']);
  });

  it('retourne tout-public si undefined', () => {
    expect(mapTargetAudience(undefined)).toEqual(['tout-public']);
  });

  it('fait une correspondance floue pour scolaires', () => {
    const result = mapTargetAudience(['Écoliers / Étudiants']);
    expect(result).toEqual(['scolaires']);
  });

  it('retourne tout-public si aucun mappage trouvé (ex: anciens types)', () => {
    expect(mapTargetAudience(['Inconnu XYZ', 'Jeunes', 'Seniors'])).toEqual(['tout-public']);
  });

  it('mappe les familles et enfants', () => {
    expect(mapTargetAudience(["Familles"])).toEqual(['familles-enfants']);
    expect(mapTargetAudience(["Enfants"])).toEqual(['familles-enfants']);
  });

  it('mappe les salariés', () => {
    expect(mapTargetAudience(["Salariés d'une entreprise"])).toEqual(['salaries-entreprise']);
  });
});

describe('mapModality', () => {
  it('mappe Présentiel', () => {
    expect(mapModality('Présentiel')).toBe('presentiel');
  });

  it('mappe Distanciel', () => {
    expect(mapModality('Distanciel')).toBe('distanciel');
  });

  it('mappe En ligne vers distanciel', () => {
    expect(mapModality('En ligne')).toBe('distanciel');
  });

  it('mappe Hybride vers présentiel', () => {
    expect(mapModality('Hybride')).toBe('presentiel');
  });

  it('retourne presentiel par défaut si undefined', () => {
    expect(mapModality(undefined)).toBe('presentiel');
  });

  it('fait une correspondance floue pour visio', () => {
    expect(mapModality('Réunion en visio')).toBe('distanciel');
  });
});

describe('extractImageUrl', () => {
  it('retourne undefined si pas de pièces jointes', () => {
    expect(extractImageUrl(undefined)).toBeUndefined();
    expect(extractImageUrl([])).toBeUndefined();
  });

  it('retourne le thumbnail large si disponible', () => {
    const attachments = [{
      id: 'att1',
      url: 'https://example.com/original.jpg',
      filename: 'image.jpg',
      size: 12345,
      type: 'image/jpeg',
      thumbnails: {
        large: { url: 'https://example.com/large.jpg', width: 800, height: 600 },
      },
    }];
    expect(extractImageUrl(attachments)).toBe('https://example.com/large.jpg');
  });

  it('retourne l\'URL directe si pas de thumbnail', () => {
    const attachments = [{
      id: 'att1',
      url: 'https://example.com/image.jpg',
      filename: 'image.jpg',
      size: 12345,
      type: 'image/jpeg',
    }];
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

describe('parseAirtableDateTime', () => {
  it('retourne des chaînes vides si undefined', () => {
    expect(parseAirtableDateTime(undefined)).toEqual({ date: '', time: '' });
  });

  it('parse une date ISO valide', () => {
    const result = parseAirtableDateTime('2026-05-20T14:00:00.000Z');
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('retourne des chaînes vides pour une date invalide', () => {
    expect(parseAirtableDateTime('not-a-date')).toEqual({ date: '', time: '' });
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
    expect(buildAccessibilityInfo(['Rampe d\'accès', 'Ascenseur'])).toBe("Rampe d'accès, Ascenseur");
  });

  it('retourne undefined si tableau vide', () => {
    expect(buildAccessibilityInfo([])).toBeUndefined();
  });

  it('retourne undefined si undefined', () => {
    expect(buildAccessibilityInfo(undefined)).toBeUndefined();
  });
});
