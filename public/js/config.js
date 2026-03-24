const VPS_ORIGIN = 'https://vps-4455523-x.dattaweb.com';

window.CONFIG = {
  isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168'),

  get BASE() {
    const path = window.location.pathname;
    // Normalized detection of the subfolder
    if (path.includes('/artedigitaldata')) return '/artedigitaldata';
    return '';
  },

  get API_URL() {
    // If local, we prioritize the VPS API for data as requested
    if (this.isLocal) {
        return VPS_ORIGIN + '/artedigitaldata/api';
    }
    
    // In production (VPS or final domain), we use the current origin + base
    const origin = window.location.origin;
    const base = this.BASE; // Can be '' or '/artedigitaldata'
    
    return origin + base + '/api';
  },

  get SOCKET_URL() {
    if (this.isLocal) return VPS_ORIGIN;
    return window.location.origin;
  },

  get SOCKET_PATH() {
    return this.BASE + '/socket.io';
  },

  get STATIC_ORIGIN() {
    return window.location.origin + this.BASE;
  }
};

// Also expose as constant for scripts that look for it globally without window prefix
const CONFIG = window.CONFIG;

console.log("%c[CONFIG] Initialized", "color: #00F5FF; font-weight: bold;", {
    isLocal: CONFIG.isLocal,
    BASE: CONFIG.BASE,
    API_URL: CONFIG.API_URL,
    origin: window.location.origin,
    pathname: window.location.pathname
});
