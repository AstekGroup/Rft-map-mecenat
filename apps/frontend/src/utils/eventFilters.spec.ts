import { describe, expect, it } from 'vitest';
import type { EventFilters } from '@/hooks/useEvents';
import { countActiveFilters } from './eventFilters';

const defaultFilters: EventFilters = {
  search: '',
  dateFilter: 'all',
  dateFrom: '',
  dateTo: '',
  regions: [],
  types: [],
  themes: [],
  partners: [],
  audiences: [],
  postalCode: '',
  modality: 'all',
  showPastEvents: false,
};

describe('countActiveFilters', () => {
  it('returns zero when filters are at their default values', () => {
    expect(countActiveFilters(defaultFilters)).toBe(0);
  });

  it('counts selected values and each active scalar filter', () => {
    expect(countActiveFilters({
      ...defaultFilters,
      search: 'festival',
      postalCode: '75001',
      regions: ['Bretagne', 'Normandie'],
      types: ['atelier'],
      themes: ['cuisine'],
      partners: ['partner-1'],
      audiences: ['families'],
      dateFilter: 'during-week',
      modality: 'presentiel',
      showPastEvents: true,
    })).toBe(11);
  });
});