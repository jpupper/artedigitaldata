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
        // El usuario quiere que en LOCAL se usen siempre los datos del VPS
        const origin = (this.isLocal || !this.IS_NODE_SERVER) ? VPS_ORIGIN : window.location.origin;
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

    get DONATIONS() {
        return {
            CAFECITO: 'https://cafecito.app/artedigitaldata',
            MERCADOPAGO: 'https://www.mercadopago.com.ar/payment-link/v1/redirect?preference-id=71459997-344a34fe-540b-4e3e-bdfe-c09efea35f18',
            PAYPAL: 'https://paypal.me/artedigitaldata'
        };
    },

    resolveImage(url) {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        // Si la URL es relativa y estamos en un espejo estático (como Ferozo),
        // debemos apuntar al VPS para obtener la imagen.
        if (url.startsWith('/artedigitaldata')) {
            return VPS_ORIGIN + url;
        }
        return url;
    }
};

// Exponemos también como variable global directa para scripts que no usen window.
const CONFIG = window.CONFIG;

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
    if (!url) return '';
    const resolved = CONFIG.resolveImage(url);
    try {
        const parsed = new URL(resolved);
        return ['http:', 'https:'].includes(parsed.protocol) ? resolved : '';
    } catch {
        // Si no es una URL válida (ej: ruta relativa que resolveImage no cambió), 
        // pero empieza con /, la dejamos pasar para que el navegador la maneje localmente
        // si resolveImage no la convirtió a absoluta.
        return resolved.startsWith('/') ? resolved : '';
    }
}
