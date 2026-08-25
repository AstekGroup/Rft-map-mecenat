import { Event } from '@/types/event';
import { useConfig } from '@/hooks/useConfig';
import { Badge } from '@/components/UI';
import { Calendar, Clock, MapPin, User, Mail, Eye, Video, Building } from 'lucide-react';

interface EventPopupProps {
  event: Event;
  onClose: () => void;
  onViewDetails?: (eventId: string) => void;
}

export function EventPopup({ event, onClose, onViewDetails }: EventPopupProps) {
  const { helpers } = useConfig();
  const modalityLabel = helpers.getEnumLabel('modalities', event.modality);
  const formattedDate = new Date(event.date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
  
  return (
    <div className="bg-white rounded-card shadow-popup w-80 max-w-[90vw] animate-fade-in overflow-hidden font-inter">
      {/* Header */}
      <div className="bg-primary p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge type={event.type} size="sm" variant="highlight" />
              {event.modality && (
                <span className="inline-flex items-center gap-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {event.modality === 'distanciel' ? (
                    <Video className="w-3 h-3" />
                  ) : (
                    <Building className="w-3 h-3" />
                  )}
                  {modalityLabel}
                </span>
              )}
            </div>
            <h3 className="font-poppins font-semibold text-base mt-2 leading-tight">
              {event.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 -mr-1 -mt-1 transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-2.5">
        {/* Date, heure - sur une seule ligne */}
        <div className="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
          <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="capitalize">{formattedDate}</span>
          <span className="text-primary/30">|</span>
          <Clock className="w-4 h-4 text-primary flex-shrink-0" />
          <span>{event.time}{event.endTime ? ` - ${event.endTime}` : ''}</span>
        </div>
        
        {/* Badge semaine LGSV */}
        {event.isDuringWeek && (
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary-dark px-2.5 py-1 rounded-full text-xs font-medium">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse-soft" />
            La Grande Semaine Végétale
          </div>
        )}
        
        {/* Lieu */}
        {event.modality === 'presentiel' && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-text-secondary">
              {event.venueName && <p className="font-medium text-text-primary">{event.venueName}</p>}
              <p>{event.address}</p>
              <p className="font-medium text-text-primary">{event.postalCode} {event.city}</p>
            </div>
          </div>
        )}
        
        {/* Lien visio pour distanciel */}
        {event.modality === 'distanciel' && event.videoConferenceUrl && (
          <div className="flex items-center gap-2 text-sm">
            <Video className="w-4 h-4 text-primary" />
            <span className="text-text-secondary">Événement en ligne</span>
          </div>
        )}
        
        {/* Organisateur */}
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-primary" />
          <span className="text-text-secondary">{event.organizer}</span>
        </div>
        
        {/* Description */}
        <p className="text-sm text-text-secondary line-clamp-2">
          {event.description}
        </p>
        
        {/* Actions - tous les boutons sur la même ligne */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onViewDetails?.(event.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-surface-beige hover:bg-primary/10 text-primary-dark font-medium rounded-button text-sm transition-colors border border-primary/20"
          >
            <Eye className="w-4 h-4" />
            Détails
          </button>
          
          {event.organizerContact || event.contactEmail ? (
            <a
              href={`mailto:${event.organizerContact || event.contactEmail}`}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary-dark font-medium rounded-button text-sm transition-colors border border-primary/20"
              title="Contacter l'organisateur"
            >
              <Mail className="w-4 h-4" />
              Contact
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
