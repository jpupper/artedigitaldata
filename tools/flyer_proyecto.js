/** Genera un PROYECTO editables de flyer a partir de una convocatoria de artedigitaldata.
 *
 *  Uso:
 *    node tools/flyer_proyecto.js <idConvocatoria> [--guardar] [--titulo "..." ]
 *
 *  - Sin --guardar: escribe el JSON en tools/salida/flyer_<id>.json y lo imprime resumido.
 *  - Con --guardar: además lo guarda en el servidor (POST /visualeffects) con la cuenta
 *    carloskernel y devuelve el id para abrirlo en visualeffects.html?id=<id> (editable)
 *    o en flyer.html?proyecto=<id> (reproducción).
 *
 *  El proyecto se diseña sobre una pantalla de referencia de 1080x1920 (el reproductor
 *  escala posiciones y tamaños a la pantalla real, ver FSC_VIEWPORT_BASE).
 */
const fs = require('fs');
const path = require('path');

const PROJ = path.resolve(__dirname, '..');
const BASE = process.env.FSC_API || 'https://vps-4455523-x.dattaweb.com/artedigitaldata/api';
const VW = 1080, VH = 1920;              // pantalla de referencia
const D = { intro: 5, artista: 5, obra: 7, obraCorta: 4, salida: 0.8, cierre: 6 };

const id = process.argv[2];
if (!id) { console.error('Falta el id de la convocatoria'); process.exit(1); }
const guardar = process.argv.includes('--guardar');
const iTitulo = process.argv.indexOf('--titulo');
const tituloForzado = iTitulo !== -1 ? process.argv[iTitulo + 1] : null;

