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
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'add_show_external';
  var APP_ID = 'artedigitaldata';
  var CACHE_MS = 60000;

  var cache = { key: null, at: 0, data: null, catalog: null };

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

  async function fetchApps() {
    if (!canUse()) throw new Error('Iniciá sesión para ver tus datos externos');
    var username = getUserUsername();
    if (cache.key === username && (Date.now() - cache.at) < CACHE_MS && cache.data) return cache.data;

    // ⚠ Se pide a la API DE ESTA APP, que lo proxea a fscauth server→server.
    // Pedirlo directo a fscauth desde el browser rompe por CORS: el preflight se
    // come un 307 de fullscreencode.com ("Redirect is not allowed for a preflight
    // request") y la allowlist de fscauth no incluye artedigitaldata.com.
    var url = CONFIG.API_URL + '/fsc/ecosystem?username=' + encodeURIComponent(username);
    var res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data || !data.ok) throw new Error((data && data.error) || 'No se pudo indexar el ecosistema');

    var apps = onlyExternal(data.apps);
    // `catalog` = QUÉ app y QUÉ tipo de cosa indexó fscauth (apps + tipos con
    // totales). Lo arma el backend con el registro público de fscauth, así
    // cualquier página puede repetir la misma data/filtros.
    cache = {
      key: username, at: Date.now(), data: apps,
      catalog: data.catalog || { apps: [], types: [] }
    };
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
    total: total
  };
})();
