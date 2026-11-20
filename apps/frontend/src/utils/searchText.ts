/**
 * Ramène un texte à une forme comparable pour une recherche côté client : minuscules et sans
 * accents (décomposition NFD puis suppression des diacritiques). Ex. « Végétal » → « vegetal ».
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');
}