function env(file) {
  const out = {};
  for (const linea of fs.readFileSync(file, 'utf8').split('\n')) {
    const l = linea.trim();
    if (!l || l.startsWith('#') || !l.includes('=')) continue;
    const i = l.indexOf('=');
    out[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const trocear = (texto, max) => {
  const out = []; let act = '';
  String(texto || '').split(/\s+/).forEach(p => {
    if (!p) return;
    if (!act) act = p;
    else if ((act + ' ' + p).length <= max) act += ' ' + p;
    else { out.push(act); act = p; }
  });
  if (act) out.push(act);
  return out.slice(0, 3);
};

(async () => {
  // ── datos de la convocatoria ────────────────────────────────────────────
  const galRes = await fetch(`${BASE}/public/oportunidades/${id}/galeria`);
  if (!galRes.ok) throw new Error('galería HTTP ' + galRes.status);
  const gal = await galRes.json();
  const obras = gal.obras || [];
  const tituloConvocatoria = (gal.oportunidad && gal.oportunidad.titulo) || 'Galería';

  // ── config base del sitio (para que el proyecto se vea igual) ──────────
  let configBase = {};
  try {
    const cfgRes = await fetch(`${BASE}/public/particles-config`);
    if (cfgRes.ok) { const d = await cfgRes.json(); configBase = (d && d.config) || {}; }
  } catch (e) { console.warn('no pude leer la config del sitio:', e.message); }

  const imageLayers = [];
  const timelineLayers = [];
  let t = 0;

  // ── capa de palabras: una sola con todos los textos ────────────────────
  const capaPalabras = { id: 'layer_palabras', name: 'Palabras (títulos y datos)', type: 'text', clips: [] };
  timelineLayers.push(capaPalabras);
  // Las FOTOS van una capa por imagen (así las maneja el editor) y se insertan
  // en orden de pintado: primero la obra y arriba la foto del artista.

  const clipPalabra = (texto, y, fontSize, letterSpacing, start, dur) => ({
    id: 'w_' + Math.random().toString(36).slice(2, 9),
    text: texto, word: texto,
    x: VW / 2, y: Math.round(VH * y),
    fontSize, letterSpacing,
    formationMode: 'CODE',
    startTime: Number(start.toFixed(2)),
    duration: Number(dur.toFixed(2)),
    keyframes: []
  });

  // portada
  capaPalabras.clips.push(clipPalabra(tituloConvocatoria.toUpperCase(), 0.44, 62, 8, t, D.intro));
  capaPalabras.clips.push(clipPalabra(obras.length + (obras.length === 1 ? ' OBRA' : ' OBRAS'), 0.60, 38, 14, t, D.intro));
  t += D.intro;

  obras.forEach((obra, i) => {
    const art = obra.artista || {};
    const n = i + 1;

    // ── foto del artista (tarjeta chica abajo a la izquierda) ────────────
    let clipArtista = null, idImgArt = null;
    if (art.avatar) {
      idImgArt = 'img_art_' + n;
      imageLayers.push({
        id: idImgArt, name: 'Artista ' + n + ': ' + (art.nombre || ''), src: art.avatar,
        x: 0.16, y: 0.86, rel: true, scale: 0.30, rotation: 0, alpha: 1, visible: false
      });
      clipArtista = {
        id: 'c_art_' + n, imageId: idImgArt,
        startTime: Number(t.toFixed(2)), duration: Number((D.artista + D.obra + D.salida).toFixed(2)),
        x: 0.5, y: 0.5, rel: true, scale: 0.62, rotation: 0, alpha: 1,
        keyframes: [
          { time: Number(t.toFixed(2)), x: 0.5, y: 0.5, scale: 0.55, rotation: -3, alpha: 1 },
          { time: Number((t + 1.0).toFixed(2)), x: 0.5, y: 0.5, scale: 0.62, rotation: 0, alpha: 1 },
          { time: Number((t + D.artista).toFixed(2)), x: 0.5, y: 0.5, scale: 0.62, rotation: 0, alpha: 1 },
          { time: Number((t + D.artista + 0.8).toFixed(2)), x: 0.16, y: 0.86, scale: 0.30, rotation: 0, alpha: 1 },
          { time: Number((t + D.artista + D.obra + D.salida).toFixed(2)), x: 0.16, y: 0.86, scale: 0.30, rotation: 0, alpha: 0 }
        ]
      };
      capaPalabras.clips.push(clipPalabra((art.nombre || 'ARTISTA').toUpperCase(), 0.72, 52, 8, t, D.artista));
      if (art.usuario) capaPalabras.clips.push(clipPalabra('@' + art.usuario.toUpperCase(), 0.83, 28, 10, t, D.artista));
    }
    t += D.artista;

    // ── foto de la obra (tapa la pantalla) ──────────────────────────────
    const desc = String(obra.descripcion || '').replace(/\s+/g, ' ').trim();
    const durObra = desc ? D.obra : D.obraCorta;
    let clipObra = null, idImgObra = null;
    if (obra.imagen) {
      idImgObra = 'img_obra_' + n;
      imageLayers.push({
        id: idImgObra, name: 'Obra ' + n + ': ' + (obra.titulo || ''), src: obra.imagen,
        ajuste: 'cover', x: 0.5, y: 0.5, rel: true, scale: 1, rotation: 0, alpha: 1, visible: false
      });
      clipObra = {
        id: 'c_obra_' + n, imageId: idImgObra,
        startTime: Number(t.toFixed(2)), duration: Number((durObra + D.salida).toFixed(2)),
        ajuste: 'cover', x: 0.5, y: 0.5, rel: true, scale: 1, rotation: 0, alpha: 1,
        keyframes: [
          { time: Number(t.toFixed(2)), scale: 1.12, rotation: 1.2, alpha: 0 },
          { time: Number((t + 0.9).toFixed(2)), scale: 1.02, rotation: 0, alpha: 1 },
          { time: Number((t + durObra).toFixed(2)), scale: 1.02, rotation: 0, alpha: 1 },
          { time: Number((t + durObra + D.salida).toFixed(2)), scale: 1.06, rotation: 0, alpha: 0 }
        ]
      };
    }
    capaPalabras.clips.push(clipPalabra((obra.titulo || 'SIN TÍTULO').toUpperCase(), 0.36, 54, 6, t, durObra));
    capaPalabras.clips.push(clipPalabra(((art.nombre || '') + (art.usuario ? ' · @' + art.usuario : '')).toUpperCase(), 0.50, 26, 8, t, durObra));
    const lineas = desc ? trocear(desc.slice(0, 92), 30) : [];
    lineas.forEach((linea, k) => {
      capaPalabras.clips.push(clipPalabra(linea.toUpperCase(), 0.66 + k * 0.06, 22, 4, t, durObra));
    });

    // Una capa por imagen (como las maneja el editor): la obra va primero y la
    // foto del artista arriba, así el retrato queda visible sobre la obra.
    if (clipObra) timelineLayers.push({ id: 'layer_obra_' + n, name: 'Obra ' + n + ': ' + (obra.titulo || ''), type: 'image', imageId: idImgObra, clips: [clipObra] });
    if (clipArtista) timelineLayers.push({ id: 'layer_art_' + n, name: 'Artista ' + n + ': ' + (art.nombre || ''), type: 'image', imageId: idImgArt, clips: [clipArtista] });

    t += durObra + D.salida;
  });

  // cierre
  capaPalabras.clips.push(clipPalabra('ARTE DIGITAL DATA', 0.46, 56, 10, t, D.cierre));
  capaPalabras.clips.push(clipPalabra('ARTEDIGITALDATA.COM', 0.58, 30, 6, t, D.cierre));
  capaPalabras.clips.push(clipPalabra(('GALERÍA: ' + tituloConvocatoria).toUpperCase(), 0.70, 22, 6, t, D.cierre));
  const duracion = Number((t + D.cierre).toFixed(2));

  const config = {
    ...configBase,
    AUTO_MODE: false,
    FORCE_WHITE_WORDS: true,
    CHAR_BG_ENABLED: false,
    CHAR_SHADOW: true,
    CHAR_SHADOW_BLUR: 16,
    IMAGE_LAYERS: imageLayers
  };

  const proyecto = {
    title: tituloForzado || ('Flyer · ' + tituloConvocatoria),
    flyerWords: [],
    timelineLayers: timelineLayers,
    timelineDuration: duracion,
    hasTimeline: true,
    viewportBase: [VW, VH],
    config: config
  };

  const dirSalida = path.join(__dirname, 'salida');
  if (!fs.existsSync(dirSalida)) fs.mkdirSync(dirSalida, { recursive: true });
  const salida = path.join(dirSalida, `flyer_${id}.json`);
  fs.writeFileSync(salida, JSON.stringify(proyecto, null, 1));

  console.log('── proyecto generado ──');
  console.log('  convocatoria :', tituloConvocatoria, '(' + obras.length + ' obras)');
  console.log('  duración     :', duracion + 's  (' + Math.floor(duracion / 60) + ':' + String(Math.round(duracion % 60)).padStart(2, '0') + ')');
  console.log('  imágenes     :', imageLayers.length, 'capas');
  console.log('  clips        :', timelineLayers.reduce((a, l) => a + l.clips.length, 0), 'en', timelineLayers.length, 'capas');
  console.log('  archivo      :', salida);

  if (!guardar) { console.log('\n(agregá --guardar para subirlo al servidor)'); return; }

  // ── subir con la cuenta carloskernel ───────────────────────────────────
  const cred = env(path.join(PROJ, '..', 'skillmaestrofsc', '.carloskernel.env'));
  const login = await fetch('https://vps-4455523-x.dattaweb.com/fscauth/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cred.CARLOSKERNEL_EMAIL, password: cred.CARLOSKERNEL_PASS })
  });
  const sesion = await login.json();
  if (!sesion.token) throw new Error('login carloskernel falló: ' + JSON.stringify(sesion).slice(0, 200));

  const iId = process.argv.indexOf('--id');
  const idExistente = iId !== -1 ? process.argv[iId + 1] : null;
  const res = await fetch(`${BASE}/visualeffects` + (idExistente ? '/' + idExistente : ''), {
    method: idExistente ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sesion.token },
    body: JSON.stringify(proyecto)
  });
  const data = await res.json();
  if (!res.ok) throw new Error('guardar falló: ' + JSON.stringify(data).slice(0, 300));
  const efecto = data.effect || data;
  console.log('\n✅ guardado en el servidor');
  console.log('   id           :', efecto._id);
  console.log('   editar       : https://artedigitaldata.com/visualeffects.html?id=' + efecto._id);
  console.log('   reproducir   : https://artedigitaldata.com/flyer.html?proyecto=' + efecto._id);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
