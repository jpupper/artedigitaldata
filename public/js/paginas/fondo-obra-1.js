/* ============================================================================
   FONDO ANIMADO POR OBRA — widget del formulario + selector de composiciones
   ----------------------------------------------------------------------------
   Lo carga: create.html (form de obra), post.html y profile.html (form de
   edición de una obra). El marcado del widget lo pide forms.js al renderizar
   la plantilla de OBRA (window.fondoObraWidgetHtml), así el mismo widget aparece
   en el form de creación y en el de edición sin duplicar código.

   Qué hace:
     · lista las composiciones del JP Shader Editor (GET {base}/api/compositions);
     · "Probar" las renderiza EN VIVO en un <iframe> con el include del editor
       (include-player.html?comp=<nombre>): un documento aparte, así la vista
       previa NO toca el fondo de la página ni el canvas del fondo del sitio;
     · "Usar" guarda el nombre de la composición en el input hidden
       <prefix>-fondo-shader (campo fondoShader del posteo) y lo muestra elegido.

   Sin estilo ni handler inline (regla de separación HTML/CSS/JS): todo por
   clases (css/paginas/fondo-obra.css) y delegación de eventos en document.
   ========================================================================== */
(function () {
  'use strict';

  var JP_BASE = 'https://vps-4455523-x.dattaweb.com/jpshadereditor';
  var COMPS_URL = JP_BASE + '/api/compositions';
  var PLAYER_URL = JP_BASE + '/include-player.html';
  // Mismo formato que valida el backend (el valor termina en data-comp del include).
  var COMP_RE = /^[A-Za-z0-9._-]{1,120}$/;
  var CACHE_MS = 5 * 60 * 1000;

  var comps = null;          // [{ nombre, titulo, autor, nodeCount, thumbnail }]
  var compsPidio = false;    // hay un fetch en curso
  var compsCuando = 0;       // cuándo se trajo (para el cache)
  var compsError = '';
  var filtro = '';
  var prefixActivo = '';     // 'post' (crear) | 'edit' (edición)
  var compProbando = '';
  var modal = null;

  // ---------------------------------------------------------------- helpers
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function normalizarComp(v) {
    var raw = String(v == null ? '' : v).trim();
    return COMP_RE.test(raw) ? raw : '';
  }

  function compPorNombre(nombre) {
    if (!comps) return null;
    for (var i = 0; i < comps.length; i++) {
      if (comps[i].nombre === nombre) return comps[i];
    }
    return null;
  }

  function etiqueta(nombre) {
    var c = compPorNombre(nombre);
    return c && c.titulo ? (c.titulo + ' · ' + c.nombre) : nombre;
  }

  // ------------------------------------------------- widget (lo usa forms.js)
  window.fondoObraWidgetHtml = function (prefix, item) {
    var valor = normalizarComp(item && item.fondoShader);
    var texto = valor ? ('Fondo propio: ' + etiqueta(valor)) : 'Sin fondo propio (usa el fondo del sitio)';
    return ''
      + '<div class="fo-section" id="' + esc(prefix) + '-fondo-section">'
      + '  <h4 class="fo-title"><i class="fas fa-film"></i>Fondo animado</h4>'
      + '  <p class="fo-hint">Elegí una composición del JP Shader Editor: va a ser el fondo de la página de esta obra. Si no elegís ninguna, se usa el fondo del sitio.</p>'
      + '  <input type="hidden" id="' + esc(prefix) + '-fondo-shader" name="fondoShader" value="' + esc(valor) + '">'
      + '  <div class="fo-row">'
      + '    <button type="button" class="fo-btn" data-fondo-abrir="' + esc(prefix) + '"><i class="fas fa-magic"></i>Fondo animado</button>'
      + '    <span class="fo-actual' + (valor ? ' is-set' : '') + '" id="' + esc(prefix) + '-fondo-actual">' + esc(texto) + '</span>'
      + '    <button type="button" class="fo-btn fo-btn--ghost" data-fondo-quitar="' + esc(prefix) + '"' + (valor ? '' : ' hidden') + '><i class="fas fa-times"></i>Quitar</button>'
      + '  </div>'
      + '</div>';
  };

  // Refresca el widget del form cuando cambia la composición elegida.
  function actualizarWidget(prefix, valor) {
    var input = document.getElementById(prefix + '-fondo-shader');
    if (input) input.value = valor;
    var etiquetaEl = document.getElementById(prefix + '-fondo-actual');
    if (etiquetaEl) {
      etiquetaEl.textContent = valor ? ('Fondo propio: ' + etiqueta(valor)) : 'Sin fondo propio (usa el fondo del sitio)';
      etiquetaEl.classList.toggle('is-set', !!valor);
    }
    var quitar = document.querySelector('[data-fondo-quitar="' + prefix + '"]');
    if (quitar) quitar.hidden = !valor;
  }

  // ------------------------------------------------------------- composiciones
  function traerComps(force) {
    if (comps && !force && (Date.now() - compsCuando) < CACHE_MS) return Promise.resolve(comps);
    if (compsPidio) return Promise.resolve(comps || []);
    compsPidio = true;
    compsError = '';
    return fetch(COMPS_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (lista) {
        comps = (Array.isArray(lista) ? lista : []).filter(function (c) { return c && normalizarComp(c.nombre); });
        compsCuando = Date.now();
        compsPidio = false;
        return comps;
      })
      .catch(function (e) {
        compsPidio = false;
        compsError = (e && e.message) || 'no se pudo conectar';
        return comps || [];
      });
  }

  // ------------------------------------------------------------------- modal
  function construirModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'fo-modal';
    modal.id = 'fo-modal';
    modal.hidden = true;
    modal.innerHTML = ''
      + '<div class="fo-box" role="dialog" aria-modal="true" aria-labelledby="fo-modal-titulo">'
      + '  <div class="fo-head">'
      + '    <h3 id="fo-modal-titulo"><i class="fas fa-film"></i>Fondo animado de la obra</h3>'
      + '    <button type="button" class="fo-x" data-fondo-cerrar aria-label="Cerrar"><i class="fas fa-times"></i></button>'
      + '  </div>'
      + '  <div class="fo-body">'
      + '    <div class="fo-col">'
      + '      <div class="fo-search"><i class="fas fa-search"></i><input type="search" id="fo-buscar" placeholder="Buscar composición por nombre o título..." autocomplete="off"></div>'
      + '      <div class="fo-list" id="fo-lista"></div>'
      + '    </div>'
      + '    <div class="fo-col fo-col--prev">'
      + '      <div class="fo-preview" id="fo-preview"><span class="fo-preview-ph" id="fo-preview-ph">Elegí “Probar” en una composición para verla acá, en vivo.</span></div>'
      + '      <p class="fo-preview-name" id="fo-preview-name"></p>'
      + '      <p class="fo-note">La vista previa es un documento aparte: no cambia el fondo de la página ni el del sitio.</p>'
      + '    </div>'
      + '  </div>'
      + '  <div class="fo-foot">'
      + '    <span class="fo-msg" id="fo-msg"></span>'
      + '    <button type="button" class="fo-btn fo-btn--ghost" data-fondo-cerrar>Cerrar</button>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(modal);
    var buscar = modal.querySelector('#fo-buscar');
    if (buscar) {
      buscar.addEventListener('input', function () {
        filtro = buscar.value.trim().toLowerCase();
        renderLista();
      });
    }
    return modal;
  }

  function abrir(prefix) {
    prefixActivo = prefix || '';
    construirModal();
    modal.hidden = false;
    document.documentElement.classList.add('fo-lock');
    compProbando = '';
    var msg = modal.querySelector('#fo-msg');
    if (msg) msg.textContent = '';
    var nombrePrev = modal.querySelector('#fo-preview-name');
    if (nombrePrev) nombrePrev.textContent = '';
    renderLista();
    traerComps(false).then(function () {
      // con la lista cargada, el widget muestra el TÍTULO de la comp elegida
      var input = document.getElementById(prefixActivo + '-fondo-shader');
      if (input) actualizarWidget(prefixActivo, normalizarComp(input.value));
      renderLista();
      scrollAElegida();
    });
    var buscar = modal.querySelector('#fo-buscar');
    if (buscar) setTimeout(function () { try { buscar.focus(); } catch (e) { } }, 30);
  }

  function cerrar() {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.classList.remove('fo-lock');
    soltarPreview();
  }

  function soltarPreview() {
    compProbando = '';
    if (!modal) return;
    var frame = modal.querySelector('#fo-preview iframe');
    if (frame) frame.src = 'about:blank';
    var ph = modal.querySelector('#fo-preview-ph');
    if (ph) ph.classList.remove('is-off');
    var nombrePrev = modal.querySelector('#fo-preview-name');
    if (nombrePrev) nombrePrev.textContent = '';
    modal.querySelectorAll('.fo-item.is-probando').forEach(function (el) { el.classList.remove('is-probando'); });
  }

  function mensaje(texto) {
    if (!modal) return;
    var msg = modal.querySelector('#fo-msg');
    if (msg) msg.textContent = texto || '';
  }

  function scrollAElegida() {
    if (!modal) return;
    var el = modal.querySelector('.fo-item.is-elegida');
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { } }
  }

  function renderLista() {
    var lista = modal && modal.querySelector('#fo-lista');
    if (!lista) return;
    var valorActual = normalizarComp((document.getElementById(prefixActivo + '-fondo-shader') || {}).value);

    if (!comps && !compsError) {
      lista.innerHTML = '<p class="fo-empty">Cargando composiciones…</p>';
      return;
    }
    if (compsError && (!comps || !comps.length)) {
      lista.innerHTML = '<p class="fo-empty">No pude traer las composiciones (' + esc(compsError) + ').'
        + '<br>Probá de nuevo en un rato o revisá <a href="' + esc(COMPS_URL) + '" target="_blank" rel="noopener">la lista del editor</a>.</p>';
      return;
    }
    if (!comps || !comps.length) {
      lista.innerHTML = '<p class="fo-empty">El editor todavía no tiene composiciones guardadas.</p>';
      return;
    }

    var visibles = comps.filter(function (c) {
      if (!filtro) return true;
      return (String(c.titulo || '') + ' ' + String(c.nombre || '') + ' ' + String(c.autor || '')).toLowerCase().indexOf(filtro) !== -1;
    });

    if (!visibles.length) {
      lista.innerHTML = '<p class="fo-empty">Ninguna composición coincide con “' + esc(filtro) + '”.</p>';
      return;
    }

    lista.innerHTML = visibles.map(function (c) {
      var nombre = c.nombre;
      var thumb = c.thumbnail ? '<img src="' + esc(c.thumbnail) + '" alt="" loading="lazy">' : '<span class="fo-thumb-ph"><i class="fas fa-film"></i></span>';
      var nodos = c.nodeCount ? (c.nodeCount + ' nodos') : 'composición';
      return ''
        + '<div class="fo-item' + (nombre === valorActual ? ' is-elegida' : '') + (nombre === compProbando ? ' is-probando' : '') + '" data-comp="' + esc(nombre) + '">'
        + '  <div class="fo-thumb">' + thumb + '</div>'
        + '  <div class="fo-meta">'
        + '    <p class="fo-item-title">' + esc(c.titulo || nombre) + '</p>'
        + '    <p class="fo-item-sub">' + esc(nombre) + ' · ' + esc(c.autor || 'anónimo') + ' · ' + esc(nodos) + '</p>'
        + '  </div>'
        + '  <div class="fo-actions">'
        + '    <button type="button" class="fo-mini" data-fondo-probar="' + esc(nombre) + '"><i class="fas fa-play"></i>Probar</button>'
        + '    <button type="button" class="fo-mini fo-mini--primary" data-fondo-elegir="' + esc(nombre) + '"><i class="fas fa-check"></i>Usar</button>'
        + '  </div>'
        + '</div>';
    }).join('');
  }

  function probar(nombre) {
    nombre = normalizarComp(nombre);
    if (!nombre || !modal) return;
    compProbando = nombre;
    var cont = modal.querySelector('#fo-preview');
    if (!cont) return;
    var ph = modal.querySelector('#fo-preview-ph');
    if (ph) ph.classList.add('is-off');
    var frame = cont.querySelector('iframe');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.className = 'fo-frame';
      frame.setAttribute('title', 'Vista previa del fondo animado');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      cont.appendChild(frame);
    }
    frame.src = PLAYER_URL + '?comp=' + encodeURIComponent(nombre) + '&hud=0';
    modal.querySelectorAll('.fo-item').forEach(function (el) {
      el.classList.toggle('is-probando', el.getAttribute('data-comp') === nombre);
    });
    var nombrePrev = modal.querySelector('#fo-preview-name');
    if (nombrePrev) nombrePrev.textContent = etiqueta(nombre);
    mensaje('Probando “' + etiqueta(nombre) + '” — con “Usar” queda guardada para esta obra.');
  }

  function elegir(nombre) {
    nombre = normalizarComp(nombre);
    if (!nombre) return;
    actualizarWidget(prefixActivo, nombre);
    if (modal) {
      modal.querySelectorAll('.fo-item').forEach(function (el) {
        el.classList.toggle('is-elegida', el.getAttribute('data-comp') === nombre);
      });
    }
    mensaje('✓ Guardada: “' + etiqueta(nombre) + '”. Se aplica cuando publiques/guardes la obra.');
  }

  function quitar(prefix) {
    actualizarWidget(prefix, '');
    mensaje('');
  }

  // ------------------------------------------------------------ interacción
  // Miniaturas: hay composiciones sin thumbnail o con el objeto de R2 caído (404).
  // El evento `error` no burbujea ⇒ se escucha en captura y se cae al ícono.
  document.addEventListener('error', function (ev) {
    var img = ev.target;
    if (!img || img.tagName !== 'IMG' || !img.closest('.fo-thumb')) return;
    img.parentNode.innerHTML = '<span class="fo-thumb-ph"><i class="fas fa-film"></i></span>';
  }, true);

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;

    var abrirBtn = t.closest('[data-fondo-abrir]');
    if (abrirBtn) { ev.preventDefault(); abrir(abrirBtn.getAttribute('data-fondo-abrir')); return; }

    var quitarBtn = t.closest('[data-fondo-quitar]');
    if (quitarBtn) { ev.preventDefault(); quitar(quitarBtn.getAttribute('data-fondo-quitar')); return; }

    if (t.closest('[data-fondo-cerrar]')) { ev.preventDefault(); cerrar(); return; }

    var probarBtn = t.closest('[data-fondo-probar]');
    if (probarBtn) { ev.preventDefault(); probar(probarBtn.getAttribute('data-fondo-probar')); return; }

    var elegirBtn = t.closest('[data-fondo-elegir]');
    if (elegirBtn) { ev.preventDefault(); elegir(elegirBtn.getAttribute('data-fondo-elegir')); return; }

    // Click en el fondo oscuro del modal (fuera de la caja) = cerrar.
    if (modal && !modal.hidden && ev.target === modal) { cerrar(); }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && modal && !modal.hidden) cerrar();
  });

  // Lista cargada de antemano SÓLO si el form de obra ya está en la página (así
  // el widget muestra el título de la composición elegida en vez de su nombre
  // crudo). Si el form recién aparece al abrir el modal de edición, la lista se
  // pide al abrirlo: no se hace ninguna llamada de más.
  document.addEventListener('DOMContentLoaded', function () {
    // Si el form de obra ya está en la página (creación), se trae la lista para
    // mostrar el TÍTULO de la comp elegida. Si el form aparece después (modal de
    // edición), la lista se pide recién al abrir el modal: ninguna llamada de más.
    if (!document.querySelector('[data-fondo-abrir]')) return;
    traerComps(false).then(function () {
      document.querySelectorAll('input[id$="-fondo-shader"]').forEach(function (input) {
        var prefix = input.id.replace(/-fondo-shader$/, '');
        if (normalizarComp(input.value)) actualizarWidget(prefix, input.value);
      });
    });
  });

  window.FondoObra = {
    abrir: abrir,
    cerrar: cerrar,
    recargar: function () { comps = null; return traerComps(true); },
    composiciones: function () { return (comps || []).slice(); }
  };
})();
