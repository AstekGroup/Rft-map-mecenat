/**
 * Types Baserow - Noms de champs réels en français
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
}

export interface BaserowRecord {
  id: number;
  order?: string;
  "Nom de l'événement"?: string;
  Description?: string;
  "Date de début de l'événement"?: string;
  "Date de fin de l'événement"?: string;
  Lieu?: string;
  Formats?: BaserowSelect[];
  "Type de l'événement"?: BaserowSelect; // = Modalité (Présentiel / Distanciel)
  'Adresse du lieu'?: string;
  'Code postal du lieu'?: string;
  'Ville du lieu'?: string;
  "Modalités spécifiques d'accès au lieu"?: BaserowSelect[];
  'Lien de la visio'?: string;
  'Modalités de visio'?: BaserowSelect[];
  "Capacité d'accueil de l'événement"?: number;
  'Email contact événement'?: string;
  'Nom de la structure organisatrice'?: string;
  'Site web de la structure'?: string;
  "Lien d'inscription à l'événement"?: string;
  "Prénom de l'animateur"?: string;
  "Nom de l'animateur"?: string;
  "E-mail de l'animateur"?: string;
  "Téléphone de l'animateur"?: string;
  'Téléphone inscription'?: string;
  "Modération de l'événement"?: string;
  'Visibilité sur la cartographie'?: string;
  Publics?: BaserowSelect[];
  Thématiques?: BaserowSelect[];
  "Visuel de l'évènement"?: BaserowAttachment[];
  'Respect de la charte'?: boolean;
  'Réception kit communication'?: string;
  'Type de structure'?: BaserowSelect;
  "Comment avez-vous connu La Semaine de l'IA pour Tous ?"?: BaserowSelect[];
  'Avez-vous quelque chose à ajouter ?'?: string;
  'Inscription NL'?: BaserowSelect[];
  Partenaires?: BaserowSelect[]; // Liaisons de lignes liées dans Baserow
  Tarif?: BaserowSelect;
  Montant?: number;
}

export interface BaserowLinkedTableRecord {
  id: number;
  Nom: string;
  Logo?: BaserowAttachment[];
  Picto?: BaserowSelect[];
  Couleur?: BaserowSelect[];
}

export interface BaserowResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
