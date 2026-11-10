import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  GEOCODING_CACHE_VERSION,
  GeocodingCacheEntry,
  GeocodingCacheStore,
  ORPHAN_MAX_AGE_MS,
} from './geocoding-cache.store';

function okEntry(lastUsedAt = Date.now()): GeocodingCacheEntry {
  return {
    result: {
      latitude: 45.76,
      longitude: 4.83,
      region: 'Auvergne-Rhône-Alpes',
      department: 'Rhône',
      cityCode: '69123',
    },
    geocodedAt: lastUsedAt,
    lastUsedAt,
  };
}

describe('GeocodingCacheStore', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'geocoding-cache-'));
    file = path.join(dir, 'geocoding.json');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('relit un cache écrit par une instance précédente', async () => {
    const first = new GeocodingCacheStore(file);
    first.load();
    first.set('1 rue test|69001|lyon', okEntry());
    first.set('rue inconnue|99999|ville', {
      failure: 'not_found',
      geocodedAt: Date.now(),
      retryAfter: Date.now() + 1000,
      lastUsedAt: Date.now(),
    });
    await first.flush();

    const second = new GeocodingCacheStore(file);
    second.load();
    expect(second.size).toBe(2);
    expect(second.get('1 rue test|69001|lyon')?.result?.latitude).toBe(45.76);
    expect(second.get('rue inconnue|99999|ville')?.failure).toBe('not_found');
  });

  it('démarre avec un cache vide quand le fichier est absent', () => {
    const store = new GeocodingCacheStore(file);
    store.load();
    expect(store.size).toBe(0);
  });

  it('met de côté un fichier illisible et repart de zéro', () => {
    fs.writeFileSync(file, '{ pas du json');
    const store = new GeocodingCacheStore(file);
    expect(() => store.load()).not.toThrow();

    expect(store.size).toBe(0);
    expect(fs.existsSync(file)).toBe(false);
    const aside = fs.readdirSync(dir).filter((f) => f.includes('.corrompu-'));
    expect(aside).toHaveLength(1);
  });

  it("met de côté un fichier d'une version inconnue", () => {
    fs.writeFileSync(file, JSON.stringify({ version: 99, entries: {} }));
    const store = new GeocodingCacheStore(file);
    store.load();

    expect(store.size).toBe(0);
    expect(fs.readdirSync(dir).some((f) => f.includes('.corrompu-'))).toBe(
      true,
    );
  });

  it('ignore les entrées invalides sans rejeter tout le fichier', () => {
    fs.writeFileSync(
      file,
      JSON.stringify({
        version: GEOCODING_CACHE_VERSION,
        entries: {
          bonne: okEntry(),
          mauvaise: { result: { latitude: 'x' } },
          vide: null,
        },
      }),
    );
    const store = new GeocodingCacheStore(file);
    store.load();
    expect(store.size).toBe(1);
  });

  it('survit à un dossier non inscriptible (cache en mémoire)', async () => {
    // Un fichier à la place du dossier parent : mkdir échoue.
    const blocker = path.join(dir, 'bloqueur');
    fs.writeFileSync(blocker, 'x');
    const store = new GeocodingCacheStore(path.join(blocker, 'geocoding.json'));
    store.set('k', okEntry());

    await expect(store.flush()).resolves.toBeUndefined();
    expect(store.get('k')).toBeDefined();
  });

  it("retire les adresses inutilisées depuis 30 jours à l'écriture", async () => {
    const store = new GeocodingCacheStore(file);
    store.set('orpheline', okEntry(Date.now() - ORPHAN_MAX_AGE_MS - 1000));
    store.set('utilisée', okEntry());
    await store.flush();

    const reloaded = new GeocodingCacheStore(file);
    reloaded.load();
    expect(reloaded.size).toBe(1);
    expect(reloaded.get('utilisée')).toBeDefined();
    expect(reloaded.get('orpheline')).toBeUndefined();
  });

  it("n'écrit rien quand rien n'a changé", async () => {
    const store = new GeocodingCacheStore(file);
    await store.flush();
    expect(fs.existsSync(file)).toBe(false);
  });

  it('ne laisse pas de fichier temporaire après écriture', async () => {
    const store = new GeocodingCacheStore(file);
    store.set('k', okEntry());
    await store.flush();
    expect(fs.readdirSync(dir)).toEqual(['geocoding.json']);
  });

  it('fonctionne en mémoire seule sans chemin', async () => {
    const store = new GeocodingCacheStore();
    store.load();
    store.set('k', okEntry());
    await store.flush();
    expect(store.size).toBe(1);
  });
});
