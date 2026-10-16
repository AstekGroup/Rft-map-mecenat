import { describe, it, expect } from 'vitest';
import {
  eventIntersectsYmdRange,
  formatFrDateRangeLabel,
  isDateFilterActive,
  isEventOver,
  toLocalYmd,
  toYmd,
} from './eventDateRange';

describe('toLocalYmd', () => {
  it('donne le jour calendaire local, avec zéros de remplissage', () => {
    expect(toLocalYmd(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalYmd(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
});

describe('isEventOver', () => {
  const weekEnd = '2026-09-27';

  it("est faux avant la fin et pendant la dernière journée de l'événement", () => {
    expect(isEventOver(weekEnd, new Date(2026, 8, 20, 10, 0))).toBe(false);
    expect(isEventOver(weekEnd, new Date(2026, 8, 27, 23, 59))).toBe(false);
  });

  it("est vrai dès le lendemain de la dernière journée", () => {
    expect(isEventOver(weekEnd, new Date(2026, 8, 28, 0, 0))).toBe(true);
    expect(isEventOver(weekEnd, new Date(2027, 2, 1, 12, 0))).toBe(true);
  });

  it("est faux (on ne devine rien) quand la date de fin manque ou est illisible", () => {
    expect(isEventOver(undefined, new Date(2030, 0, 1))).toBe(false);
    expect(isEventOver('', new Date(2030, 0, 1))).toBe(false);
    expect(isEventOver('bientôt', new Date(2030, 0, 1))).toBe(false);
  });
});

describe('toYmd', () => {
  it('tronque une ISO à 10 caractères', () => {
    expect(toYmd('2026-05-20T14:00:00.000Z')).toBe('2026-05-20');
  });
});

describe('eventIntersectsYmdRange', () => {
  it('inclut un événement d’un jour dans une plage d’un jour', () => {
    expect(
      eventIntersectsYmdRange({ date: '2026-05-20', endDate: undefined }, '2026-05-20', '2026-05-20'),
    ).toBe(true);
  });

  it('exclut si hors plage', () => {
    expect(
      eventIntersectsYmdRange({ date: '2026-05-10' }, '2026-05-15', '2026-05-20'),
    ).toBe(false);
  });

  it('intersecte une plage multi-jours événement', () => {
    expect(
      eventIntersectsYmdRange(
        { date: '2026-05-18', endDate: '2026-05-22' },
        '2026-05-20',
        '2026-05-25',
      ),
    ).toBe(true);
  });
});

describe('isDateFilterActive', () => {
    it('custom sans dateFrom est inactif', () => {
      expect(isDateFilterActive('custom', '')).toBe(false);
    });

    it('custom avec dateFrom est actif', () => {
      expect(isDateFilterActive('custom', '2026-05-20')).toBe(true);
    });

    it('during-week est actif', () => {
      expect(isDateFilterActive('during-week', '')).toBe(true);
    });

    it('all est inactif', () => {
      expect(isDateFilterActive('all', '')).toBe(false);
    });
  });

describe('formatFrDateRangeLabel', () => {
  it('affiche une seule date si fin absente (sans flèche)', () => {
    const s = formatFrDateRangeLabel('2026-05-20', '');
    expect(s.length).toBeGreaterThan(4);
    expect(s).not.toContain('→');
  });

  it('affiche une plage avec flèche si deux dates distinctes', () => {
    const s = formatFrDateRangeLabel('2026-05-18', '2026-05-24');
    expect(s).toContain('→');
  });
});
