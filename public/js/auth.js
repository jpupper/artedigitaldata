function getToken() {
  return localStorage.getItem('artedigitaldata_token');
}

function setToken(token) {
  localStorage.setItem('artedigitaldata_token', token);
}

function removeToken() {
  localStorage.removeItem('artedigitaldata_token');
}

function getUser() {
  const raw = localStorage.getItem('artedigitaldata_user');
  return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
  localStorage.setItem('artedigitaldata_user', JSON.stringify(user));
}

function removeUser() {
  localStorage.removeItem('artedigitaldata_user');
}

// Un token sano es un JWT (3 partes separadas por punto). Si el retorno del SSO
// llegó incompleto, localStorage puede guardar el TEXTO "undefined"/"null": eso
// pasaba por sesión válida y la app mandaba `Bearer undefined` a todo el
// ecosistema, que contestaba 401 (y el token muerto quedaba enquistado).
function tokenPlausible(t) {
  if (typeof t !== 'string' || !t) t = getToken();
  return typeof t === 'string' && t.length > 40 && t.split('.').length === 3;
}

function isLoggedIn() {
  return tokenPlausible();
}

function isAdmin() {
  const user = getUser();
  return user && (user.role === 'ADMINISTRADOR' || user.role === 'ADMIN');
}

function getUserId() {
  const user = getUser();
  return user ? user._id || user.id : null;
}

function getUserUsername() {
  const user = getUser();
  return user ? user.username : null;
}

function logout() {
  removeToken();
  removeUser();
  window.location.href = CONFIG.BASE + '/';
}

// ── Base de la API de FSCAUTH ───────────────────────────────────────────────
// Antes cada llamada usaba CONFIG.FSCAUTH_API a secas. En las páginas del dominio
// público (fullscreencode.com) ese campo NO existe en config.js, así que el
// navegador terminaba en https://fullscreencode.com/undefined/auth/sso-check (404)
// y el usuario quedaba varado ahí. Ahora se resuelve en cascada:
//   1) CONFIG.FSCAUTH_API  (artedigitaldata apunta directo al VPS)
//   2) CONFIG.FSCAUTH_URL + '/api'  (fullscreencode.com sirve /fscauth y proxya al VPS)
//   3) el VPS directo
// Nunca puede salir "undefined".
function fscAuthApi() {
  var cfg = window.CONFIG || {};
  var base = cfg.FSCAUTH_API;
  if (!base && cfg.FSCAUTH_URL) base = String(cfg.FSCAUTH_URL).replace(/\/+$/, '') + '/api';
  if (!base) base = 'https://vps-4455523-x.dattaweb.com/fscauth/api';
  return String(base).replace(/\/+$/, '');
}
window.fscAuthApi = fscAuthApi;

// ── Sesión de FSCAUTH vencida ───────────────────────────────────────────────
// El login del ecosistema lo emite fscauth y dura 7 días; si el token venció (o
// se rotó el JWT_SECRET, que invalida TODOS los tokens viejos), la app se quedaba
// en silencio: 401 → logout() → home, sin formulario, sin pista, y el botón
// "Iniciar Sesión" tampoco llevaba a ningún lado porque cortaba con isLoggedIn().
// Ahora: se limpia el token muerto y se va al FORMULARIO con retorno a esta página.
function urlLoginFsc(aviso) {
  const redirectUrl = new URL(window.location.origin + window.location.pathname);
  redirectUrl.searchParams.delete('token');
  redirectUrl.searchParams.delete('username');
  redirectUrl.searchParams.delete('userId');
  return `${CONFIG.FSCAUTH_URL}/login.html?redirect=${encodeURIComponent(redirectUrl.toString())}&origin=artedigitaldata${aviso ? '&aviso=' + aviso : ''}`;
}

