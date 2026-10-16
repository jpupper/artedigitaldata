/** Probe: qué endpoints devuelven publicaciones / convocatorias para el importador del
 *  editor de efectos. Prueba con la cuenta de tests (token real) e informa status + forma.
 *  Nunca imprime la contraseña.  node tools/probe_importador.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api';
const CONV = process.argv[2] || '6aa84bda4931621eba633509';

function env(file) {
  const out = {};
  for (const linea of fs.readFileSync(file, 'utf8').split('\n')) {
    const l = linea.trim();
    if (!l || l.startsWith('#') || !l.includes('=')) continue;
    const i = l.indexOf('=');
    out[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

(async () => {
  const cred = env(path.resolve(__dirname, '..', '..', 'skillmaestrofsc', '.carloskernel.env'));
  const login = await fetch('https://vps-4455523-x.dattaweb.com/fscauth/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cred.CARLOSKERNEL_EMAIL, password: cred.CARLOSKERNEL_PASS })
  });
  const sesion = await login.json();
  if (!sesion.token) { console.log('LOGIN FALLÓ:', JSON.stringify(sesion).slice(0, 200)); process.exit(1); }
  const H = { Authorization: 'Bearer ' + sesion.token };

  // quién es
  const jwt = JSON.parse(Buffer.from(sesion.token.split('.')[1], 'base64').toString('utf8'));
  console.log('usuario:', jwt.username, '| role:', jwt.role, '| id:', jwt.id);
  console.log('');

  const pruebas = [
    ['GET /posts', {}],
    ['GET /posts/mis-obras', { auth: true }],
    ['GET /eventos', {}],
    ['GET /recursos', {}],
    ['GET /oportunidades', {}],
    ['GET /oportunidades?all=true', { auth: true }],
    ['GET /oportunidades/mis-oportunidades/listar', { auth: true }],
    ['GET /visualeffects/my', { auth: true }],
    ['GET /public/particles-config', {}],
    ['GET /public/oportunidades/' + CONV + '/galeria', {}]
  ];

  for (const [rutaFull, opt] of pruebas) {
    const ruta = rutaFull.replace(/^GET /, '');
    try {
      const res = await fetch(BASE + ruta, { headers: opt.auth ? H : {} });
      const txt = await res.text();
      let data = null; try { data = JSON.parse(txt); } catch (e) {}
      const arr = Array.isArray(data) ? data : (data && Array.isArray(data.obras) ? data.obras : null);
      let extra = '';
      if (arr) {
        extra = ` | items: ${arr.length}`;
        if (arr[0]) {
          const o = arr[0];
          extra += ` | claves[0]: ${Object.keys(o).slice(0, 14).join(',')}`;
          extra += ` | titulo: ${JSON.stringify(o.titulo || o.title || '')}`;
          extra += ` | autor: ${JSON.stringify((o.creador && (o.creador.displayName || o.creador.username)) || (o.author && (o.author.displayName || o.author.username)) || o.author || '')}`;
          extra += ` | createdAt: ${o.createdAt || ''}`;
        }
      } else if (data && typeof data === 'object') {
        extra = ' | claves: ' + Object.keys(data).slice(0, 12).join(',');
        if (data.oportunidad) extra += ` | conv: ${data.oportunidad.titulo} (obras ${data.total})`;
      }
      console.log(`${res.status}  ${ruta}${extra}`);
      if (!res.ok) console.log('      body:', txt.slice(0, 160));
    } catch (e) {
      console.log(`ERR  ${ruta} → ${e.message}`);
    }
  }
})().catch(e => console.error('ERROR', e.message));
