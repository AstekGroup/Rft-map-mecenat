export type MapStyleId = 'bright' | 'liberty' | 'positron';

export interface MapStyleOption {
  id: MapStyleId;
  name: string;
  description: string;
  url: string;
}

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'bright',
    name: 'Bright',
    description: 'Coloré et détaillé',
    url: '/map-style-bright-fr.json',
  },
  {
    id: 'liberty',
    name: 'Liberty',
    description: 'Moderne avec effet 3D',
    url: '/map-style-liberty-fr.json',
  },
  {
    id: 'positron',
    name: 'Positron',
    description: 'Clair et minimaliste',
    url: '/map-style-positron-fr.json',
  },
];
