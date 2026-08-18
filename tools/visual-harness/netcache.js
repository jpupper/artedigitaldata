// Cache de red record/replay. Sin esto los snapshots dependerían de la API del VPS,
// de las imágenes de usuarios y de los CDN de fuentes: nada sería comparable
// entre la corrida "before" y la "after".
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.resolve(__dirname, 'netcache');

function keyFor(request) {
  const raw = `${request.method()} ${request.url()}`;
  return crypto.createHash('sha1').update(raw).digest('hex');
}

function paths(key) {
  return {
    meta: path.join(CACHE_DIR, `${key}.json`),
    body: path.join(CACHE_DIR, `${key}.body`),
  };
}

// El CDN de Tailwind se sirve desde el cache igual que todo lo demás, así la
// corrida "before" usa exactamente el mismo build del CDN en cada repetición.
async function attach(context, { record }) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();

    // Lo que sirve nuestro propio servidor estático va directo al disco.
    if (url.startsWith('http://127.0.0.1:')) return route.continue();

    const key = keyFor(request);
    const p = paths(key);

    if (fs.existsSync(p.meta)) {
      const meta = JSON.parse(fs.readFileSync(p.meta, 'utf8'));
      return route.fulfill({
        status: meta.status,
        headers: meta.headers,
        body: fs.existsSync(p.body) ? fs.readFileSync(p.body) : Buffer.alloc(0),
      });
    }

    if (!record) {
      // Nada grabado: cortamos en vez de salir a la red, para no introducir
      // variabilidad silenciosa en una corrida de comparación.
      return route.fulfill({ status: 204, headers: {}, body: '' });
    }

    let response;
    try {
      response = await route.fetch({ timeout: 20000 });
    } catch {
      fs.writeFileSync(p.meta, JSON.stringify({ status: 204, headers: {} }));
      return route.fulfill({ status: 204, headers: {}, body: '' });
    }

    const body = await response.body().catch(() => Buffer.alloc(0));
    const headers = { ...response.headers() };
    // Estas cabeceras rompen el fulfill de Playwright si se reenvían tal cual.
    delete headers['content-encoding'];
    delete headers['content-length'];
    delete headers['transfer-encoding'];

    fs.writeFileSync(p.meta, JSON.stringify({ status: response.status(), headers, url }, null, 2));
    fs.writeFileSync(p.body, body);
    return route.fulfill({ status: response.status(), headers, body });
  });
}

module.exports = { attach, CACHE_DIR };
