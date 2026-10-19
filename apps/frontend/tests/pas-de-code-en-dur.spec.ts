/**
 * Garde-fou « codé en dur = refus en revue » : lance, sur le code applicatif (hors tests), les
 * recherches de la checklist de PR d'`AGENTS.md` (marque, couleurs hexadécimales). Une carte ne
 * doit rien porter dans le code : identité, titres et design viennent de la config.
 *
 * Ce fichier vit hors de `src/` (comme `deux-cartes.spec.tsx`) parce qu'il lit aussi le backend
 * et `shared/types`.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');
const SCAN_DIRS = ['apps/frontend/src', 'apps/backend/src', 'shared/types/src'];
const EXTRA_FILES = ['apps/frontend/tailwind.config.ts'];
const EXTENSIONS = /\.(ts|tsx|css|cjs|mjs|js)$/;
const IGNORED = /\.(spec|test)\.(ts|tsx)$/;

/** Marques et mots propres à une carte (checklist d'AGENTS.md). */
const BRAND = /lgsv|semaine|végétal|vegetal/i;
const HEX_COLOR = /#[0-9a-f]{6}\b/i;

/** Seule couleur écrite en dur autorisée : le gris neutre de repli, défini une seule fois. */
const ALLOWED_HEX = [{ file: 'apps/frontend/src/utils/iconResolver.ts', line: /DEFAULT_FORMAT_COLOR\s*=/ }];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' || name === 'dist' ? [] : walk(full);
    return EXTENSIONS.test(name) && !IGNORED.test(name) ? [full] : [];
  });
}

const FILES = [
  ...SCAN_DIRS.flatMap((dir) => walk(resolve(ROOT, dir))),
  ...EXTRA_FILES.map((file) => resolve(ROOT, file)),
].map((full) => ({ rel: relative(ROOT, full).replace(/\\/g, '/'), full }));

function findings(pattern: RegExp, isAllowed: (rel: string, line: string) => boolean): string[] {
  return FILES.flatMap(({ rel, full }) =>
    readFileSync(full, 'utf8')
      .split(/\r?\n/)
      .flatMap((line, index) =>
        pattern.test(line) && !isAllowed(rel, line) ? [`${rel}:${index + 1}: ${line.trim()}`] : [],
      ),
  );
}

describe('aucune donnée propre à une carte dans le code', () => {
  it('parcourt bien le code applicatif (le garde-fou ne tourne pas à vide)', () => {
    expect(FILES.length).toBeGreaterThan(50);
    expect(FILES.some((f) => f.rel === 'apps/frontend/src/utils/iconResolver.ts')).toBe(true);
    expect(FILES.some((f) => f.rel.startsWith('apps/backend/src/'))).toBe(true);
  });

  it('ne contient ni marque ni nom de semaine propre à une carte', () => {
    expect(findings(BRAND, () => false)).toEqual([]);
  });

  it('ne contient aucune couleur hexadécimale, hors la constante de repli neutre', () => {
    const found = findings(HEX_COLOR, (rel, line) =>
      ALLOWED_HEX.some((allowed) => allowed.file === rel && allowed.line.test(line)),
    );
    expect(found).toEqual([]);
  });
});
