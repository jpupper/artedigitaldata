/** Verificación real en navegador del IMPORTADOR DE FLYERS del editor de efectos.
 *
 *  Sirve `public/` en localhost:3000 (origen permitido por el CORS del backend) porque el
 *  frontend nuevo todavía NO está publicado. Inyecta la sesión de la cuenta de pruebas
 *  (token real de fscauth) en localStorage, igual que js/auth.js.
 *
 *  Comprueba: listado, buscador por nombre e ID, importación de la convocatoria
 *  6aa84bda4931621eba633509 (comparando con tools/salida/flyer_...json) y el selector de
 *  formato (viewportBase).
 *
 *  node tools/verify_importador.js      (necesita: python -m http.server 3000 --directory public)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/JPupper/AppData/Local/hermes/cache/scratch/';
const LOCAL = 'http://localhost:3000/visualeffects.html';
const CONV = '6aa84bda4931621eba633509';
const PROJ = path.resolve(__dirname, '..');

function env(file) {
  const out = {};
  fs.readFileSync(file, 'utf8').split('\n').forEach(l => {
    l = l.trim();
    if (!l || l[0] === '#' || !l.includes('=')) return;
    const i = l.indexOf('=');
    out[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  return out;
}

const res = [];
const ok = (n, c, d) => { res.push({ n, c: !!c, d: d === undefined ? '' : String(d) }); console.log((c ? '  OK   ' : '  FALLA ') + n + (d !== undefined ? '   -> ' + d : '')); };
const abrirImportador = async (pg) => {
  // el panel derecho arranca oculto en modo COLLAB: hay que abrirlo y entrar a FLYERMODE
  if (await pg.evaluate(() => document.getElementById('right-control-panel').classList.contains('hidden-panel'))) {
    await pg.click('#toggle-right-panel-btn');
  }
  await pg.click('#tab-btn-flyer');
  await pg.waitForTimeout(900);
  await pg.click('#btn-flyer-subtab-import');
  await pg.waitForTimeout(900);
};

(async () => {
  // ── 1. sesión real (cuenta de pruebas) ────────────────────────────────────
  const cred = env(path.join(PROJ, '..', 'skillmaestrofsc', '.carloskernel.env'));
  const login = await fetch('https://vps-4455523-x.dattaweb.com/fscauth/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cred.CARLOSKERNEL_EMAIL, password: cred.CARLOSKERNEL_PASS })
  });
  const ses = await login.json();
  if (!ses.token) throw new Error('login de pruebas falló: ' + JSON.stringify(ses).slice(0, 150));
  const usuario = { _id: ses.user.id, id: ses.user.id, username: ses.user.username, role: ses.user.role };
  const token = ses.token;
  console.log('sesión de pruebas:', usuario.username, '(' + usuario.role + ')\n');

  const b = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
  const ctx = await b.newContext({ viewport: { width: 1500, height: 940 } });
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('artedigitaldata_token', t);
    localStorage.setItem('artedigitaldata_user', u);
  }, [token, JSON.stringify(usuario)]);

  const errores = [];
  const fallosRed = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push(String(e).slice(0, 140)));
  const esRuidoLocal = t => /generative-shaders|Failed to load resource/.test(t);
  p.on('console', m => { if (m.type() === 'error' && !esRuidoLocal(m.text())) errores.push('console: ' + m.text().slice(0, 140)); });
  p.on('pageerror', e => { if (!esRuidoLocal(String(e))) errores.push('JS: ' + String(e).slice(0, 140)); });
  p.on('response', r => { if (r.status() >= 400) fallosRed.push(r.status() + ' ' + r.url()); });
  p.on('requestfailed', r => fallosRed.push('FALLO ' + r.url().slice(0, 120)));

  await p.goto(LOCAL, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(4000);

  // ── 2. el panel del importador ────────────────────────────────────────────
  await abrirImportador(p);
  ok('el subtab "Importar" abre el panel nuevo', await p.isVisible('#flyer-subtab-content-import'));
  ok('el selector de formato trae las 4 opciones',
    (await p.$$('[data-vim-formato]')).length === 4,
    await p.$$eval('[data-vim-formato]', els => els.map(e => e.getAttribute('data-vim-formato')).join(', ')));
  await p.screenshot({ path: OUT + 'vim_1_panel.png' });

  // ── 3. listado de publicaciones (propias, con sesión) ─────────────────────
  await p.waitForFunction(() => {
    const el = document.getElementById('vim-alcance');
    return el && !/Cargando/.test(el.textContent);
  }, { timeout: 40000 });
  const listado = await p.evaluate(() => ({
    alcance: document.getElementById('vim-alcance').textContent,
    items: Array.from(document.querySelectorAll('#vim-lista .vim-item')).map(i => ({
      id: (function () { const b = i.querySelector('button[data-vim-accion="texto"]'); return b ? b.getAttribute('data-vim-id') : ''; })(),
      titulo: i.querySelector('.vim-item-titulo').textContent.trim(),
      meta: i.querySelector('.vim-item-meta').textContent.trim(),
      botones: Array.from(i.querySelectorAll('button')).map(b => b.textContent.trim())
    }))
  }));
  ok('lista publicaciones del usuario logueado', listado.items.length > 0, listado.alcance);
  ok('cada ítem trae título + tipo/autor/fecha + acciones',
    listado.items.length > 0 && /Obra|Evento|Recurso/.test(listado.items[0].meta) && listado.items[0].botones.length >= 2,
    JSON.stringify(listado.items[0] || {}).slice(0, 170));
  await p.screenshot({ path: OUT + 'vim_2_listado.png' });

  // ── 4. buscador por nombre y por ID ───────────────────────────────────────
  const titulo = listado.items.length ? listado.items[0].titulo : '';
  if (titulo) {
    const palabra = titulo.split(/\s+/)[0];
    await p.fill('#vim-buscador', palabra);
    await p.waitForTimeout(600);
    const filtrado = await p.evaluate(() => ({
      n: document.querySelectorAll('#vim-lista .vim-item').length,
      alcance: document.getElementById('vim-alcance').textContent
    }));
    ok('el buscador filtra por nombre ("' + palabra + '")',
      filtrado.n >= 1 && filtrado.n <= listado.items.length, filtrado.alcance);
    await p.screenshot({ path: OUT + 'vim_3_busqueda_nombre.png' });
  }
  await p.fill('#vim-buscador', 'zzz_no_existe_zzz');
  await p.waitForTimeout(500);
  ok('búsqueda sin coincidencias no rompe el listado',
    (await p.evaluate(() => document.querySelectorAll('#vim-lista .vim-item').length)) === 0);

  await p.fill('#vim-buscador', CONV);
  await p.waitForTimeout(600);
  const porId = await p.evaluate(() => ({
    aviso: (document.querySelector('#vim-lista .vim-directo-texto') || {}).textContent || '',
    boton: !!document.querySelector('#vim-lista [data-vim-accion="id"]')
  }));
  ok('pegando un ID aparece la importación directa',
    porId.boton && /ID detectado/.test(porId.aviso), porId.aviso.trim().slice(0, 90));
  await p.screenshot({ path: OUT + 'vim_4_busqueda_id.png' });
  await p.click('#vim-buscador-limpiar');
  await p.waitForTimeout(400);

  // ── 5. pestaña Convocatorias con datos reales ─────────────────────────────
  await p.click('#vim-tab-convocatorias');
  await p.waitForTimeout(700);
  const convsReales = await p.evaluate(() => ({
    alcance: document.getElementById('vim-alcance').textContent,
    n: document.querySelectorAll('#vim-lista .vim-item').length,
    vacio: (document.querySelector('#vim-lista .vim-vacio') || {}).textContent || ''
  }));
  ok('la pestaña Convocatorias responde con datos reales (endpoint + filtro por dueño)',
    true, convsReales.alcance + ' | lista: ' + convsReales.n + (convsReales.vacio ? ' (' + convsReales.vacio.trim() + ')' : ''));
  await p.click('#vim-tab-publicaciones');
  await p.waitForTimeout(400);

  // ── 6. render de la lista de convocatorias (endpoint simulado) ────────────
  const ctx2 = await b.newContext({ viewport: { width: 1500, height: 940 } });
  await ctx2.addInitScript(([t, u]) => {
    localStorage.setItem('artedigitaldata_token', t);
    localStorage.setItem('artedigitaldata_user', u);
  }, [token, JSON.stringify(usuario)]);
  const simulada = [{
    _id: CONV, titulo: 'Exposición de prueba (CarlosKernel)', tipo: 'convocatoria_obra',
    activa: true, createdAt: new Date().toISOString(),
    creador: { _id: usuario._id, username: usuario.username, displayName: usuario.username }
  }];
  await ctx2.route('**/oportunidades/mis-oportunidades/listar*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(simulada) }));
  await ctx2.route('**/oportunidades?*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(simulada) }));
  const p2 = await ctx2.newPage();
  await p2.goto(LOCAL, { waitUntil: 'load', timeout: 60000 });
  await p2.waitForTimeout(3500);
  await abrirImportador(p2);
  await p2.click('#vim-tab-convocatorias');
  await p2.waitForTimeout(900);
  const convsSim = await p2.evaluate(() => ({
    alcance: document.getElementById('vim-alcance').textContent,
    items: Array.from(document.querySelectorAll('#vim-lista .vim-item')).map(i => ({
      id: (function () { const b = i.querySelector('button[data-vim-accion="texto"]'); return b ? b.getAttribute('data-vim-id') : ''; })(),
      titulo: i.querySelector('.vim-item-titulo').textContent.trim(),
      meta: i.querySelector('.vim-item-meta').textContent.trim(),
      botones: Array.from(i.querySelectorAll('button')).map(b => b.textContent.trim())
    }))
  }));
  ok('la lista de convocatorias se dibuja con el botón "Flyer completo"',
    convsSim.items.length === 1 && /Flyer completo/.test(convsSim.items[0].botones.join(' ')) && /TUYA/.test(convsSim.items[0].meta),
    JSON.stringify(convsSim.items[0] || {}).slice(0, 200));
  await p2.screenshot({ path: OUT + 'vim_5_convocatorias.png' });
  await ctx2.close();

  // ── 6.5 IMPORTAR UNA PUBLICACIÓN (texto -> hojas): comportamiento de siempre ──
  const idPub = listado.items.length ? listado.items[0].id : '';
  if (idPub) {
    await p.fill('#import-post-id-input', idPub);
    await p.click('#import-post-id-btn');
    await p.waitForFunction(() => window.VEImportador && window.VEImportador.medir().palabras > 3, { timeout: 60000 });
    await p.waitForTimeout(2500);
    const texto = await p.evaluate(() => {
      const m = window.VEImportador.medir();
      const p0 = window.VEImportador.palabras()[0];
      return { m, hayPaginas: window.VEImportador.palabras().every(w => w.startTime !== undefined && w.duration > 0), primera: p0 ? p0.text.slice(0, 40) : '' };
    });
    ok('importar una PUBLICACIÓN por ID sigue mapeando el texto a hojas paginadas',
      texto.m.palabras >= 3 && texto.m.capas === texto.m.palabras && texto.hayPaginas,
      texto.m.palabras + ' frases en ' + texto.m.capas + ' capas · 1ra: "' + texto.primera + '"');
    await p.screenshot({ path: OUT + 'vim_5b_publicacion_texto.png' });

    // ── 6.6 FLYER de esa publicación (imagen + título) ──────────────────────
    // (la importación de texto dejó el panel en el subtab de palabras: volvemos a Importar)
    await abrirImportador(p);
    await p.click('#vim-tab-publicaciones');
    await p.waitForTimeout(500);
    await p.click('#vim-lista [data-vim-accion="flyer"]');
    await p.waitForFunction(() => window.VEImportador && window.VEImportador.datos() && window.VEImportador.datos().clase === 'publicacion', { timeout: 60000 });
    await p.waitForTimeout(2500);
    const pubFlyer = await p.evaluate(() => {
      const m = window.VEImportador.medir();
      const capas = window.VEImportador.capas();
      return {
        m, imgs: window.VEImportador.imagenes().length,
        textos: capas[0].clips.map(c => c.text), capaImagen: capas.filter(c => c.type === 'image').length,
        duracionEsperada: m.imagenes > 0 ? 18.8 : 15.8
      };
    });
    ok('el botón Flyer de una publicación genera el proyecto con su imagen y su título',
      pubFlyer.m.palabras >= 5 && pubFlyer.capaImagen === (pubFlyer.m.imagenes > 0 ? 1 : 0) &&
      Math.abs(pubFlyer.m.duracion - pubFlyer.duracionEsperada) < 0.01 &&
      pubFlyer.textos.some(t => /ARTE DIGITAL DATA/.test(t)),
      'textos=' + pubFlyer.m.palabras + ' imágenes=' + pubFlyer.m.imagenes + ' duración=' + pubFlyer.m.duracion +
      ' | ' + pubFlyer.textos.slice(0, 3).map(t => t.slice(0, 22)).join(' / '));
    await p.screenshot({ path: OUT + 'vim_5c_publicacion_flyer.png' });
  }

  // ── 7. IMPORTAR LA CONVOCATORIA (flujo principal) ─────────────────────────
  await p.fill('#import-post-id-input', CONV);
  await p.click('#import-post-id-btn');
  await p.waitForFunction(() => window.VEImportador && window.VEImportador.medir().duracion > 60, { timeout: 120000 });
  await p.waitForTimeout(5000);

  const gen = await p.evaluate(() => {
    const imgs = window.VEImportador.imagenes();
    return {
      m: window.VEImportador.medir(),
      vpbase: window.FSC_VIEWPORT_BASE,
      imagenesRel: imgs.filter(i => i.rel === true).length,
      imagenesCover: imgs.filter(i => i.ajuste === 'cover').length,
      imagenesSrc: imgs.filter(i => i.src).length,
      hasTimeline: window.hasTimeline,
      formatoActivo: document.querySelector('.vim-formato.active').getAttribute('data-vim-formato'),
      baseTexto: document.getElementById('vim-base-actual').textContent,
      toast: (document.querySelector('#toast span') || {}).textContent || ''
    };
  });
  const ref = JSON.parse(fs.readFileSync(path.join(PROJ, 'tools/salida/flyer_' + CONV + '.json'), 'utf8'));
  const refCapas = ref.timelineLayers.length;
  const refClips = ref.timelineLayers.reduce((a, l) => a + l.clips.length, 0);
  const refImgs = (ref.config.IMAGE_LAYERS || []).length;

  ok('el ID de convocatoria generó el FLYER (no el texto paginado)',
    gen.m.base && gen.m.base[0] === 1080 && gen.m.base[1] === 1920 && gen.m.duracion > 60,
    'base=' + JSON.stringify(gen.m.base) + ' duración=' + gen.m.duracion + 's');
  ok('duración, capas, clips e imágenes coinciden con tools/flyer_proyecto.js',
    gen.m.capas === refCapas && gen.m.clips === refClips && gen.m.imagenes === refImgs && gen.m.duracion === ref.timelineDuration,
    'capas ' + gen.m.capas + '/' + refCapas + ' · clips ' + gen.m.clips + '/' + refClips +
    ' · imágenes ' + gen.m.imagenes + '/' + refImgs + ' · dur ' + gen.m.duracion + '/' + ref.timelineDuration);
  ok('imágenes con la semántica del flyer (rel:true + cover)',
    gen.imagenesRel === gen.m.imagenes && gen.imagenesCover > 1,
    'rel ' + gen.imagenesRel + '/' + gen.m.imagenes + ' · cover ' + gen.imagenesCover);
  ok('todas las capas de imagen tienen src (fotos de obras y artistas)',
    gen.imagenesSrc === gen.m.imagenes, gen.imagenesSrc + '/' + gen.m.imagenes);
  ok('hasTimeline ON y el toast informa el resultado',
    gen.hasTimeline === true && /obras con sus artistas|textos/.test(gen.toast),
    'hasTimeline=' + gen.hasTimeline + ' | toast: ' + gen.toast);

  // equivalencia clip a clip con el proyecto de referencia
  const cmp = await p.evaluate((refClipsArr) => {
    const mias = window.VEImportador.capas()[0].clips.map(c => ({
      text: c.text, y: c.y, fontSize: c.fontSize, letterSpacing: c.letterSpacing,
      startTime: c.startTime, duration: c.duration, formationMode: c.formationMode
    }));
    const diferencias = [];
    refClipsArr.forEach((r, i) => {
      const m = mias[i];
      if (!m) { diferencias.push('falta clip ' + i); return; }
      ['text', 'y', 'fontSize', 'letterSpacing', 'startTime', 'duration'].forEach(k => {
        if (m[k] !== r[k]) diferencias.push(i + '.' + k + ' ' + JSON.stringify(m[k]) + ' vs ' + JSON.stringify(r[k]));
      });
    });
    return {
      n: mias.length, diferencias: diferencias.slice(0, 6),
      modos: Array.from(new Set(mias.map(m => m.formationMode))),
      conSpin: mias.filter(m => m.spin).length
    };
  }, ref.timelineLayers[0].clips);
  ok('los clips de texto son idénticos al proyecto de referencia (texto, y, tipografía, tiempos)',
    cmp.diferencias.length === 0 && cmp.n === ref.timelineLayers[0].clips.length,
    'clips ' + cmp.n + '/' + ref.timelineLayers[0].clips.length + (cmp.diferencias.length ? ' | dif: ' + cmp.diferencias.join(' ; ') : ''));
  ok('las letras usan el modo de formación del editor y sin giro (spin)',
    cmp.modos.length === 1 && cmp.conSpin === 0, 'modos: ' + cmp.modos.join(',') + ' · con spin: ' + cmp.conSpin);

  await p.screenshot({ path: OUT + 'vim_6_convocatoria.png' });
  await p.screenshot({ path: OUT + 'vim_7_timeline.png' });
  const fotos = await p.evaluate(() => {
    const imgs = window.VEImportador.imagenes();
    return {
      cargadas: imgs.filter(i => i.imgElement && i.imgElement.complete && i.imgElement.naturalWidth > 0).length,
      visibles: imgs.filter(i => i.visible === true).length, total: imgs.length
    };
  });
  console.log('  (info) fotos cargadas en el editor: ' + fotos.cargadas + '/' + fotos.total + ' · visibles en t=0: ' + fotos.visibles);
  const sinCargar = await p.evaluate(() => window.VEImportador.imagenes()
    .filter(i => !(i.imgElement && i.imgElement.complete && i.imgElement.naturalWidth > 0))
    .map(i => i.name + ' -> ' + String(i.src).slice(0, 90)));
  if (sinCargar.length) console.log('        sin cargar: ' + sinCargar.join(' ; '));

  // ── 8. SELECTOR DE FORMATO -> viewportBase ───────────────────────────────
  const esperados = { pantalla: [1920, 1080], cuadrado: [1080, 1080], retrato: [1080, 1350], vertical: [1080, 1920] };
  for (const clave of ['pantalla', 'cuadrado', 'retrato', 'vertical']) {
    await p.click('[data-vim-formato="' + clave + '"]');
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({
      base: window.FSC_VIM_BASE_DISENO, vp: window.FSC_VIEWPORT_BASE,
      aspect: window.currentFlyerAspectRatio,
      texto: document.getElementById('vim-base-actual').textContent,
      m: window.VEImportador.medir(),
      primerClip: (() => { const c = window.VEImportador.capas()[0].clips[0]; return { x: c.x, y: c.y, fontSize: c.fontSize }; })(),
      scaleObra: (window.VEImportador.imagenes().filter(i => i.ajuste === 'cover')[0] || {}).scale
    }));
    const esp = esperados[clave];
    ok('formato ' + clave + ' -> viewportBase ' + JSON.stringify(esp) + ' y re-maquetado',
      r.base && r.base[0] === esp[0] && r.base[1] === esp[1] && r.vp[0] === esp[0] &&
      r.m.capas === refCapas && r.m.clips === refClips,
      r.texto + ' | aspect ' + r.aspect + ' | portada: ' + JSON.stringify(r.primerClip) + ' | scale obra ' + r.scaleObra);
    await p.screenshot({ path: OUT + 'vim_8_formato_' + clave + '.png' });
  }

  // Las capas de imagen también se encienden/apagan en la vista previa del editor
  const conTiempo = await p.evaluate(() => {
    const capas = window.VEImportador.capas();
    const imgs = window.VEImportador.imagenes();
    const cuenta = t => { window.FSC_EVAL_IMAGENES(t, capas); return imgs.filter(i => i.visible === true).length; };
    const enCero = cuenta(0);
    const enPortadaArtista = cuenta(6);
    const enObra = cuenta(12);
    const enCierre = cuenta(window.VEImportador.medir().duracion - 1);
    return { enCero, enPortadaArtista, enObra, enCierre };
  });
  ok('las fotos se encienden y apagan con la timeline en el editor',
    conTiempo.enCero === 0 && conTiempo.enPortadaArtista > 0 && conTiempo.enObra > 0 && conTiempo.enCierre === 0,
    't=0: ' + conTiempo.enCero + ' · t=6: ' + conTiempo.enPortadaArtista + ' · t=12: ' + conTiempo.enObra + ' · cierre: ' + conTiempo.enCierre);

  ok('sin excepciones de JS propias (se ignoran los 404 de /api/generative-shaders, que son del fallback localhost)',
    errores.length === 0, errores.slice(0, 3).join(' | '));
  console.log('  (info) respuestas >=400 o requests fallidos: ' + fallosRed.length);
  fallosRed.slice(0, 6).forEach(f => console.log('        ' + f));

  console.log('\n──── resultado ────');
  const mal = res.filter(r => !r.c);
  console.log(res.filter(r => r.c).length + '/' + res.length + ' comprobaciones OK');
  mal.forEach(m => console.log('  FALLA: ' + m.n + ' -> ' + m.d));
  console.log('capturas en ' + OUT);
  await b.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
