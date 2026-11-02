import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MapPage } from './pages/MapPage';
import { EventsListPage } from './pages/EventsListPage';
import { EventDetailPage } from './pages/EventDetailPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MapPage />,
  },
  {
    // Ancienne adresse de la carte : conservée pour les liens et iframes existants.
    path: '/carte',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/evenements',
    element: <EventsListPage />,
  },
  {
    path: '/evenement/:id',
    element: <EventDetailPage />,
  },
]);
