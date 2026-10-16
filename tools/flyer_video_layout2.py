"""Flyer: (1) carga robusta en celular, (2) exportar VIDEO de toda la vuelta,
(3) el texto del artista ya no cae sobre la foto."""
import io

PUB = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public'
cambios = []

# ── flyer.html: botón de video ────────────────────────────────────────────
P = PUB + r'\flyer.html'
ls = io.open(P, encoding='utf-8', newline='').read().split('\n')
if not any('fly-grabar' in l for l in ls):
    i = next((k for k, l in enumerate(ls) if 'id="fly-exportar"' in l), None)
    if i is not None:
        sangria = ls[i][:len(ls[i]) - len(ls[i].lstrip())]
        ls.insert(i, sangria + '<button type="button" id="fly-grabar" class="fly-btn fly-btn--principal"><i class="fas fa-video"></i> Grabar video (toda la vuelta)</button>')
        io.open(P, 'w', encoding='utf-8', newline='').write('\n'.join(ls))
        cambios.append('flyer.html: botón Grabar video')

# ── flyer.css: fondo de respaldo + artista arriba + velo ─────────────────
P2 = PUB + r'\css\paginas\flyer.css'
c = io.open(P2, encoding='utf-8', newline='').read()
if 'fondo de respaldo' not in c:
    c = c.replace(".fly-stage {\n  position: fixed; inset: 0;",
                  ".fly-stage {\n  /* fondo de respaldo: si el shader tarda o falla, nunca se ve negro plano */\n  background: radial-gradient(120% 90% at 50% 40%, #1b1a22 0%, #0d0d12 70%, #08080c 100%);\n  position: fixed; inset: 0;", 1)
    cambios.append('flyer.css: fondo de respaldo')
if 'is-artista' not in c:
    c += """
/* Escena del artista: la foto arriba y el texto abajo, así el nombre y la bio
   NO quedan encima de la foto (sobre fotos claras el blanco no se leía). */
.fly-perfil.is-artista {
  inset: 0 0 auto 0; align-items: flex-start;
  padding-top: clamp(34px, 8vh, 120px);
}
.fly-perfil.is-artista .fly-perfil-marco { width: clamp(150px, 26vh, 330px); }
/* Velo más marcado arriba y abajo: ayuda a leer sobre obras claras */
.fly-velo.is-in {
  background:
    linear-gradient(180deg, rgba(0,0,0,.58) 0%, rgba(0,0,0,.16) 38%, rgba(0,0,0,.30) 62%, rgba(0,0,0,.68) 100%),
    radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,.10) 0%, rgba(0,0,0,.55) 65%, rgba(0,0,0,.82) 100%);
}
"""
    cambios.append('flyer.css: artista arriba + velo')
io.open(P2, 'w', encoding='utf-8', newline='').write(c)

# ── flyer-1.js ───────────────────────────────────────────────────────────
P3 = PUB + r'\js\paginas\flyer-1.js'
j = io.open(P3, encoding='utf-8', newline='').read()

# (3) clase is-artista (foto arriba) y textos más abajo
viejo = "      elPerfil.classList.toggle('is-chico', !!chico);"
nuevo = ("      elPerfil.classList.toggle('is-chico', !!chico);\n"
         "      elPerfil.classList.toggle('is-artista', !chico);   // foto arriba, texto abajo")
if viejo in j and 'is-artista' not in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: foto del artista arriba')

viejo = "          lista.push({ texto: artista.nombre || 'Artista', y: conBio ? 0.60 : 0.72, size: grande ? 50 : 30 });"
nuevo = "          lista.push({ texto: artista.nombre || 'Artista', y: conBio ? 0.57 : 0.57, size: grande ? 50 : 30 });"
if viejo in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: nombre del artista abajo')

viejo = "          if (artista.usuario) lista.push({ texto: '@' + artista.usuario, y: conBio ? 0.66 : 0.84, size: grande ? 26 : 17, spacing: 8 });"
nuevo = "          if (artista.usuario) lista.push({ texto: '@' + artista.usuario, y: conBio ? 0.635 : 0.65, size: grande ? 26 : 17, spacing: 8 });"
if viejo in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: usuario del artista')

viejo = "            var ysBio = grande ? [0.74, 0.79, 0.84] : [0.76, 0.82];"
nuevo = "            var ysBio = grande ? [0.71, 0.765, 0.82] : [0.73, 0.80];"
if viejo in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: bio abajo')

# (1) carga robusta
viejo = """    fetch(API + '/public/oportunidades/' + encodeURIComponent(id) + '/galeria')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(render)
      .catch(function (e) { console.error('[flyer]', e); fallar('No pudimos cargar las obras de esa convocatoria.'); });"""
if viejo in j:
    j = j.replace(viejo, "    cargarObras(id);", 1); cambios.append('flyer-1.js: cargarObras()')

