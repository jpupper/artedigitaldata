// Servidor estático que replica el comportamiento de `npx serve public`:
// resuelve URLs limpias (sin extensión .html).
const http = require('http');
const fs = require('fs');
const path = require('path');

// HARNESS_ROOT permite apuntar a una copia intacta del sitio (p. ej. la de
// git HEAD) para regenerar la referencia del CDN después de la migración.
const ROOT = process.env.HARNESS_ROOT
  ? path.resolve(process.env.HARNESS_ROOT)
  : path.resolve(__dirname, '../../public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.mp4': 'video/mp4',
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const rel = path.normalize(clean).replace(/^(\.\.[/\\])+/, '');
  const base = path.join(ROOT, rel);
  if (!base.startsWith(ROOT)) return null;

  const candidates = [base, base + '.html', path.join(base, 'index.html')];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch { /* siguiente candidato */ }
  }
  return null;
}

function createServer() {
  return http.createServer((req, res) => {
    const file = resolveFile(req.url === '/' ? '/index.html' : req.url);
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}

// Puerto 0 = el SO asigna uno libre, y siempre en 127.0.0.1: atarse a `localhost`
// puede colisionar con otro dev server escuchando en ::1.
async function start() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, origin: `http://127.0.0.1:${port}` };
}

module.exports = { createServer, start, ROOT };

if (require.main === module) {
  const port = Number(process.argv[2]) || 4321;
  createServer().listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));
}
