// Verifica en el navegador: una obra CON fondo propio carga su comp; una SIN fondo queda igual que siempre
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const API = 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api';
const ID_PRUEBA = process.argv[2] || '6acef67b0f0270a397345089';

const medir = (p) => p.evaluate(() => {
  const s = document.querySelector('script[src*="include.js"]');
  const canvas = document.querySelectorAll('canvas');
  return {
    dataPage: s ? s.getAttribute('data-page') : null,
    dataComp: s ? s.getAttribute('data-comp') : null,
    dataPass: s ? s.getAttribute('data-pass') : null,
    scriptsInclude: document.querySelectorAll('script[src*="include.js"]').length,
    canvases: canvas.length,
    canvasGrande: Array.from(canvas).some(c => c.width > 300 && c.height > 300),
  };
});

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const errs = [];
  const abrir = async (id, nombre) => {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    p.on('pageerror', e => errs.push(nombre + ': ' + String(e).slice(0, 80)));
    await p.goto('https://artedigitaldata.com/post.html?id=' + id + '&nc=' + Date.now(), { waitUntil: 'load' });
    await p.waitForTimeout(12000);
    const info = await medir(p);
    fs.writeFileSync(OUT + 'fondo_' + nombre + '.png', await p.screenshot());
    console.log(nombre, JSON.stringify(info));
    await p.close();
  };

  await abrir(ID_PRUEBA, 'con_fondo');

  // una obra existente sin fondo propio (para comparar que no cambió nada)
  try {
    const lista = await (await fetch(API + '/posts?limit=6')).json();
    const posts = Array.isArray(lista) ? lista : (lista.posts || []);
    const sinFondo = posts.find(x => x && x._id && !x.fondoShader && x._id !== ID_PRUEBA);
    if (sinFondo) await abrir(sinFondo._id, 'sin_fondo');
    else console.log('(no encontré una obra sin fondo para comparar)');
  } catch (e) { console.log('no pude listar obras:', e.message); }

  console.log('errores:', errs.length, errs.slice(0, 3));
  await b.close();
})();