let __yendoALogin = false;
function irALoginPorSesionVencida() {
  if (__yendoALogin) return;
  const paginas = /login\.html|register\.html|reset-password\.html|forgot-password\.html/;
  if (paginas.test(window.location.pathname)) return;
  __yendoALogin = true;
  removeToken();
  removeUser();
  let intentos = 0;
  try {
    intentos = Number(sessionStorage.getItem('add_login_intentos') || '0') + 1;
    sessionStorage.setItem('add_login_intentos', String(intentos));
    sessionStorage.setItem('add_sesion_vencida', '1');
  } catch (e) { /* modo privado: seguimos */ }
  // Corte anti-loop: si ya rebotamos una vez, no se insiste (evita el ping-pong
  // con el login cuando el navegador bloquea el retorno).
  if (intentos > 1) { window.location.href = CONFIG.BASE + '/'; return; }
  window.location.href = urlLoginFsc('vencida');
}

// ── Sesión local muerta: rehacerla SIN pedir usuario y contraseña ────────────
// La copia que guarda esta app puede morir (el token vence a los 7 días, se
// revoca o se rota el secreto) mientras la cookie de fscauth sigue viva. En ese
// caso fscauth reemite la sesión y vuelve a esta misma página con un token
// nuevo: es el mismo camino que usa checkSSO (la cookie viaja cross-site porque
// es SameSite=None). Si la cookie también murió, sso-check vuelve con
// `nosession=true`, el contador corta el reintento y se ofrece el login normal.
function refrescarSesionSilenciosa() {
  var intentos = 0;
  try { intentos = Number(sessionStorage.getItem('add_reauth_intentos') || '0'); } catch (e) {}
  if (intentos >= 1) return false;    // ya lo intentamos: se resuelve con el login
  // No rebotar desde las propias páginas de acceso (evita el ping-pong).
  if (/login\.html|register\.html|reset-password\.html|forgot-password\.html/.test(window.location.pathname)) return false;
  try {
    sessionStorage.setItem('add_reauth_intentos', String(intentos + 1));
    sessionStorage.removeItem('fsc_sso_checked');   // destrabar el checkSSO de arranque
  } catch (e) { /* modo privado: seguimos */ }
  var base = fscAuthApi();
  var back = window.location.href.replace(/[?&](token|username|userId|ssoset)=[^&]*/g, '');
  window.location.href = `${base}/auth/sso-check?redirect=${encodeURIComponent(back)}`;
  return true;
}

/**
 * ¿El token local venció DE VERDAD? Se mira su propio `exp` (no se valida firma:
 * la firma la valida el servidor). Un 401 o un 404 puntual NO es una sesión muerta:
 * es ESE request el que falló.
 */
function localTokenExpired(t) {
  const payload = parseJwt(t || getToken());
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
}

/**
 * Cierra la sesión local SÓLO cuando corresponde (token vencido o ilegible). Con el
 * token todavía vigente se revalida y se renueva en silencio: antes cualquier 401
 * —o un 404 de /auth/me— borraba la sesión, y como la cookie fsc_token es de
 * TERCEROS en los dominios de las apps (el navegador la bloquea), el usuario
 * terminaba en el formulario de login con la sesión todavía viva (deslogueo fantasma).
 */
function sesionLocalMuerta() {
  const t = getToken();
  if (tokenPlausible(t) && !localTokenExpired(t)) {
    console.warn('[AUTH] 401/404 con el token local vigente: se revalida la sesión, NO se cierra.');
    syncSession();
    return;
  }
  removeToken();
  removeUser();
  if (refrescarSesionSilenciosa()) return;
  irALoginPorSesionVencida();
}

// ── Perfil completo: la FOTO del header ────────────────────────────────────
// La copia local se guarda con lo mínimo (username/id). El avatar, el rol y el
// displayName viven en /auth/me, que antes se pedía SOLO en la carga normal de la
// página: al volver del login —o de un re-login silencioso, que también vuelve
// con ?token=...— el header quedaba con el avatar generativo en lugar de la foto.
// Ahora se pide también en ese camino.
function refrescarPerfil() {
    if (!isLoggedIn()) return;
    const token = getToken();
    fetch(CONFIG.API_URL + '/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(res => {
            if (res.status === 401 || res.status === 404) { sesionLocalMuerta(); return null; }
            return res.ok ? res.json() : null;
        })
        .then(data => {
            if (data && !data.error) {
                const currentUser = getUser();
                const hasChanges = !currentUser || currentUser.role !== data.role ||
                    currentUser.avatar !== data.avatar || currentUser.username !== data.username;
                setUser({ ...data, id: data._id || data.id });
                if (!hasChanges) return;
                if (typeof window.renderHeader === 'function') window.renderHeader();
                else document.addEventListener('DOMContentLoaded', () => {
                    if (typeof window.renderHeader === 'function') window.renderHeader();
                });
            }
        })
        .catch(err => console.error("[AUTH] Error fetching profile updates:", err));
}

