/**
 * Types Baserow.
 *
 * Aucun nom de colonne ici : les enregistrements sont lus avec les noms indiqués par la config
 * (`baserow.fieldMapping`, `baserow.mapping.referenceFields`). Seuls l'identifiant de ligne et
 * les formes des valeurs renvoyées par l'API Baserow sont connus du code.
 */

export interface BaserowAttachment {
  id?: string;
  url: string;
  filename: string;
  size?: number;
  mime_type?: string;
  is_image?: boolean;
  image_width?: number;
  image_height?: number;
  thumbnails?: BaserowThumbnails;
}

export interface BaserowThumbnails {
  tiny?: BaserowThumbnail;
  small?: BaserowThumbnail;
  card?: BaserowThumbnail;
}

export interface BaserowThumbnail {
  url: string;
  width: number | null;
  height: number | null;
}

export interface BaserowSelect {
  id: number;
  value: string;
  /** Nom de la pastille de l'option (`dark-orange`), voir `BASEROW_SELECT_PALETTE`. */
  color?: string;
}

/** Ligne de la table des événements (réponse avec `user_field_names=true`). */
export interface BaserowRecord {
  id: number;
  order?: string;
  [column: string]: unknown;
}

/** Ligne d'une table de référence (formats, publics, thématiques, partenaires). */
export interface BaserowLinkedTableRecord {
  id: number;
  [column: string]: unknown;
}

export interface BaserowResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
