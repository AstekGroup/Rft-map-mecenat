import { describe, it, expect } from 'vitest';
import { formatEventDate } from './formatEventDate';

describe('formatEventDate', () => {
  it('formate une date AAAA-MM-JJ en français', () => {
    expect(formatEventDate('2026-09-25', { day: 'numeric', month: 'long' })).toBe(
      '25 septembre',
    );
    expect(
      formatEventDate('2026-09-25', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    ).toBe('vendredi 25 septembre 2026');
  });

  it('ne décale pas le jour (lecture à midi, pas à minuit UTC)', () => {
    expect(formatEventDate('2026-01-01', { day: '2-digit', month: '2-digit' })).toBe(
      '01/01',
    );
  });

  it("renvoie une chaîne vide, jamais « Invalid Date », si la date manque ou est illisible", () => {
    for (const value of [undefined, '', 'pas une date', '2026-13-45', '25/09/2026']) {
      expect(formatEventDate(value, { day: 'numeric', month: 'long' })).toBe('');
    }
  });
});
