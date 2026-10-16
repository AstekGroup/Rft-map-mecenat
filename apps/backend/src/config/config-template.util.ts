/**
 * Gabarits de la config de la carte.
 *
 * Une chaîne de `app.config.json` peut contenir `{{chemin.vers.la.valeur}}` : le
 * placeholder est remplacé par la valeur (chaîne ou nombre) trouvée à ce chemin dans la
 * même config. Exemple : `"title": "Carte - {{app.name}}"`. Le nom de l'événement n'est
 * ainsi écrit qu'à un seul endroit (`app.name`).
 *
 * ATTENTION : `apps/frontend/scripts/config-template.cjs` implémente les mêmes règles
 * (le script de build de `index.html` ne peut pas importer ce fichier TypeScript). Un test
 * de parité (`apps/frontend/scripts/config-template.spec.ts`) vérifie qu'ils restent alignés.
 *
 * Règles :
 * - placeholder inconnu, non scalaire ou cyclique : remplacé par une chaîne vide et signalé
 *   par `onWarn` (jamais d'accolades brutes affichées à l'écran) ;
 * - une valeur référencée peut elle-même contenir des gabarits (profondeur limitée).
 */

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;
const MAX_DEPTH = 5;

export type TemplateWarn = (message: string) => void;

function lookup(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function resolveString(
  value: string,
  root: unknown,
  where: string,
  depth: number,
  onWarn: TemplateWarn,
): string {
  return value.replace(PLACEHOLDER, (_match, path: string) => {
    const target = lookup(root, path);
    if (typeof target === 'number') return String(target);
    if (typeof target !== 'string') {
      onWarn(
        `Gabarit {{${path}}} dans « ${where} » : valeur absente ou non textuelle, remplacée par une chaîne vide.`,
      );
      return '';
    }
    if (depth >= MAX_DEPTH) {
      onWarn(
        `Gabarit {{${path}}} dans « ${where} » : références imbriquées trop profondes (cycle ?), remplacé par une chaîne vide.`,
      );
      return '';
    }
    return resolveString(target, root, path, depth + 1, onWarn);
  });
}

function walk(
  node: unknown,
  root: unknown,
  where: string,
  onWarn: TemplateWarn,
): unknown {
  if (typeof node === 'string') {
    return resolveString(node, root, where, 0, onWarn);
  }
  if (Array.isArray(node)) {
    return node.map((item, i) => walk(item, root, `${where}[${i}]`, onWarn));
  }
  if (node !== null && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = walk(value, root, where ? `${where}.${key}` : key, onWarn);
    }
    return out;
  }
  return node;
}

/** Retourne une copie de la config dont tous les gabarits sont résolus. */
export function resolveConfigTemplates<T>(
  config: T,
  onWarn: TemplateWarn = () => undefined,
): T {
  return walk(config, config, '', onWarn) as T;
}
