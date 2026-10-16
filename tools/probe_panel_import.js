// Probe rápido: por qué el subtab Importar no es visible (paneles y clases).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 940 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/visualeffects.html', { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(4000);
  const info = await p.evaluate(() => {
    const el = id => document.getElementById(id);
    const vis = id => { const e = el(id); if (!e) return 'no existe'; const r = e.getBoundingClientRect(); return { display: getComputedStyle(e).display, w: Math.round(r.width), h: Math.round(r.height), clases: e.className }; };
    return {
      rightPanel: vis('right-control-panel'),
      tabPaneFlyer: vis('tab-pane-flyer'),
      importBtn: vis('btn-flyer-subtab-import'),
      importContent: vis('flyer-subtab-content-import'),
      tabBtnFlyer: vis('tab-btn-flyer'),
      toggleRight: vis('toggle-right-panel-btn'),
      vimLista: vis('vim-lista'),
      appMode: window.appMode,
      tieneVEImportador: typeof window.VEImportador,
      hijosVimLista: (el('vim-lista') || {}).children ? el('vim-lista').children.length : -1,
      alcance: (el('vim-alcance') || {}).textContent
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})();
