// Verifica que el FONDO del shader se vea (y no el gradiente que lo tapaba) + que el set de obras cargue
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const URL = 'https://artedigitaldata.com/flyer.html?id=6aa84bda4931621eba633509&play=1';

// mide "cuánto varía el color" de la mitad superior (sin palabras): el shader varía mucho, un gradiente casi nada
const analizar = async (p) => {
  const png = await p.screenshot();
  const r = await p.evaluate(async (d) => {
    const img = new Image(); await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + d; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
    const zona = cx.getImageData(0, 20, c.width, 90).data;   // franja arriba, sin texto
    let n = 0, s = 0, s2 = 0;
    for (let i = 0; i < zona.length; i += 4) { const v = (zona[i] + zona[i + 1] + zona[i + 2]) / 3; n++; s += v; s2 += v * v; }
    const media = s / n, varianza = Math.sqrt(s2 / n - media * media);
    return { media: Math.round(media), desvio: Math.round(varianza) };
  }, png.toString('base64'));
  return { png, ...r };
};

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));

  // escritorio
  let p = await b.newPage({ viewport: { width: 900, height: 1400 } });
  await p.goto(URL + '&nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(13000);
  const fondoE = await analizar(p);
  const est = await p.evaluate(() => ({
    hayCanvasShader: !!document.getElementById('jpsi-canvas'),
    shaderSize: (() => { const c = document.getElementById('jpsi-canvas'); return c ? c.width + 'x' + c.height : null; })(),
    meta: document.getElementById('fly-meta').textContent.slice(0, 34),
    cargando: !document.getElementById('fly-estado').classList.contains('ui-hidden'),
    stageFondo: getComputedStyle(document.getElementById('fly-stage')).backgroundImage.slice(0, 30),
  }));
  console.log('escritorio ->', JSON.stringify({ ...est, ...fondoE, png: undefined }));
  fs.writeFileSync(OUT + 'fondo_restaurado.png', fondoE.png);
  await p.close();

  // celular
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  p = await ctx.newPage();
  await p.goto(URL + '&nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(14000);
  const fondoM = await analizar(p);
  console.log('celular  ->', JSON.stringify(await p.evaluate(() => ({
    shader: !!document.getElementById('jpsi-canvas'),
    meta: document.getElementById('fly-meta').textContent.slice(0, 34),
    cargando: !document.getElementById('fly-estado').classList.contains('ui-hidden'),
    barra: document.getElementById('fly-barra-fill').style.width,
  })), null, 0), '| desvío del fondo:', fondoM.desvio, '(>8 = hay textura/shader)');
  fs.writeFileSync(OUT + 'fondo_celu.png', fondoM.png);
  await b.close();
})();
