"""Grabación de video del flyer, rehecha:
 - usa la captura de PANTALLA PESTAÑA del navegador (así entra el shader, las fotos y las palabras)
 - al apretar: reinicia la secuencia desde 0, la reproduce UNA vez y corta sola
 - calidad alta (hasta 20 Mbps) y MP4 si el navegador lo permite
"""
import io

PUB = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public'
cambios = []

# ── 1) p5-effect: que el reproductor exponga duración y reinicio del proyecto ──
P = PUB + r'\js\p5-effect.js'
s = io.open(P, encoding='utf-8', newline='').read()
if 'FSC_DURACION_PROYECTO' not in s:
    viejo = """            function loopFrontTimeline(now) {"""
    nuevo = """            // Para grabar: el flyer necesita saber cuánto dura y poder volver a 0
            window.FSC_DURACION_PROYECTO = timelineDuration;
            window.FSC_REINICIAR_PROYECTO = function () { frontTimelineTime = 0; };

            function loopFrontTimeline(now) {"""
    if viejo in s:
        s = s.replace(viejo, nuevo, 1)
        io.open(P, 'w', encoding='utf-8', newline='').write(s)
        cambios.append('p5-effect.js: expone duración y reinicio del proyecto')

# ── 2) flyer-1.js: grabación por captura de pantalla ──────────────────────────
P2 = PUB + r'\js\paginas\flyer-1.js'
j = io.open(P2, encoding='utf-8', newline='').read()

inicio = j.find('  function grabarVideo() {')
fin = j.find('  var btnGrabar = document.getElementById(\'fly-grabar\');')
if inicio != -1 and fin != -1 and fin > inicio:
    nueva = """  function duracionTotalMs() {
    if (typeof window.FSC_DURACION_PROYECTO === 'number' && window.FSC_DURACION_PROYECTO > 0) {
      return window.FSC_DURACION_PROYECTO * 1000;
    }
    return totalMs || 0;
  }

  function reiniciarSecuencia() {
    if (idProyecto) {
      if (typeof window.FSC_REINICIAR_PROYECTO === 'function') window.FSC_REINICIAR_PROYECTO();
    } else {
      reiniciar();
      reproducir();
    }
  }

  function aviso(texto) {
    var el = document.getElementById('fly-link-solo');
    if (el) {
      el.textContent = texto;
      el.classList.remove('ui-hidden');
    }
  }

  /** GRABAR VIDEO: usa la captura de la pestaña/pantalla del navegador. Es la
      única forma de que el video incluya el fondo animado (el canvas del shader
      viene de otro origen y el navegador no deja leerlo). Al apretar: vuelve a
      cero, reproduce UNA vuelta y corta sola. */
  async function grabarVideo() {
    var btn = document.getElementById('fly-grabar');
    if (grabando && mediaRec) { mediaRec.stop(); return; }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert('Este navegador no permite grabar la pantalla. Probá desde Chrome o Edge de escritorio.');
      return;
    }

    aviso('Elegí ESTA PESTAÑA en el diálogo. Empieza sola desde el principio y se corta al terminar la vuelta.');

    var stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false
      });
    } catch (e) {
      aviso('Cancelaste la grabación.');
      return;
    }

    // pantalla completa: así lo grabado es el flyer, sin barras del navegador
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch (e) { }

    var trozos = [];
    var mime = mejorMime();
    try {
      mediaRec = mime
        ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 20000000 })
        : new MediaRecorder(stream);
    } catch (e) {
      alert('No se pudo iniciar la grabación: ' + e.message);
      stream.getTracks().forEach(function (t) { t.stop(); });
      return;
    }

    mediaRec.ondataavailable = function (ev) { if (ev.data && ev.data.size) trozos.push(ev.data); };
    mediaRec.onstop = function () {
      grabando = false;
      try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { }
      var tipo = (mediaRec.mimeType || 'video/webm').split(';')[0];
      var ext = tipo.indexOf('mp4') !== -1 ? 'mp4' : 'webm';
      var blob = new Blob(trozos, { type: tipo });
      window.__tamanoVideo = blob.size;
      if (!blob.size) {
        aviso('La grabación salió vacía. Probá de nuevo sin cambiar de pestaña.');
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'flyer_' + (params.get('proyecto') || params.get('id') || 'arte') + '.' + ext;
        a.click();
        aviso('¡Listo! Se descargó el video (' + Math.round(blob.size / 1048576 * 10) / 10 + ' MB).');
      }
      if (btn) btn.innerHTML = '<i class="fas fa-video"></i> Grabar video (1 vuelta completa)';
      if (elPanel && !params.get('play')) elPanel.classList.remove('is-oculto');
      document.body.classList.remove('fly-grabando');
    };

    grabando = true;
    mediaRec.start(1000);
    document.body.classList.add('fly-grabando');
    if (elPanel) elPanel.classList.add('is-oculto');
    if (btn) btn.innerHTML = '<i class="fas fa-stop"></i> Grabando… (tocá para cortar)';

    // arranca de cero, una sola vuelta
    reiniciarSecuencia();
    var dur = duracionTotalMs();
    if (dur > 0) {
      setTimeout(function () { if (grabando && mediaRec) mediaRec.stop(); }, dur + 1200);
    }
  }

"""
    j = j[:inicio] + nueva + j[fin:]
    cambios.append('flyer-1.js: grabación por captura de pantalla + 1 vuelta con corte automático')

if cambios:
    io.open(P2, 'w', encoding='utf-8', newline='').write(j)

# ── 3) flyer.html: un solo botón claro + texto de ayuda ──────────────────────
P3 = PUB + r'\flyer.html'
ls = io.open(P3, encoding='utf-8', newline='').read().split('\n')
sacados = 0
for k, l in enumerate(ls):
    if 'id="fly-grabar"' in l:
        ls[k] = l.replace('Grabar video (toda la vuelta)', 'Grabar video (1 vuelta completa)')
    if 'id="fly-pantalla"' in l:
        ls[k] = ''; sacados += 1
    if 'Grabá la pantalla: la animación va sola' in l:
        ls[k] = l.replace('Grabá la pantalla: la animación va sola',
                          'Al grabar elegí ESTA PESTAÑA: vuelve a empezar, se reproduce una vuelta y se corta sola')
if sacados:
    cambios.append('flyer.html: un solo botón de grabación (%d quitado)' % sacados)
io.open(P3, 'w', encoding='utf-8', newline='').write('\n'.join(ls))

print('\n'.join('· ' + c for c in cambios) if cambios else '· sin cambios')
