// Inspección del header: logo (reborde), nav (CHANCES cortado), alturas/colores de botones
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  for (const w of [1440, 1366, 1280]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto('https://artedigitaldata.com/?nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(6000);
    const info = await page.evaluate(() => {
      const cs = (el, props) => { if (!el) return null; const s = getComputedStyle(el); const o = {}; props.forEach(p => o[p] = s[p]); return o; };
      const logo = document.querySelector('.ui-logo');
      const logoImg = document.querySelector('.ui-logo img');
      const nav = document.querySelector('.ui-nav');
      const bar = document.querySelector('.ui-header-bar');
      const chances = document.querySelector('.ui-navlink.is-chances');
      const btns = [...document.querySelectorAll('.ui-actions > *')].map(el => ({
        tag: el.tagName, cls: String(el.className).slice(0, 60),
        texto: (el.textContent || '').trim().slice(0, 16),
        alto: Math.round(el.getBoundingClientRect().height), ancho: Math.round(el.getBoundingClientRect().width),
        color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor,
        borde: getComputedStyle(el).borderColor, padding: getComputedStyle(el).padding,
      }));
      return {
        anchoVentana: window.innerWidth,
        logoHTML: logo ? logo.outerHTML.slice(0, 220) : null,
        logo: cs(logo, ['border', 'outline', 'boxShadow', 'filter', 'borderRadius']),
        logoImg: cs(logoImg, ['border', 'outline', 'boxShadow', 'filter', 'borderRadius', 'width', 'height']),
        logoImgSrc: logoImg ? logoImg.getAttribute('src') : null,
        barGrid: cs(bar, ['display', 'gridTemplateColumns', 'gap', 'padding', 'overflow']),
        nav: cs(nav, ['display', 'gap', 'overflow', 'flexWrap', 'minWidth']),
        navScroll: nav ? { scrollWidth: nav.scrollWidth, clientWidth: nav.clientWidth, corta: nav.scrollWidth > nav.clientWidth + 1 } : null,
        chances: chances ? { rect: (r => ({ x: Math.round(r.x), w: Math.round(r.width) }))(chances.getBoundingClientRect()), color: getComputedStyle(chances).color, visible: getComputedStyle(chances).visibility, display: getComputedStyle(chances).display } : null,
        botones: btns,
      };
    });
    console.log('\n========== ancho ' + w + ' ==========');
    console.log(JSON.stringify(info, null, 1));
    fs.writeFileSync('C:/Users/JPupper/AppData/Local/hermes/cache/scratch/header_' + w + '.png', await page.screenshot({ clip: { x: 0, y: 0, width: w, height: 90 } }));
    await page.close();
  }
  await browser.close();
})();
