/** Verifica que GUARDAR el proyecto generado por el importador incluye TODO lo que el
 *  flyer necesita: timeline (capas + clips), palabras, capas de imagen con ajuste/rel y
 *  la base de diseño (viewportBase). Intercepta el POST /visualeffects: NO escribe en
 *  producción.
 *
 *  node tools/verify_guardado_flyer.js     (necesita: python -m http.server 3000 --directory public)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const CONV = '6aa84bda4931621eba633509';

function env(file) {
  const out = {};
  fs.readFileSync(file, 'utf8').split('\n').forEach(l => {
    l = l.trim();
    if (!l || l[0] === '#' || !l.includes('=')) return;
    const i = l.indexOf('=');
    out[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  return out;
}

(async () => {
  const cred = env(path.resolve(__dirname, '..', '..', 'skillmaestrofsc', '.carloskernel.env'));
  const ses = await (await fetch('https://vps-4455523-x.dattaweb.com/fscauth/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cred.CARLOSKERNEL_EMAIL, password: cred.CARLOSKERNEL_PASS })
  })).json();
  const usuario = { _id: ses.user.id, id: ses.user.id, username: ses.user.username, role: ses.user.role };

  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 940 } });
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('artedigitaldata_token', t);
    localStorage.setItem('artedigitaldata_user', u);
  }, [ses.token, JSON.stringify(usuario)]);

  const capturado = [];
  await ctx.route('**/visualeffects', route => {
    const req = route.request();
    if (req.method() === 'POST') capturado.push(req.postData());
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ effect: { _id: '000000000000000000000000' } }) });
  });

  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  p.on('dialog', d => d.accept('Flyer de prueba (verificación)'));
  await p.goto('http://localhost:3000/visualeffects.html', { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(4000);

  await p.evaluate(id => window.VEImportador.importarConvocatoria(id), CONV);
  await p.waitForFunction(() => window.VEImportador.medir().duracion > 60, { timeout: 120000 });
  await p.waitForTimeout(3000);

  await p.click('#btn-save-fx');
  await p.waitForTimeout(4000);

  const ok = [];
  const check = (n, c, d) => { ok.push(!!c); console.log((c ? '  OK   ' : '  FALLA ') + n + (d !== undefined ? '   -> ' + d : '')); };

  if (!capturado.length) {
    console.log('  FALLA no se capturó ningún POST /visualeffects');
    await b.close();
    process.exit(1);
  }
  const body = JSON.parse(capturado[capturado.length - 1]);
  const imgs = (body.config && body.config.IMAGE_LAYERS) || [];
  const clips = (body.timelineLayers || []).reduce((a, l) => a + (l.clips || []).length, 0);
  check('el POST lleva el título', !!body.title, body.title);
  check('timeline completa (18 capas / 81 clips)', body.timelineLayers.length === 18 && clips === 81,
    body.timelineLayers.length + ' capas · ' + clips + ' clips');
  check('timelineDuration y hasTimeline', body.timelineDuration === 126.2 && body.hasTimeline === true,
    body.timelineDuration + ' / ' + body.hasTimeline);
  check('flyerWords con los textos del flyer', body.flyerWords.length === 64, body.flyerWords.length + ' palabras');
  check('las 17 capas de imagen viajan en config.IMAGE_LAYERS', imgs.length === 17, imgs.length + ' imágenes');
  check('las imágenes conservan ajuste:cover y rel:true (y ninguna queda oculta)',
    imgs.filter(i => i.ajuste === 'cover').length === 9 && imgs.filter(i => i.rel === true).length === 17 &&
    imgs.every(i => i.visible !== false) && imgs.every(i => !!i.src),
    'cover=' + imgs.filter(i => i.ajuste === 'cover').length + ' rel=' + imgs.filter(i => i.rel === true).length +
    ' con src=' + imgs.filter(i => !!i.src).length + ' ocultas=' + imgs.filter(i => i.visible === false).length);
  check('viewportBase en el payload y en la config',
    Array.isArray(body.viewportBase) && body.viewportBase[0] === 1080 && body.viewportBase[1] === 1920 &&
    body.config.VIEWPORT_BASE && body.config.VIEWPORT_BASE[0] === 1080,
    JSON.stringify(body.viewportBase) + ' / ' + JSON.stringify(body.config.VIEWPORT_BASE));
  check('las palabras NO llevan giro (spin)', (body.flyerWords || []).every(w => !w.spin) &&
    (body.timelineLayers || []).every(l => (l.clips || []).every(c => !c.spin)));
  check('sin errores de JS', errs.length === 0, errs.slice(0, 2).join(' | '));

  fs.writeFileSync(OUT + 'vim_guardado_payload.json', JSON.stringify({
    title: body.title, timelineLayers: body.timelineLayers.length, clips: clips, flyerWords: body.flyerWords.length,
    imagenes: imgs.length, viewportBase: body.viewportBase,
    muestraImagen: imgs[0], muestraClipImagen: (body.timelineLayers.filter(l => l.type === 'image')[0] || {}).clips[0]
  }, null, 1));
  console.log('\n  ' + ok.filter(Boolean).length + '/' + ok.length + ' comprobaciones OK');
  console.log('  muestra guardada en ' + OUT + 'vim_guardado_payload.json');
  await b.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
