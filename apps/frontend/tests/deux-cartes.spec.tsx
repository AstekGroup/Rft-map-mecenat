/**
 * « 1 code, N cartes » côté frontend : le même `ConfigProvider` est rendu avec deux configs de
 * carte réelles (la config du dépôt et la fixture « seconde carte »), servies comme le fait
 * `/api/config` (gabarits résolus par le backend). Titres, dates et thème doivent suivre la
 * config, sans rien de la première carte dans la seconde.
 *
 * Ce fichier vit hors de `src/` (comme `scripts/config-template.spec.ts`) parce qu'il importe
 * du code backend ; `tsc -b` ne compile que `src/`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen } from '@testing-library/react';
import type { AppConfig } from '@make-map/types';
import { ConfigProvider } from '@/components/Layout/ConfigProvider';
import { buildHelpers, useConfig } from '@/hooks/useConfig';
import { fetchConfig } from '@/services/api';
import type { EventFilters } from '@/hooks/useEvents';
import type { Event } from '@/types/event';
import { matchesFilters } from '@/utils/eventFilters';
import { countDefinedFilters, getVisibleFilters } from '@/utils/filterDefinitions';
import { resolveConfigTemplates } from '../../backend/src/config/config-template.util';

vi.mock('@/services/api', () => ({ fetchConfig: vi.fn() }));
const ROOT = resolve(__dirname, '../../..');
const MAPS = [
  { label: 'carte du dépôt', file: 'app.config.json' },
  { label: 'seconde carte', file: 'docs/audit/fixtures/app.config.second-map.json' },
] as const;

/** Config telle que la sert `/api/config` : lue dans le fichier, gabarits résolus. */
function served(file: string): AppConfig {
  const raw = JSON.parse(readFileSync(resolve(ROOT, file), 'utf8'));
  return resolveConfigTemplates(raw) as AppConfig;
}

/** Conversion de référence, écrite indépendamment du code testé. */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Affiche le nom de l'événement tel que le donne la config (rien tant qu'elle charge). */
function EventNameProbe() {
  const { helpers, loading } = useConfig();
  return loading ? null : <h1>{helpers.getEventName()}</h1>;
}

async function renderConfig(file: string): Promise<{ config: AppConfig; text: string }> {
  const config = served(file);
  vi.mocked(fetchConfig).mockResolvedValue(config);
  render(
    <ConfigProvider>
      <EventNameProbe />
    </ConfigProvider>,
  );
  await screen.findByRole('heading', { level: 1 });
  return { config, text: document.body.textContent ?? '' };
}

function resetTheme() {
  const root = document.documentElement;
  root.removeAttribute('style');
  document.querySelectorAll('link[data-config-fonts]').forEach((el) => el.remove());
}

describe('deux cartes, un seul code (frontend)', () => {
  beforeEach(resetTheme);
  afterEach(resetTheme);

  describe.each(MAPS)('$label', ({ file }) => {
    it("affiche le nom de l'événement de sa config", async () => {
      const { config } = await renderConfig(file);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(config.app.name);
    });

    it('injecte le thème (couleurs, polices) de sa config', async () => {
      const { config } = await renderConfig(file);
      const root = document.documentElement.style;

      for (const [key, hex] of Object.entries(config.theme.colors)) {
        expect(root.getPropertyValue(`--color-${key}-rgb`)).toBe(rgb(hex));
      }
      expect(root.getPropertyValue('--font-heading')).toBe(config.theme.fonts.heading);
      expect(root.getPropertyValue('--font-body')).toBe(config.theme.fonts.body);
      const link = document.querySelector('link[data-config-fonts]');
      expect(link?.getAttribute('href')).toBe(config.theme.fonts.googleFontsUrl);
    });

    it("donne le badge et les libellés de période à partir du nom et de l'année", () => {
      const config = served(file);
      const helpers = buildHelpers(config);
      const year = config.app.eventDates.weekStart.slice(0, 4);

      expect(helpers.getEditionBadge()).toBe(`${config.app.shortName} ${year}`);
      const duringWeek = helpers.getDateFilterModes().find((m) => m.mode === 'during-week');
      expect(duringWeek?.label).toContain(config.app.name);
    });
  });

  describe('coup de cœur (rôle optionnel fieldMapping.highlight)', () => {
    const noFilters: EventFilters = {
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
      showPastEvents: true,
      highlightOnly: false,
    };
    const references = { partners: [], formats: [], themes: [], publics: [] };

    /** Événements tels que les sert le backend : coup de cœur seulement si la config déclare le rôle. */
    function eventsFor(config: AppConfig): Event[] {
      const enabled = Boolean(config.baserow.fieldMapping.highlight);
      const base = {
        description: '',
        time: '10:00',
        address: '',
        city: 'Nantes',
        region: 'Pays de la Loire',
        department: '',
        postalCode: '44000',
        latitude: 47.2,
        longitude: -1.5,
        themes: [],
        organizer: 'Structure',
        isDuringWeek: true,
        modality: 'presentiel' as const,
        targetAudience: [],
        isFree: true,
        date: config.app.eventDates.weekStart,
      };
      return [
        { ...base, id: 'a', title: 'A', isHighlighted: enabled },
        { ...base, id: 'b', title: 'B', isHighlighted: false },
      ];
    }

    it('est actif sur la carte du dépôt : filtre proposé, seuls les coups de cœur restent', () => {
      const config = served(MAPS[0].file);
      const events = eventsFor(config);

      expect(config.baserow.fieldMapping.highlight).toBeTruthy();
      expect(events.some((e) => e.isHighlighted)).toBe(true);
      expect(
        getVisibleFilters(noFilters, references, [], undefined, true).map((d) => d.id),
      ).toContain('highlight');
      const today = new Date('2000-01-01T00:00:00');
      expect(
        events
          .filter((e) => matchesFilters(e, { ...noFilters, highlightOnly: true }, today))
          .map((e) => e.id),
      ).toEqual(['a']);
    });

    it('est inactif sur la seconde carte (rôle absent) : aucun filtre, aucun badge, rien ne plante', () => {
      const config = served(MAPS[1].file);
      const events = eventsFor(config);

      expect(config.baserow.fieldMapping.highlight).toBeUndefined();
      expect(events.some((e) => e.isHighlighted)).toBe(false);
      // Le filtre se masque de lui-même : l'interface déduit son affichage des événements.
      expect(
        getVisibleFilters(noFilters, references, [], undefined, events.some((e) => e.isHighlighted)).map((d) => d.id),
      ).not.toContain('highlight');
      expect(countDefinedFilters(noFilters)).toBe(0);
    });
  });

  it('ne laisse rien de la première carte dans la seconde', async () => {
    const first = served(MAPS[0].file);
    const { config: second, text } = await renderConfig(MAPS[1].file);

    expect(first.app.name).not.toBe(second.app.name);
    expect(text).not.toContain(first.app.name);
    expect(text).not.toContain(first.app.shortName);
    expect(text).not.toMatch(/lgsv|grande semaine/i);
    expect(document.documentElement.style.getPropertyValue('--color-primary-rgb')).not.toBe(
      rgb(first.theme.colors.primary),
    );
    expect(buildHelpers(second).getEditionBadge()).not.toContain(first.app.shortName);
  });
});
