// Header LOGUEADO (harness local) a 3 anchos + chat local (sin redirect SSO)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));

  console.log('=== HEADER LOGUEADO (harness) ===');
  for (const w of [1440, 1366, 1280, 1100]) {
    const page = await browser.newPage({ viewport: { width: w, height: 300 } });
    await page.goto('http://localhost:8899/_harness_header.html', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const h = await page.evaluate(() => {
      const r = el => el ? el.getBoundingClientRect() : null;
      const nav = document.querySelector('.ui-nav'), bar = document.querySelector('.ui-header-bar');
      const chances = document.querySelector('.ui-navlink.is-chances');
      const items = [...document.querySelectorAll('.ui-actions > *')].filter(e => r(e).width > 0).map(el => ({
        t: ((el.textContent || '').trim().slice(0, 14) || '(icono)'), h: Math.round(r(el).height), w: Math.round(r(el).width),
        bg: getComputedStyle(el).backgroundColor, col: getComputedStyle(el).color,
      }));
      return {
        logueado: !!document.querySelector('.ui-actions a[href*="profile"]'),
        navCorta: nav ? nav.scrollWidth > nav.clientWidth + 1 : null,
        navSize: nav ? nav.scrollWidth + '/' + nav.clientWidth : null,
        chancesDentro: (chances && bar) ? (r(chances).right <= r(bar).right + 1) : null,
        badge: (() => { const b = document.getElementById('header-notif-badge'); return b ? getComputedStyle(b).backgroundColor + ' r=' + getComputedStyle(b).borderRadius : 'sin badge'; })(),
        items,
      };
    });
    console.log(`ancho ${w}: logueado=${h.logueado} navCorta=${h.navCorta} (${h.navSize}) CHANCES dentro=${h.chancesDentro} badge=${h.badge}`);
    h.items.forEach(i => console.log(`    ${i.t.padEnd(14)} alto=${i.h} ancho=${i.w} bg=${i.bg} col=${i.col}`));
    if (w === 1366) fs.writeFileSync(OUT + 'header_harness.png', await page.screenshot({ clip: { x: 0, y: 0, width: 1366, height: 70 } }));
    await page.close();
  }

  console.log('\n=== CHAT LOCAL (bloqueando el redirect de SSO) ===');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/fscauth/**', r => r.abort());
  await page.route('**/fullscreencode.com/**', r => r.abort());
  await page.goto('http://localhost:8899/chat.html', { waitUntil: 'domcontentloaded' }).catch(() => { });
  await page.waitForTimeout(6000);
  const chat = await page.evaluate(() => ({
    url: location.pathname,
    capa: [...document.styleSheets].some(s => (s.href || '').includes('fondo-ui.css')),
    canvas: !!document.getElementById('jpsi-canvas'),
    roomsPanel: !!document.getElementById('rooms-panel'),
    radioPanel: (() => { const p = document.getElementById('rooms-panel'); return p ? getComputedStyle(p).borderRadius + ' / ' + getComputedStyle(p).backgroundColor : 'n/a'; })(),
    radios: [...document.querySelectorAll('*')].filter(e => parseFloat(getComputedStyle(e).borderRadius) > 0).length,
  }));
  console.log(JSON.stringify(chat, null, 1));
  fs.writeFileSync(OUT + 'chat_local.png', await page.screenshot());
  await browser.close();
})();
