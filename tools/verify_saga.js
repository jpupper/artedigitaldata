// Verifica el perfil de SAGA
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 80)));
  await p.goto('https://artedigitaldata.com/profile.html?user=Saga&nc=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(9000);
  const info = await p.evaluate(() => {
    const txt = document.body.innerText || '';
    const imgs = Array.from(document.querySelectorAll('img')).map(i => i.src).filter(s => /saga-barros/.test(s));
    return {
      nombre: (document.querySelector('h1, .profile-name, #profile-name') || {}).textContent,
      tieneBio: /Ludalab/.test(txt) && /Videojuegos de Tucum/ .test(txt) ? 'sí (completa)' : (/Ludalab/.test(txt) ? 'parcial' : 'no'),
      fotoPerfil: imgs.length > 0 ? imgs[0].slice(-40) : 'no',
      largoTexto: txt.length,
      pedazos: ['Ludalab', 'Tucumán Videojuegos', 'Vagabundo', 'Tormenta', 'Diplomatura'].filter(k => txt.includes(k)),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  fs.writeFileSync(OUT + 'saga_perfil.png', await p.screenshot());
  console.log('errores:', errs.length, errs.slice(0, 2));
  await b.close();
})();
