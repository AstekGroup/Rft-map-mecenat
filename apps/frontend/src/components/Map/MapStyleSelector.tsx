import { Layers } from 'lucide-react';
import { MAP_STYLES, type MapStyleId } from './mapStyles';

interface MapStyleSelectorProps {
  currentStyle: MapStyleId;
  onStyleChange: (styleId: MapStyleId) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function MapStyleSelector({
  currentStyle,
  onStyleChange,
  isOpen,
  onToggle,
}: MapStyleSelectorProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="w-10 h-10 bg-white rounded-lg shadow-card flex items-center justify-center text-primary hover:bg-surface-beige transition-colors"
        aria-label="Changer le style de carte"
        title="Changer le style de carte"
      >
        <Layers className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-12 top-0 bg-white rounded-lg shadow-popup p-2 min-w-[180px] animate-fade-in">
          <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
            Style de carte
          </div>
          {MAP_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => {
                onStyleChange(style.id);
                onToggle();
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                currentStyle === style.id
                  ? 'bg-primary text-white'
                  : 'hover:bg-surface-beige text-primary'
              }`}
            >
              <div className="font-medium">{style.name}</div>
              <div
                className={`text-xs ${
                  currentStyle === style.id ? 'text-white/80' : 'text-gray-500'
                }`}
              >
                {style.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
