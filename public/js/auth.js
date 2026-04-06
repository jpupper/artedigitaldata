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

function isLoggedIn() {
  return !!getToken();
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
  // Limpiar también en el centralizador
  window.location.href = `${CONFIG.FSCAUTH_URL}/api/auth/logout?redirect=${encodeURIComponent(window.location.origin + CONFIG.BASE + '/')}`;
}

// Centralized Redirection logic
function showLogin() {
    // If we already have a token in URL, don't redirect (let the loader handle it)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) return;

    if (isLoggedIn()) {
        window.location.href = CONFIG.BASE + '/';
        return;
    }

    const currentUrl = window.location.href;
    // Ensure the redirect URL doesn't have existing auth params
    const redirectUrl = new URL(currentUrl);
    redirectUrl.searchParams.delete('token');
    redirectUrl.searchParams.delete('username');
    redirectUrl.searchParams.delete('userId');

    window.location.href = `${CONFIG.FSCAUTH_URL}/login.html?redirect=${encodeURIComponent(redirectUrl.toString())}&origin=artedigitaldata`;
}

function showRegister() {
    // If we already have a token in URL, don't redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) return;

    if (isLoggedIn()) {
        window.location.href = CONFIG.BASE + '/';
        return;
    }

    const currentUrl = window.location.href;
    const redirectUrl = new URL(currentUrl);
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
    window.location.href = `${CONFIG.FSCAUTH_URL}/api/auth/sso-check?redirect=${encodeURIComponent(currentUrl)}`;
}

/**
 * Silent Session Sync: Checks if the central session matches the local state
 * without redirecting. Used on window focus to catch logout from other tabs.
 */
async function syncSession() {
    try {
        const res = await fetch(`${CONFIG.FSCAUTH_URL}/api/auth/verify`, { credentials: 'include' });
        const data = await res.json();
        
        const localLoggedIn = isLoggedIn();
        
        if (data.loggedIn) {
            // Un-authenticated locally but logged in centrally -> Trigger SSO Flow (redirect for token)
            if (!localLoggedIn) {
                console.log("[AUTH] Nueva sesión detectada en FSC. Sincronizando...");
                checkSSO();
            }
        } else {
            // Authenticated locally but NOT centrally -> Logout
            // ONLY force logout if we are on the same domain as the Auth Server
            // Across different domains, background fetch often fails to send cookies (false negative)
            const isSameOrigin = new URL(CONFIG.FSCAUTH_URL).origin === window.location.origin;
            if (localLoggedIn && isSameOrigin) {
                console.warn("[AUTH] Sesión central cerrada. Cerrando local...");
                logout();
            }
        }
    } catch (err) {
        console.error("[AUTH] Error syncSession:", err);
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
    } else {
        // Solo chequear SSO en el evento DOMContentLoaded para no bloquear el renderizado inicial
        document.addEventListener('DOMContentLoaded', () => {
            if (isLoggedIn()) {
                // Update profile in background to get roles and fresh data
                if (typeof apiRequest === 'function') {
                    apiRequest('/auth/me')
                        .then(res => res && res.json())
                        .then(data => {
                            if (data && !data.error) {
                                const currentUser = getUser();
                                const hasChanges = !currentUser || currentUser.role !== data.role || currentUser.avatar !== data.avatar;
                                setUser({ ...data, id: data._id || data.id });
                                if (hasChanges && typeof window.renderHeader === 'function') {
                                    window.renderHeader();
                                }
                            }
                        })
                        .catch(err => console.error("[AUTH] Error fetching profile updates:", err));
                }
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
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(CONFIG.API_URL + endpoint, { ...options, headers });
  if (res.status === 401) {
    logout();
    return null;
  }
  return res;
}
