/**
 * Formate une date d'événement (`AAAA-MM-JJ`, telle que servie par le backend) en français.
 * Renvoie une chaîne vide si la date est absente ou illisible : l'interface ne doit jamais
 * afficher « Invalid Date » (le backend écarte déjà les événements sans date, ceci est le
 * filet de sécurité côté écran).
 *
 * La date est lue à midi, heure locale : `new Date('2026-09-25')` serait interprétée à minuit UTC
 * et afficherait la veille dans les fuseaux à l'ouest de Greenwich.
 */
export function formatEventDate(
  date: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return '';
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('fr-FR', options);
}
