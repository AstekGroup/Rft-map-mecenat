/**
 * « 1 code, N cartes » côté frontend : la même page d'accueil et le même `ConfigProvider` sont
 * rendus avec deux configs de carte réelles (la config du dépôt et la fixture « seconde
 * carte »), servies comme le fait `/api/config` (gabarits résolus par le backend). Titres,
 * dates et thème doivent suivre la config, sans rien de la première carte dans la seconde.
 *
 * Ce fichier vit hors de `src/` (comme `scripts/config-template.spec.ts`) parce qu'il importe
 * du code backend ; `tsc -b` ne compile que `src/`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AppConfig } from '@make-map/types';
import { ConfigProvider } from '@/components/Layout/ConfigProvider';
import { buildHelpers } from '@/hooks/useConfig';
import { fetchConfig } from '@/services/api';
import { HomePage } from '@/pages/HomePage';
import { Badge } from '@/components/UI/Badge';
import tailwindConfig from '../tailwind.config';
import { resolveConfigTemplates } from '../../backend/src/config/config-template.util';

vi.mock('@/services/api', () => ({ fetchConfig: vi.fn() }));
vi.mock('@/hooks', () => ({
  useEvents: () => ({ allEvents: [], loading: false }),
}));

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

async function renderHome(file: string): Promise<{ config: AppConfig; text: string }> {
  const config = served(file);
  vi.mocked(fetchConfig).mockResolvedValue(config);
  render(
    <ConfigProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
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
    it("affiche le nom de l'événement et l'édition de sa config", async () => {
      const { config } = await renderHome(file);
      const year = config.app.eventDates.weekStart.slice(0, 4);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(config.app.name);
      expect(document.body.textContent).toContain(`${config.texts.home.editionLabel} ${year}`);
      expect(document.body.textContent).toContain(config.texts.home.mainDescription);
      expect(screen.getByRole('link', { name: new RegExp(config.texts.home.ctaText) })).toBeTruthy();
    });

    it('injecte le thème (couleurs, polices) de sa config', async () => {
      const { config } = await renderHome(file);
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

  describe('badge de format (variante « highlight »)', () => {
    const format = { id: '1', name: 'Atelier', colorHexa: '#123456' };

    /** Nom de la variable CSS que lit la classe Tailwind `primary-dark` (config Tailwind réelle). */
    function primaryDarkVariable(): string {
      const value = tailwindConfig.theme.extend.colors.primary.dark;
      const match = /var\((--[a-z-]+)/.exec(value);
      if (!match) throw new Error(`Variable CSS introuvable dans « ${value} »`);
      return match[1];
    }

    async function renderBadge(file: string) {
      const config = served(file);
      vi.mocked(fetchConfig).mockResolvedValue(config);
      render(
        <ConfigProvider>
          <Badge type={format} variant="highlight" />
        </ConfigProvider>,
      );
      const badge = await screen.findByText(format.name);
      // Attend l'injection du thème (faite après la résolution de `fetchConfig`).
      await waitFor(() =>
        expect(document.documentElement.style.getPropertyValue('--color-primary-dark-rgb')).not.toBe(''),
      );
      return { config, badge };
    }

    it.each(MAPS)('suit la couleur de thème de $label, sans couleur en dur', async ({ file }) => {
      const { config, badge } = await renderBadge(file);

      // Aucune couleur en ligne : tout passe par les classes Tailwind alimentées par le thème.
      expect(badge.getAttribute('style') ?? '').toBe('');
      expect(badge.className).toContain('text-primary-dark');
      expect(badge.className).toContain('bg-surface-beige');
      // La classe `text-primary-dark` lit la variable que le ConfigProvider a posée avec la config.
      expect(document.documentElement.style.getPropertyValue(primaryDarkVariable())).toBe(
        rgb(config.theme.colors['primary-dark']),
      );
    });

    it('ne reprend pas la couleur de thème de la première carte dans la seconde', async () => {
      const first = served(MAPS[0].file);
      const { config: second } = await renderBadge(MAPS[1].file);

      expect(first.theme.colors['primary-dark']).not.toBe(second.theme.colors['primary-dark']);
      expect(document.documentElement.style.getPropertyValue(primaryDarkVariable())).not.toBe(
        rgb(first.theme.colors['primary-dark']),
      );
    });
  });

  it('ne laisse rien de la première carte dans la seconde', async () => {
    const first = served(MAPS[0].file);
    const { config: second, text } = await renderHome(MAPS[1].file);

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
