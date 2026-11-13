/**
 * Une table de référence (formats, publics, thématiques, partenaires) n'a pas pu être lue.
 * À ne pas confondre avec une table vide : une table vide masque simplement le filtre, une table
 * en erreur doit se voir (logs, santé de l'API, réponse d'erreur des endpoints de référentiel).
 */
export class ReferenceTableError extends Error {
  constructor(
    /** Nom de la variable d'environnement de la table (ex. `BASEROW_PARTNERS_TABLE`). */
    readonly table: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReferenceTableError';
  }
}

/** Dernier état connu du chargement d'une table de référence (sans détail technique : voir les logs). */
export interface ReferenceTableStatus {
  table: string;
  ok: boolean;
  /** Date ISO du dernier chargement tenté. */
  checkedAt: string;
}
