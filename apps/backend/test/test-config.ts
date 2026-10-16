import type { AppConfig } from '@make-map/types';

/**
 * Config de carte valide, propre aux tests (elle ne dépend d'aucun fichier du dépôt).
 * Chaque appel renvoie un nouvel objet que le test peut modifier librement.
 */
export function buildTestConfig(): AppConfig {
  return {
    profile: 'test',
    app: {
      name: 'Événement de test',
      shortName: 'EDT',
      description: 'Carte de {{app.name}}',
      eventDates: { weekStart: '2026-05-04', weekEnd: '2026-05-10' },
    },
    theme: {
      colors: { primary: '#112233' },
      fonts: { heading: 'Test Heading', body: 'Test Body' },
    },
    texts: {
      meta: { title: 'Carte - {{app.name}}' },
      home: { mainTitle: '{{app.name}}' },
    },
    filters: { dateFilterModes: [] },
    baserow: {
      moderationVisibleValue: 'Validé',
      fieldMapping: {
        title: 'Intitulé',
        description: 'Présentation',
        startDate: 'Début',
        endDate: 'Fin',
        format: 'Formats',
        modality: 'Modalité',
        audience: 'Publics',
        theme: 'Thèmes',
        image: 'Visuel',
        address: 'Adresse',
        postalCode: 'CP',
        city: 'Commune',
        organizer: 'Structure',
        organizerFirstName: 'Prénom',
        organizerLastName: 'Nom',
        registrationUrl: 'Inscription',
        venueName: 'Salle',
        accessModalities: 'Accès',
        videoConferenceUrl: 'Visio',
        contactEmail: 'Email',
        contactEmailFallback: 'Email animateur',
        contactPhone: 'Téléphone',
        organizerWebsite: 'Site',
        capacity: 'Capacité',
        price: 'Prix',
        tariff: 'Tarif',
        partnerField: 'Partenaires',
        moderation: 'Modération',
      },
      mapping: {
        referenceFields: {
          name: 'Libellé',
          logo: 'Logo',
          picto: 'Icône',
          color: 'Teinte',
        },
        modality: { 'Sur place': 'presentiel', 'À distance': 'distanciel' },
        tariffFreeValue: 'Gratuit',
      },
    },
  };
}
