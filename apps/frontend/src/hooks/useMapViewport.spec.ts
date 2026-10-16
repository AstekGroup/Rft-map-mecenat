import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FRANCE_DEFAULT_VIEW } from '@/hooks';
import { useMapViewport } from './useMapViewport';

describe('useMapViewport', () => {
  it('expose la vue France par défaut via le point d’entrée des hooks', () => {
    expect(FRANCE_DEFAULT_VIEW).toEqual({
      longitude: 2.2137,
      latitude: 46.2276,
      zoom: 5.5,
    });
  });

  it('initialise avec le centre de la France', () => {
    const { result } = renderHook(() => useMapViewport());
    expect(result.current.viewport.longitude).toBeCloseTo(2.2137);
    expect(result.current.viewport.latitude).toBeCloseTo(46.2276);
    expect(result.current.viewport.zoom).toBe(5.5);
  });

  it('onMove met à jour le viewport', () => {
    const { result } = renderHook(() => useMapViewport());
    const newViewState = {
      longitude: 4.8357,
      latitude: 45.7640,
      zoom: 10,
      bearing: 0,
      pitch: 0,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    };

    act(() => {
      result.current.onMove({ viewState: newViewState });
    });

    expect(result.current.viewport.longitude).toBeCloseTo(4.8357);
    expect(result.current.viewport.latitude).toBeCloseTo(45.7640);
    expect(result.current.viewport.zoom).toBe(10);
  });

  it('flyTo déplace le viewport vers les coordonnées données', () => {
    const { result } = renderHook(() => useMapViewport());

    act(() => {
      result.current.flyTo(2.3522, 48.8566, 12);
    });

    expect(result.current.viewport.longitude).toBeCloseTo(2.3522);
    expect(result.current.viewport.latitude).toBeCloseTo(48.8566);
    expect(result.current.viewport.zoom).toBe(12);
  });

  it('flyTo conserve le zoom actuel si non précisé', () => {
    const { result } = renderHook(() => useMapViewport());
    const initialZoom = result.current.viewport.zoom;

    act(() => {
      result.current.flyTo(2.3522, 48.8566);
    });

    expect(result.current.viewport.zoom).toBe(initialZoom);
  });

  it('resetView retourne au centre de la France', () => {
    const { result } = renderHook(() => useMapViewport());

    act(() => {
      result.current.flyTo(4.8357, 45.7640, 12);
    });

    act(() => {
      result.current.resetView();
    });

    expect(result.current.viewport.longitude).toBeCloseTo(2.2137);
    expect(result.current.viewport.latitude).toBeCloseTo(46.2276);
    expect(result.current.viewport.zoom).toBe(5.5);
  });

  it('zoomIn augmente le zoom de 1', () => {
    const { result } = renderHook(() => useMapViewport());
    const initialZoom = result.current.viewport.zoom;

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.viewport.zoom).toBe(initialZoom + 1);
  });

  it('zoomOut diminue le zoom de 1', () => {
    const { result } = renderHook(() => useMapViewport());
    const initialZoom = result.current.viewport.zoom;

    act(() => {
      result.current.zoomOut();
    });

    expect(result.current.viewport.zoom).toBe(initialZoom - 1);
  });

  it('zoomIn est limité à 18', () => {
    const { result } = renderHook(() => useMapViewport());

    act(() => {
      result.current.setViewport(prev => ({ ...prev, zoom: 18 }));
    });

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.viewport.zoom).toBe(18);
  });

  it('zoomOut est limité à 3', () => {
    const { result } = renderHook(() => useMapViewport());

    act(() => {
      result.current.setViewport(prev => ({ ...prev, zoom: 3 }));
    });

    act(() => {
      result.current.zoomOut();
    });

    expect(result.current.viewport.zoom).toBe(3);
  });
});
