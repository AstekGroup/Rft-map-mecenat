import { useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { EventType, TargetAudience } from '@/types/event';
import { useEvents, type EventFilters } from '@/hooks';
import { EventListView, EventFiltersBar } from '@/components/Events';
import { Loader2, Home, Map } from 'lucide-react';

export function EventsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    events,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
    toggleRegion,
    toggleType,
    toggleTheme,
    togglePartner,
    availablePartners,
    toggleAudience,
    stats,
    availableThemes,
    availableFormats,
    availablePublics,
  } = useEvents();

  const searchParamsKey = searchParams.toString();

  // Recherche `?q=` + modalité `?modality=` ↔ état (retour navigateur, liens partageables)
  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    const q = params.get('q') ?? '';
    const modRaw = params.get('modality');
    const modality: EventFilters['modality'] =
      modRaw && ['presentiel', 'distanciel', 'all'].includes(modRaw)
        ? (modRaw as EventFilters['modality'])
        : 'all';
    updateFilters({ search: q, modality });
  }, [searchParamsKey, updateFilters]);

  const handleUpdateFilters = useCallback(
    (partial: Partial<EventFilters>) => {
      updateFilters(partial);
      const touchesUrl =
        partial.search !== undefined || partial.modality !== undefined;
      if (!touchesUrl) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (partial.search !== undefined) {
            if (partial.search) next.set('q', partial.search);
            else next.delete('q');
          }
          if (partial.modality !== undefined) {
            if (partial.modality === 'all') next.delete('modality');
            else next.set('modality', partial.modality);
          }
          return next;
        },
        { replace: true },
      );
    },
    [updateFilters, setSearchParams],
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [resetFilters, setSearchParams]);

  const isOnlineMode = filters.modality === 'distanciel';
  const pageTitle = isOnlineMode ? 'Les événements en ligne' : 'Assister aux événements';

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-offwhite font-inter">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          <p className="mt-4 font-poppins font-semibold text-text-primary text-lg">
            Chargement des événements...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-offwhite font-inter">
        <div className="text-center max-w-md p-8">
          <p className="text-text-primary mb-6">{error.message}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-offwhite overflow-hidden font-inter">
      {/* Header unifié */}
      <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Retour à l'accueil"
          >
            <Home className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-poppins font-semibold text-lg">{pageTitle}</h1>
            <p className="text-sm text-white/70">
              {stats.filtered} événements trouvés
            </p>
          </div>
        </div>
        
        {/* Bouton vers la carte - visible uniquement en mode présentiel */}
        {!isOnlineMode && (
          <button
            onClick={() => navigate('/carte')}
            className="flex items-center gap-2 px-4 py-2 rounded-button text-sm font-semibold transition-all bg-accent-yellow text-text-primary hover:bg-yellow-500 shadow-md"
          >
            <Map className="w-4 h-4" />
            Voir sur la carte
          </button>
        )}
      </div>
      
      {/* Filters bar with integrated Search and Modality Switcher */}
      <EventFiltersBar
        filters={filters}
        onUpdateFilters={handleUpdateFilters}
        onToggleRegion={toggleRegion}
        onToggleType={(type) => toggleType(type as EventType)}
        onToggleTheme={toggleTheme}
        onTogglePartner={togglePartner}
        availablePartners={availablePartners}
        onToggleAudience={(audience) => toggleAudience(audience as TargetAudience)}
        onResetFilters={handleResetFilters}
        availableThemes={availableThemes}
        availableFormats={availableFormats}
        availablePublics={availablePublics}
      />
      
      {/* Event list grid with pagination */}
      <div className="flex-1 overflow-hidden">
        <EventListView events={events} />
      </div>
    </div>
  );
}
