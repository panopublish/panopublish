const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'src/lib/seo-pages-data.ts'), 'utf8');

// Match:
//   slug: "google-street-view-publishing",
//   type: "service",
// We capture both slug and type
const regex = /slug:\s*["']([^"']+)["'][\s\S]*?type:\s*["']([^"']+)["']/g;
let match;
const pages = [];

while ((match = regex.exec(content)) !== null) {
  pages.push({
    slug: match[1],
    type: match[2]
  });
}

console.log(`Found ${pages.length} dynamic pages.`);

const baseUrl = 'https://app.panopublish.com';

// Start building XML
let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/pricing</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/signup</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/refund</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
`;

// Add dynamic SEO pages
pages.forEach(page => {
  let url = `${baseUrl}/${page.slug}`;
  let priority = '0.7';
  let changefreq = 'weekly';

  if (page.type === 'blog') {
    url = `${baseUrl}/blog/${page.slug}`;
    priority = '0.8';
  } else if (page.type === 'city') {
    priority = '0.7';
  } else if (page.type === 'service') {
    priority = '0.8';
  }

  xml += `  <url>
    <loc>${url}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
});

xml += `</urlset>\n`;

fs.writeFileSync(path.join(__dirname, 'public/sitemap.xml'), xml, 'utf8');
console.log('Sitemap generated successfully in public/sitemap.xml!');
