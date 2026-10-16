const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

const PAGINAS = ['obras.html', 'recursos.html', 'oportunidades.html', 'eventos.html', 'artistas.html',
  'calendario.html', 'search.html', 'create.html', 'quienessomos.html', 'post.html?id=6a84ec1a939afeac458d1bb6',
  'recurso.html?id=6a5408a7c0eac6a367cfa625', 'evento.html?id=6a7a6d49dc1c465540651a36', 'profile.html?user=jpupper'];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));

  // ---------- 1) cabecera en contenedor + filtros unificados + radios ----------
  console.log('=== SECCIONES ===');
  for (const p of PAGINAS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 80)));
    await page.goto('https://artedigitaldata.com/' + p + (p.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(7000);
    const info = await page.evaluate(() => {
      const cs = el => el ? getComputedStyle(el) : null;
      const head = document.querySelector('.fk-head');
      const filtros = [...document.querySelectorAll('.filter-btn, .filter-switch, .search-filter-chip, .tab-btn')];
      const filtrosColoreados = filtros.filter(f => {
        const c = getComputedStyle(f).backgroundColor;
        return c && c !== 'rgba(0, 0, 0, 0)' && !/^rgba\(255, 255, 255/.test(c);
      }).length;
      const radios = [...document.querySelectorAll('*')].filter(e => parseFloat(getComputedStyle(e).borderRadius) > 0).length;
      const ph = document.getElementById('profile-header');
      const cssCapa = [...document.styleSheets].some(s => (s.href || '').includes('fondo-ui.css?v=8'));
      return {
        cssCapa,
        head: head ? cs(head).backgroundColor + ' pad=' + cs(head).paddingTop : 'sin .fk-head',
        filtros: filtros.length, filtrosColoreados,
        radios,
        profileHeader: ph ? cs(ph).backgroundColor + ' borde=' + cs(ph).borderTopWidth : null,
        titulo: (() => { const h = document.querySelector('main h1'); return h ? cs(h).fontSize + '/' + cs(h).fontWeight : 'n/a'; })(),
      };
    });
    const nombre = p.replace(/[^\w]/g, '_').slice(0, 26);
    fs.writeFileSync(OUT + 'unif_' + nombre + '.png', await page.screenshot());
    console.log(`${p.slice(0, 40).padEnd(42)} capa=${info.cssCapa} .fk-head=${info.head} filtros=${info.filtros}(color=${info.filtrosColoreados}) radios=${info.radios} h1=${info.titulo}${info.profileHeader ? ' PERFIL=' + info.profileHeader : ''} err=${errs.length}`);
    await page.close();
  }

  // ---------- 2) desplegable MÁS ----------
  console.log('\n=== DESPLEGABLE "MÁS" ===');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(7000);
  await page.click('#ui-menu-mas [data-ui-menu-btn]');
  await page.waitForTimeout(500);
  const mas = await page.evaluate(() => {
    const panel = document.querySelector('#ui-menu-mas .ui-menu-panel');
    const r = panel.getBoundingClientRect();
    const px = Math.round(r.x + r.width / 2), py = Math.round(r.y + r.height / 2);
    const pila = document.elementsFromPoint(px, py).slice(0, 3);
    const dentro = pila.some(e => e.closest && e.closest('#ui-menu-mas'));
    return {
      op: getComputedStyle(panel).opacity, visible: getComputedStyle(panel).visibility,
      items: [...panel.querySelectorAll('a')].map(a => (a.textContent || '').trim().slice(0, 16)),
      clickeable: dentro, encima: pila.map(e => e.tagName + '.' + String(e.className).split(' ')[0]),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    };
  });
  console.log(JSON.stringify(mas, null, 1));
  // click real en el primer ítem del desplegable
  const destino = await page.$('#ui-menu-mas .ui-menu-panel a');
  if (destino) {
    const href = await destino.getAttribute('href');
    await destino.click();
    await page.waitForTimeout(1500);
    console.log(`click en "${href}" -> url=${page.url()}`);
  }
  fs.writeFileSync(OUT + 'unif_mas_abierto.png', await page.screenshot({ clip: { x: 620, y: 0, width: 820, height: 340 } }));
  await browser.close();
})();
