import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../tailwind.config';

/**
 * Sans thème injecté (config non chargée, page d'erreur), seules les valeurs par défaut de
 * `globals.css` s'appliquent. Elles doivent exister pour chaque variable lue par Tailwind, être
 * neutres (aucune couleur de marque) et rester lisibles (contraste suffisant).
 */

const css = readFileSync(resolve(__dirname, 'globals.css'), 'utf8');
const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';

function defaults(): Record<string, [number, number, number]> {
  const vars: Record<string, [number, number, number]> = {};
  for (const m of rootBlock.matchAll(/(--color-[a-z-]+-rgb):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
    vars[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return vars;
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('thème par défaut (config non chargée)', () => {
  const vars = defaults();

  it('définit chaque variable de couleur lue par Tailwind, sans valeur de repli dupliquée', () => {
    const colors = JSON.stringify(tailwindConfig.theme.extend.colors);
    const used = [...colors.matchAll(/var\((--color-[a-z-]+-rgb)([^)]*)\)/g)];
    expect(used.length).toBeGreaterThan(0);
    for (const [, name, fallback] of used) {
      expect(vars[name], `${name} manque dans :root`).toBeDefined();
      expect(fallback, `${name} : repli dupliqué dans tailwind.config.ts`).toBe('');
    }
  });

  it("n'utilise plus la palette de marque d'origine (vert)", () => {
    const [r, g, b] = vars['--color-primary-rgb'];
    expect(g > r && g > b, 'primary ne doit pas être vert').toBe(false);
  });

  it('reste lisible : texte sur fond de page, texte clair sur la couleur primaire', () => {
    expect(contrast(vars['--color-text-primary-rgb'], vars['--color-surface-offwhite-rgb'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars['--color-text-light-rgb'], vars['--color-primary-rgb'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars['--color-primary-dark-rgb'], vars['--color-surface-beige-rgb'])).toBeGreaterThanOrEqual(4.5);
  });
});
