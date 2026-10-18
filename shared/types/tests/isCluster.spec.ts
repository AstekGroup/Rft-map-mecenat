import { describe, expect, it } from 'vitest';
import { isCluster } from '../src';
import type { ClusterFeature, EventFeature, MapFeature } from '../src';

const cluster: ClusterFeature = {
  type: 'Feature',
  id: 1,
  properties: { cluster: true, cluster_id: 1, point_count: 12, point_count_abbreviated: 12 },
  geometry: { type: 'Point', coordinates: [2.35, 48.85] },
};

describe('isCluster', () => {
  it('reconnaît un cluster', () => {
    expect(isCluster(cluster)).toBe(true);
  });

  it('ne prend pas un événement pour un cluster', () => {
    // Un événement n'a pas de propriété `cluster` : seul le garde de type est exercé ici.
    const event = {
      type: 'Feature',
      properties: { id: 'E1', title: 'Atelier' },
      geometry: { type: 'Point', coordinates: [2.35, 48.85] },
    } as unknown as EventFeature;
    expect(isCluster(event as MapFeature)).toBe(false);
  });

  it('exige cluster === true (une valeur fausse ne suffit pas)', () => {
    const notCluster = {
      ...cluster,
      properties: { ...cluster.properties, cluster: false },
    } as unknown as MapFeature;
    expect(isCluster(notCluster)).toBe(false);
  });
});
