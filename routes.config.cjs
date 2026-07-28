const fs = require('fs');
const path = require('path');

function getPublicRoutes() {
  const seoPagesFilePath = path.join(__dirname, 'src/lib/seo-pages-data.ts');
  const cluster1FilePath = path.join(__dirname, 'src/lib/cluster1-virtual-tour-software-data.ts');
  const cluster2FilePath = path.join(__dirname, 'src/lib/cluster2-google-street-view-data.ts');
  const cluster3FilePath = path.join(__dirname, 'src/lib/cluster3-360-photography-data.ts');
  const cluster4FilePath = path.join(__dirname, 'src/lib/cluster4-industry-solutions-data.ts');
  const authorsFilePath = path.join(__dirname, 'src/lib/authors-data.ts');
  const caseStudiesFilePath = path.join(__dirname, 'src/lib/case-studies-data.ts');

  const content = fs.readFileSync(seoPagesFilePath, 'utf8') + '\n' + 
    (fs.existsSync(cluster1FilePath) ? fs.readFileSync(cluster1FilePath, 'utf8') : '') + '\n' + 
    (fs.existsSync(cluster2FilePath) ? fs.readFileSync(cluster2FilePath, 'utf8') : '') + '\n' + 
    (fs.existsSync(cluster3FilePath) ? fs.readFileSync(cluster3FilePath, 'utf8') : '') + '\n' + 
    (fs.existsSync(cluster4FilePath) ? fs.readFileSync(cluster4FilePath, 'utf8') : '');

  // Match slug and type from seo-pages-data.ts (supports TS objects and JSON formatting)
  const regex = /"?slug"?:?\s*["']([^"']+)["'][\s\S]*?"?type"?:?\s*["']([^"']+)["']/g;
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

  // Add Authors routes from authors-data.ts
  if (fs.existsSync(authorsFilePath)) {
    const authorsContent = fs.readFileSync(authorsFilePath, 'utf8');
    const authorSlugRegex = /"slug":\s*["']([^"']+)["']/g;
    let authorMatch;
    while ((authorMatch = authorSlugRegex.exec(authorsContent)) !== null) {
      dynamicPages.push({
        slug: authorMatch[1],
        type: 'author',
        path: `/authors/${authorMatch[1]}`
      });
    }
  }

  // Add Case Studies routes from case-studies-data.ts
  if (fs.existsSync(caseStudiesFilePath)) {
    const caseStudiesContent = fs.readFileSync(caseStudiesFilePath, 'utf8');
    const csSlugRegex = /\n\s*slug:\s*["']([^"']+)["']/g;
    let csMatch;
    while ((csMatch = csSlugRegex.exec(caseStudiesContent)) !== null) {
      dynamicPages.push({
        slug: csMatch[1],
        type: 'case-study',
        path: `/case-studies/${csMatch[1]}`
      });
    }
  }

  const staticPublicRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/blog', priority: '0.9', changefreq: 'daily' },
    { path: '/pricing', priority: '0.8', changefreq: 'weekly' },
    { path: '/faq', priority: '0.8', changefreq: 'weekly' },
    { path: '/case-studies', priority: '0.8', changefreq: 'weekly' },
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
