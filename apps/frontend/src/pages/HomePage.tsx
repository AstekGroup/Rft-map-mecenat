import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Globe, Calendar, ArrowRight, Clock, Users } from 'lucide-react';
import { useEvents } from '@/hooks';
import { useConfig } from '@/hooks/useConfig';
import { Event } from '@/types/event';
import { TYPE_ICONS } from '@/components/Map/EventMarker';
import { Loader2 } from 'lucide-react';

function MiniEventCard({ event }: { event: Event }) {
  const { config, helpers } = useConfig();
  const Icon = TYPE_ICONS[event.type] || Globe;
  const typeColor = helpers.getEnumColor(event.type);
  const editionYear = config?.app?.eventDates?.weekStart?.split('-')[0];
  const weekBadgeText = editionYear ? `${config.app.shortName} ${editionYear}` : 'LGSV 2026';
  const formattedDate = new Date(event.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <Link
      to={`/evenement/${event.id}`}
      className="bg-white rounded-xl shadow-card hover:shadow-popup transition-all group overflow-hidden border border-surface-beige"
    >
      {event.imageUrl ? (
        <div className="relative h-28 overflow-hidden">
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-primary-dark shadow-sm">
              <Icon className="w-2.5 h-2.5" />
              {helpers.getEnumLabel('eventTypes', event.type)}
            </span>
            {event.isDuringWeek && (
              <span className="inline-flex items-center gap-1 bg-primary text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                {weekBadgeText}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center relative" style={{ backgroundColor: `${typeColor}10` }}>
          <Icon className="w-6 h-6" style={{ color: typeColor }} />
        </div>
      )}
      <div className="p-3">
        <h3 className="font-poppins font-semibold text-text-primary text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <div className="space-y-1 text-xs text-text-secondary">
          <p className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-primary flex-shrink-0" />
            <span>{formattedDate}</span>
            <Clock className="w-3 h-3 text-primary flex-shrink-0 ml-auto" />
            <span>{event.time}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="truncate">{event.organizer}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const { allEvents, loading } = useEvents();
  const { config, helpers } = useConfig();

  const presentielEvents = useMemo(() =>
    allEvents
      .filter(e => e.modality === 'presentiel')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6),
    [allEvents]
  );

  const editionYear = config?.app?.eventDates?.weekStart?.split('-')[0];
  const heroTitle = helpers.getText('home', 'heroTitle');
  const editionLabel = helpers.getText('home', 'editionLabel');
  const heroDescription = helpers.getText('home', 'heroDescription');
  const ctaText = helpers.getText('home', 'ctaText');
  const sectionPresentiel = helpers.getText('home', 'sectionPresentiel');
  const nearbySubtitle = helpers.getText('home', 'nearbySubtitle');
  const seeAll = helpers.getText('home', 'seeAll');
  const infoTitle = helpers.getText('home', 'infoTitle');
  const infoDescription = helpers.getText('home', 'infoDescription');

  return (
    <div className="min-h-screen bg-surface-offwhite overflow-y-auto font-body">
      {/* Hero Section */}
      <div className="bg-primary text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-poppins text-4xl md:text-5xl font-bold mb-4">
            {heroTitle}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-2 flex items-center justify-center gap-2">
            <Calendar className="w-6 h-6" />
            {editionLabel} {editionYear}
          </p>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mt-4 font-body">
            {heroDescription}
          </p>
          <div className="mt-8">
            <Link
              to="/carte"
              className="inline-flex items-center gap-2 bg-accent-yellow text-text-primary px-8 py-3 rounded-button font-bold text-lg hover:bg-yellow-500 transition-colors shadow-lg"
            >
              {ctaText}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">

        {/* Section Événements en présentiel */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-poppins font-bold text-xl text-text-primary">{sectionPresentiel}</h2>
                <p className="text-text-secondary text-sm">{nearbySubtitle}</p>
              </div>
            </div>
            <Link
              to="/carte"
              className="text-primary font-semibold flex items-center gap-1 hover:underline"
            >
              {seeAll}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {presentielEvents.map(event => (
                <MiniEventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Info Section */}
        <div className="bg-primary/5 rounded-2xl p-8 text-center border border-primary/10">
          <h3 className="font-poppins font-semibold text-xl text-primary-dark mb-3">
            {infoTitle}
          </h3>
          <p className="text-text-primary max-w-3xl mx-auto leading-relaxed font-body">
            {infoDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
