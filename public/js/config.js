const VPS_ORIGIN = 'https://vps-4455523-x.dattaweb.com';

window.CONFIG = {
    // Orígenes que sí ejecutan el backend de Node
    NODE_HOSTS: [
        'localhost',
        '127.0.0.1',
        'vps-4455523-x.dattaweb.com',
        'artedigitaldata.com',
        'www.artedigitaldata.com'
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
        // Lógica robusta: si estoy en el dominio real, uso el mismo origen para evitar CORS
        const origin = (window.location.hostname.includes('artedigitaldata.com')) 
            ? window.location.origin 
            : (this.isLocal ? VPS_ORIGIN : window.location.origin);
        return origin + '/artedigitaldata/api';
    },

    get SOCKET_URL() {
        return (this.isLocal || !this.IS_NODE_SERVER) ? VPS_ORIGIN : window.location.origin;
    },

    get SOCKET_PATH() {
        return '/artedigitaldata/socket.io';
    },

    get STATIC_ORIGIN() {
        return window.location.origin + this.BASE;
    },

    get FSCAUTH_URL() {
        return VPS_ORIGIN + '/fscauth';
    },

    // Enlaces de colaboración/donación
    DONATIONS: {
        CAFECITO: 'https://cafecito.app/artedigitaldata',
        MERCADOPAGO: 'https://www.mercadopago.com.ar/payment-link/v1/redirect?preference-id=71459997-344a34fe-540b-4e3e-bdfe-c09efea35f18',
        PAYPAL: 'https://paypal.me/artedigitaldata'
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
