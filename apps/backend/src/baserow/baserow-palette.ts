/**
 * Palette des pastilles des options de liste de choix Baserow : nom de couleur renvoyé par l'API
 * (`option.color`) vers le code affiché par Baserow. Constante de l'outil Baserow, identique pour
 * toutes les cartes (pas une couleur de marque).
 *
 * Source : bundle du web-frontend de l'image `baserow/baserow:2.4.1`. Le sélecteur de couleur ne
 * propose que les 40 premières (4 lignes de 10) ; les teintes `muted-*` et `deep-dark-*` peuvent
 * toutefois être attribuées par Baserow (couleur aléatoire d'une option créée à la volée). À
 * revérifier à chaque montée de version de Baserow : une couleur absente d'ici est signalée dans
 * les journaux et affichée avec la couleur de repli.
 */
export const BASEROW_SELECT_PALETTE: Readonly<Record<string, string>> = {
  'light-blue': '#f0f4fc',
  'light-green': '#ecfcf1',
  'light-cyan': '#cff5fa',
  'light-orange': '#fffbf0',
  'light-yellow': '#fffbf0',
  'light-red': '#fff2f0',
  'light-brown': '#f5e6dc',
  'light-purple': '#f9f1fd',
  'light-pink': '#f7e1f2',
  'light-gray': '#f5f5f5',
  blue: '#dae4fd',
  green: '#d0f6dc',
  cyan: '#a0ebf5',
  orange: '#fff4da',
  yellow: '#ffe9b4',
  red: '#ffdeda',
  brown: '#f5ceb0',
  purple: '#dfb9f7',
  pink: '#f7b2e7',
  gray: '#d7d8d9',
  'dark-blue': '#acc8f8',
  'dark-green': '#a0eeba',
  'dark-cyan': '#70e0ef',
  'dark-orange': '#ffe9b4',
  'dark-yellow': '#ffdd8f',
  'dark-red': '#ffbdb4',
  'dark-brown': '#f5c098',
  'dark-purple': '#cf96f2',
  'dark-pink': '#f285d9',
  'dark-gray': '#cdcecd',
  'darker-blue': '#689ef1',
  'darker-green': '#41dd75',
  'darker-cyan': '#41d6ea',
  'darker-orange': '#ffd269',
  'darker-yellow': '#ffd269',
  'darker-red': '#ff7b69',
  'darker-brown': '#f5a96e',
  'darker-purple': '#bf73ee',
  'darker-pink': '#ff6dde',
  'darker-gray': '#b5b5b7',
  'muted-blue': '#3c76c7',
  'muted-green': '#0eaa42',
  'muted-cyan': '#0ea3b7',
  'muted-yellow': '#cc9f36',
  'muted-red': '#cc4836',
  'muted-purple': '#8c40bb',
  'deep-dark-green': '#10bf4a',
  'deep-dark-orange': '#ffc744',
};
