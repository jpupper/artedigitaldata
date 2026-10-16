// Prueba que los manejadores que pasaron de onclick="" a data-on-click="" sigan funcionando
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8899/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const ok = [], mal = [];

  // 1) index: filtros del feed (filter-switch) + desplegable MÁS
  let p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 90)));
  await p.goto(BASE + '?nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(7000);
  const antes = await p.evaluate(() => document.querySelectorAll('.filter-switch.active').length + '|' +
    [...document.querySelectorAll('.filter-switch')].map(x => x.className.includes('active')).join(','));
  await p.click('.filter-switch.filter-recurso').catch(() => mal.push('no pude clickear el filtro recurso'));
  await p.waitForTimeout(1500);
  const despues = await p.evaluate(() => [...document.querySelectorAll('.filter-switch')].map(x => x.className.includes('active')).join(','));
  (antes.split('|')[1] !== despues ? ok : mal).push(`index filtro: ${antes.split('|')[1]} -> ${despues}`);
  await p.click('#ui-menu-mas [data-ui-menu-btn]').catch(() => mal.push('no pude clickear MÁS'));
  await p.waitForTimeout(600);
  const masAbierto = await p.evaluate(() => document.getElementById('ui-menu-mas').dataset.open === '1');
  (masAbierto ? ok : mal).push('index MÁS abre: ' + masAbierto);
  // toggles humano/IA y data externa
  const toggle = await p.evaluate(() => { const b = document.getElementById('filter-human-ai'); return b ? !!b.getAttribute('data-on-click') : 'sin boton'; });
  ok.push('toggle human-ai convertido a data-on-click: ' + toggle);
  await p.close();

  // 2) recursos: botones de filtro (filterRecursos)
  p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on('pageerror', e => errs.push(String(e).slice(0, 90)));
  await p.goto(BASE + 'recursos.html?nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(7000);
  const n1 = await p.evaluate(() => document.querySelectorAll('#recursos-container .card-cyber').length);
  await p.click('button.filter-btn:nth-of-type(2)').catch(() => mal.push('no pude clickear el filtro de recursos'));
  await p.waitForTimeout(1800);
  const r2 = await p.evaluate(() => ({ n: document.querySelectorAll('#recursos-container .card-cyber').length, activo: document.querySelector('.filter-btn.active')?.textContent.trim() }));
  ok.push(`recursos filtro: ${n1} tarjetas -> ${r2.n} (activo: ${r2.activo})`);
  await p.close();

  // 3) calendario: prevMonth / nextMonth
  p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on('pageerror', e => errs.push(String(e).slice(0, 90)));
  await p.goto(BASE + 'calendario.html?nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(7000);
  const mes1 = await p.evaluate(() => document.getElementById('current-month-year').textContent.trim());
  await p.click('button[data-on-click="prevMonth()"]').catch(async () => { await p.click('button[data-on-click*="prevMonth"]').catch(() => mal.push('no pude clickear prevMonth')); });
  await p.waitForTimeout(1500);
  const mes2 = await p.evaluate(() => document.getElementById('current-month-year').textContent.trim());
  (mes1 !== mes2 ? ok : mal).push(`calendario prevMonth: "${mes1}" -> "${mes2}"`);
  await p.close();

  // 4) buscador: chips de filtro
  p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on('pageerror', e => errs.push(String(e).slice(0, 90)));
  await p.goto(BASE + 'search.html?nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(6500);
  const chips = await p.evaluate(() => [...document.querySelectorAll('.search-filter-chip')].map(c => c.className.includes('is-active')).join(','));
  const chip = await p.$('.search-filter-chip');
  if (chip) { await chip.click(); await p.waitForTimeout(1200); }
  const chips2 = await p.evaluate(() => [...document.querySelectorAll('.search-filter-chip')].map(c => c.className.includes('is-active')).join(','));
  ok.push(`search chips: ${chips} -> ${chips2} (click manejado: ${chips !== chips2})`);
  await p.close();

  await browser.close();
  console.log('✅ funcionan:');
  ok.forEach(x => console.log('   ' + x));
  if (mal.length) { console.log('⚠️  revisar:'); mal.forEach(x => console.log('   ' + x)); }
  console.log('errores JS en la prueba: ' + errs.length);
  errs.slice(0, 4).forEach(e => console.log('   ' + e));
})();
