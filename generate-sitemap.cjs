const fs = require('fs');
const path = require('path');
const { allRouteObjects } = require('./routes.config.cjs');

const baseUrl = 'https://panopublish.com';
const today = new Date().toISOString().split('T')[0];

console.log(`Generating sitemap for ${allRouteObjects.length} routes...`);

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

allRouteObjects.forEach((route) => {
  const url = `${baseUrl}${route.path === '/' ? '' : route.path}`;
  const priority = route.priority || '0.7';
  const changefreq = route.changefreq || 'weekly';

  xml += `  <url>\n`;
  xml += `    <loc>${url}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>${changefreq}</changefreq>\n`;
  xml += `    <priority>${priority}</priority>\n`;
  xml += `  </url>\n`;
});

xml += `</urlset>\n`;

// Write to public/sitemap.xml (which Vite copies to dist/client/sitemap.xml during build)
fs.writeFileSync(path.join(__dirname, 'public/sitemap.xml'), xml, 'utf8');
console.log('Sitemap generated successfully in public/sitemap.xml!');
