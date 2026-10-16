const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  for (const w of [1440, 1366, 1280, 1100]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 260 } });
    await ctx.addInitScript(() => {
      localStorage.setItem('artedigitaldata_user', JSON.stringify({ _id: '1', username: 'jpupper', nombre: 'jpupper', avatar: '', role: 'USER' }));
      localStorage.setItem('artedigitaldata_token', 'fake');
    });
    const page = await ctx.newPage();
    await page.route('**/fscauth/**', r => r.abort());
    await page.route('**/api/**', r => r.abort());
    await page.route('**/fullscreencod*.com/**', r => r.abort());
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 90)));
    await page.goto('http://localhost:8899/_harness_header.html', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    const h = await page.evaluate(() => {
      const rect = el => el ? el.getBoundingClientRect() : null;
      const nav = document.querySelector('.ui-nav');
      const bar = document.querySelector('.ui-header-bar');
      const ch = document.querySelector('.ui-navlink.is-chances');
      const items = [...document.querySelectorAll('.ui-actions > *')].filter(e => rect(e).width > 0).map(el => ({
        t: ((el.textContent || '').trim().slice(0, 14) || '(icono)'),
        h: Math.round(rect(el).height), w: Math.round(rect(el).width),
        bg: getComputedStyle(el).backgroundColor, col: getComputedStyle(el).color,
      }));
      const badge = document.getElementById('header-notif-badge');
      return {
        headerLen: document.getElementById('app-header').innerHTML.length,
        logueado: !!document.querySelector('.ui-actions a[href*="profile"]'),
        navSize: nav ? nav.scrollWidth + '/' + nav.clientWidth : null,
        navCorta: nav ? nav.scrollWidth > nav.clientWidth + 1 : null,
        chancesDentro: (ch && bar) ? (rect(ch).right <= rect(bar).right + 1) : null,
        badge: badge ? getComputedStyle(badge).backgroundColor : 'sin badge',
        items,
      };
    });
    console.log(`ancho ${w}: headerLen=${h.headerLen} logueado=${h.logueado} nav=${h.navSize} corta=${h.navCorta} CHANCESdentro=${h.chancesDentro} badge=${h.badge} err=${errs.length}`);
    h.items.forEach(i => console.log(`    ${i.t.padEnd(14)} alto=${i.h} ancho=${i.w} bg=${i.bg} col=${i.col}`));
    if (errs.length) errs.slice(0, 2).forEach(e => console.log('    err: ' + e));
    if (w === 1366) fs.writeFileSync('C:/Users/JPupper/AppData/Local/hermes/cache/scratch/header_harness.png', await page.screenshot({ clip: { x: 0, y: 0, width: 1366, height: 66 } }));
    await ctx.close();
  }
  await browser.close();
})();
