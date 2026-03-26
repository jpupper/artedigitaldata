const VPS_ORIGIN = 'https://vps-4455523-x.dattaweb.com';

window.CONFIG = {
    isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168'),

    get BASE() {
        // Normalización para detectar el subfolder /artedigitaldata en cualquier dominio
        if (window.location.pathname.startsWith('/artedigitaldata')) return '/artedigitaldata';
        return '';
    },

    get API_URL() {
        // Forzamos el uso del VPS para la API siempre, incluso si estamos en Ferozo o local
        // Esto garantiza que siempre indexemos la base de datos principal
        return VPS_ORIGIN + '/artedigitaldata/api';
    },

    get SOCKET_URL() {
        return VPS_ORIGIN;
    },

    get SOCKET_PATH() {
        return '/artedigitaldata/socket.io';
    },

    get STATIC_ORIGIN() {
        return window.location.origin + this.BASE;
    },

    get FSCAUTH_URL() {
        if (this.isLocal) {
            return window.location.origin + '/fscauth';
        }
        return VPS_ORIGIN + '/fscauth';
    }
};

// Exponemos también como variable global directa para scripts que no usen window.
const CONFIG = window.CONFIG;

console.log("%c[CONFIG] Initialized v4", "color: #00F5FF; font-weight: bold;", {
    isLocal: CONFIG.isLocal,
    BASE: CONFIG.BASE,
    API_URL: CONFIG.API_URL,
    currentOrigin: window.location.origin
});
