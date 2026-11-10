import React from 'react';

interface PageSkeletonLoaderProps {
  className?: string;
  variant?: 'map' | 'list' | 'detail';
}

/**
 * Loader qui reproduit la structure de la page avec des rectangles animés
 * correspondant aux différents éléments de l'interface (header, sidebar,
 * barre d'outils, contenu, footer).
 *
 * Les placeholders reprennent les couleurs de fond du thème (`surface-*`)
 * pour rester discrets et cohérents avec la page en cours de chargement.
 */
export const PageSkeletonLoader: React.FC<PageSkeletonLoaderProps> = ({ 
  className = '', 
  variant = 'map' 
}) => {
  // Blocs "skeleton" : couleur de fond du thème, jamais une couleur en dur.
  const skeletonBlock = 'bg-surface-beige/80 animate-pulse rounded';
  const skeletonBlockLight = 'bg-surface-offwhite/30 animate-pulse rounded';

  return (
    <div
      className={`min-h-screen w-full bg-surface-offwhite font-inter overflow-y-auto ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Chargement de la page"
    >
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (for map variant) */}
        {variant === 'map' && (
          <div className="w-96 bg-white border-r border-primary/10 flex flex-col h-screen">
            <div className="p-4 bg-primary text-white">
              <div className={`h-6 w-48 mb-4 ${skeletonBlockLight}`} />
              <div className="flex gap-2">
                <div className={`flex-1 h-8 ${skeletonBlockLight}`} />
                <div className={`flex-1 h-8 ${skeletonBlockLight}`} />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
                <div className="px-3 py-2 bg-primary/10">
                  <div className={`w-32 h-4 ${skeletonBlock}`} />
                </div>
                <div className="p-2 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-3 bg-white rounded-lg border border-primary/10">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 ${skeletonBlock}`} />
                        <div className="flex-1 space-y-2">
                          <div className={`h-3 w-3/4 ${skeletonBlock}`} />
                          <div className={`h-3 w-1/2 ${skeletonBlock} opacity-50`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer (map only) */}
            <div className="h-14 bg-white border-t border-primary/10 flex items-center justify-between px-6">
              <div className={`h-4 w-64 ${skeletonBlock} opacity-40`} />
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${skeletonBlock} opacity-40`} />
                <div className={`w-8 h-8 rounded-full ${skeletonBlock} opacity-40`} />
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className={`flex-1 ${variant === 'list' ? '' : ''}`}>
          {variant === 'map' ? (
            <div className="h-full bg-primary/5 rounded-xl border border-primary/10 m-4 flex items-center justify-center">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 ${skeletonBlock} opacity-20`} />
                <div className={`h-4 w-48 mx-auto ${skeletonBlock} opacity-20`} />
              </div>
            </div>
          ) : variant === 'list' ? (
            <div className="flex flex-col h-screen">
              {/* Barre de filtres (vue liste) */}
              <div className="bg-white border-b border-primary/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`h-10 w-64 ${skeletonBlock}`} />
                  <div className={`h-10 w-32 ${skeletonBlock} opacity-70`} />
                  <div className={`h-10 w-28 ${skeletonBlock} opacity-50`} />
                  <div className={`h-10 w-36 ${skeletonBlock} opacity-30`} />
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`h-6 w-32 ${skeletonBlock}`} />
                    <div className={`h-6 w-24 ${skeletonBlock}`} />
                  </div>
                  
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                      <div key={i} className="bg-white rounded-xl shadow-card overflow-hidden">
                        <div className={`h-28 ${skeletonBlock} rounded-none rounded-t-xl opacity-40`} />
                        <div className="p-3 space-y-2">
                          <div className={`h-4 w-full ${skeletonBlock}`} />
                          <div className={`h-3 w-3/4 ${skeletonBlock} opacity-60`} />
                          <div className={`h-3 w-1/2 ${skeletonBlock} opacity-40`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-screen bg-surface-offwhite">
              {/* Hero Header Placeholder */}
              <div className="h-64 md:h-80 bg-primary/20 animate-pulse relative">
                <div className="max-w-4xl mx-auto px-4 pt-8">
                  <div className={`h-8 w-24 ${skeletonBlockLight} opacity-50`} />
                </div>
              </div>

              {/* Main Detail Content */}
              <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 pb-12">
                <div className="bg-white rounded-2xl shadow-popup overflow-hidden">
                  {/* Header Section */}
                  <div className="p-6 md:p-8 border-b border-primary/10">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className={`h-7 w-24 ${skeletonBlock} opacity-40 rounded-full`} />
                      <div className={`h-7 w-32 ${skeletonBlock} opacity-30 rounded-full`} />
                      <div className={`h-7 w-28 ${skeletonBlock} opacity-20 rounded-full`} />
                    </div>
                    <div className={`h-9 w-3/4 ${skeletonBlock} mb-4`} />
                    <div className={`h-5 w-1/2 ${skeletonBlock} opacity-60`} />
                  </div>

                  {/* Info Grid (Date & Location) */}
                  <div className="p-6 md:p-8 border-b border-primary/10 bg-surface-beige/10">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 ${skeletonBlock} opacity-30 flex-shrink-0`} />
                        <div className="flex-1 space-y-2">
                          <div className={`h-4 w-24 ${skeletonBlock} opacity-40`} />
                          <div className={`h-5 w-full ${skeletonBlock}`} />
                          <div className={`h-4 w-2/3 ${skeletonBlock} opacity-60`} />
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 ${skeletonBlock} opacity-30 flex-shrink-0`} />
                        <div className="flex-1 space-y-2">
                          <div className={`h-4 w-20 ${skeletonBlock} opacity-40`} />
                          <div className={`h-5 w-full ${skeletonBlock}`} />
                          <div className={`h-4 w-3/4 ${skeletonBlock} opacity-60`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="p-6 md:p-8 border-b border-primary/10">
                    <div className={`h-6 w-48 ${skeletonBlock} mb-4`} />
                    <div className="space-y-3">
                      <div className={`h-4 w-full ${skeletonBlock} opacity-50`} />
                      <div className={`h-4 w-full ${skeletonBlock} opacity-50`} />
                      <div className={`h-4 w-5/6 ${skeletonBlock} opacity-50`} />
                      <div className={`h-4 w-full ${skeletonBlock} opacity-50`} />
                      <div className={`h-4 w-2/3 ${skeletonBlock} opacity-50`} />
                    </div>
                  </div>

                  {/* Access Section */}
                  <div className="p-6 md:p-8 border-b border-primary/10 bg-primary/5">
                    <div className={`h-6 w-40 ${skeletonBlock} mb-4`} />
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`w-10 h-10 ${skeletonBlock} opacity-30 flex-shrink-0`} />
                      <div className="flex-1 space-y-2">
                        <div className={`h-4 w-16 ${skeletonBlock} opacity-40`} />
                        <div className={`h-5 w-24 ${skeletonBlock}`} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className={`h-10 w-44 ${skeletonBlock} opacity-80`} />
                      <div className={`h-10 w-44 ${skeletonBlock} opacity-60`} />
                    </div>
                  </div>

                  {/* Contact Section */}
                  <div className="p-6 md:p-8">
                    <div className={`h-6 w-24 ${skeletonBlock} mb-4`} />
                    <div className="space-y-3">
                      <div className={`h-5 w-64 ${skeletonBlock} opacity-60`} />
                      <div className={`h-5 w-56 ${skeletonBlock} opacity-60`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
