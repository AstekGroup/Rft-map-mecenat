const fs = require('fs');
const path = require('path');

// Paths
const configPath = path.resolve(__dirname, '../../../app.config.json');
const indexHtmlPath = path.resolve(__dirname, '../index.html');

// Read config
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Extract values
const appDescription = config.app.description;
const metaTitle = config.texts.meta.title;
const metaOgTitle = config.texts.meta.ogTitle;
const metaOgDescription = config.texts.meta.ogDescription;
const iconRef = config.texts.meta.iconRef;

// Read index.html
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Replace values
indexHtml = indexHtml.replace(
  '<meta name="description" content="description" />',
  `<meta name="description" content="${appDescription}" />`
);

indexHtml = indexHtml.replace(
  '<meta property="og:title" content="og:title" />',
  `<meta property="og:title" content="${metaOgTitle}" />`
);

indexHtml = indexHtml.replace(
  '<meta property="og:description" content="og:description" />',
  `<meta property="og:description" content="${metaOgDescription}" />`
);

indexHtml = indexHtml.replace(
  '<meta property="twitter:title" content="twitter:title" />',
  `<meta property="twitter:title" content="${metaOgTitle}" />`
);

indexHtml = indexHtml.replace(
  '<meta property="twitter:description" content="twitter:description" />',
  `<meta property="twitter:description" content="${metaOgDescription}" />`
);

indexHtml = indexHtml.replace(
  '<title>title</title>',
  `<title>${metaTitle}</title>`
);

// Replace favicon
indexHtml = indexHtml.replace(
  '<link rel="icon" type="image/x-icon" href="iconRef" />',
  `<link rel="icon" type="image/x-icon" href="${iconRef}" />`
);

// Write back index.html
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');

console.log('index.html updated with values from app.config.json');