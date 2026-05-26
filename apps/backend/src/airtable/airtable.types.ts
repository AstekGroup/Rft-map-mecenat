/**
 * Types Airtable - Noms de champs réels en français
 */

export interface AirtableAttachment {
  id: string;
  width?: number;
  height?: number;
  url: string;
  filename: string;
  size: number;
  type: string;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
}

export interface AirtableRecord {
  id: string;
  fields: {
    'Nom de l\'événement'?: string;
    'Description'?: string;
    'Date de début de l\'événement'?: string;
    'Date de fin de l\'événement'?: string;
    'Lieu'?: string;
    'Format'?: string;
    'Type de l\'événement'?: string; // = Modalité (Présentiel / Distanciel)
    'Adresse du lieu'?: string;
    'Code postal du lieu'?: string;
    'Ville du lieu'?: string;
    'Modalités spécifiques d\'accès au lieu'?: string[];
    'Lien de la visio'?: string;
    'Modalités de visio'?: string[];
    'Capacité d\'accueil de l\'événement'?: number;
    'Email contact événement'?: string;
    'Nom de la structure organisatrice'?: string;
    'Site web de la structure'?: string;
    'Lien d\'inscription à l\'événement'?: string;
    'Prénom de l\'animateur'?: string;
    'Nom de l\'animateur'?: string;
    'E-mail de l\'animateur'?: string;
    'Téléphone de l\'animateur'?: string;
    'Téléphone inscription'?: string;
    'Modération de l\'événement'?: string;
    'Visibilité sur la cartographie'?: string;
    Public?: string[];
    Thématique?: string[];
    "Visuel de l'événement"?: AirtableAttachment[];
    'Respect de la charte'?: boolean;
    'Réception kit communication'?: string;
    'Type de structure'?: string;
    'Comment avez-vous connu La Semaine de l\'IA pour Tous ?'?: string[];
    'Avez-vous quelque chose à ajouter ?'?: string;
    'Inscription NL'?: string[];
    Communautés?: string[]; // IDs des partenaires liés
  };
  createdTime?: string;
}

export interface AirtablePartnerRecord {
  id: string;
  fields: {
    Nom: string;
    Logo?: AirtableAttachment[];
  };
}

export interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}
