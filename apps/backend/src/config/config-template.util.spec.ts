import { resolveConfigTemplates } from './config-template.util';

describe('resolveConfigTemplates', () => {
  it('remplace un gabarit par la valeur du chemin indiqué', () => {
    const config = {
      app: { name: 'Les Journées du Test' },
      texts: {
        meta: {
          title: '{{app.name}}',
          info: "C'est quoi {{ app.name }} ?",
        },
      },
    };
    const resolved = resolveConfigTemplates(config);
    expect(resolved.texts.meta.title).toBe('Les Journées du Test');
    expect(resolved.texts.meta.info).toBe("C'est quoi Les Journées du Test ?");
  });

  it('change tous les titres quand le nom change (un seul champ à modifier)', () => {
    const make = (name: string) => ({
      app: { name },
      a: 'Carte - {{app.name}}',
      b: { c: ['Pendant {{app.name}}'] },
    });
    expect(resolveConfigTemplates(make('X'))).toEqual({
      app: { name: 'X' },
      a: 'Carte - X',
      b: { c: ['Pendant X'] },
    });
    expect(resolveConfigTemplates(make('Y'))).toEqual({
      app: { name: 'Y' },
      a: 'Carte - Y',
      b: { c: ['Pendant Y'] },
    });
  });

  it('résout les gabarits imbriqués et les nombres', () => {
    const config = {
      app: { name: 'N', short: '{{app.name}}-court', year: 2026 },
      badge: '{{app.short}} {{app.year}}',
    };
    expect(resolveConfigTemplates(config).badge).toBe('N-court 2026');
  });

  it('ne modifie pas la config reçue', () => {
    const config = { app: { name: 'N' }, t: '{{app.name}}' };
    resolveConfigTemplates(config);
    expect(config.t).toBe('{{app.name}}');
  });

  it('laisse intactes les chaînes sans gabarit et les valeurs non textuelles', () => {
    const config = { n: 3, b: true, z: null, s: 'texte simple' };
    expect(resolveConfigTemplates(config)).toEqual(config);
  });

  it('remplace un chemin inconnu par une chaîne vide et le signale', () => {
    const warn = jest.fn();
    const resolved = resolveConfigTemplates(
      { app: { name: 'N' }, t: 'Bonjour {{app.absent}}' },
      warn,
    );
    expect(resolved.t).toBe('Bonjour ');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('{{app.absent}}');
    expect(warn.mock.calls[0][0]).toContain('t');
  });

  it('remplace une cible non textuelle (objet) par une chaîne vide et le signale', () => {
    const warn = jest.fn();
    const resolved = resolveConfigTemplates(
      { app: { name: 'N' }, t: '{{app}}' },
      warn,
    );
    expect(resolved.t).toBe('');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('coupe les références cycliques', () => {
    const warn = jest.fn();
    const resolved = resolveConfigTemplates({ a: '{{b}}', b: '{{a}}' }, warn);
    expect(resolved.a).toBe('');
    expect(warn).toHaveBeenCalled();
  });
});
