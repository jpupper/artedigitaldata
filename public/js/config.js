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
    // NOTA: Forzamos /artedigitaldata si no se encuentra en el path pero estamos en un dominio conocido, 
    // ya que NGINX solo mapea ese prefijo al servidor Node.
    get BASE() {
        const path = window.location.pathname;
        if (path.startsWith('/artedigitaldata')) return '/artedigitaldata';
        
        // Si estamos en producción (no localhost) y no hay prefijo, lo añadimos para la API
        if (!this.isLocal) return '/artedigitaldata';
        
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

    get API_URL() {
        // En producción siempre necesitamos el prefijo por el mapeo de NGINX
        const prefix = this.isLocal ? this.BASE : '/artedigitaldata';
        return window.location.origin + prefix + '/api';
    },

    get SOCKET_URL() {
        return window.location.origin;
    },

    get SOCKET_PATH() {
        // El servidor Socket.io en el VPS está configurado específicamente en este path
        return '/artedigitaldata/socket.io';
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
