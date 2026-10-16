// Prueba del orden de pintado: el canvas del shader esta en z-index:-1.
// Si el body tiene fondo OPACO, su background pinta DESPUES de los hijos con
// z-index negativo => tapa el canvas. Se comprueba midiendo lo que se VE.
const { chromium } = require('playwright');
const fs = require('fs');

function statsDePng(buf, region) {
  // usa el propio Chromium para leer el PNG -> no se puede aca; se hace en la pagina.
  return buf.length;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(9000);

  // Lo que se ve: screenshot -> se analiza dibujandolo en un canvas 2D (mismo navegador)
  async function verEnPantalla(etiqueta) {
    const png = await page.screenshot({ clip: { x: 900, y: 60, width: 420, height: 130 } }); // zona sin tarjetas
    const b64 = png.toString('base64');
    const r = await page.evaluate(async (data) => {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + data; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      let s = 0, max = 0, n = d.length / 4;
      const hist = {};
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i] + d[i + 1] + d[i + 2]; s += v; if (v > max) max = v;
        const key = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
        hist[key] = (hist[key] || 0) + 1;
      }
      const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, c2]) => k + ' x' + Math.round(100 * c2 / n) + '%');
      return { brilloMedio: +(s / n / 3).toFixed(1), maxRGB: max, coloresDominantes: top };
    }, b64);
    console.log(`${etiqueta}: ${JSON.stringify(r)}`);
    return r;
  }

  console.log('--- PANTALLA tal como esta hoy ---');
  await verEnPantalla('zona vacia (x900-1320,y60-190)');

  const est = await page.evaluate(() => ({
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    canvasBg: getComputedStyle(document.getElementById('jpsi-canvas')).backgroundColor,
    canvasZ: getComputedStyle(document.getElementById('jpsi-canvas')).zIndex,
    bodyHeight: document.body.getBoundingClientRect().height,
  }));
  console.log('estilos: ' + JSON.stringify(est));

  // EXPERIMENTO 1: solo sacar el fondo del BODY (dejando html oscuro)
  await page.evaluate(() => { document.body.style.setProperty('background-color', 'transparent', 'important'); });
  await page.waitForTimeout(1200);
  console.log('\n--- PANTALLA con body transparente (mismo html #0d0d12) ---');
  await verEnPantalla('zona vacia igual');

  // EXPERIMENTO 2: ademas sacar el fondo del canvas
  await page.evaluate(() => { document.getElementById('jpsi-canvas').style.setProperty('background', 'transparent', 'important'); });
  await page.waitForTimeout(1200);
  console.log('\n--- PANTALLA con body + canvas transparentes ---');
  await verEnPantalla('zona vacia igual');

  // comparar contra el contenido del canvas del shader en esa zona
  const canvasZona = await page.evaluate(() => {
    const c = document.getElementById('jpsi-canvas');
    const t = document.createElement('canvas'); t.width = 420; t.height = 130;
    const cx = t.getContext('2d');
    // la zona de pantalla x900..1320, y60..190 en un canvas de c.width x c.height
    const sx = Math.round(900 / window.innerWidth * c.width), sy = Math.round(60 / window.innerHeight * c.height);
    const sw = Math.round(420 / window.innerWidth * c.width), sh = Math.round(130 / window.innerHeight * c.height);
    cx.drawImage(c, sx, sy, sw, sh, 0, 0, t.width, t.height);
    const d = cx.getImageData(0, 0, t.width, t.height).data;
    let s = 0, max = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; s += v; if (v > max) max = v; }
    return { brilloMedio: +(s / n / 3).toFixed(1), maxRGB: max };
  });
  console.log('\nCONTENIDO REAL del canvas del shader en esa misma zona: ' + JSON.stringify(canvasZona));

  fs.writeFileSync('C:/Users/JPupper/AppData/Local/hermes/cache/scratch/con_body_transparente.png', await page.screenshot());
  await browser.close();
})();
