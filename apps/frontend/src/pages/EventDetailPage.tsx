import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, ExternalLink, Mail, Globe, Video, Building, Accessibility, Tag, BookOpen, Handshake, Euro, Phone, Info } from 'lucide-react';
import { useEvents } from '@/hooks';
import { useConfig } from '@/hooks/useConfig';
import { Loader2 } from 'lucide-react';
import { TYPE_ICONS } from '@/components/Map/EventMarker';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { allEvents, loading, error } = useEvents();
  const { helpers } = useConfig();
  
  const event = allEvents.find(e => e.id === id);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-offwhite flex items-center justify-center font-inter">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          <p className="mt-4 font-poppins font-semibold text-text-primary text-lg">
            Chargement de l'événement...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-offwhite flex items-center justify-center font-inter">
        <div className="text-center max-w-md p-8">
          <p className="text-text-primary mb-6">{error.message}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-surface-offwhite flex items-center justify-center font-inter">
        <div className="text-center max-w-md p-8">
          <h2 className="font-poppins font-semibold text-text-primary text-xl mb-4">
            Événement non trouvé
          </h2>
          <p className="text-text-secondary mb-6">
            L'événement que vous recherchez n'existe pas ou a été supprimé.
          </p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Retour
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedEndDate = event.endDate
    ? new Date(event.endDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const Icon = TYPE_ICONS[event.type] || Globe;

  const isComplete = event.capacity && event.registeredCount && event.registeredCount >= event.capacity;

  return (
    <div className="min-h-screen bg-surface-offwhite overflow-y-auto font-inter">
      {/* Hero Image */}
      {event.imageUrl ? (
        <div className="relative h-64 md:h-80 bg-primary">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 inline-flex items-center gap-2 bg-white/90 text-primary-dark px-3 py-2 rounded-lg text-sm font-medium hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>
      ) : (
        <div className="bg-primary py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-popup overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-primary/10">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-surface-beige text-primary-dark"
              >
                <Icon className="w-4 h-4" />
                {helpers.getEnumLabel('eventTypes', event.type)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary-dark">
                {event.modality === 'distanciel' ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <Building className="w-4 h-4" />
                )}
                {helpers.getEnumLabel('modalities', event.modality)}
              </span>
              {event.isDuringWeek && (
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary-dark px-3 py-1.5 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  La Grande Semaine Végétale
                </span>
              )}
              {isComplete && (
                <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-sm font-bold uppercase">
                  <Tag className="w-4 h-4" />
                  Complet
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-poppins text-2xl md:text-3xl font-bold text-text-primary mb-2">
              {event.title}
            </h1>

            {/* Organizer & Partners */}
            <div className="flex flex-col gap-4">
              <p className="text-text-secondary">
                Organisé par <span className="font-medium text-primary-dark">{event.organizer}</span>
              </p>

              {event.partners && event.partners.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-primary/5">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Handshake className="w-3.5 h-3.5" />
                    Partenaires :
                  </span>
                  <div className="flex flex-wrap gap-4">
                    {event.partners.map((partner) => (
                      <div key={partner.id} className="flex items-center gap-2 group">
                        {partner.logoUrl && (
                          <div className="w-8 h-8 rounded bg-white shadow-sm border border-primary/5 p-1 flex items-center justify-center overflow-hidden">
                            <img
                              src={partner.logoUrl}
                              alt={partner.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}
                        <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                          {partner.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date & Location side by side */}
          <div className="p-6 md:p-8 border-b border-primary/10 bg-surface-beige/20">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-sm text-primary/70 uppercase tracking-wide mb-1">
                    Date et horaires
                  </h3>
                  <p className="font-medium text-text-primary capitalize">{formattedDate}</p>
                  {formattedEndDate && formattedEndDate !== formattedDate && (
                    <p className="text-text-secondary text-sm capitalize">au {formattedEndDate}</p>
                  )}
                  <p className="text-text-secondary flex items-center gap-1 mt-1">
                    <Clock className="w-4 h-4" />
                    {event.time}
                    {event.endTime && ` - ${event.endTime}`}
                  </p>
                </div>
              </div>

              {/* Location / Online */}
              {event.modality === 'presentiel' ? (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-sm text-primary/70 uppercase tracking-wide mb-1">
                      Lieu
                    </h3>
                    {event.venueName && (
                      <p className="font-medium text-text-primary">{event.venueName}</p>
                    )}
                    <p className="text-text-secondary">{event.address}</p>
                    <p className="text-text-secondary font-medium">
                      {event.postalCode} {event.city}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent-red/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5 text-accent-red" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-sm text-primary/70 uppercase tracking-wide mb-1">
                      Accès
                    </h3>
                    <p className="font-medium text-text-primary">Événement en ligne</p>
                    {event.videoConferenceUrl && (
                      <a
                        href={event.videoConferenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-red hover:underline flex items-center gap-1 mt-1 font-medium"
                      >
                        <Globe className="w-4 h-4" />
                        Accéder à l'événement
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Accessibility */}
          {event.accessibilityInfo && (
            <div className="p-6 md:p-8 border-b border-primary/10 bg-primary/5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Accessibility className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-sm text-primary/70 uppercase tracking-wide mb-1">
                    Accessibilité
                  </h3>
                  <p className="text-text-primary">{event.accessibilityInfo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Format & Public (above description) */}
          <div className="p-6 md:p-8 border-b border-primary/10 grid md:grid-cols-2 gap-6">
            {/* Format */}
            <div>
              <h3 className="font-poppins font-semibold text-sm text-primary/70 uppercase tracking-wide mb-2">
                Format
              </h3>
              <p className="text-text-primary font-medium">
                {helpers.getEnumLabel('eventFormats', event.format)}
              </p>
            </div>

            {/* Public cible */}
            <div>
              <h3 className="font-poppins font-semibold text-sm text-primary/70 uppercase tracking-wide mb-2">
                Public cible
              </h3>
              <div className="flex flex-wrap gap-1">
                {event.targetAudience.map((audience) => (
                  <span
                    key={audience}
                    className="text-sm bg-primary/5 text-primary-dark px-2.5 py-1 rounded-full border border-primary/10"
                  >
                    {helpers.getEnumLabel('targetAudiences', audience)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Thématiques */}
          {event.themes && event.themes.length > 0 && (
            <div className="p-6 md:p-8 border-b border-primary/10 bg-secondary/5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-gobold text-sm text-primary/70 mb-2 lowercase">
                    Thématiques
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {event.themes.map((theme) => (
                      <span
                        key={theme}
                        className="text-sm font-medium text-primary bg-white border border-primary/10 px-3 py-1 rounded-full shadow-sm"
                      >
                        {helpers.getEnumLabel('eventThemes', theme)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="p-6 md:p-8 border-b border-primary/10">
            <h2 className="font-poppins font-semibold text-lg text-text-primary mb-3">
              À propos de l'événement
            </h2>
            <p className="text-text-secondary whitespace-pre-line leading-relaxed">
              {event.description}
            </p>
          </div>
          
            {/* Condition d'accès */}
          <div className="p-6 md:p-8 border-b border-primary/10 bg-primary/5">
            <h2 className="font-poppins font-semibold text-lg text-text-primary mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Condition d'accès
            </h2>

            {/* Tarif */}
            <div className="mb-6 pb-6 border-b border-primary/10 flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-poppins font-semibold text-sm text-primary/70 uppercase tracking-wide mb-1">
                  Tarif
                </h3>
                {event.isFree ? (
                  <p className="font-bold text-green-600">Gratuit</p>
                ) : (
                  <p className="font-bold text-text-primary">
                    {event.price ? `${event.price} €` : 'Payant (consulter l\'organisateur)'}
                  </p>
                )}
              </div>
            </div>
            
            {!(event.registrationUrl || event.contactPhone || event.contactEmail) ? (
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Entrée libre
                </span>
                <p className="mt-3 text-text-secondary text-sm">
                  Cet événement est en accès libre et ne nécessite aucune inscription préalable.
                </p>
              </div>
            ) : (
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 mb-3">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Sur inscription
                </span>
                <p className="text-text-secondary text-sm mb-4">
                  L'inscription à cet événement est requise. Vous pouvez vous inscrire par les moyens suivants :
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  {event.registrationUrl && (
                    <a
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-button text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      S'inscrire par Internet
                    </a>
                  )}
                  {event.contactPhone && (
                    <a
                      href={`tel:${event.contactPhone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-2 bg-white border border-primary/20 text-primary-dark hover:bg-primary/5 px-4 py-2.5 rounded-button text-sm font-medium transition-colors shadow-sm"
                    >
                      <Phone className="w-4 h-4 text-primary" />
                      S'inscrire par Téléphone ({event.contactPhone})
                    </a>
                  )}
                  {event.contactEmail && (
                    <a
                      href={`mailto:${event.contactEmail}`}
                      className="inline-flex items-center gap-2 bg-white border border-primary/20 text-primary-dark hover:bg-primary/5 px-4 py-2.5 rounded-button text-sm font-medium transition-colors shadow-sm"
                    >
                      <Mail className="w-4 h-4 text-primary" />
                      S'inscrire par E-mail ({event.contactEmail})
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="p-6 md:p-8 border-b border-primary/10">
            <h2 className="font-poppins font-semibold text-lg text-text-primary mb-4">
              Contact
            </h2>
            <div className="space-y-3">
              {event.contactEmail && (
                <a
                  href={`mailto:${event.contactEmail}`}
                  className="flex items-center gap-3 text-text-secondary hover:text-primary-dark transition-colors font-medium"
                >
                  <Mail className="w-5 h-5 text-primary" />
                  {event.contactEmail}
                </a>
              )}
              {event.organizerWebsite && (
                <a
                  href={event.organizerWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-text-secondary hover:text-primary-dark transition-colors font-medium"
                >
                  <Globe className="w-5 h-5 text-primary" />
                  Site web de l'organisateur
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 md:p-8 bg-surface-beige/20">
            <div className="flex flex-col sm:flex-row gap-4">
              {isComplete ? (
                <div className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-50 text-red-600 rounded-button font-bold text-sm uppercase">
                  <Tag className="w-5 h-5" />
                  Événement complet
                </div>
              ) : null}
              {event.contactEmail && (
                <a
                  href={`mailto:${event.contactEmail}`}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Contacter l'organisateur
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-12" />
    </div>
  );
}
