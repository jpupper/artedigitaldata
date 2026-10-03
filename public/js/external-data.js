/* ============================================================
   🌐 DATA EXTERNA — índice del ecosistema FSC dentro de artedigitaldata
   ------------------------------------------------------------
   Internal = todo lo creado DENTRO de artedigitaldata (obras, recursos,
              eventos, chances, secuencias). Es la base de datos de esta app.
   External = las creaciones del MISMO usuario en el RESTO de las apps del
              ecosistema (vuelapelucas3000, jpshadereditor, pizarraia, ...).
              NO se copian: se indexan con el fan-out de fscauth
              (GET /fscauth/api/auth/assets), el mismo que usa el pasaporte.

   El switch arranca APAGADO y su estado se recuerda en localStorage, así el
   INICIO y el PERFIL muestran siempre lo mismo.

   ⚠️ El índice de fscauth es POR SESIÓN: devuelve las creaciones del usuario
   logueado (y los admins pueden pedir las de otro). Por eso el switch solo
   tiene sentido con sesión iniciada y en el perfil propio.

   RESILIENCIA (02-Oct-2026): antes CUALQUIER tropiezo mostraba un error rojo
   y el feed quedaba vacío. Ahora:
     · 401/403 → la sesión de FSCAUTH venció: mensaje accionable
                 (err.kind === 'sesion'), sin romper la pantalla.
     · 504/502/red → 1 reintento automático; si igual falla y hay una copia
                     buena guardada, se muestra ESA copia (err.kind === 'cache').
     · El último índice bueno queda en localStorage (10 min) para que al
                     recargar la página el switch no arranque en blanco.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'add_show_external';
  var CACHE_KEY = 'add_external_cache';
  var APP_ID = 'artedigitaldata';
  var CACHE_MS = 60000;         // caché en memoria de la pestaña
  var DISK_MS = 10 * 60 * 1000; // copia en localStorage (sobrevive al reload)

  var cache = { key: null, at: 0, data: null, catalog: null };

  function error(msg, kind) {
    var e = new Error(msg);
    e.kind = kind || 'error';
    return e;
  }

  function enabled() {
    return localStorage.getItem(KEY) === '1';
  }

  function setEnabled(v) {
    localStorage.setItem(KEY, v ? '1' : '0');
    if (!v) cache = { key: null, at: 0, data: null, catalog: null };
  }

  // El índice externo depende de la sesión (fscauth no indexa datos ajenos).
  function canUse() {
    return typeof isLoggedIn === 'function' && isLoggedIn() &&
           typeof getToken === 'function' && !!getToken() &&
           typeof getUserUsername === 'function' && !!getUserUsername();
  }

  // Todas las apps del índice MENOS artedigitaldata: eso es lo "externo".
  function onlyExternal(apps) {
    return (apps || []).filter(function (a) { return a && a.id !== APP_ID; });
  }

  // Lista plana: { id, title, url, app, appLabel, type, typeLabel }
  function flatten(apps) {
    var out = [];
    (apps || []).forEach(function (a) {
      if (!a.ok) return;
      (a.groups || []).forEach(function (g) {
        (g.items || []).forEach(function (it) {
          out.push({
            id: String(it.id || ''),
            title: it.title || 'Sin título',
            url: it.url || '',
            // La captura/preview que indexa cada app (composiciones, shaders, imágenes).
            image: it.image || (it.meta && it.meta.image) || '',
            app: a.id,
            appLabel: a.label || a.id,
            appIcon: a.icon || '📦',
            type: g.type,
            typeLabel: g.label || g.type
          });
        });
      });
    });
    return out;
  }

  function total(apps) {
    return (apps || []).reduce(function (n, a) { return n + (a.ok ? (a.total || 0) : 0); }, 0);
  }

  function leerDisco(username) {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || c.key !== username || !c.data) return null;
      if ((Date.now() - c.at) > DISK_MS) return null;
      return c;
    } catch (e) { return null; }
  }

  function guardarDisco(username, apps, catalog) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ key: username, at: Date.now(), data: apps, catalog: catalog }));
    } catch (e) { /* cuota llena: no es crítico */ }
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Una sola llamada al proxy, con los errores ya clasificados por tipo.
  async function pedir(username) {
    // ⚠ Se pide a la API DE ESTA APP, que lo proxea a fscauth server→server.
    // Pedirlo directo a fscauth desde el browser rompe por CORS: el preflight se
    // come un 307 de fullscreencode.com ("Redirect is not allowed for a preflight
    // request") y la allowlist de fscauth no incluye artedigitaldata.com.
    var url = CONFIG.API_URL + '/fsc/ecosystem?username=' + encodeURIComponent(username);
    var res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    var data = await res.json().catch(function () { return {}; });
    if (res.status === 401 || res.status === 403) {
      throw error('Tu sesión de FSCAUTH venció o no es válida en este navegador. Entrá de nuevo para indexar tus creaciones del resto del ecosistema.', 'sesion');
    }
    if (res.status === 504 || res.status === 502) {
      throw error('El ecosistema tardó demasiado en responder.', 'timeout');
    }
    if (!res.ok || !data || !data.ok) {
      throw error((data && data.error) || 'No se pudo indexar el ecosistema.', 'error');
    }
    return data;
  }

  async function fetchApps() {
    if (!canUse()) throw error('Iniciá sesión para indexar tus creaciones del resto del ecosistema.', 'sin-sesion');
    var username = getUserUsername();
    if (cache.key === username && (Date.now() - cache.at) < CACHE_MS && cache.data) return cache.data;

    var data = null;
    var ultimoError = null;
    try {
      data = await pedir(username);
    } catch (err) {
      ultimoError = err;
      // Un tropiezo de red o de tiempo no puede vaciar el feed: va un reintento.
      if (err.kind === 'timeout' || err.kind === 'error') {
        await esperar(1200);
        try { data = await pedir(username); } catch (err2) { ultimoError = err2; }
      }
    }

    if (!data) {
      // Última red de seguridad: la copia buena guardada hace minutos.
      var copia = leerDisco(username);
      if (copia) {
        cache = {
          key: username, at: copia.at, data: onlyExternal(copia.data),
          catalog: copia.catalog || { apps: [], types: [] }
        };
        var hora = new Date(copia.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        var e2 = error('Mostrando la última indexación guardada (' + hora + '). No pude actualizarla: ' + ultimoError.message, 'cache');
        e2.cachedAt = copia.at;
        e2.causa = ultimoError.kind;   // 'sesion' → la UI además ofrece "volver a entrar"
        throw e2;
      }
      throw ultimoError;
    }

    var apps = onlyExternal(data.apps);
    // `catalog` = QUÉ app y QUÉ tipo de cosa indexó fscauth (apps + tipos con
    // totales). Lo arma el backend con el registro público de fscauth, así
    // cualquier página puede repetir la misma data/filtros.
    var catalog = data.catalog || { apps: [], types: [] };
    cache = { key: username, at: Date.now(), data: apps, catalog: catalog };
    guardarDisco(username, apps, catalog);
    return apps;
  }

  window.ExternalData = {
    KEY: KEY,
    APP_ID: APP_ID,
    enabled: enabled,
    setEnabled: setEnabled,
    canUse: canUse,
    // Catálogo del último fetch (apps + tipos). Lo consume la UI de filtros.
    catalog: function () { return (cache && cache.catalog) || { apps: [], types: [] }; },
    fetchApps: fetchApps,
    onlyExternal: onlyExternal,
    flatten: flatten,
    total: total,
    // Última copia guardada (o null): la UI la usa para no arrancar en blanco.
    copiaGuardada: function () {
      if (typeof getUserUsername !== 'function') return null;
      return leerDisco(getUserUsername());
    }
  };
})();
