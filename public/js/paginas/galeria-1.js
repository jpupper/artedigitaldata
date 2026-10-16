/* ════════════════════════════════════════════════════════════════════════════
   GALERÍA PÚBLICA DE UNA CONVOCATORIA
   Lee ?id=<oportunidad> y dibuja todas las obras de la planilla:
   título, descripción, imagen y el artista (foto, nombre y bio).
   Animación: las letras entran girando (clase .gk-l + .gk-letras-on del CSS)
   y las palabras se forman con el sistema de partículas (js/p5-effect.js).
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var id = new URLSearchParams(window.location.search).get('id');
  var $ = function (sel) { return document.querySelector(sel); };
  var API = (window.CONFIG && (CONFIG.API_URL || CONFIG.API_BASE)) || '';

  // ── Estados ────────────────────────────────────────────────────────────────
  function mostrar(sel) {
    ['#gk-cargando', '#gk-vacio', '#gk-error'].forEach(function (s) {
      var el = $(s); if (el) el.classList.toggle('ui-hidden', s !== sel);
    });
  }
  function ocultarEstados() { mostrar(''); }

  // ── Letras que entran girando ──────────────────────────────────────────────
  function letras(el, texto) {
    if (!el) return;
    el.textContent = '';
    el.classList.remove('gk-letras-on');
    var t = String(texto || '');
    var frag = document.createDocumentFragment();
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
      var s = document.createElement('span');
      s.className = 'gk-l';
      s.style.setProperty('--i', String(Math.min(i, 40)));
      s.textContent = ch;
      frag.appendChild(s);
    }
    el.appendChild(frag);
  }
  function animar(el) {
    if (!el) return;
    var objetivo = el.querySelectorAll('.gk-l').length ? el : null;
    if (objetivo) objetivo.classList.add('gk-letras-on');
  }

  // ── Partículas: las palabras del título se forman con el sistema de p5 ─────
  function palabrasEnParticulas(titulo) {
    var intentos = 0;
    var palabras = String(titulo || '').split(/\s+/).filter(function (w) { return w.length > 2; }).slice(0, 6);
    if (!palabras.length) return;
    var tirar = function () {
      if (typeof window.spawnWordParticles !== 'function') {
        if (++intentos < 40) return setTimeout(tirar, 500);
        return;
      }
      var grande = window.innerWidth > 900;
      var i = 0;
      var siguiente = function () {
        if (i >= Math.min(palabras.length, grande ? 4 : 2)) return;
        var w = palabras[i++].toUpperCase();
        var x = window.innerWidth * (0.25 + Math.random() * 0.5);
        var y = window.innerHeight * (0.2 + Math.random() * 0.45);
        try {
          window.spawnWordParticles(w, x, y, false, null, {
            fontSize: grande ? Math.round(Math.min(72, window.innerWidth / 16)) : Math.round(Math.min(40, window.innerWidth / 11)),
          });
        } catch (e) { }
        setTimeout(siguiente, 2200);
      };
      setTimeout(siguiente, 800);
    };
    tirar();
  }

  // ── Tarjetas ───────────────────────────────────────────────────────────────
  function bloqueArtista(a) {
    var cont = document.createElement('div');
    cont.className = 'gk-artista';

    var avatar = document.createElement('div');
    avatar.className = 'gk-avatar';
    if (a && a.avatar) {
      var img = document.createElement('img');
      img.src = a.avatar;
      img.alt = (a.nombre || 'Artista');
      img.loading = 'lazy';
      img.onerror = function () { img.remove(); avatar.textContent = (a.nombre || 'A').charAt(0).toUpperCase(); };
      avatar.appendChild(img);
    } else {
      avatar.textContent = (a && a.nombre ? a.nombre : 'A').charAt(0).toUpperCase();
    }
    cont.appendChild(avatar);

    var txt = document.createElement('div');
    txt.className = 'gk-artista-txt';

    var nombre = document.createElement(a && a.usuario ? 'a' : 'span');
    nombre.className = 'gk-nombre';
    if (a && a.usuario) {
      nombre.href = 'profile.html?user=' + encodeURIComponent(a.usuario);
    }
    var n = (a && a.nombre) || 'Artista';
    nombre.appendChild(document.createTextNode(n));
    letras(nombre, n);
    txt.appendChild(nombre);

    if (a && a.usuario) {
      var u = document.createElement('div');
      u.className = 'gk-usuario';
      u.textContent = '@' + a.usuario;
      txt.appendChild(u);
    }
    if (a && a.bio) {
      var bio = document.createElement('p');
      bio.className = 'gk-bio';
      bio.textContent = a.bio;
      txt.appendChild(bio);
    }
    cont.appendChild(txt);
    return cont;
  }

  function tarjeta(obra, idx) {
    var card = document.createElement('article');
    card.className = 'gk-card';

    var media = document.createElement('div');
    media.className = 'gk-media';
    if (obra.imagen) {
      var img = document.createElement('img');
      img.src = obra.imagen;
      img.alt = obra.titulo || 'Obra';
      img.loading = 'lazy';
      var a = document.createElement(obra.obraId ? 'a' : 'span');
      if (obra.obraId) a.href = 'post.html?id=' + encodeURIComponent(obra.obraId);
      a.appendChild(img);
      media.appendChild(a);
    } else {
      var vacio = document.createElement('div');
      vacio.className = 'gk-media-vacia';
      var ic = document.createElement('i');
      ic.className = 'fas fa-palette';
      vacio.appendChild(ic);
      media.appendChild(vacio);
    }
    var num = document.createElement('span');
    num.className = 'gk-num';
    num.textContent = String(idx + 1).padStart(2, '0');
    media.appendChild(num);
    card.appendChild(media);

    var cuerpo = document.createElement('div');
    cuerpo.className = 'gk-card-cuerpo';

    var h = document.createElement('h2');
    h.className = 'gk-card-titulo';
    letras(h, obra.titulo || 'Sin título');
    cuerpo.appendChild(h);

    if (obra.descripcion) {
      var p = document.createElement('p');
      p.className = 'gk-card-desc';
      p.textContent = obra.descripcion;
      cuerpo.appendChild(p);
      if (obra.descripcion.length > 260) {
        var mas = document.createElement('button');
        mas.type = 'button';
        mas.className = 'gk-vermas';
        mas.textContent = 'Leer más';
        mas.addEventListener('click', function () {
          var abierta = p.classList.toggle('gk-abierta');
          mas.textContent = abierta ? 'Leer menos' : 'Leer más';
        });
        cuerpo.appendChild(mas);
      }
    }

    cuerpo.appendChild(bloqueArtista(obra.artista || {}));
    card.appendChild(cuerpo);
    return card;
  }

  // ── Chips de la cabecera ──────────────────────────────────────────────────
  function chip(icono, texto) {
    var c = document.createElement('span');
    c.className = 'gk-chip';
    var i = document.createElement('i');
    i.className = 'fas ' + icono;
    c.appendChild(i);
    c.appendChild(document.createTextNode(' ' + texto));
    return c;
  }
  function fecha(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(data) {
    var o = data.oportunidad || {};
    var obras = data.obras || [];

    document.title = (o.titulo || 'Galería') + ' — Arte Digital Data';
    var kicker = $('#gk-kicker');
    if (kicker) {
      kicker.textContent = o.tipo === 'oportunidad_laboral' ? 'Oportunidad laboral'
        : (o.tipo === 'colaboracion' ? 'Colaboración' : 'Convocatoria de obra');
    }
    letras($('#gk-titulo'), o.titulo || 'Galería de obras');
    var bajada = $('#gk-bajada');
    if (bajada) {
      bajada.textContent = o.descripcion || '';
      var toggleBajada = $('#gk-bajada-toggle');
      if (toggleBajada) {
        toggleBajada.classList.toggle('ui-hidden', (o.descripcion || '').length < 220);
        toggleBajada.addEventListener('click', function () {
          var abierta = bajada.classList.toggle('gk-abierta');
          toggleBajada.textContent = abierta ? 'Leer menos' : 'Leer más';
        });
      }
    }

    var chips = $('#gk-chips');
    if (chips) {
      chips.appendChild(chip('fa-images', obras.length + (obras.length === 1 ? ' obra' : ' obras')));
      if (o.lugar) chips.appendChild(chip('fa-location-dot', o.lugar));
      var f = fecha(o.fechaDesde) || fecha(o.fechaHasta);
      if (f) chips.appendChild(chip('fa-calendar-alt', f));
      if (Array.isArray(o.diasEvento) && o.diasEvento.length) {
        chips.appendChild(chip('fa-calendar-check', o.diasEvento.length + (o.diasEvento.length === 1 ? ' día de evento' : ' días de evento')));
      }
    }

    var cont = $('#gk-obras');
    if (!obras.length) { mostrar('#gk-vacio'); return; }
    ocultarEstados();

    var frag = document.createDocumentFragment();
    obras.forEach(function (obra, i) { frag.appendChild(tarjeta(obra, i)); });
    cont.appendChild(frag);

    // Entrada animada: el título de la cabecera ya está; cada tarjeta entra al
    // aparecer en pantalla (letras girando + bloque elevándose).
    animar($('#gk-titulo'));
    var observerActivo = false;
    var observer = new IntersectionObserver(function (entradas) {
      observerActivo = true;
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('gk-visible');
        animar(e.target.querySelector('.gk-card-titulo'));
        animar(e.target.querySelector('.gk-nombre'));
        observer.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    var tarjetas = cont.querySelectorAll('.gk-card');
    Array.prototype.forEach.call(tarjetas, function (c) { observer.observe(c); });

    // Red de seguridad: si el navegador no tiene IntersectionObserver (o no
    // dispara), las tarjetas no pueden quedar invisibles.
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(tarjetas, function (c) {
        c.classList.add('gk-visible');
        animar(c.querySelector('.gk-card-titulo'));
        animar(c.querySelector('.gk-nombre'));
      });
    } else {
      setTimeout(function () {
        if (observerActivo) return;
        Array.prototype.forEach.call(tarjetas, function (c) {
          c.classList.add('gk-visible');
          animar(c.querySelector('.gk-card-titulo'));
        });
      }, 2500);
    }

    palabrasEnParticulas(o.titulo || '');
  }

  // ── Compartir ─────────────────────────────────────────────────────────────
  var btnCompartir = $('#gk-compartir');
  if (btnCompartir) {
    btnCompartir.addEventListener('click', function () {
      var url = window.location.href;
      var listo = function () {
        var original = btnCompartir.innerHTML;
        btnCompartir.innerHTML = '<i class="fas fa-check"></i> ¡Link copiado!';
        setTimeout(function () { btnCompartir.innerHTML = original; }, 1800);
      };
      if (navigator.share) {
        navigator.share({ title: document.title, url: url }).catch(function () { });
        return;
      }
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(listo, function () { window.prompt('Copiá el link:', url); });
      else window.prompt('Copiá el link:', url);
    });
  }

  // ── Arranque ──────────────────────────────────────────────────────────────
  function fallar(txt) {
    var t = $('#gk-error-txt');
    if (t) t.textContent = txt;
    mostrar('#gk-error');
  }

  if (!id) {
    fallar('Falta el id de la convocatoria en el link. Entrá desde el panel de la convocatoria.');
  } else {
    mostrar('#gk-cargando');
    fetch(API + '/public/oportunidades/' + encodeURIComponent(id) + '/galeria')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(render)
      .catch(function (e) {
        console.error('[galeria]', e);
        fallar('No pudimos cargar la galería de esta convocatoria.');
      });
  }
})();
