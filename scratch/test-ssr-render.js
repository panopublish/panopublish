const serverModule = await import('../dist/server/index.js');
const handler = serverModule.default || serverModule;

const testRoutes = ['/', '/pricing', '/blog', '/google-street-view-publishing'];

for (const routePath of testRoutes) {
  const req = new Request(`http://localhost:3000${routePath}`, {
    headers: { 'accept': 'text/html' }
  });
  const res = await handler.fetch(req, {}, {});
  const html = await res.text();
  console.log(`Route: ${routePath} | Status: ${res.status} | HTML Length: ${html.length}`);
  const hasH1 = html.includes('<h1');
  const hasTitle = html.includes('<title>');
  console.log(`  -> Has <title>: ${hasTitle}, Has <h1>: ${hasH1}`);
}
