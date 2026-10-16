/** Smoke test: outputeffect.html (también carga js/particulas.js) no se rompe con el
 *  importador nuevo y NO le cambia la base de diseño al reproductor.
 *  node tools/smoke_outputeffect.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const BASE = 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api';

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
  const h = { Authorization: 'Bearer ' + ses.token };
  const efectos = await (await fetch(BASE + '/visualeffects/my', { headers: h })).json();
  const id = Array.isArray(efectos) && efectos[0] ? efectos[0]._id : null;
  console.log('efecto a reproducir:', id, efectos[0] ? efectos[0].title : '');

  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('artedigitaldata_token', t);
    localStorage.setItem('artedigitaldata_user', u);
  }, [ses.token, JSON.stringify(usuario)]);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  p.on('console', m => { if (m.type() === 'error' && !/generative-shaders|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 140)); });

  await p.goto('http://localhost:3000/outputeffect.html?id=' + id, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(9000);
  const estado = await p.evaluate(() => ({
    tienePanel: !!document.getElementById('vim-lista'),
    tieneVEImportador: typeof window.VEImportador,
    baseDiseno: window.FSC_VIM_BASE_DISENO,
    vpBase: window.FSC_VIEWPORT_BASE,
    vpBaseOriginal: window.FSC_VIM_VIEWPORT_ORIGINAL === undefined ? 'n/a' : window.FSC_VIM_VIEWPORT_ORIGINAL,
    imagenes: (window.activeImageLayers || []).length,
    palabras: (window.flyerWordsList || window.flyerWords || []).length || (window.CFG && window.CFG.FLYER_WORDS ? window.CFG.FLYER_WORDS.length : 0),
    vueltas: (window.getWordIndex ? window.getWordIndex() : 'n/a')
  }));
  console.log(JSON.stringify(estado, null, 1));
  console.log('errores propios:', errs.length, errs.slice(0, 3));
  await p.screenshot({ path: OUT + 'vim_smoke_outputeffect.png' });
  await b.close();
})();
