/* ════════════════════════════════════════════════════════════════════════════
   FLYER ANIMADO — timeline automático sobre el sistema de palabras de
   artedigitaldata (js/p5-effect.js) + el fondo del JP Shader Editor.

   Secuencia:  portada (palabras) → por cada obra: FOTO DEL ARTISTA + su nombre
   → FOTO DE LA OBRA + el título → salida → … → cierre con el link.
   Las palabras entran y salen solas (partículas); las fotos entran y salen por
   CSS. Todo se controla con el reloj de la timeline (pausa, ritmo, repetir).

   Parámetros:  ?id=<convocatoria>   ?t=SEGUNDOS  (salta a ese segundo y pausa)
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
  var idProyecto = params.get('proyecto') || window.FSC_PROYECTO_ID || null;
  var saltarA = params.get('t') ? Number(params.get('t')) : null;
  var API = (window.CONFIG && (CONFIG.API_URL || CONFIG.API_BASE)) || '';
  var $ = function (s) { return document.querySelector(s); };

  var elObra = $('#fly-obra'), elVelo = $('#fly-velo'), elPerfil = $('#fly-perfil'), elPerfilImg = $('#fly-perfil-img');
  var elPanel = $('#fly-panel'), elBarra = $('#fly-barra'), elBarraFill = $('#fly-barra-fill');
  var elEstado = $('#fly-estado'), elEstadoTxt = $('#fly-estado-txt');

  // ── Duraciones base (ms) — se multiplican por el "ritmo" elegido ──────────
  var D = { intro: 5000, artista: 5000, obra: 7000, obraCorta: 4000, salida: 800, cierre: 6000, cierreCorto: 5000 };

  var escenas = [], totalMs = 0, datos = null, idsEscena = [];
  var pausado = true, t = 0, ultimo = 0, ritmo = 1, loop = true, escenaActual = -1, terminado = false, contadorPalabras = 0;

  // ─────────────────────────────────────────────────── partículas ─────────
  function configurarParticulas() {
    var intentos = 0;
    (function probar() {
      if (window.ParticlesConfig && typeof window.ParticlesConfig.set === 'function') {
        var grande = window.innerWidth > 900;
        window.ParticlesConfig.set({
          AUTO_MODE: false,                 // sin palabras automáticas: manda el flyer
          COLLAB_WORD_LIFESPAN: 60,         // las palabras no se van solas: las saca la escena
          FORCE_WHITE_WORDS: true,
          TEXT_SIZE: grande ? 52 : 34,
          LETTER_SPACING: grande ? 8 : 4,
        });
        return;
      }
      if (++intentos < 60) setTimeout(probar, 250);
    })();
  }

  /** Corta un texto largo en trozos de hasta 16 caracteres (una "palabra" cada uno). */
  function trocear(texto, max) {
    max = max || 16;
    var salida = [], actual = '';
    String(texto || '').split(/\s+/).forEach(function (p) {
      if (!p) return;
      if (!actual) { actual = p; }
      else if ((actual + ' ' + p).length <= max) { actual += ' ' + p; }
      else { salida.push(actual); actual = p; }
    });
    if (actual) salida.push(actual);
    return salida.slice(0, 3);
  }

  /** El sistema de partículas necesita que p5 ya haya publicado sus globales
      (textWidth/createVector aparecen recién en window.load). Hasta entonces
      spawnWordParticles no dibuja nada: por eso se espera. */
  function p5Listo() {
    return typeof window.spawnWordParticles === 'function'
      && typeof window.textWidth === 'function'
      && typeof window.createVector === 'function';
  }

  /** Saca las palabras de la escena anterior. Se BORRAN al instante (no se
      desvanecen) porque si no quedan encimadas con las de la escena nueva. */
  function limpiarPalabras() {
    if (idProyecto) return;
    if (typeof window.removeFlyerWordParticles === 'function') {
      idsEscena.forEach(function (id) {
        try { window.removeFlyerWordParticles(id); } catch (e) { }
      });
    }
    idsEscena = [];
    if (typeof window.clearAllFlyerParticles === 'function') window.clearAllFlyerParticles();
  }

  /** Lanza las palabras de una escena con el sistema de partículas. */
  function palabras(lista, intento) {
    intento = intento || 0;
    if (!p5Listo()) {
      // todavía no está listo p5: reintento en un ratito (no se pierden las palabras)
      if (intento < 25) setTimeout(function () { palabras(lista, intento + 1); }, 200);
      return;
    }
    var W = window.innerWidth, H = window.innerHeight;
    var grande = W > 900;
    lista.forEach(function (w) {
      var trozos = trocear(w.texto, w.max || 16);
      var baseY = (w.y !== undefined ? w.y : 0.5);
      trozos.forEach(function (trozo, i) {
        var size = w.size || (grande ? 54 : 30);
        var y = H * baseY + (i - (trozos.length - 1) / 2) * (size * 1.35);
        var idPalabra = 'fly_' + (contadorPalabras++) + '_' + i;
        idsEscena.push(idPalabra);
        try {
          window.spawnWordParticles(trozo.toUpperCase(), W * (w.x !== undefined ? w.x : 0.5), y,
            true, idPalabra, {
              fontSize: size,
              letterSpacing: w.spacing !== undefined ? w.spacing : (grande ? 7 : 3),
              // Sin formación forzada ni giro: así las letras usan la MISMA
              // animación (CODE o FISICS) que esté configurada en visualeffects.
              formationMode: w.modo,
            });
        } catch (e) { }
      });
    });
  }

  // ─────────────────────────────────────────────────── timeline ──────────
  function construirTimeline(d) {
    var o = d.oportunidad || {}, obras = d.obras || [];
    escenas = [];

    // 1) Portada
    escenas.push({
      tipo: 'intro', dur: D.intro,
      palabras: [
        { texto: o.titulo || 'Galería', y: 0.44, size: window.innerWidth > 900 ? 58 : 32 },
        { texto: obras.length + (obras.length === 1 ? ' OBRA' : ' OBRAS'), y: 0.62, size: window.innerWidth > 900 ? 34 : 22, spacing: 12 },
      ],
    });

    // 2) Una escena por obra: artista → obra
    obras.forEach(function (obra) {
      var artista = obra.artista || {};
      escenas.push({
        tipo: 'artista', dur: D.artista, obra: obra, artista: artista,
        palabras: (function () {
          var grande = window.innerWidth > 900;
          var lista = [];
          var conBio = String(artista.bio || '').trim().length > 0;
          lista.push({ texto: artista.nombre || 'Artista', y: conBio ? 0.57 : 0.57, size: grande ? 50 : 30 });
          if (artista.usuario) lista.push({ texto: '@' + artista.usuario, y: conBio ? 0.635 : 0.65, size: grande ? 26 : 17, spacing: 8 });
          // BIO del artista: recortada, repartida arriba de todo para que se lea
          if (conBio) {
            var bio = String(artista.bio).replace(/\s+/g, ' ').trim();
            var ancho = grande ? 34 : 38;
            var maxLineas = grande ? 3 : 2;
            var tope = ancho * maxLineas;
            if (bio.length > tope) bio = bio.slice(0, tope).replace(/\s\S*$/, '') + '…';
            var ysBio = grande ? [0.71, 0.765, 0.82] : [0.73, 0.80];
            trocear(bio, ancho).slice(0, maxLineas).forEach(function (linea, i) {
              lista.push({ texto: linea, y: ysBio[i] !== undefined ? ysBio[i] : 0.84,
                size: grande ? 19 : 13, spacing: grande ? 3 : 1, max: ancho });
            });
          }
          return lista.filter(function (w) { return w.texto; });
        })(),
      });
      var grandeObra = window.innerWidth > 900;
      // Descripción: un pedazo corto, repartido en pocas líneas y SIEMPRE por
      // encima de la foto del artista (que va abajo a la izquierda).
      var anchoLinea = grandeObra ? 30 : 34;
      var maxLineas = grandeObra ? 3 : 2;
      var ysDesc = grandeObra ? [0.66, 0.72, 0.78] : [0.60, 0.685];
      var maxLargo = anchoLinea * maxLineas;
      var desc = String(obra.descripcion || '').replace(/\s+/g, ' ').trim();
      if (desc.length > maxLargo) desc = desc.slice(0, maxLargo).replace(/\s\S*$/, '') + '…';
      var lineasDesc = desc ? trocear(desc, anchoLinea).slice(0, maxLineas) : [];
      var palabrasObra = [
        { texto: obra.titulo || 'Sin título', y: lineasDesc.length ? (grandeObra ? 0.36 : 0.33) : 0.5, size: grandeObra ? 52 : 30, max: 18 },
        { texto: (artista.nombre || '') + (artista.usuario ? '  ·  @' + artista.usuario : ''), y: lineasDesc.length ? (grandeObra ? 0.5 : 0.47) : 0.66, size: grandeObra ? 24 : 16, spacing: 8 },
      ].filter(function (w) { return w.texto; });
      lineasDesc.forEach(function (linea, i) {
        palabrasObra.push({
          texto: linea, y: ysDesc[i] !== undefined ? ysDesc[i] : 0.72, size: grandeObra ? 21 : 14,
          spacing: grandeObra ? 3 : 1, max: anchoLinea,
        });
      });
      escenas.push({
        tipo: 'obra', dur: obra.descripcion ? D.obra : D.obraCorta, obra: obra, artista: artista,
        palabras: palabrasObra,
      });
      escenas.push({ tipo: 'salida', dur: D.salida });
    });

    // 3) Cierre
    escenas.push({
      tipo: 'cierre', dur: obras.length ? D.cierre : D.cierreCorto,
      palabras: [
        { texto: 'ARTE DIGITAL DATA', y: 0.46, size: window.innerWidth > 900 ? 56 : 30, spacing: 10 },
        { texto: 'artedigitaldata.com', y: 0.6, size: window.innerWidth > 900 ? 30 : 19, spacing: 6 },
        { texto: 'GALERÍA: ' + (o.titulo || ''), y: 0.72, size: window.innerWidth > 900 ? 22 : 15, max: 20, spacing: 6 },
      ],
    });

    totalMs = escenas.reduce(function (a, e) { return a + e.dur; }, 0);
  }

  function escenaEn(ms) {
    var acc = 0;
    for (var i = 0; i < escenas.length; i++) {
      acc += escenas[i].dur;
      if (ms < acc) return i;
    }
    return escenas.length - 1;
  }

  // ─────────────────────────────────────────────────── escenas ───────────
  function mostrarFotoObra(src) {
    if (!elObra) return;
    if (src) {
      if (elObra.getAttribute('src') !== src) elObra.src = src;
      elObra.classList.add('is-in');
      elVelo.classList.add('is-in');
    } else {
      elObra.classList.remove('is-in');
      elVelo.classList.remove('is-in');
    }
  }
  function mostrarPerfil(artista, chico) {
    if (!elPerfil) return;
    if (artista) {
      var src = artista.avatar || '';
      if (src) {
        if (elPerfilImg.getAttribute('src') !== src) elPerfilImg.src = src;
        elPerfilImg.style.display = 'block';
      } else {
        elPerfilImg.removeAttribute('src');
        elPerfilImg.style.display = 'none';
      }
      elPerfil.classList.add('is-in');
      elPerfil.classList.toggle('is-chico', !!chico);
      elPerfil.classList.toggle('is-artista', !chico);   // foto arriba, texto abajo
    } else {
      elPerfil.classList.remove('is-in');
    }
  }

  function entrar(escena) {
    limpiarPalabras();
    if (!escena) return;
    switch (escena.tipo) {
      case 'intro':
        mostrarFotoObra(null); mostrarPerfil(null);
        palabras(escena.palabras || []);
        break;
      case 'artista':
        mostrarFotoObra(null);
        mostrarPerfil(escena.artista, false);
        palabras(escena.palabras || []);
        break;
      case 'obra':
        mostrarFotoObra(escena.obra && escena.obra.imagen);
        mostrarPerfil(escena.artista, true);
        palabras(escena.palabras || []);
        break;
      case 'salida':
        mostrarFotoObra(null); mostrarPerfil(null);
        break;
      case 'cierre':
        mostrarFotoObra(null); mostrarPerfil(null);
        palabras(escena.palabras || []);
        break;
    }
  }

  // ─────────────────────────────────────────────────── reloj ─────────────
  function pintarBarra() {
    if (!elBarraFill) return;
    var pct = totalMs ? Math.min(100, (t / totalMs) * 100) : 0;
    elBarraFill.style.width = pct.toFixed(2) + '%';
  }

  function frame(now) {
    if (!pausado) {
      if (!ultimo) ultimo = now;
      t += (now - ultimo) * ritmo;
      ultimo = now;
      if (t >= totalMs) {
        if (loop) { t = 0; escenaActual = -1; }
        else { t = totalMs; pausar(true); terminado = true; }
      }
      var idx = escenaEn(t);
      if (idx !== escenaActual) { escenaActual = idx; entrar(escenas[idx]); }
      pintarBarra();
    } else {
      ultimo = now;
    }
    requestAnimationFrame(frame);
  }

  // ─────────────────────────────────────────────────── controles ─────────
  function reproducir() {
    pausado = false; terminado = false; ultimo = 0;
    document.body.classList.add('fly-grabando');
    elPanel.classList.add('is-oculto');
    elBarra.classList.remove('ui-hidden');
  }
  function pausar(porFin) {
    pausado = true;
    document.body.classList.remove('fly-grabando');
    elPanel.classList.remove('is-oculto');
    if (porFin) elBarra.classList.add('ui-hidden');
  }
  function reiniciar() {
    if (idProyecto) return;          // en modo proyecto manda la timeline del editor
    t = 0; escenaActual = -1; terminado = false; limpiarPalabras();
    mostrarFotoObra(null); mostrarPerfil(null);
    elBarraFill.style.width = '0%';
  }

  // ── link de SOLO FLYER (modo play, sin panel) ──────────────────────────
  var elLinkSolo = document.getElementById('fly-link-solo');

  function urlSoloFlyer() {
    var u = new URL(window.location.href);
    u.searchParams.set('play', '1');
    return u.toString();
  }

  function mostrarLinkSolo() {
    var url = urlSoloFlyer();
    if (elLinkSolo) {
      elLinkSolo.textContent = 'Link de solo-flyer (abre y reproduce): ' + url;
      elLinkSolo.classList.remove('ui-hidden');
    }
    var copiado = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url); copiado = true;
      }
    } catch (e) { }
    return { url: url, copiado: copiado };
  }

  var btnCopiar = document.getElementById('fly-copiar-solo');
  if (btnCopiar) btnCopiar.addEventListener('click', function () {
    var r = mostrarLinkSolo();
    btnCopiar.innerHTML = r.copiado
      ? '<i class="fas fa-check"></i> Link copiado'
      : '<i class="fas fa-link"></i> Link listo (copialo del texto)';
    setTimeout(function () {
      btnCopiar.innerHTML = '<i class="fas fa-link"></i> Copiar link de solo-flyer';
    }, 2600);
  });

  // ── Exportar: PNG del cuadro actual en el tamaño de diseño ─────────────
  function exportarPNG() {
    try {
      var base = (window.FSC_VIEWPORT_BASE && window.FSC_VIEWPORT_BASE.length === 2)
        ? window.FSC_VIEWPORT_BASE : [1080, 1920];
      var out = document.createElement('canvas');
      out.width = base[0]; out.height = base[1];
      var ctx = out.getContext('2d');
      ctx.fillStyle = '#0d0d12';
      ctx.fillRect(0, 0, out.width, out.height);
      // 1) fondo del shader, 2) partículas y fotos (p5)
      var p5cv = document.querySelector('#p5-canvas canvas');
      if (p5cv) { try { ctx.drawImage(p5cv, 0, 0, out.width, out.height); } catch (e) { } }
      var a = document.createElement('a');
      a.download = 'flyer_' + (params.get('proyecto') || params.get('id') || 'arte') + '.png';
      a.href = out.toDataURL('image/png');
      a.click();
    } catch (e) { console.error('[flyer] export', e); }
  }

  // ── GRABAR VIDEO de toda la vuelta: compone fondo + partículas/fotos a 1080x1920 ──
  var grabando = false, mediaRec = null, compCanvas = null;

  function lienzoCompuesto() {
    var base = (window.FSC_VIEWPORT_BASE && window.FSC_VIEWPORT_BASE.length === 2)
      ? window.FSC_VIEWPORT_BASE : [1080, 1920];
    if (!compCanvas) {
      compCanvas = document.createElement('canvas');
      compCanvas.width = base[0]; compCanvas.height = base[1];
      // Tiene que estar EN el documento (aunque sea fuera de pantalla): un canvas
      // suelto no entrega cuadros a captureStream y el video sale vacío.
      compCanvas.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + base[0] + 'px;height:' + base[1] + 'px;opacity:0;pointer-events:none;';
      compCanvas.id = 'fly-comp-canvas';
      document.body.appendChild(compCanvas);
    }
    return compCanvas;
  }

  /** Compone el cuadro para exportar. OJO: NO se puede dibujar el canvas del
      shader de fondo porque viene de otro origen y "contamina" el lienzo
      (después el navegador no deja exportar ni grabar nada). Va un fondo propio
      oscuro + lo que dibuja p5 (palabras y fotos), que sí es exportable. */
  function pintaCompuesto() {
    var out = lienzoCompuesto(), ctx = out.getContext('2d');
    var g = ctx.createRadialGradient(out.width / 2, out.height * 0.42, out.width * 0.1,
                                     out.width / 2, out.height * 0.5, out.width * 0.85);
    g.addColorStop(0, '#1b1a22');
    g.addColorStop(0.55, '#101018');
    g.addColorStop(1, '#08080c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, out.width, out.height);
    var p5cv = document.querySelector('#p5-canvas canvas');
    if (p5cv) { try { ctx.drawImage(p5cv, 0, 0, out.width, out.height); } catch (e) { } }
  }

  function mejorMime() {
    // Ojo: 'video/mp4;codecs=h264' dice estar soportado pero el encoder no entrega
    // cuadros (sale vacío). Los que funcionan de verdad son estos, en este orden:
    var opciones = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < opciones.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(opciones[i])) return opciones[i];
    }
    return '';
  }

  function duracionTotalMs() {
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

  var btnGrabar = document.getElementById('fly-grabar');
  if (btnGrabar) btnGrabar.addEventListener('click', grabarVideo);

  var btnExportar = document.getElementById('fly-exportar');
  if (btnExportar) btnExportar.addEventListener('click', exportarPNG);

  var btnPlay = $('#fly-play');
  if (btnPlay) btnPlay.addEventListener('click', function () {
    if (terminado) reiniciar();
    if (pausado) {
      mostrarLinkSolo();          // Empezar también deja listo el link de solo-flyer
      reproducir();
    } else { pausar(); }
  });
  var btnFull = $('#fly-fullscreen');
  if (btnFull) btnFull.addEventListener('click', alternarFullscreen);
  var btnLoop = $('#fly-loop');
  if (btnLoop) btnLoop.addEventListener('click', function () {
    loop = !loop;
    btnLoop.classList.toggle('is-on', loop);
    btnLoop.innerHTML = '<i class="fas fa-repeat"></i> Repetir' + (loop ? '' : ' (no)');
  });

  function alternarFullscreen() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    } catch (e) { }
  }

  var contFormatos = $('#fly-formatos');
  if (contFormatos) contFormatos.addEventListener('click', function (e) {
    var b = e.target.closest('.fly-op'); if (!b) return;
    Array.prototype.forEach.call(contFormatos.querySelectorAll('.fly-op'), function (x) { x.classList.remove('is-on'); });
    b.classList.add('is-on');
    $('#fly-stage').setAttribute('data-formato', b.dataset.formato);
  });
  var contRitmos = $('#fly-ritmos');
  if (contRitmos) contRitmos.addEventListener('click', function (e) {
    var b = e.target.closest('.fly-op'); if (!b) return;
    Array.prototype.forEach.call(contRitmos.querySelectorAll('.fly-op'), function (x) { x.classList.remove('is-on'); });
    b.classList.add('is-on');
    ritmo = Number(b.dataset.ritmo) || 1;
  });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') { e.preventDefault(); if (terminado) reiniciar(); if (pausado) reproducir(); else pausar(); }
    if (e.key === 'f' || e.key === 'F') alternarFullscreen();
    if (e.key === 'p' || e.key === 'P') { pausar(); }   // P = volver a mostrar el panel
    if (e.key === 'r' || e.key === 'R') { reiniciar(); reproducir(); }
  });

  // ─────────────────────────────────────────────────── arranque ─────────
  function reloj(ms) {
    var s = Math.round(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function render(data) {
    datos = data;
    var obras = data.obras || [];
    document.title = 'Flyer · ' + (data.oportunidad && data.oportunidad.titulo ? data.oportunidad.titulo : 'Galería');

    // preload de fotos para que no parpadeen al entrar
    obras.forEach(function (o) {
      if (o.imagen) { var i = new Image(); i.src = o.imagen; }
      if (o.artista && o.artista.avatar) { var j = new Image(); j.src = o.artista.avatar; }
    });

    $('#fly-titulo').textContent = (data.oportunidad && data.oportunidad.titulo) || 'Galería';
    var artistas = obras.map(function (o) { return (o.artista && o.artista.nombre) || ''; }).filter(Boolean);
    $('#fly-meta').textContent = obras.length + (obras.length === 1 ? ' obra' : ' obras')
      + ' · ' + artistas.length + ' artistas · ~' + reloj(totalMs / ritmo) + ' por vuelta';

    elEstado.classList.add('ui-hidden');
    construirTimeline(data);
    $('#fly-meta').textContent = obras.length + (obras.length === 1 ? ' obra' : ' obras')
      + ' · ' + artistas.length + ' artistas · ~' + reloj(totalMs / 1) + ' por vuelta';

    if (saltarA !== null) {           // ?t=12 → se planta en ese segundo (para revisar)
      t = saltarA * 1000; escenaActual = escenaEn(t); entrar(escenas[escenaActual]);
      pausado = true; document.body.classList.add('fly-grabando'); elPanel.classList.add('is-oculto');
      pintarBarra();
    }
  }

  function fallar(txt) {
    if (elEstadoTxt) elEstadoTxt.textContent = txt;
  }

  /** Modo proyecto guardado: lo reproduce el motor de p5-effect (lee
      /visualeffects/<id>, arma las palabras y anima imágenes + palabras con la
      timeline). Acá sólo queda la interfaz de grabación. */
  function modoProyecto() {
    if (params.get('play') === '1') {        // link de solo-flyer: sin panel
      document.body.classList.add('fly-grabando');
      elPanel.classList.add('is-oculto');
      elBarra.classList.remove('ui-hidden');
    }
    $('#fly-titulo').textContent = 'Flyer (proyecto guardado)';
    $('#fly-meta').textContent = 'Se reproduce solo con la timeline del editor · grabá cuando arranque';
    elEstado.classList.add('ui-hidden');
    elBarra.classList.remove('ui-hidden');
    var pct = 0;
    setInterval(function () {                     // barra de progreso orientativa
      pct = (pct + 0.4) % 100;
      if (elBarraFill) elBarraFill.style.width = pct.toFixed(1) + '%';
    }, 500);
  }

  var modoPlay = params.get('play') === '1';

  /** Carga la galería probando varias direcciones (en celular una suele fallar):
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
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var reloj = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : null;
      fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { if (reloj) clearTimeout(reloj); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
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

  configurarParticulas();
  if (idProyecto) {
    modoProyecto();
  } else {
    // El reloj empieza recién cuando p5 está listo (si no, las palabras no salen)
    (function esperarP5(intento) {
      if (p5Listo() || (intento || 0) > 120) {
        requestAnimationFrame(frame);
        if (modoPlay) { reproducir(); }     // ?play=1: arranca solo, sin panel
        return;
      }
      setTimeout(function () { esperarP5((intento || 0) + 1); }, 200);
    })(0);
  }

  if (!id) {
    fallar('Falta el id de la convocatoria: agregá ?id=… en el link.');
  } else {
    cargarObras(id);
  }
})();
