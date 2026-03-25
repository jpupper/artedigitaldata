const VPS_ORIGIN = 'https://vps-4455523-x.dattaweb.com';

window.CONFIG = {
    // Orígenes válidos para saber si estamos en un entorno conocido
    VALID_ORIGINS: [
        'https://fullscreencode.com',
        'https://artedigitaldata.com',
        'https://www.artedigitaldata.com',
        'https://vps-4455523-x.dattaweb.com'
    ],

    // Detección automática de base path
    get BASE() {
        if (window.location.pathname.startsWith('/artedigitaldata')) return '/artedigitaldata';
        return '';
    },

    // Detección de entorno local
    get isLocal() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' || 
               window.location.hostname.includes('192.168');
    },

    // URL base de la aplicación (para links internos)
    get ORIGIN() {
        return window.location.origin;
    },

    // La API siempre debe apuntar al mismo servidor que sirve la página,
    // a menos que estemos en un dominio que solo sirve el frontend (como Ferozo si fuera estático)
    get API_URL() {
        // En localhost, usamos localhost
        if (this.isLocal) return window.location.origin + this.BASE + '/api';
        
        // En producción, usamos el origen actual (que debería ser el servidor Node)
        // Si el origen actual no está en la lista de confianza, podrías forzar el VPS_ORIGIN
        // Pero para flexibilidad total, usamos el origen actual.
        return window.location.origin + this.BASE + '/api';
    },

    get SOCKET_URL() {
        return window.location.origin;
    },

    get SOCKET_PATH() {
        return this.BASE + '/socket.io';
    },

    get STATIC_ORIGIN() {
        return window.location.origin + this.BASE;
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
