import { describe, expect, it } from 'vitest';
import { normalizeForSearch } from './searchText';

describe('normalizeForSearch', () => {
  it('passe en minuscules', () => {
    expect(normalizeForSearch('PartenAire')).toBe('partenaire');
  });

  it('supprime les accents et diacritiques', () => {
    expect(normalizeForSearch('Végétal, Café & Thé')).toBe('vegetal, cafe & the');
    expect(normalizeForSearch('Æther Œuvre')).toBe('æther œuvre');
  });

  it('laisse un texte déjà normalisé inchangé', () => {
    expect(normalizeForSearch('partenaire 2026')).toBe('partenaire 2026');
  });
});
