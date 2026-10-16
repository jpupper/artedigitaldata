const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

// captura cada sección + prueba el desplegable MÁS
const PAGINAS = process.argv.slice(2).length ? process.argv.slice(2)
  : ['obras.html', 'recursos.html', 'oportunidades.html', 'eventos.html', 'post.html?id=6a84ec1a939afeac458d1bb6', 'recurso.html?id=6a5408a7c0eac6a367cfa625'];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  for (const p of PAGINAS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto('https://artedigitaldata.com/' + p + (p.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(7000);
    const nombre = p.replace(/[^\w]/g, '_').slice(0, 30);
    fs.writeFileSync(OUT + 'sec_' + nombre + '.png', await page.screenshot({ fullPage: false }));

    // ¿hay elementos con radio? ¿qué familias de clases dominan el contenido?
    const info = await page.evaluate(() => {
      const radios = [...document.querySelectorAll('*')].filter(e => parseFloat(getComputedStyle(e).borderRadius) > 0)
        .map(e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.className || '').split(' ').slice(0, 2).join('.')));
      const tarjetas = [...document.querySelectorAll('.card-cyber')].length;
      const fk = [...document.querySelectorAll('[class*="fk-"]')].length;
      return { radios: radios.slice(0, 8), nRadios: radios.length, tarjetasOld: tarjetas, elementosFk: fk };
    });
    console.log(`${p.padEnd(46)} radios=${info.nRadios} card-cyber=${info.tarjetasOld} fk-*=${info.elementosFk}`);
    if (info.radios.length) console.log('    ' + info.radios.join(' | '));
    await page.close();
  }

  // desplegable MÁS en la home
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(7000);
  const antes = await page.evaluate(() => {
    const mas = document.getElementById('ui-menu-mas');
    const panel = mas ? mas.querySelector('.ui-menu-panel') : null;
    const nav = document.querySelector('.ui-nav');
    const cs = panel ? getComputedStyle(panel) : null;
    return {
      existeMas: !!mas, claseBoton: mas ? mas.querySelector('[data-ui-menu-btn]').className : null,
      panel: cs ? { op: cs.opacity, vis: cs.visibility, disp: cs.display, pos: cs.position, rect: panel.getBoundingClientRect().toJSON(), overflowNav: nav ? getComputedStyle(nav).overflow : null } : null,
    };
  });
  console.log('\nMÁS antes del click: ' + JSON.stringify(antes));
  const btn = await page.$('#ui-menu-mas [data-ui-menu-btn]');
  if (btn) {
    await btn.click();
    await page.waitForTimeout(500);
    const desp = await page.evaluate(() => {
      const mas = document.getElementById('ui-menu-mas');
      const panel = mas.querySelector('.ui-menu-panel');
      const cs = getComputedStyle(panel);
      const r = panel.getBoundingClientRect();
      const items = [...panel.querySelectorAll('a')].map(a => (a.textContent || '').trim().slice(0, 18));
      // ¿queda dentro de la pantalla / hay algo que lo tape?
      const top = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + 12));
      return { dataOpen: mas.dataset.open, op: cs.opacity, vis: cs.visibility, disp: cs.display, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, items, encima: top ? top.tagName + '.' + String(top.className).split(' ')[0] : null, clip: getComputedStyle(panel.parentElement).overflow };
    });
    console.log('MÁS después del click: ' + JSON.stringify(desp));
    fs.writeFileSync(OUT + 'mas_desplegado.png', await page.screenshot({ clip: { x: 700, y: 0, width: 740, height: 320 } }));
  } else {
    console.log('NO existe el botón MÁS (#ui-menu-mas [data-ui-menu-btn])');
  }
  await browser.close();
})();
