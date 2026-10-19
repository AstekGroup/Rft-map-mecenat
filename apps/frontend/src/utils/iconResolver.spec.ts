import { describe, expect, it } from 'vitest';
import { ArrowDown01, Heart, PenTool, type LucideIcon } from 'lucide-react';
import { getIcon } from './iconResolver';

/** Icône de repli reconnaissable (distincte de toute icône Lucide réelle). */
const FALLBACK = (() => null) as unknown as LucideIcon;

describe('getIcon', () => {
  it('résout le nom exact de lucide-react (PascalCase)', () => {
    expect(getIcon('PenTool', FALLBACK)).toBe(PenTool);
  });

  it('résout le nom kebab-case copié depuis lucide.dev', () => {
    expect(getIcon('pen-tool', FALLBACK)).toBe(PenTool);
  });

  it('donne la même icône pour `pen-tool` et `PenTool`', () => {
    expect(getIcon('pen-tool', FALLBACK)).toBe(getIcon('PenTool', FALLBACK));
  });

  it('résout un nom d’un seul mot en minuscules', () => {
    expect(getIcon('heart', FALLBACK)).toBe(Heart);
  });

  it('résout un nom kebab-case avec chiffres (`arrow-down-0-1`)', () => {
    expect(getIcon('arrow-down-0-1', FALLBACK)).toBe(ArrowDown01);
  });

  it('ignore les espaces en début et en fin', () => {
    expect(getIcon('  pen-tool ', FALLBACK)).toBe(PenTool);
    expect(getIcon(' PenTool\n', FALLBACK)).toBe(PenTool);
  });

  it('renvoie l’icône de repli pour un nom inconnu', () => {
    expect(getIcon('icone-qui-n-existe-pas', FALLBACK)).toBe(FALLBACK);
    expect(getIcon('IconeInconnue', FALLBACK)).toBe(FALLBACK);
  });

  it.each([[''], ['   '], [null], [undefined]])(
    'renvoie l’icône de repli pour un nom vide (%j)',
    (name) => {
      expect(getIcon(name, FALLBACK)).toBe(FALLBACK);
    },
  );
});
