// Verifica el flyer con giro + descripción: captura la entrada (letras girando) y el estado final
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const ID = '6aa84bda4931621eba633509';
const URL = 'https://artedigitaldata.com/flyer.html?id=' + ID;

async function px(pagina) {
  const png = await pagina.screenshot();
  const n = await pagina.evaluate(async (d) => {
    const img = new Image(); await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + d; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
    const dd = cx.getImageData(0, 0, c.width, c.height).data;
    let claros = 0;
    for (let i = 0; i < dd.length; i += 4) if (dd[i] > 215 && dd[i + 1] > 215 && dd[i + 2] > 215) claros++;
    return claros;
  }, png.toString('base64'));
  return { png, claros: n };
}

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const errs = [];

  // 1) Entrada de escena (letras girando/acomodándose) vs estado final
  let page = await b.newPage({ viewport: { width: 420, height: 860 } });
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 80)));
  await page.goto(URL + '&t=10.4&nc=' + Date.now(), { waitUntil: 'load' });   // arranque de la escena de obra
  await page.waitForTimeout(2300);
  let e1 = await px(page);
  fs.writeFileSync(OUT + 'flyg_entrada.png', e1.png);
  console.log('entrada (letras entrando):', e1.claros, 'px');
  await page.waitForTimeout(9000);
  let e2 = await px(page);
  fs.writeFileSync(OUT + 'flyg_obra.png', e2.png);
  const info = await page.evaluate(() => {
    const c = document.getElementById('fly-obra'), pf = document.getElementById('fly-perfil');
    const vid = document.getElementById('fly-estado');
    return {
      meta: (document.getElementById('fly-meta') || {}).textContent,
      titulo: (document.getElementById('fly-titulo') || {}).textContent,
      obra: c && c.classList.contains('is-in') ? 'sí' : 'no',
      perfil: pf && pf.classList.contains('is-in') ? (pf.classList.contains('is-chico') ? 'chico' : 'grande') : 'no',
      barra: (document.getElementById('fly-barra-fill') || {}).style ? document.getElementById('fly-barra-fill').style.width : '',
    };
  });
  console.log('obra final:', JSON.stringify(info));
  await page.close();

  // 2) Escena del artista (5s) y cierre
  for (const [t, nombre] of [[6.5, 'artista'], [118, 'cierre']]) {
    page = await b.newPage({ viewport: { width: 420, height: 860 } });
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 80)));
    await page.goto(URL + '&t=' + t + '&nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(11000);
    const r = await px(page);
    fs.writeFileSync(OUT + 'flyg_' + nombre + '.png', r.png);
    console.log(nombre + ' t=' + t + 's:', r.claros, 'px de palabras');
    await page.close();
  }
  console.log('errores JS:', errs.length, errs.slice(0, 2));
  await b.close();
})();