if 'function cargarObras' not in j:
    fn = """  /** Carga la galería probando varias direcciones (en celular una suele fallar):
      y si ninguna contesta, muestra el motivo con un botón para reintentar. */
  function cargarObras(idConvocatoria) {
    var ruta = '/public/oportunidades/' + encodeURIComponent(idConvocatoria) + '/galeria';
    var candidatos = [];
    if (API) candidatos.push(API + ruta);
    candidatos.push('https://vps-4455523-x.dattaweb.com/artedigitaldata/api' + ruta);
    if (window.location.origin) {
      candidatos.push(window.location.origin + '/artedigitaldata/api' + ruta);
      candidatos.push(window.location.origin + '/api' + ruta);
    }
    candidatos = candidatos.filter(function (u, i) { return candidatos.indexOf(u) === i; });

    var i = 0;
    (function probar() {
      if (i >= candidatos.length) { mostrarErrorCarga(); return; }
      var url = candidatos[i++];
      fetch(url, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) { render(data); })
        .catch(function (e) { console.warn('[flyer] falló ' + url.slice(0, 55) + ': ' + e.message); probar(); });
    })();
  }

  function mostrarErrorCarga() {
    if (!elEstado || !elEstadoTxt) return;
    elEstado.classList.remove('ui-hidden');
    elEstadoTxt.textContent = 'No pudimos cargar las obras. Revisá la conexión y reintentá.';
    if (!document.getElementById('fly-retry')) {
      var btn = document.createElement('button');
      btn.id = 'fly-retry';
      btn.className = 'fly-btn fly-btn--principal';
      btn.style.marginLeft = '10px';
      btn.innerHTML = '<i class="fas fa-rotate-right"></i> Reintentar';
      btn.addEventListener('click', function () { cargarObras(id); });
      elEstado.appendChild(btn);
    }
  }

  configurarParticulas();"""
    j = j.replace("  configurarParticulas();", fn, 1); cambios.append('flyer-1.js: carga con reintento')

# (2) grabación de video
if 'grabarVideo' not in j:
    vid = """  // ── GRABAR VIDEO de toda la vuelta: compone fondo + partículas/fotos a 1080x1920 ──
  var grabando = false, mediaRec = null, compCanvas = null;

  function lienzoCompuesto() {
    var base = (window.FSC_VIEWPORT_BASE && window.FSC_VIEWPORT_BASE.length === 2)
      ? window.FSC_VIEWPORT_BASE : [1080, 1920];
    if (!compCanvas) {
      compCanvas = document.createElement('canvas');
      compCanvas.width = base[0]; compCanvas.height = base[1];
    }
    return compCanvas;
  }

  function pintaCompuesto() {
    var out = lienzoCompuesto(), ctx = out.getContext('2d');
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(0, 0, out.width, out.height);
    var fondo = document.getElementById('jpsi-canvas');
    if (fondo) { try { ctx.drawImage(fondo, 0, 0, out.width, out.height); } catch (e) { } }
    var p5cv = document.querySelector('#p5-canvas canvas');
    if (p5cv) { try { ctx.drawImage(p5cv, 0, 0, out.width, out.height); } catch (e) { } }
  }

  function mejorMime() {
    var opciones = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < opciones.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(opciones[i])) return opciones[i];
    }
    return '';
  }

  function grabarVideo() {
    var btn = document.getElementById('fly-grabar');
    var out = lienzoCompuesto();
    if (!window.MediaRecorder || !out.captureStream) {
      alert('Este navegador no puede grabar video. Probá desde Chrome o Edge de escritorio.');
      return;
    }
    if (grabando && mediaRec) { mediaRec.stop(); return; }   // segundo toque = terminar

    var trozos = [];
    try {
      var mime = mejorMime();
      mediaRec = mime ? new MediaRecorder(out.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8000000 })
                      : new MediaRecorder(out.captureStream(30));
    } catch (e) { alert('No se pudo iniciar la grabación: ' + e.message); return; }

    mediaRec.ondataavailable = function (ev) { if (ev.data && ev.data.size) trozos.push(ev.data); };
    mediaRec.onstop = function () {
      grabando = false;
      var tipo = (mediaRec.mimeType || 'video/webm').split(';')[0];
      var ext = tipo.indexOf('mp4') !== -1 ? 'mp4' : 'webm';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(trozos, { type: tipo }));
      a.download = 'flyer_' + (params.get('proyecto') || params.get('id') || 'arte') + '.' + ext;
      a.click();
      if (btn) btn.innerHTML = '<i class="fas fa-video"></i> Grabar video (toda la vuelta)';
    };

    grabando = true;
    mediaRec.start();
    if (btn) btn.innerHTML = '<i class="fas fa-stop"></i> Grabando… (tocá para terminar)';

    (function pintar() {                 // compone el cuadro mientras graba
      if (!grabando) return;
      pintaCompuesto();
      requestAnimationFrame(pintar);
    })();

    if (!idProyecto) {                   // en modo automático corta al terminar la vuelta
      reiniciar();
      reproducir();
      var hasta = totalMs + 700;
      setTimeout(function () { if (grabando && mediaRec) mediaRec.stop(); }, hasta);
    }
  }

  var btnGrabar = document.getElementById('fly-grabar');
  if (btnGrabar) btnGrabar.addEventListener('click', grabarVideo);

  var btnExportar = document.getElementById('fly-exportar');"""
    if 'var btnExportar = document.getElementById(\'fly-exportar\');' in j:
        j = j.replace("  var btnExportar = document.getElementById('fly-exportar');", vid, 1)
        cambios.append('flyer-1.js: grabación de video')

io.open(P3, 'w', encoding='utf-8', newline='').write(j)
print('\n'.join('· ' + c for c in cambios) if cambios else '· sin cambios')
