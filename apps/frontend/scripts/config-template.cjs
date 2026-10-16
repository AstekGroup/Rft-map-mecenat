'use strict';

/**
 * Gabarits de la config de la carte : `{{chemin.vers.la.valeur}}` est remplacé par la valeur
 * (chaîne ou nombre) trouvée à ce chemin dans la même config.
 *
 * ATTENTION : ce fichier reprend les règles de `apps/backend/src/config/config-template.util.ts`
 * (le backend est en TypeScript, ce script de build en CommonJS : ils ne peuvent pas partager
 * un module). `config-template.spec.ts` vérifie que les deux donnent le même résultat.
 *
 * Placeholder inconnu, non scalaire ou cyclique : chaîne vide + avertissement (`onWarn`).
 */

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;
const MAX_DEPTH = 5;

function lookup(root, path) {
  let current = root;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function resolveString(value, root, where, depth, onWarn) {
  return value.replace(PLACEHOLDER, (_match, path) => {
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

function walk(node, root, where, onWarn) {
  if (typeof node === 'string') return resolveString(node, root, where, 0, onWarn);
  if (Array.isArray(node)) {
    return node.map((item, i) => walk(item, root, `${where}[${i}]`, onWarn));
  }
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = walk(value, root, where ? `${where}.${key}` : key, onWarn);
    }
    return out;
  }
  return node;
}

/** Retourne une copie de la config dont tous les gabarits sont résolus. */
function resolveConfigTemplates(config, onWarn = () => undefined) {
  return walk(config, config, '', onWarn);
}

module.exports = { resolveConfigTemplates };
