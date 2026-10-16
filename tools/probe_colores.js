// Encuentra QUÉ selectores están pintando de color en cada sección
const { chromium } = require('playwright');

const PAGINAS = process.argv.slice(2).length ? process.argv.slice(2) : ['https://artedigitaldata.com/artistas.html', 'https://artedigitaldata.com/', 'https://artedigitaldata.com/oportunidades.html', 'https://artedigitaldata.com/calendario.html'];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  for (const url of PAGINAS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'nc=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(6500);
    const res = await page.evaluate(() => {
      const vivos = (x) => {
        const m = String(x).match(/rgba?\((\d+), (\d+), (\d+)/);
        if (!m) return false;
        const [r, g, bl] = [+m[1], +m[2], +m[3]];
        const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
        return mx - mn > 60 && mx > 90;
      };
      // todas las reglas legibles
      const reglas = [];
      for (const s of document.styleSheets) {
        let rs; try { rs = s.cssRules; } catch (e) { continue; }
        const src = (s.href || 'inline');
        for (const r of rs) {
          if (r.selectorText) reglas.push({ sel: r.selectorText, txt: r.cssText, src });
        }
      }
      const culpables = {};
      const vistos = [];
      for (const el of document.querySelectorAll('main *')) {
        const cs = getComputedStyle(el);
        const colores = [];
        if (vivos(cs.backgroundColor)) colores.push('bg=' + cs.backgroundColor);
        if (vivos(cs.color)) colores.push('fg=' + cs.color);
        if (vivos(cs.borderTopColor) && parseFloat(cs.borderTopWidth) > 0) colores.push('bd=' + cs.borderTopColor);
        if (!colores.length) continue;
        vistos.push(el.tagName + '.' + String(el.className).split(' ').slice(0, 2).join('.') + ' ' + colores.join(','));
        for (const r of reglas) {
          if (/fondo-ui/.test(r.src)) continue;   // mi capa no es la culpable
          if (!/color/i.test(r.txt)) continue;
          let m = false; try { m = el.matches(r.sel); } catch (e) { }
          if (m) culpables[r.sel + '   [' + r.src.split('/').pop() + ']'] = (culpables[r.sel + '   [' + r.src.split('/').pop() + ']'] || 0) + 1;
        }
      }
      return { total: vistos.length, ejemplos: vistos.slice(0, 6), culpables: Object.entries(culpables).sort((a, b) => b[1] - a[1]).slice(0, 18) };
    });
    console.log('\n===== ' + url.replace('https://artedigitaldata.com', '') + '  (elementos con color: ' + res.total + ')');
    res.ejemplos.forEach(e => console.log('   ej: ' + e));
    res.culpables.forEach(([sel, n]) => console.log(`   ${n}×  ${sel}`));
    await page.close();
  }
  await browser.close();
})();
