import type { ReactNode } from 'react';

/**
 * Squelette de page : rectangles animés qui épousent le layout réel
 * (mêmes positions, tailles et découpages que les sections affichées),
 * pour un chargement sans saut visuel. Toutes les couleurs passent par
 * les jetons du thème (variables `--color-*-rgb` injectées par
 * `ConfigProvider` depuis la config de la carte) : aucune couleur en dur.
 */

/** Gabarit de page dont le squelette imite le layout. */
export type PageSkeletonVariant = 'map' | 'list' | 'detail';

interface PageSkeletonLoaderProps {
  /** Gabarit à imiter ; par défaut la page carte. */
  variant?: PageSkeletonVariant;
}

/** Pulsation douce, coupée si l'utilisateur réduit les animations. */
const PULSE = 'animate-pulse-soft motion-reduce:animate-none';

/** Intensités de teinte (classes statiques pour la compilation Tailwind). */
const TONE_CLASSES = {
  soft: 'bg-primary/5',
  medium: 'bg-primary/10',
  strong: 'bg-primary/20',
} as const;

type SkeletonTone = keyof typeof TONE_CLASSES;

/** Rectangle de base du squelette, décoratif (masqué aux lecteurs d'écran). */
function Block({ tone = 'medium', className = '' }: { tone?: SkeletonTone; className?: string }) {
  return <div aria-hidden="true" className={`${PULSE} ${TONE_CLASSES[tone]} ${className}`} />;
}

/** Racine commune : annonce la zone comme chargement en cours. */
function SkeletonRoot({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement de la page…"
      className={className}
    >
      {children}
    </div>
  );
}

/** Carte événement de la sidebar (cf. `Sidebar/EventCard.tsx`). */
function SidebarCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-card border-2 border-transparent bg-white p-4 shadow-card">
      <Block tone="strong" className="h-8 w-8 flex-shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Block className="h-3 w-16 rounded-full" />
        <Block className="h-3.5 w-3/4 rounded-full" />
        <Block tone="soft" className="h-2.5 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

/** Page carte (cf. `pages/MapPage.tsx`) : recherche, nav, carte, sidebar, bouton mobile. */
function MapSkeleton() {
  return (
    <SkeletonRoot className="relative h-screen w-screen overflow-hidden bg-surface-offwhite font-inter">
      {/* Fond carte (cf. `Map/MapView.tsx`) */}
      <div aria-hidden="true" className="absolute inset-0 bg-surface-beige" />
      {/* Amas évocateurs de marqueurs */}
      <Block tone="soft" className="absolute left-[28%] top-[38%] h-8 w-8 rounded-full" />
      <Block tone="soft" className="absolute left-[55%] top-[30%] h-6 w-6 rounded-full" />
      <Block tone="soft" className="absolute left-[62%] top-[55%] h-10 w-10 rounded-full" />
      <Block tone="soft" className="absolute right-[15%] top-[65%] h-6 w-6 rounded-full" />

      {/* Barre de recherche (cf. `Map/SearchOverlay.tsx`, top-4 centrée) */}
      <div className="absolute left-1/2 top-4 z-20 w-[90%] -translate-x-1/2 sm:max-w-sm lg:max-w-lg">
        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-popup">
          <Block tone="strong" className="h-6 w-6 rounded-full" />
          <Block className="h-2 w-2/3 rounded-full" />
        </div>
      </div>

      {/* Boutons de navigation (cf. nav top-4 right-4, masqués sur mobile) */}
      <div className="absolute right-4 top-4 z-20 hidden flex-row items-center gap-2 sm:flex">
        <Block tone="strong" className="h-10 w-10 rounded-xl 2xl:w-28" />
        <Block tone="strong" className="h-10 w-10 rounded-xl 2xl:w-32" />
      </div>

      {/* Pile de zoom (cf. MapView, top-20) */}
      <div className="absolute right-4 top-20 z-20 hidden flex-col gap-1 sm:flex">
        <Block tone="strong" className="h-9 w-9 rounded-lg" />
        <Block tone="strong" className="h-9 w-9 rounded-lg" />
        <Block tone="strong" className="h-9 w-9 rounded-lg" />
      </div>

      {/* Sidebar (cf. `Sidebar/Sidebar.tsx` : header, onglets, cartes, footer) */}
      <div className="absolute bottom-0 left-0 top-0 z-20 hidden w-96 flex-col border-r border-primary/10 bg-surface-offwhite shadow-popup sm:flex">
        {/* Header */}
        <div className="bg-primary/20 p-4">
          <div className="mb-4 flex items-center justify-between">
            <Block tone="strong" className="h-5 w-44 rounded-full" />
            <Block tone="strong" className="h-8 w-8 rounded-lg" />
          </div>
          {/* Onglets */}
          <div className="flex gap-2">
            <Block tone="strong" className="h-9 flex-1 rounded-lg" />
            <Block tone="strong" className="h-9 flex-1 rounded-lg" />
          </div>
        </div>
        {/* Contenu : encart « visibles sur la carte » puis autres événements */}
        <div className="flex-1 space-y-4 overflow-hidden p-4">
          <div className="space-y-2 rounded-xl border-2 border-primary/10 bg-primary/5 p-2">
            <Block tone="strong" className="mx-3 my-2 h-3 w-40 rounded-full" />
            <SidebarCardSkeleton />
            <SidebarCardSkeleton />
            <SidebarCardSkeleton />
          </div>
          <div className="space-y-2 rounded-xl border border-primary/10 bg-white/60 p-2">
            <Block className="mx-3 my-2 h-3 w-32 rounded-full" />
            <SidebarCardSkeleton />
            <SidebarCardSkeleton />
          </div>
        </div>
        {/* Footer */}
        <div className="border-t border-primary/10 bg-white p-4">
          <Block className="h-3 w-32 rounded-full" />
          <Block tone="soft" className="mt-3 h-3 w-24 rounded-full" />
        </div>
      </div>

      {/* Bouton mobile (cf. MapPage bottom-4 centré) */}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 sm:hidden">
        <Block tone="strong" className="h-11 w-36 rounded-full" />
      </div>
    </SkeletonRoot>
  );
}

