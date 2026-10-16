// Verifica el fondo en varias secciones + header (logo/nav/botones) + chat
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const PAGINAS = ['', 'obras.html', 'eventos.html', 'recursos.html', 'oportunidades.html', 'chat.html', 'admin.html', 'profile.html?user=jpupper'];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const resumen = [];
  for (const p of PAGINAS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
    page.on('console', (m) => {
      const t = m.text();
      if (m.type() === 'error' && !/CORS|Failed to load resource|favicon|net::ERR/.test(t)) errs.push(t.slice(0, 100));
    });
    await page.goto('https://artedigitaldata.com/' + p + (p.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'load' }).catch(() => { });
    await page.waitForTimeout(9000);

    const info = await page.evaluate(() => {
      const jc = document.getElementById('jpsi-canvas');
      const ascii = document.getElementById('ascii-bg-canvas');
      const nav = document.querySelector('.ui-nav');
      const chances = document.querySelector('.ui-navlink.is-chances');
      const logoImg = document.querySelector('.ui-logo img');
      const chromeBar = document.querySelector('.ui-header-bar');
      const r = el => el ? el.getBoundingClientRect() : null;
      const cr = chances ? r(chances) : null;
      const br = chromeBar ? r(chromeBar) : null;
      const radios = [...document.querySelectorAll('*')].filter(e => parseFloat(getComputedStyle(e).borderRadius) > 0).length;
      return {
        cssCapa: [...document.styleSheets].some(s => (s.href || '').includes('fondo-ui.css')),
        canvasFondo: jc ? jc.width + 'x' + jc.height + ' z=' + getComputedStyle(jc).zIndex + ' op=' + getComputedStyle(jc).opacity : 'NO',
        asciiViejo: !!ascii,
        include: typeof window.JPShaderInclude,
        estadoFondo: window.JPShaderInclude && window.JPShaderInclude.state ? window.JPShaderInclude.state().ready : null,
        fuenteFondo: window.JPShaderInclude && window.JPShaderInclude.state ? window.JPShaderInclude.state().valor || window.JPShaderInclude.state().comp : null,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        logoBorde: logoImg ? getComputedStyle(logoImg).borderTopWidth + ' ' + getComputedStyle(logoImg).borderTopColor : 'sin logo',
        navCorta: nav ? nav.scrollWidth > nav.clientWidth + 1 : null,
        chancesDentro: (cr && br) ? (cr.right <= br.right + 1 && cr.x >= br.x) : null,
        elementosConRadio: radios,
      };
    });

    // fondo visible? comparar pantalla vs canvas en un recorte
    const png = await page.screenshot({ clip: { x: 1100, y: 200, width: 260, height: 120 } });
    const b64 = png.toString('base64');
    const pix = await page.evaluate(async (data) => {
      const img = new Image(); await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + data; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      let s = 0, coloridos = 0, n = d.length / 4;
      for (let i = 0; i < d.length; i += 4) { s += d[i] + d[i + 1] + d[i + 2]; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 12) coloridos++; }
      return { brillo: +(s / n / 3).toFixed(1), pctColorido: +(100 * coloridos / n).toFixed(1) };
    }, b64);

    const ve = pix.pctColorido > 3 || pix.brillo > 40;
    console.log(`${(p || 'index.html').padEnd(24)} fondo=${ve ? 'SE VE' : 'tapado'} (brillo ${pix.brillo}, color ${pix.pctColorido}%) | canvas ${info.canvasFondo} | listo=${info.estadoFondo} fuente=${info.fuenteFondo} | asciiViejo=${info.asciiViejo} | css=${info.cssCapa} | radios>0=${info.elementosConRadio} | navCorta=${info.navCorta} | CHANCEdentro=${info.chancesDentro} | logo="${info.logoBorde}" | errores=${errs.length}`);
    if (errs.length) errs.slice(0, 3).forEach(e => console.log('        err: ' + e));
    resumen.push({ p: p || 'index.html', ve, errs: errs.length });
    if (p === '' || p === 'chat.html') fs.writeFileSync(OUT + 'fondo_' + (p.replace(/\W+/g, '') || 'index') + '.png', await page.screenshot());
    await page.close();
  }
  await browser.close();
})();
