// Verifica: escena del artista (texto fuera de la foto), grabación de video real, y el modo play en celular
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const CONV = '6aa84bda4931621eba633509';
const API = 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api';

(async () => {
  // ¿está SAGA en la convocatoria? (para saber en qué segundo cae su escena)
  const gal = await (await fetch(`${API}/public/oportunidades/${CONV}/galeria`)).json();
  const obras = gal.obras || [];
  console.log('obras:', obras.length);
  obras.forEach((o, i) => console.log('   ' + (i + 1) + '.', (o.artista && o.artista.nombre) || '(sin artista)', '|', (o.titulo || '').slice(0, 32), '| bio:', (o.artista && o.artista.bio ? 'sí' : 'no')));
  // tiempo del inicio de la escena del artista i (portada 5s + i*(5+7+0.8))
  const iSaga = obras.findIndex(o => /saga/i.test(((o.artista || {}).nombre || '') + ((o.artista || {}).usuario || '')));
  const tEscena = 5 + (iSaga >= 0 ? iSaga : 0) * 12.8 + 2.5;

  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));

  // 1) escena del artista: el texto no debe caer sobre la foto
  const p1 = await b.newPage({ viewport: { width: 420, height: 860 } });
  await p1.goto(`https://artedigitaldata.com/flyer.html?id=${CONV}&t=${tEscena.toFixed(1)}&nc=` + Date.now(), { waitUntil: 'load' });
  await p1.waitForTimeout(12000);
  const pos = await p1.evaluate(() => {
    const marco = document.getElementById('fly-perfil-marco');
    const r = marco ? marco.getBoundingClientRect() : null;
    const perfil = document.getElementById('fly-perfil');
    return {
      claseArtista: perfil ? perfil.classList.contains('is-artista') : null,
      fotoArriba: r ? Math.round(r.top) : null,
      fotoAbajo: r ? Math.round(r.bottom) : null,
      alto: r ? Math.round(r.height) : null,
      altoVentana: window.innerHeight,
    };
  });
  console.log('escena artista:', JSON.stringify(pos));
  fs.writeFileSync(OUT + 'fly_artista_layout.png', await p1.screenshot());
  await p1.close();

  // 2) grabación de video real (10 s) en el modo proyecto
  const p2 = await b.newPage({ viewport: { width: 420, height: 860 } });
  await p2.goto('https://artedigitaldata.com/flyer.html?proyecto=6acef4267e2dfebc537d3ddd&nc=' + Date.now(), { waitUntil: 'load' });
  await p2.waitForTimeout(9000);
  const hayBoton = await p2.evaluate(() => !!document.getElementById('fly-grabar'));
  const mime = await p2.evaluate(() => {
    const ops = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    return ops.filter(o => window.MediaRecorder && MediaRecorder.isTypeSupported(o));
  });
  console.log('botón de video:', hayBoton, '| formatos soportados:', JSON.stringify(mime));
  const dl = p2.waitForEvent('download', { timeout: 60000 }).catch(() => null);
  await p2.click('#fly-grabar');
  await p2.waitForTimeout(9000);
  await p2.click('#fly-grabar');       // terminar
  const d = await dl;
  if (d) {
    const ruta = OUT + 'video_prueba.' + (d.suggestedFilename().split('.').pop());
    await d.saveAs(ruta);
    console.log('✅ video descargado:', d.suggestedFilename(), fs.statSync(ruta).size, 'bytes');
  } else {
    console.log('⚠️ no se descargó video');
  }
  await p2.close();

  // 3) celular con ?play=1
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p3 = await ctx.newPage();
  const errs = [];
  p3.on('pageerror', e => errs.push(String(e).slice(0, 80)));
  await p3.goto(`https://artedigitaldata.com/flyer.html?id=${CONV}&play=1&nc=` + Date.now(), { waitUntil: 'load' });
  await p3.waitForTimeout(15000);
  console.log('celular ?play=1:', JSON.stringify(await p3.evaluate(() => ({
    panelOculto: document.getElementById('fly-panel').classList.contains('is-oculto'),
    barra: document.getElementById('fly-barra-fill').style.width,
    meta: document.getElementById('fly-meta').textContent.slice(0, 40),
    reintento: !!document.getElementById('fly-retry'),
  }))), '| errores:', errs.length);
  fs.writeFileSync(OUT + 'fly_celu.png', await p3.screenshot());
  await b.close();
})();
