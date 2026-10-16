/* Prueba decisiva: ¿el fondo animado llega a los contenedores?
   Compara el MISMO recorte del contenedor con el fondo encendido y con el
   fondo apagado (#jpsi-canvas display:none).
   dif≈0  -> el fondo no incide ahí: más transparencia no cambia nada.
   dif>5  -> el fondo sí se ve a través del vidrio.
   Uso: node tools/diag_glass2.js [url] */
const { chromium } = require('playwright');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const URL = process.argv[2] || 'https://artedigitaldata.com/';

const medir = async (page, buf) => page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let r = 0, g = 0, b = 0, n = 0, max = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; max = Math.max(max, d[i], d[i + 1], d[i + 2]); }
  return { m: [Math.round(r / n), Math.round(g / n), Math.round(b / n)], max };
}, buf.toString('base64'));

const difDe = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

(async () => {
  const browser = await chromium
    .launch({ headless: true, channel: 'msedge' })
    .catch(() => chromium.launch({ headless: true, channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(URL + '?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(10000);

  const caja = (sel, i = 0) => page.evaluate(({ sel, i }) => {
    const el = document.querySelectorAll(sel)[i];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight;
    const x = Math.max(0, Math.round(r.x)), y = Math.max(0, Math.round(r.y));
    const width = Math.round(Math.min(r.width, W - x - 1)), height = Math.round(Math.min(r.height, H - y - 1));
    if (width < 5 || height < 5) return null;
    return { x, y, width, height };
  }, { sel, i });

  const apagarFondo = async (off) => {
    await page.evaluate((off) => {
      const c = document.getElementById('jpsi-canvas');
      if (c) c.style.display = off ? 'none' : '';
    }, off);
    await page.waitForTimeout(1200);
  };

  const lista = [
    ['hero .fk-hero', '.fk-hero', 0],
    ['tarjeta fijada', '#pinned-container .card-cyber', 0],
    ['tarjeta feed (1a)', '#feed-container .card-cyber', 0],
    ['tarjeta feed (3a)', '#feed-container .card-cyber', 2],
    ['header', '.ui-header', 0],
  ];
  for (const [nombre, sel, i] of lista) {
    const box = await caja(sel, i);
    if (!box) { console.log(`${nombre.padEnd(18)} sin caja visible`); continue; }
    await apagarFondo(false);
    const con = await medir(page, await page.screenshot({ clip: box }));
    await apagarFondo(true);
    const sin = await medir(page, await page.screenshot({ clip: box }));
    await apagarFondo(false);
    const d = difDe(con.m, sin.m);
    console.log(`${nombre.padEnd(18)} conFondo=${con.m.join('/')}(max ${con.max})  sinFondo=${sin.m.join('/')}(max ${sin.max})  dif=${d}  ${d > 5 ? 'EL FONDO SE VE' : 'no incide'}`);
  }

  // capturo el hero con y sin fondo para mostrar
  const hb = await caja('.fk-hero', 0);
  await apagarFondo(false); require('fs').writeFileSync(OUT + 'hero_confondo.png', await page.screenshot({ clip: hb }));
  await apagarFondo(true); require('fs').writeFileSync(OUT + 'hero_sinfondo.png', await page.screenshot({ clip: hb }));
  await apagarFondo(false);
  console.log('capturas: ' + OUT + 'hero_confondo.png / hero_sinfondo.png');
  await browser.close();
})();
