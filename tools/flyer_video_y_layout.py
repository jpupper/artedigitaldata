"""1) Flyer más robusto en celular: la carga de obras prueba varios endpoints y,
   si falla, muestra el motivo + botón Reintentar (antes quedaba en "Cargando…").
   Fondo de respaldo por si el shader no carga.
2) Exportar VIDEO de toda la duración (MediaRecorder + captureStream del cuadro
   compuesto: fondo del shader + partículas y fotos).
3) El nombre y la bio del artista ya NO caen encima de la foto: la foto va arriba
   y el texto abajo, sobre el fondo.
"""
import io

PUB = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public'
cambios = []

# ─────────────────────────── flyer.html: botón de video ───────────────────
P = PUB + r'\flyer.html'
h = io.open(P, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in h else '\n'
if 'fly-grabar' not in h:
    i = next((k for k, l in enumerate(h.split('\n')) if 'id="fly-exportar"' in l), None)
    if i is not None:
        ls = h.split('\n')
        sangria = ls[i][:len(ls[i]) - len(ls[i].lstrip())]
        ls.insert(i + 1, sangria + '<button type="button" id="fly-grabar" class="fly-btn fly-btn--principal"><i class="fas fa-video"></i> Grabar video (toda la vuelta)</button>')
        h = '\n'.join(ls)
        io.open(P, 'w', encoding='utf-8', newline='').write(h)
        cambios.append('flyer.html: botón Grabar video')

# ─────────────────────────── flyer.css: fondo de respaldo + artista arriba ─
P2 = PUB + r'\css\paginas\flyer.css'
c = io.open(P2, encoding='utf-8', newline='').read()
if 'fondo de respaldo' not in c:
    c = c.replace(""".fly-stage {
  position: fixed; inset: 0;""",
""".fly-stage {
  /* fondo de respaldo: si el shader tardara o no cargara, nunca se ve negro plano */
  background: radial-gradient(120% 90% at 50% 40%, #1b1a22 0%, #0d0d12 70%, #08080c 100%);
  position: fixed; inset: 0;""", 1)
    cambios.append('flyer.css: fondo de respaldo')

c2 = c + """
/* Escena del artista: la foto arriba y el texto abajo, para que el nombre y la
   bio NO queden encima de la foto (sobre fotos claras el blanco no se leía). */
.fly-perfil.is-artista {
  inset: 0 0 auto 0; align-items: flex-start;
  padding-top: clamp(34px, 8vh, 120px);
}
.fly-perfil.is-artista .fly-perfil-marco {
  width: clamp(150px, 26vh, 330px);
  box-shadow: 0 24px 70px rgba(0,0,0,.72);
}
/* Velo un poco más marcado: ayuda a leer el texto sobre las obras claras */
.fly-velo.is-in {
  background:
    linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.18) 38%, rgba(0,0,0,.28) 62%, rgba(0,0,0,.66) 100%),
    radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,.10) 0%, rgba(0,0,0,.55) 65%, rgba(0,0,0,.82) 100%);
}
"""
if 'is-artista' not in c:
    io.open(P2, 'w', encoding='utf-8', newline='').write(c2)
    cambios.append('flyer.css: escena artista + velo más marcado')
else:
    io.open(P2, 'w', encoding='utf-8', newline='').write(c)

# ─────────────────────────── flyer-1.js ───────────────────────────────────
P3 = PUB + r'\js\paginas\flyer-1.js'
j = io.open(P3, encoding='utf-8', newline='').read()

# (3) la foto del artista se marca para ir arriba y el texto baja
viejo = """        var src = artista.avatar || '';"""
if 'is-artista' not in j and viejo in j:
    # en mostrarPerfil: clase extra cuando es la escena del artista (no la de obra)
    viejo2 = """  function mostrarPerfil(artista, chico) {"""
    nuevo2 = """  function mostrarPerfil(artista, chico) {
    // 'chico' = escena de la obra (retrato en la esquina) | grande = escena del artista"""
    if (viejo2 in j):
        pass"""
    j = j.replace(viejo2, nuevo2, 1)
    # agrego la clase is-artista cuando NO es chico
    viejo3 = """      elPerfil.classList.add('is-in');
      elPerfil.classList.toggle('is-chico', !!chico);"""
    nuevo3 = """      elPerfil.classList.add('is-in');
      elPerfil.classList.toggle('is-chico', !!chico);
      elPerfil.classList.toggle('is-artista', !chico);   // foto arriba, texto abajo"""
    if viejo3 in j:
        j = j.replace(viejo3, nuevo3, 1); cambios.append('flyer-1.js: foto del artista arriba')

# texto del artista más abajo (nombre, usuario, bio)
viejo4 = """          lista.push({ texto: artista.nombre || 'Artista', y: conBio ? 0.60 : 0.72, size: grande ? 50 : 30 });
          if (artista.usuario) lista.push({ texto: '@' + artista.usuario, y: conBio ? 0.66 : 0.84, size: grande ? 26 : 17, spacing: 8 });"""
nuevo4 = """          lista.push({ texto: artista.nombre || 'Artista', y: conBio ? 0.58 : 0.58, size: grande ? 50 : 30 });
          if (artista.usuario) lista.push({ texto: '@' + artista.usuario, y: conBio ? 0.645 : 0.66, size: grande ? 26 : 17, spacing: 8 });"""
if viejo4 in j:
    j = j.replace(viejo4, nuevo4, 1); cambios.append('flyer-1.js: textos del artista abajo')

viejo5 = """            var ysBio = grande ? [0.74, 0.79, 0.84] : [0.76, 0.82];"""
nuevo5 = """            var ysBio = grande ? [0.72, 0.775, 0.83] : [0.74, 0.81];"""
if viejo5 in j:
    j = j.replace(viejo5, nuevo5, 1); cambios.append('flyer-1.js: bio abajo')

# (1) carga de obras robusta (varios endpoints + reintento visible)
viejo6 = """    fetch(API + '/public/oportunidades/' + encodeURIComponent(id) + '/galeria')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(render)
      .catch(function (e) { console.error('[flyer]', e); fallar('No pudimos cargar las obras de esa convocatoria.'); });"""
nuevo6 = """    cargarObras(id);"""
if viejo6 in j:
    j = j.replace(viejo6, nuevo6, 1); cambios.append('flyer-1.js: usa cargarObras()')

if 'function cargarObras' not in j:
    ancla = """  configurarParticulas();"""
    fn = """  /** Carga la galería probando varias direcciones (en celular la red a veces
      falla con una): si ninguna contesta, muestra el motivo y un botón para reintentar. */
  function cargarObras(idConvocatoria) {
    var candidatos = [];
    if (API) candidatos.push(API + '/public/oportunidades/' + encodeURIComponent(idConvocatoria) + '/galeria');
    candidatos.push('https://vps-4455523-x.dattaweb.com/artedigitaldata/api/public/oportunidades/' + encodeURIComponent(idConvocatoria) + '/galeria');
    if (window.location.origin) {
      candidatos.push(window.location.origin + '/artedigitaldata/api/public/oportunidades/' + encodeURIComponent(idConvocatoria) + '/galeria');
      candidatos.push(window.location.origin + '/api/public/oportunidades/' + encodeURIComponent(idConvocatoria) + '/galeria');
    }
    candidatos = candidatos.filter(function (u, i) { return candidatos.indexOf(u) === i; });

    var i = 0;
    (function probar() {
      if (i >= candidatos.length) {
        mostrarErrorCarga();
        return;
      }
      var url = candidatos[i++];
      fetch(url, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) { render(data); })
        .catch(function (e) { console.warn('[flyer] falló', url.slice(0, 60), e.message); probar(); });
    })();
  }

  function mostrarErrorCarga() {
    if (!elEstado || !elEstadoTxt) return;
    elEstado.classList.remove('ui-hidden');
    elEstadoTxt.textContent = 'No pudimos cargar las obras (revisá la conexión). ';
    var btn = document.getElementById('fly-retry');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'fly-retry';
      btn.className = 'fly-btn fly-btn--principal';
      btn.style.marginLeft = '10px';
      btn.innerHTML = '<i class="fas fa-rotate-right"></i> Reintentar';
      btn.addEventListener('click', function () { cargarObras(id); });
      elEstado.appendChild(btn);
    }
  }

  configurarParticulas();"""
    if ancla in j:
        j = j.replace(ancla, fn, 1); cambios.append('flyer-1.js: carga con reintento')

# (2) exportar VIDEO
if 'grabarVideo' not in j:
    ancla2 = """  var btnExportar = document.getElementById('fly-exportar');"""
    vid = """  // ── Grabar VIDEO de toda la vuelta (compone el fondo + partículas/fotos) ──
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
    if (!window.MediaRecorder || !lienzoCompuesto().captureStream) {
      alert('Este navegador no puede grabar el video. Usalo desde Chrome o Edge de escritorio.');
      return;
    }
    if (grabando && mediaRec) { mediaRec.stop(); return; }

    var out = lienzoCompuesto();
    var stream = out.captureStream(30);
    var mime = mejorMime();
    var trozos = [];
    try {
      mediaRec = mime ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 })
                      : new MediaRecorder(stream);
    } catch (e) { alert('No se pudo iniciar la grabación: ' + e.message); return; }

    mediaRec.ondataavailable = function (ev) { if (ev.data && ev.data.size) trozos.push(ev.data); };
    mediaRec.onstop = function () {
      grabando = false;
      var tipo = (mediaRec.mimeType || 'video/webm').split(';')[0];
      var ext = tipo.indexOf('mp4') !== -1 ? 'mp4' : 'webm';
      var blob = new Blob(trozos, { type: tipo });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'flyer_' + (params.get('proyecto') || params.get('id') || 'arte') + '.' + ext;
      a.click();
      if (btn) btn.innerHTML = '<i class="fas fa-video"></i> Grabar video (toda la vuelta)';
      document.body.classList.remove('fly-grabando-video');
    };

    grabando = true;
    mediaRec.start();
    document.body.classList.add('fly-grabando-video');
    if (btn) btn.innerHTML = '<i class="fas fa-stop"></i> Grabando… (tocá para terminar)';

    // compone el cuadro a 30 fps mientras dure la grabación
    (function pintar() {
      if (!grabando) return;
      pintaCompuesto();
      requestAnimationFrame(pintar);
    })();

    // en modo automático corta solo al terminar la vuelta
    if (!idProyecto) {
      reiniciar();
      reproducir();
      var hasta = totalMs + 600;
      setTimeout(function () { if (grabando) mediaRec.stop(); }, hasta);
    }
  }

  var btnGrabar = document.getElementById('fly-grabar');
  if (btnGrabar) btnGrabar.addEventListener('click', grabarVideo);

  var btnExportar = document.getElementById('fly-exportar');"""
    if ancla2 in j:
        j = j.replace(ancla2, vid, 1); cambios.append('flyer-1.js: grabación de video')

if cambios:
    io.open(P3, 'w', encoding='utf-8', newline='').write(j)

print('\n'.join('· ' + c for c in cambios) if cambios else '· sin cambios')