// Centralized Redirection logic
function showLogin() {
    // If we already have a token in URL, don't redirect (let the loader handle it)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) return;
    // OJO: acá NO se corta con isLoggedIn(). Un token viejo (vencido o firmado con
    // el secreto anterior) hacía que el botón "Iniciar Sesión" mandara al inicio sin
    // formulario => el usuario no podía volver a entrar nunca.
    window.location.href = urlLoginFsc();
}

function showRegister() {
    // If we already have a token in URL, don't redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) return;
    // Igual que showLogin(): un token viejo no debe encerrar al usuario en el inicio.
    const redirectUrl = new URL(window.location.origin + window.location.pathname);
    redirectUrl.searchParams.delete('token');
    redirectUrl.searchParams.delete('username');
    redirectUrl.searchParams.delete('userId');
    window.location.href = `${CONFIG.FSCAUTH_URL}/register.html?redirect=${encodeURIComponent(redirectUrl.toString())}&origin=artedigitaldata`;
}

/**
 * SSO Check: Si no hay token local, intentamos ver si hay una sesión activa en el centralizador.
 */
async function checkSSO() {
    if (isLoggedIn()) return;
    
    // Si ya tenemos token en URL, no redirigir (estamos procesándolo)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) return;

    // Evitar infinitos redireccionamientos (usar sessionStorage como flag)
    if (sessionStorage.getItem('fsc_sso_checked')) return;
    sessionStorage.setItem('fsc_sso_checked', 'true');

    const currentUrl = window.location.href;
    // Redirigir al endpoint de sso-check del centralizador
    window.location.href = `${fscAuthApi()}/auth/sso-check?redirect=${encodeURIComponent(currentUrl)}`;
}

/**
 * Silent Session Sync: renueva la ventana de la sesión contra fscauth y detecta
 * logouts hechos en otra pestaña. Se apoya en el token local (Bearer), NO en la
 * cookie fsc_token: la cookie es de TERCEROS en los dominios de las apps y el
 * navegador la bloquea, así que no se puede depender de ella.
 */
