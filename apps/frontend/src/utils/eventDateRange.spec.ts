import { describe, it, expect } from 'vitest';
import {
  eventIntersectsYmdRange,
  formatFrDateRangeLabel,
  isDateFilterActive,
  toYmd,
} from './eventDateRange';

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
