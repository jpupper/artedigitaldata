/** Prueba de punta a punta del fondo por obra, con la cuenta carloskernel:
 *  1) login  2) POST /posts con fondoShader  3) GET público (persistió)  4) PATCH lo cambia
 *  Uso: node tools/test_fondo_obra_api.js [compPrueba]
 */
const fs = require('fs');
const path = require('path');

const PROJ = path.resolve(__dirname, '..');
const API = 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api';
const comp = process.argv[2] || 'nodeeditor-8347';

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
  const cred = env(path.join(PROJ, '..', 'skillmaestrofsc', '.carloskernel.env'));
  const login = await fetch('https://vps-4455523-x.dattaweb.com/fscauth/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cred.CARLOSKERNEL_EMAIL, password: cred.CARLOSKERNEL_PASS })
  });
  const sesion = await login.json();
  if (!sesion.token) throw new Error('login falló: ' + JSON.stringify(sesion).slice(0, 200));
  const H = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sesion.token };
  console.log('1) login OK como', sesion.user && (sesion.user.username || sesion.user.email));

  const alta = await fetch(API + '/posts', {
    method: 'POST', headers: H,
    body: JSON.stringify({
      title: 'PRUEBA fondo por obra (CarlosKernel)',
      description: 'Post de prueba automática: verifica que cada obra pueda tener su propio fondo animado.',
      imageUrl: 'https://fullscreencode.com/fscauth/img/isotipo-sin-fondo.png',
      tags: ['prueba', 'fondo'], visibility: 'public',
      fondoShader: comp
    })
  });
  const post = await alta.json();
  if (!alta.ok) throw new Error('POST falló: ' + JSON.stringify(post).slice(0, 300));
  console.log('2) POST /posts ->', alta.status, '| id:', post._id, '| fondoShader guardado:', JSON.stringify(post.fondoShader));

  const publico = await (await fetch(API + '/posts/' + post._id)).json();
  const p = Array.isArray(publico) ? publico[0] : (publico.post || publico);
  console.log('3) GET público   -> fondoShader persistido:', JSON.stringify(p && p.fondoShader));

  const patch = await fetch(API + '/posts/' + post._id, {
    method: 'PATCH', headers: H, body: JSON.stringify({ fondoShader: 'sancarlopoliroso6' })
  });
  const r = await patch.json();
  const q = Array.isArray(r) ? r[0] : (r.post || r);
  console.log('4) PATCH         ->', patch.status, '| fondoShader ahora:', JSON.stringify(q && q.fondoShader));

  // vuelvo a dejarlo en la comp pedida para que la página de la obra la muestre
  await fetch(API + '/posts/' + post._id, { method: 'PATCH', headers: H, body: JSON.stringify({ fondoShader: comp }) });

  // inválido debe caer a ''
  const malo = await fetch(API + '/posts', {
    method: 'POST', headers: H,
    body: JSON.stringify({ title: 'PRUEBA fondo inválido', description: 'x', visibility: 'private', fondoShader: '<script>alert(1)</script>' })
  });
  const postMalo = await malo.json();
  console.log('5) comp inválida -> se guarda como:', JSON.stringify(postMalo.fondoShader), '(debe ser "")');

  console.log('\nURL de la obra de prueba: https://artedigitaldata.com/post.html?id=' + post._id);
  console.log('id para borrar cuando quieras:', post._id, '|', postMalo._id);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