async function syncSession() {
    // RENOVACIÓN DESLIZANTE (esto es lo que hace que la sesión dure los 10 días y no
    // se caiga antes): se manda el token local como Bearer y el servidor devuelve un
    // token con la ventana completa otra vez. NO se usa la cookie fsc_token: en
    // fullscreencode.com / artedigitaldata.com vive en OTRO host (vps-...) y el
    // navegador la bloquea por ser de terceros. Antes esta función se saltaba todo
    // cuando el origen no era el del VPS (return temprano), así que el token nunca se
    // renovaba: vencía a los SESSION_DAYS y el usuario aparecía deslogueado sin motivo.
    const token = getToken();
    if (!tokenPlausible(token)) return;

    try {
        const res = await fetch(`${fscAuthApi()}/auth/verify`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;                                  // 401/5xx/proxy: no se toca la sesión
        const data = await res.json().catch(() => null);
        if (!data) return;
        if (data.token && data.token !== token) {
            setToken(data.token);                             // ventana renovada
        }
        // Si el servidor no pudo resolver la sesión pero el token local sigue vigente
        // (no venció por `exp`), NO se cierra nada: puede ser un 401 puntual.
    } catch (err) {
        // Sin red: tampoco se cierra la sesión (antes este catch deslogueaba).
    }
}

// Initial session check and synchronization on load
// Lo hacemos fuera del DOMContentLoaded para atrapar los tokens ANTES de que otros scripts redirijan
(function initAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlUsername = urlParams.get('username');
    const urlUserId = urlParams.get('userId');

    if (urlToken && urlUsername) {
        setToken(urlToken);
        setUser({ username: urlUsername, id: urlUserId, _id: urlUserId });
        // Volvemos bien del login: se resetean los contadores del rebote por sesión vencida.
        try {
            sessionStorage.removeItem('add_login_intentos');
            sessionStorage.removeItem('add_sesion_vencida');
            sessionStorage.removeItem('add_reauth_intentos');
        } catch (e) {}
        
        // Limpiar URL sin recargar
        urlParams.delete('token');
        urlParams.delete('username');
        urlParams.delete('userId');
        urlParams.delete('ssoset');
        const newQuery = urlParams.toString();
        const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '');
        window.history.replaceState({}, document.title, newUrl);
        
        // Si estamos en login.html o register.html, redirigir a home
        if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
            window.location.href = CONFIG.BASE + '/';
        }

        // Recién logueado: traer el perfil completo para que el header muestre la
        // FOTO de perfil (no el avatar generativo) sin esperar a otra navegación.
        refrescarPerfil();
    } else {
        // Solo chequear SSO en el evento DOMContentLoaded para no bloquear el renderizado inicial
        document.addEventListener('DOMContentLoaded', () => {
            if (isLoggedIn()) {
                // Renovar la ventana de la sesión (deslizante) y después validar el
                // perfil: /auth/me contesta 401 si el token venció y trae el avatar.
                syncSession();
                refrescarPerfil();
            } else if (!urlParams.has('nosession')) {
                checkSSO();
            }
        });
    }

    // Sincronización proactiva cuando el usuario vuelve a la pestaña
    window.addEventListener('focus', () => {
        syncSession();
    });
})();

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  
  if (options.body && !(options.body instanceof FormData)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(CONFIG.API_URL + endpoint, { ...options, headers });
  if (res.status === 401) {
    // 401 (no 403: eso es permiso, no sesión muerta) + creíamos estar logueados
    // = el token venció, se revocó o su usuario ya no existe. Primero se intenta
    // REHACER la sesión en silencio (la cookie de fscauth puede seguir viva: no
    // hace falta pedir la contraseña de nuevo); recién si eso no es posible se
    // vuelve al login con retorno.
    if (token) {
      // Con el token todavía vigente, el 401 es de ESE endpoint: se revalida en
      // silencio (y se renueva) y NO se desloguea. Solo con el token vencido se
      // rehace la sesión con la cookie o se vuelve al login con retorno.
      if (tokenPlausible(token) && !localTokenExpired(token)) {
        syncSession();
        return null;
      }
      if (!refrescarSesionSilenciosa()) irALoginPorSesionVencida();
    }
    return null;
  }
  return res;
}

/**
 * Subida de archivos con el mismo manejo de sesión que apiRequest.
 * Antes cada página hacía su propio fetch a /upload y, si la sesión local estaba
 * muerta, la subida fallaba EN SILENCIO (el usuario no veía nada y el problema
 * reaparecía más tarde como un rebote raro al guardar). Devuelve siempre
 * { ok, status, url } para poder avisar en pantalla.
 */
async function apiUpload(file, fields = {}) {
  if (!file) return { ok: false, status: 0, url: '' };

  const formData = new FormData();
  formData.append('file', file, file.name || 'archivo.jpg');
  Object.keys(fields).forEach(k => {
    const v = fields[k];
    if (v !== undefined && v !== null && v !== '') formData.append(k, v);
  });

  const token = getToken();
  try {
    const res = await fetch(CONFIG.API_URL + '/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (res.status === 401) {
      // Igual que apiRequest: si el token local sigue vigente NO se desloguea (se
      // revalida y renueva en silencio); con el token vencido se rehace la sesión
      // y, si no hay forma, se vuelve al login con retorno.
      if (token) {
        if (tokenPlausible(token) && !localTokenExpired(token)) {
          syncSession();
          return { ok: false, status: 401, url: '' };
        }
        if (!refrescarSesionSilenciosa()) irALoginPorSesionVencida();
      }
      return { ok: false, status: 401, url: '' };
    }
    if (!res.ok) return { ok: false, status: res.status, url: '' };

    const data = await res.json().catch(() => ({}));
    return { ok: true, status: res.status, url: data.url || '' };
  } catch (err) {
    return { ok: false, status: 0, url: '', error: String((err && err.message) || err) };
  }
}

window.apiUpload = apiUpload;
