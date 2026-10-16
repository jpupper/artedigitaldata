/* Manejadores que antes estaban inline en el HTML (onclick="...", onsubmit="...", etc.).
   Delegación: un solo listener global + atributo data-on-<evento> en el elemento.
   Respeta el comportamiento original: `this` es el elemento, `event` existe y `return false`
   cancela el evento por defecto. */
(function () {
  var MAPA = {
    'data-on-click': 'click', 'data-on-change': 'change', 'data-on-input': 'input',
    'data-on-submit': 'submit', 'data-on-keyup': 'keyup', 'data-on-keydown': 'keydown',
    'data-on-mouseover': 'mouseover', 'data-on-mouseout': 'mouseout',
    'data-on-focus': 'focusin', 'data-on-blur': 'focusout', 'data-on-scroll': 'scroll',
    'data-on-dragover': 'dragover', 'data-on-drop': 'drop',
    'data-on-mousemove': 'mousemove', 'data-on-wheel': 'wheel'
  };
  var BURBUJEA = ['click', 'change', 'input', 'submit', 'keyup', 'keydown', 'mouseover', 'mouseout',
    'focusin', 'focusout', 'dragover', 'drop', 'mousemove', 'wheel'];

  function ejecutar(el, attr, evento) {
    var codigo = el.getAttribute(attr);
    if (codigo === null) return;
    try {
      var fn = new Function('event', 'return (function(){' + codigo + '}).call(this, event);');
      var r = fn.call(el, evento);
      if (r === false && evento && evento.cancelable) evento.preventDefault();
    } catch (e) { console.error('[inline-handler]', attr, e); }
  }

  BURBUJEA.forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      var attrs = Object.keys(MAPA).filter(function (a) { return MAPA[a] === ev; });
      var el = e.target;
      while (el && el !== document) {
        for (var i = 0; i < attrs.length; i++) {
          if (el.getAttribute && el.getAttribute(attrs[i]) !== null) {
            if ((ev === 'mouseover' || ev === 'mouseout') && el.contains(e.relatedTarget)) return;
            ejecutar(el, attrs[i], e);
            return;
          }
        }
        el = el.parentElement;
      }
    }, true);
  });

  function directos(raiz) {
    ['data-on-load', 'data-on-error', 'data-on-mouseenter', 'data-on-mouseleave'].forEach(function (attr) {
      var ev = attr.replace('data-on-', '');
      if (ev === 'mouseenter') ev = 'mouseover';
      if (ev === 'mouseleave') ev = 'mouseout';
      var lista = raiz.querySelectorAll ? raiz.querySelectorAll('[' + attr + ']') : [];
      Array.prototype.forEach.call(lista, function (el) {
        if (el.__inlineHandlerOk) return;
        el.__inlineHandlerOk = true;
        el.addEventListener(ev, function (e) { ejecutar(el, attr, e); });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { directos(document); });
  else directos(document);
  try {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes || [], function (n) { if (n.nodeType === 1) directos(n); });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) { }
})();
