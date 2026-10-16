// ¿Se ve el fondo del shader en pantalla? Compara lo que se ve (screenshot) con
// el contenido real del canvas del shader en la misma zona.
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:8899/index.html';
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(9000);

  const zona = { x: 900, y: 60, width: 420, height: 130 };
  const png = await page.screenshot({ clip: zona });
  const b64 = png.toString('base64');

  const res = await page.evaluate(async ({ data, zona }) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + data; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height).data;
    let s = 0, max = 0, n = d.length / 4; const hist = {};
    for (let i = 0; i < d.length; i += 4) {
      const v = d[i] + d[i + 1] + d[i + 2]; s += v; if (v > max) max = v;
      const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; hist[k] = (hist[k] || 0) + 1;
    }
    const dominante = Object.entries(hist).sort((a, b) => b[1] - a[1])[0];

    // el mismo recorte, pero del canvas del shader
    const jc = document.getElementById('jpsi-canvas');
    const t = document.createElement('canvas'); t.width = zona.width; t.height = zona.height;
    const tcx = t.getContext('2d');
    const sx = Math.round(zona.x / window.innerWidth * jc.width), sy = Math.round(zona.y / window.innerHeight * jc.height);
    const sw = Math.round(zona.width / window.innerWidth * jc.width), sh = Math.round(zona.height / window.innerHeight * jc.height);
    tcx.drawImage(jc, sx, sy, sw, sh, 0, 0, t.width, t.height);
    const jd = tcx.getImageData(0, 0, t.width, t.height).data;
    let js2 = 0, jmax = 0;
    for (let i = 0; i < jd.length; i += 4) { const v = jd[i] + jd[i + 1] + jd[i + 2]; js2 += v; if (v > jmax) jmax = v; }

    return {
      pantalla: { brillo: +(s / n / 3).toFixed(1), maxRGB: max, colorDominante: dominante[0] + ' (' + Math.round(100 * dominante[1] / n) + '% del area)' },
      canvasShader: { brillo: +(js2 / (jd.length / 4) / 3).toFixed(1), maxRGB: jmax },
      incluirEstado: window.JPShaderInclude && window.JPShaderInclude.state ? window.JPShaderInclude.state() : null,
      fondos: {
        html: getComputedStyle(document.documentElement).backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        canvas: getComputedStyle(jc).backgroundColor, z: getComputedStyle(jc).zIndex,
      },
    };
  }, { data: b64, zona });

  console.log(url);
  console.log(JSON.stringify(res, null, 1));
  const ve = res.pantalla.brillo > res.canvasShader.brillo * 0.6 && res.pantalla.maxRGB > 200;
  console.log(ve ? 'VEREDICTO: el fondo SE VE en pantalla' : 'VEREDICTO: el fondo NO se ve (lo tapa algo)');
  await page.screenshot({ path: 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/ver_fondo_' + (url.includes('localhost') ? 'local' : 'live') + '.png' });
  await browser.close();
})();
