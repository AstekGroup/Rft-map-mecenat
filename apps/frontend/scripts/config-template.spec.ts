import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { resolveConfigTemplates as resolveBackend } from '../../backend/src/config/config-template.util';

const require = createRequire(import.meta.url);
const { resolveConfigTemplates: resolveScript } = require('./config-template.cjs');
const { buildIndexHtml, escapeHtml } = require('./update-index-html.cjs');

const root = resolve(__dirname, '../../..');
const readJson = (rel: string) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
const template = readFileSync(resolve(__dirname, '../index.template.html'), 'utf8');

const CONFIGS = ['app.config.json', 'docs/audit/fixtures/app.config.second-map.json'];

describe('gabarits de config : parité script de build / backend', () => {
  it.each(CONFIGS)('donne le même résultat pour %s', (rel) => {
    const raw = readJson(rel);
    expect(resolveScript(raw)).toEqual(resolveBackend(raw));
  });

  it('donne les mêmes résultats et avertissements sur des cas limites', () => {
    const raw = {
      app: { name: 'N', n: 3 },
      a: '{{app.name}} {{ app.n }}',
      b: '{{inconnu}}',
      c: '{{app}}',
      d: '{{e}}',
      e: '{{d}}',
      f: ['x {{app.name}}'],
    };
    const warnScript: string[] = [];
    const warnBackend: string[] = [];
    expect(resolveScript(raw, (m: string) => warnScript.push(m))).toEqual(
      resolveBackend(raw, (m) => warnBackend.push(m)),
    );
    expect(warnScript).toEqual(warnBackend);
    expect(warnScript.length).toBeGreaterThan(0);
  });
});

describe('index.html généré depuis la config', () => {
  it.each(CONFIGS)('est idempotent et sans placeholder restant pour %s', (rel) => {
    const raw = readJson(rel);
    const first = buildIndexHtml(template, raw);
    const second = buildIndexHtml(template, raw);
    expect(second).toBe(first);
    expect(first).not.toContain('content="og:title"');
    expect(first).not.toContain('{{');
    expect(first).not.toContain('undefined');
  });

  it('change toutes les métas quand le nom de l’événement change, sans toucher au code', () => {
    const raw = readJson('app.config.json');
    const other = readJson('docs/audit/fixtures/app.config.second-map.json');
    const htmlA = buildIndexHtml(template, raw);
    const htmlB = buildIndexHtml(template, other);
    // Les titres attendus viennent de la config elle-même (gabarits résolus, HTML échappé), jamais
    // d'une phrase écrite en dur : le test doit passer avec n'importe quelle config valide.
    const meta = (cfg: typeof raw, key: 'title' | 'ogTitle') =>
      escapeHtml(resolveBackend(cfg).texts.meta[key]);
    expect(htmlA).toContain(`<title>${meta(raw, 'title')}</title>`);
    expect(htmlB).toContain(`<title>${meta(other, 'title')}</title>`);
    expect(htmlB).toContain(`content="${meta(other, 'ogTitle')}"`);
    // Le nom de l'événement est repris dans les titres, et celui de l'autre carte n'y figure pas.
    expect(meta(other, 'title')).toContain(escapeHtml(other.app.name));
    expect(htmlB).not.toContain(escapeHtml(raw.app.name));
  });

  it('échappe les caractères HTML des valeurs de la config', () => {
    const raw = readJson('app.config.json');
    raw.app.name = 'Fête "des" <b>Tests</b> & Cie';
    const html = buildIndexHtml(template, raw);
    expect(html).toContain('Fête &quot;des&quot; &lt;b&gt;Tests&lt;/b&gt; &amp; Cie');
    expect(html).not.toContain('<b>Tests</b>');
  });

  it('échoue avec un message clair si une valeur requise manque', () => {
    const raw = readJson('app.config.json');
    delete raw.texts.meta.iconRef;
    expect(() => buildIndexHtml(template, raw)).toThrow(/texts\.meta\.iconRef/);
  });

  it('échoue si le modèle ne contient plus un placeholder attendu', () => {
    const raw = readJson('app.config.json');
    expect(() => buildIndexHtml('<html></html>', raw)).toThrow(/placeholder introuvable/);
  });
});
