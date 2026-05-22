import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, MapPin, Loader2 } from 'lucide-react';

interface SearchOverlayProps {
  onFlyTo: (lng: number, lat: number, zoom: number) => void;
  onSearchFilter: (search: string) => void;
  searchValue: string;
}

interface BanSuggestion {
  label: string;
  postcode: string;
  city: string;
  context: string;
  coordinates: [number, number]; // [lng, lat]
  type: string;
}

/**
 * Barre de recherche proéminente sur la carte avec :
 * - Autocomplétion via api-adresse.data.gouv.fr
 * - Zoom automatique sur la ville/département sélectionné
 * - Bouton de géolocalisation
 */
export function SearchOverlay({ onFlyTo, onSearchFilter }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<BanSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer les suggestions quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Appel API BAN avec debounce
  const searchBAN = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const url = new URL('https://api-adresse.data.gouv.fr/search/');
      url.searchParams.set('q', q);
      url.searchParams.set('limit', '5');
      // Si c'est un code postal, chercher par type municipality
      if (/^\d{2,5}$/.test(q)) {
        url.searchParams.set('type', 'municipality');
        url.searchParams.set('postcode', q);
      }

      const response = await fetch(url.toString());
      if (!response.ok) return;

      const data = await response.json();
      const results: BanSuggestion[] = data.features.map((f: any) => ({
        label: f.properties.label,
        postcode: f.properties.postcode || '',
        city: f.properties.city || '',
        context: f.properties.context || '',
        coordinates: f.geometry.coordinates,
        type: f.properties.type,
      }));

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch {
      // Silencieux en cas d'erreur réseau
    }
  }, []);

  // Debounce la recherche
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    
    // Aussi filtrer la liste des événements en temps réel
    onSearchFilter(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchBAN(value), 300);
  }, [searchBAN, onSearchFilter]);

  // Sélection d'une suggestion -> zoom sur la carte
  const handleSelectSuggestion = useCallback((suggestion: BanSuggestion) => {
    const [lng, lat] = suggestion.coordinates;
    
    // Zoom adapté au type de résultat
    let zoom = 14;
    if (suggestion.type === 'municipality') zoom = 13;
    if (suggestion.type === 'street') zoom = 16;
    if (suggestion.type === 'housenumber') zoom = 17;

    onFlyTo(lng, lat, zoom);
    setQuery(suggestion.label);
    setShowSuggestions(false);
    onSearchFilter(suggestion.city || suggestion.label);
  }, [onFlyTo, onSearchFilter]);

  // Géolocalisation
  const handleGeolocate = useCallback(() => {
    // La géolocalisation nécessite HTTPS (sauf localhost)
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!isSecure) {
      setGeoError('La géolocalisation nécessite une connexion HTTPS. Utilisez la recherche par ville ou code postal.');
      setTimeout(() => setGeoError(null), 5000);
      return;
    }

    if (!('geolocation' in navigator)) {
      setGeoError('La géolocalisation n\'est pas supportée par votre navigateur.');
      setTimeout(() => setGeoError(null), 4000);
      return;
    }

    setIsGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onFlyTo(position.coords.longitude, position.coords.latitude, 13);
        setIsGeolocating(false);
        setQuery('');
        onSearchFilter('');
      },
      (error) => {
        setIsGeolocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Géolocalisation refusée. Autorisez-la dans les paramètres de votre navigateur, ou recherchez une ville.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Position indisponible. Essayez de rechercher une ville.');
            break;
          case error.TIMEOUT:
            setGeoError('Délai de géolocalisation dépassé. Essayez de rechercher une ville.');
            break;
          default:
            setGeoError('Erreur de géolocalisation.');
        }
        setTimeout(() => setGeoError(null), 5000);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, [onFlyTo, onSearchFilter]);

  // Clear
  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSearchFilter('');
    inputRef.current?.focus();
  }, [onSearchFilter]);

  return (
    <div ref={containerRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-lg font-inter">
      {/* Barre de recherche */}
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Rechercher une ville, un code postal, un lieu..."
            className="w-full pl-11 pr-10 py-3.5 bg-white border-0 rounded-l-2xl shadow-popup text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-inter"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors p-0.5"
              aria-label="Effacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bouton géolocalisation */}
        <button
          onClick={handleGeolocate}
          disabled={isGeolocating}
          className="flex items-center gap-2 px-4 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-r-2xl shadow-popup transition-all font-poppins font-semibold text-sm whitespace-nowrap disabled:opacity-60"
          title="Me localiser"
        >
          {isGeolocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
          <span className="hidden sm:inline">Me localiser</span>
        </button>
      </div>

      {/* Erreur géolocalisation */}
      {geoError && (
        <div className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 shadow-sm animate-fade-in">
          {geoError}
        </div>
      )}

      {/* Suggestions autocomplete */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mt-1 bg-white rounded-2xl shadow-popup overflow-hidden border border-primary/5 animate-fade-in">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSuggestion(s)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-beige transition-colors text-left border-b border-primary/5 last:border-0"
            >
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{s.label}</p>
                <p className="text-xs text-text-secondary">{s.context}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
