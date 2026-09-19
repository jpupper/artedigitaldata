const VPS_ORIGIN = 'https://vps-4455523-x.dattaweb.com';

window.CONFIG = {
    NODE_HOSTS: ['localhost', '127.0.0.1', 'vps-4455523-x.dattaweb.com'],

    get isLocal() {
        const host = window.location.hostname;
        return host === 'localhost' || 
               host === '127.0.0.1' || 
               host.startsWith('192.168.') ||
               host.startsWith('10.') ||
               host.startsWith('172.') ||
               host.endsWith('.local');
    },

    get IS_NODE_SERVER() {
        return this.NODE_HOSTS.some(host => window.location.hostname === host) || this.isLocal;
    },

    get BASE() {
        if (window.location.pathname.startsWith('/artedigitaldata')) return '/artedigitaldata';
        return '';
    },

    // Siempre conectar directamente al VPS seguro o al backend local activo
    get API_URL() {
        if (window.location.port === '2494' || window.location.port === '2495') {
            return window.location.origin + (this.BASE ? this.BASE : '') + '/api';
        }
        return VPS_ORIGIN + '/artedigitaldata/api';
    },

    get SOCKET_URL() {
        if (window.location.port === '2494' || window.location.port === '2495') {
            return window.location.origin;
        }
        return VPS_ORIGIN;
    },

    get SOCKET_PATH() {
        if (window.location.port === '2494' || window.location.port === '2495') {
            return '/socket.io';
        }
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
        if (url.startsWith('/artedigitaldata')) return VPS_ORIGIN + url;
        return url;
    }
};

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
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
        const isInternalPath = resolved.startsWith('/') && !resolved.startsWith('//');
        return (isInternalPath && !/["'<>\s]/.test(resolved)) ? resolved : '';
    }
}