/** Carte de la grille (cf. `Events/EventListView.tsx`) : image + lignes. */
function GridCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl bg-white shadow-card">
      <Block tone="soft" className="h-28 rounded-t-xl" />
      <div className="flex-1 space-y-2 p-3">
        <Block className="h-3.5 w-full rounded-full" />
        <Block className="h-3.5 w-2/3 rounded-full" />
        <Block tone="soft" className="mt-auto h-2.5 w-3/4 rounded-full" />
      </div>
    </div>
  );
}

/** Page liste (cf. `pages/EventsListPage.tsx`) : header, barre de filtres, grille. */
function ListSkeleton() {
  return (
    <SkeletonRoot className="flex h-screen w-screen flex-col overflow-hidden bg-surface-offwhite font-inter">
      {/* Header unifié (cf. bg-primary) */}
      <div className="flex items-center justify-between bg-primary/20 px-4 py-3">
        <div className="flex items-center gap-4">
          <Block tone="strong" className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Block tone="strong" className="h-4 w-40 rounded-full" />
            <Block className="h-3 w-24 rounded-full" />
          </div>
        </div>
        <Block tone="strong" className="h-9 w-32 rounded-button" />
      </div>

      {/* Barre de filtres (cf. `Events/EventFiltersBar.tsx`) */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Block className="h-10 w-44 rounded-full" />
        <Block className="h-10 w-28 rounded-full" />
        <Block className="h-10 w-24 rounded-full" />
        <Block className="h-10 w-20 rounded-full" />
        <Block className="h-10 w-16 rounded-full" />
      </div>

      {/* Grille d'événements (mêmes colonnes que EventListView) */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <GridCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </SkeletonRoot>
  );
}

/** Page détail (cf. `pages/EventDetailPage.tsx`) : hero, badges, corps, infos. */
function DetailSkeleton() {
  return (
    <SkeletonRoot className="min-h-screen overflow-y-auto bg-surface-offwhite font-inter">
      {/* Image d'en-tête (cf. hero h-64 md:h-80) */}
      <div className="relative h-64 bg-primary/20 md:h-80">
        <Block tone="strong" className="absolute left-4 top-4 h-9 w-24 rounded-lg" />
      </div>

      {/* Carte de contenu (cf. max-w-4xl -mt-8) */}
      <div className="relative z-10 mx-auto -mt-8 max-w-4xl px-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-popup">
          {/* En-tête : badges + titre */}
          <div className="space-y-4 border-b border-primary/10 p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              <Block className="h-7 w-24 rounded-full" />
              <Block className="h-7 w-20 rounded-full" />
              <Block className="h-7 w-28 rounded-full" />
            </div>
            <Block tone="strong" className="h-6 w-2/3 rounded-full" />
            <Block className="h-3 w-1/3 rounded-full" />
          </div>

          {/* Corps : description + colonne d'infos */}
          <div className="grid gap-6 p-6 md:grid-cols-3 md:p-8">
            <div className="space-y-2 md:col-span-2">
              <Block className="h-3 w-full rounded-full" />
              <Block className="h-3 w-11/12 rounded-full" />
              <Block className="h-3 w-10/12 rounded-full" />
              <Block tone="soft" className="h-3 w-2/3 rounded-full" />
            </div>
            <div className="space-y-3">
              <Block className="h-3 w-5/6 rounded-full" />
              <Block className="h-3 w-4/6 rounded-full" />
              <Block className="h-3 w-5/6 rounded-full" />
              <Block tone="soft" className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </SkeletonRoot>
  );
}

export function PageSkeletonLoader({ variant = 'map' }: PageSkeletonLoaderProps) {
  if (variant === 'list') return <ListSkeleton />;
  if (variant === 'detail') return <DetailSkeleton />;
  return <MapSkeleton />;
}
