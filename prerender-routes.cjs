const fs = require('fs');
const path = require('path');
const { allRouteObjects } = require('./routes.config.cjs');

async function prerender() {
  console.log('Starting prerendering of public routes...');
  
  const serverPath = path.join(__dirname, 'dist/server/index.js');
  if (!fs.existsSync(serverPath)) {
    console.error('Error: dist/server/index.js does not exist. Run vite build first.');
    process.exit(1);
  }

  const serverModule = await import('./dist/server/index.js');
  const handler = serverModule.default || serverModule;

  let count = 0;

  for (const route of allRouteObjects) {
    const routePath = route.path;
    const req = new Request(`http://localhost:3000${routePath}`, {
      headers: { 'accept': 'text/html' }
    });

    try {
      const res = await handler.fetch(req, {}, {});
      if (res.status !== 200) {
        console.warn(`[WARN] Route ${routePath} returned status ${res.status}`);
        continue;
      }

      const html = await res.text();

      // Determine output file path in dist/client
      let targetFile;
      if (routePath === '/') {
        targetFile = path.join(__dirname, 'dist/client/index.html');
      } else {
        const dir = path.join(__dirname, 'dist/client', routePath.replace(/^\//, ''));
        fs.mkdirSync(dir, { recursive: true });
        targetFile = path.join(dir, 'index.html');
      }

      fs.writeFileSync(targetFile, html, 'utf8');
      count++;
      console.log(`[PRERENDER] Prerendered ${routePath} -> ${path.relative(__dirname, targetFile)} (${html.length} bytes)`);
    } catch (err) {
      console.error(`[ERROR] Failed to prerender ${routePath}:`, err);
    }
  }

  console.log(`Prerendering complete! Successfully prerendered ${count}/${allRouteObjects.length} routes.`);
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
