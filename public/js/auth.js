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
  return user && user.role === 'ADMINISTRADOR';
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
    const currentUrl = window.location.href;
    window.location.href = `${CONFIG.FSCAUTH_URL}/login.html?redirect=${encodeURIComponent(currentUrl)}&origin=artedigitaldata`;
}

function showRegister() {
    const currentUrl = window.location.href;
    window.location.href = `${CONFIG.FSCAUTH_URL}/register.html?redirect=${encodeURIComponent(currentUrl)}&origin=artedigitaldata`;
}

/**
 * SSO Check: Si no hay token local, intentamos ver si hay una sesión activa en el centralizador.
 */
async function checkSSO() {
    if (isLoggedIn()) return;
    
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
            if (localLoggedIn) {
                console.warn("[AUTH] Sesión central cerrada. Cerrando local...");
                logout();
            }
        }
    } catch (err) {
        console.error("[AUTH] Error syncSession:", err);
    }
}

// Initial session check and synchronization on load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlUsername = urlParams.get('username');
    const urlUserId = urlParams.get('userId');

    if (urlToken && urlUsername) {
        setToken(urlToken);
        setUser({ username: urlUsername, id: urlUserId, _id: urlUserId });
        
        // Limpiar URL
        urlParams.delete('token');
        urlParams.delete('username');
        urlParams.delete('userId');
        urlParams.delete('ssoset');
        const newQuery = urlParams.toString();
        const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '');
        window.history.replaceState({}, document.title, newUrl);
    } else {
        // Si no estamos logueados y no venimos de un inteno fallido, chequear SSO
        if (!isLoggedIn() && !urlParams.has('nosession')) {
            checkSSO();
        }
    }

    // Sincronización proactiva cuando el usuario vuelve a la pestaña
    window.addEventListener('focus', () => {
        syncSession();
    });
});

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
