"""Flyer: 
 1) la BIO del artista entra en la escena del artista (generador + página)
 2) al apretar Empezar se genera y copia el LINK de solo-flyer en modo play
 3) botón Exportar (PNG del cuadro actual, en el tamaño de diseño)
 4) tecla P vuelve a mostrar el panel
 5) ?play=1 arranca solo, sin panel (es el modo del link de solo-flyer)
"""
import io, os

PUB = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public'
cambios = []

# ───────────────────────── flyer.html: botones ─────────────────────────────
P = PUB + r'\flyer.html'
h = io.open(P, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in h else '\n'
if 'btn-copiar-solo' not in h:
    ancla = """      <button type="button" id="fly-loop" class="fly-btn is-on"><i class="fas fa-repeat"></i> Repetir</button>"""
    extra = ancla + nl + """      <button type="button" id="fly-copiar-solo" class="fly-btn"><i class="fas fa-link"></i> Copiar link de solo-flyer</button>
      <button type="button" id="fly-exportar" class="fly-btn"><i class="fas fa-download"></i> Exportar PNG</button>"""
    if ancla in h:
        h = h.replace(ancla, extra, 1)
    elif ancla.replace('\n', nl) in h:
        h = h.replace(ancla.replace('\n', nl), extra.replace('\n', nl), 1)
    if 'btn-copiar-solo' in h:
        h = h.replace('</p>' + nl + '    <div class="fly-acciones">',
                      '</p>' + nl + '    <div class="fly-acciones">', 1)
        # texto para mostrar el link generado
        ancla2 = """    <p class="fly-ayuda">"""
        if ancla2 in h:
            h = h.replace(ancla2, '    <p id="fly-link-solo" class="fly-link-solo ui-hidden"></p>' + nl + ancla2, 1)
        io.open(P, 'w', encoding='utf-8', newline='').write(h)
        cambios.append('flyer.html: botones de link y export + texto del link')

# ───────────────────────── flyer.css: .fly-link-solo ──────────────────────
P2 = PUB + r'\css\paginas\flyer.css'
c = io.open(P2, encoding='utf-8', newline='').read()
if '.fly-link-solo' not in c:
    c += """
/* Link de solo-flyer generado al apretar Empezar */
.fly-link-solo {
  margin: 0 0 12px; padding: 9px 12px; font-size: 12px; color: #d9fbff;
  background: rgba(34,211,238,.12); border: 1px solid rgba(34,211,238,.35);
  word-break: break-all;
}
"""
    io.open(P2, 'w', encoding='utf-8', newline='').write(c)
    cambios.append('flyer.css: estilo del link')

# ───────────────────────── flyer-1.js: lógica ─────────────────────────────
P3 = PUB + r'\js\paginas\flyer-1.js'
j = io.open(P3, encoding='utf-8', newline='').read()

# (1) bio en la escena del artista
viejo = """        palabras: [
          { texto: artista.nombre || 'Artista', y: artista.bio ? 0.72 : 0.76, size: window.innerWidth > 900 ? 50 : 30 },
          { texto: artista.usuario ? '@' + artista.usuario : '', y: 0.84, size: window.innerWidth > 900 ? 26 : 17, spacing: 8 },
        ].filter(function (w) { return w.texto; }),"""
nuevo = """        palabras: (function () {
          var grande = window.innerWidth > 900;
          var lista = [];
          var conBio = String(artista.bio || '').trim().length > 0;
          lista.push({ texto: artista.nombre || 'Artista', y: conBio ? 0.60 : 0.72, size: grande ? 50 : 30 });
          if (artista.usuario) lista.push({ texto: '@' + artista.usuario, y: conBio ? 0.66 : 0.84, size: grande ? 26 : 17, spacing: 8 });
          // BIO del artista: recortada, repartida arriba de todo para que se lea
          if (conBio) {
            var bio = String(artista.bio).replace(/\\s+/g, ' ').trim();
            var ancho = grande ? 34 : 38;
            var maxLineas = grande ? 3 : 2;
            var tope = ancho * maxLineas;
            if (bio.length > tope) bio = bio.slice(0, tope).replace(/\\s\\S*$/, '') + '…';
            var ysBio = grande ? [0.74, 0.79, 0.84] : [0.76, 0.82];
            trocear(bio, ancho).slice(0, maxLineas).forEach(function (linea, i) {
              lista.push({ texto: linea, y: ysBio[i] !== undefined ? ysBio[i] : 0.84,
                size: grande ? 19 : 13, spacing: grande ? 3 : 1, max: ancho });
            });
          }
          return lista.filter(function (w) { return w.texto; });
        })(),"""
if viejo in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: bio del artista en la escena')

# (2) tecla P vuelve a mostrar el panel
viejo = """    if (e.key === 'f' || e.key === 'F') alternarFullscreen();"""
nuevo = """    if (e.key === 'f' || e.key === 'F') alternarFullscreen();
    if (e.key === 'p' || e.key === 'P') { pausar(); }   // P = volver a mostrar el panel"""
if viejo in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: tecla P muestra el panel')

# (3)(4)(5) link solo-flyer, export y arranque automático
viejo = """  var btnPlay = $('#fly-play');"""
nuevo = """  // ── link de SOLO FLYER (modo play, sin panel) ──────────────────────────
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
      ['jpsi-canvas', 'defaultCanvas0'].forEach(function (id) {
        var cv = document.getElementById(id);
        if (!cv) return;
        try { ctx.drawImage(cv, 0, 0, out.width, out.height); } catch (e) { }
      });
      var p5cv = document.querySelector('#p5-canvas canvas');
      if (p5cv) { try { ctx.drawImage(p5cv, 0, 0, out.width, out.height); } catch (e) { } }
      var a = document.createElement('a');
      a.download = 'flyer_' + (params.get('proyecto') || params.get('id') || 'arte') + '.png';
      a.href = out.toDataURL('image/png');
      a.click();
    } catch (e) { console.error('[flyer] export', e); }
  }

  var btnExportar = document.getElementById('fly-exportar');
  if (btnExportar) btnExportar.addEventListener('click', exportarPNG);

  var btnPlay = $('#fly-play');"""
if viejo in j and 'urlSoloFlyer' not in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: link solo-flyer + export')

# al apretar Empezar: generar/copiar el link
viejo = """  if (btnPlay) btnPlay.addEventListener('click', function () {
    if (terminado) reiniciar();
    if (pausado) reproducir(); else pausar();
  });"""
nuevo = """  if (btnPlay) btnPlay.addEventListener('click', function () {
    if (terminado) reiniciar();
    if (pausado) {
      mostrarLinkSolo();          // Empezar también deja listo el link de solo-flyer
      reproducir();
    } else { pausar(); }
  });"""
if viejo in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: Empezar genera el link')

# ?play=1 → arranca solo
viejo = """  configurarParticulas();
  if (idProyecto) {"""
nuevo = """  var modoPlay = params.get('play') === '1';

  configurarParticulas();
  if (idProyecto) {"""
if viejo in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: lee ?play=1')

viejo = """  } else {
    // El reloj empieza recién cuando p5 está listo (si no, las palabras no salen)
    (function esperarP5(intento) {
      if (p5Listo() || (intento || 0) > 120) { requestAnimationFrame(frame); return; }
      setTimeout(function () { esperarP5((intento || 0) + 1); }, 200);
    })(0);
  }"""
nuevo = """  } else {
    // El reloj empieza recién cuando p5 está listo (si no, las palabras no salen)
    (function esperarP5(intento) {
      if (p5Listo() || (intento || 0) > 120) {
        requestAnimationFrame(frame);
        if (modoPlay) { reproducir(); }     // ?play=1: arranca solo, sin panel
        return;
      }
      setTimeout(function () { esperarP5((intento || 0) + 1); }, 200);
    })(0);
  }"""
if viejo in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: ?play=1 arranca automático')

# en modo proyecto también: si play=1, ocultar panel al cargar
viejo = """  function modoProyecto() {"""
nuevo = """  function modoProyecto() {
    if (params.get('play') === '1') {        // link de solo-flyer: sin panel
      document.body.classList.add('fly-grabando');
      elPanel.classList.add('is-oculto');
      elBarra.classList.remove('ui-hidden');
    }"""
if viejo in j and 'link de solo-flyer: sin panel' not in j:
    j = j.replace(viejo, nuevo, 1); cambios.append('flyer-1.js: modo proyecto con ?play=1')

if cambios:
    io.open(P3, 'w', encoding='utf-8', newline='').write(j)

print('\n'.join('· ' + c for c in cambios) if cambios else '· sin cambios')
