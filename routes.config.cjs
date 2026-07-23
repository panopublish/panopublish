const fs = require('fs');
const path = require('path');

function getPublicRoutes() {
  const seoPagesFilePath = path.join(__dirname, 'src/lib/seo-pages-data.ts');
  const content = fs.readFileSync(seoPagesFilePath, 'utf8');

  // Match slug and type from seo-pages-data.ts
  const regex = /slug:\s*["']([^"']+)["'][\s\S]*?type:\s*["']([^"']+)["']/g;
  let match;
  const dynamicPages = [];

  while ((match = regex.exec(content)) !== null) {
    const slug = match[1];
    const type = match[2];
    let routePath = `/${slug}`;
    if (type === 'blog') {
      routePath = `/blog/${slug}`;
    }
    dynamicPages.push({
      slug,
      type,
      path: routePath
    });
  }

  const staticPublicRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/blog', priority: '0.9', changefreq: 'daily' },
    { path: '/pricing', priority: '0.8', changefreq: 'weekly' },
    { path: '/contact', priority: '0.7', changefreq: 'monthly' },
    { path: '/signup', priority: '0.6', changefreq: 'monthly' },
    { path: '/login', priority: '0.5', changefreq: 'monthly' },
    { path: '/terms', priority: '0.3', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.3', changefreq: 'monthly' },
    { path: '/refund', priority: '0.3', changefreq: 'monthly' }
  ];

  const dynamicRoutes = dynamicPages.map(page => {
    let priority = '0.7';
    let changefreq = 'weekly';
    if (page.type === 'blog') {
      priority = '0.8';
    } else if (page.type === 'service') {
      priority = '0.8';
    }
    return {
      path: page.path,
      slug: page.slug,
      type: page.type,
      priority,
      changefreq
    };
  });

  return {
    staticPublicRoutes,
    dynamicRoutes,
    allPublicRoutes: [...staticPublicRoutes.map(r => r.path), ...dynamicRoutes.map(r => r.path)],
    allRouteObjects: [...staticPublicRoutes, ...dynamicRoutes]
  };
}

module.exports = getPublicRoutes();
