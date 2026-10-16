import { describe, it, expect } from 'vitest';
import { buildHelpers } from './useConfig';
import type { AppConfig } from '@/types/event';

function makeConfig(app: Partial<AppConfig['app']>): AppConfig {
  return {
    profile: 'test',
    app: {
      name: 'Événement de test',
      shortName: 'EDT',
      description: '',
      eventDates: { weekStart: '2027-03-01', weekEnd: '2027-03-07' },
      ...app,
    },
  } as AppConfig;
}

describe('buildHelpers().getEditionBadge', () => {
  it("combine le nom court et l'année de début de la config", () => {
    expect(buildHelpers(makeConfig({})).getEditionBadge()).toBe('EDT 2027');
  });

  it('suit la config : un autre nom court et d’autres dates donnent un autre badge', () => {
    const config = makeConfig({
      shortName: 'JDT',
      eventDates: { weekStart: '2026-11-10', weekEnd: '2026-11-16' },
    });
    expect(buildHelpers(config).getEditionBadge()).toBe('JDT 2026');
  });

  it("n'affiche que le nom court si les dates sont absentes ou invalides", () => {
    expect(
      buildHelpers(makeConfig({ eventDates: undefined as never })).getEditionBadge(),
    ).toBe('EDT');
    expect(
      buildHelpers(
        makeConfig({ eventDates: { weekStart: 'pas-une-date', weekEnd: '' } }),
      ).getEditionBadge(),
    ).toBe('EDT');
  });

  it("n'affiche que l'année si le nom court est vide", () => {
    expect(buildHelpers(makeConfig({ shortName: ' ' })).getEditionBadge()).toBe('2027');
  });

  it("retourne une chaîne vide sans config (jamais « undefined »)", () => {
    expect(buildHelpers(null).getEditionBadge()).toBe('');
  });
});
