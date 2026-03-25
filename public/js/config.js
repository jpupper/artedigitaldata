const VPS_ORIGIN = 'https://vps-4455523-x.dattaweb.com';

window.CONFIG = {
    // Orígenes que sí ejecutan el backend de Node
    NODE_HOSTS: [
        'localhost',
        '127.0.0.1',
        'vps-4455523-x.dattaweb.com'
    ],

    get isLocal() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' || 
               window.location.hostname.includes('192.168');
    },

    // Detectamos si el dominio actual sirve el backend o es solo un espejo estático
    get IS_NODE_SERVER() {
        return this.NODE_HOSTS.some(host => window.location.hostname === host) || this.isLocal;
    },

    get BASE() {
        if (window.location.pathname.startsWith('/artedigitaldata')) return '/artedigitaldata';
        return '';
    },

    get API_URL() {
        // Si estamos en el servidor Node o local, usamos ruta relativa/misma origen
        if (this.IS_NODE_SERVER) {
            const prefix = this.isLocal && !window.location.pathname.startsWith('/artedigitaldata') ? '' : '/artedigitaldata';
            return window.location.origin + prefix + '/api';
        }
        // Si estamos en un espejo estático (artedigitaldata.com, fullscreencode.com), 
        // debemos apuntar explícitamente al VPS porque el hosting actual no tiene el backend.
        return VPS_ORIGIN + '/artedigitaldata/api';
    },

    get SOCKET_URL() {
        return this.IS_NODE_SERVER ? window.location.origin : VPS_ORIGIN;
    },

    get SOCKET_PATH() {
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
