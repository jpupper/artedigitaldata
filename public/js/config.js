const VPS_ORIGIN = 'https://vps-4455523-x.dattaweb.com';

window.CONFIG = {
  isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168'),

  get BASE() {
    const path = window.location.pathname;
    // If the path starts with /artedigitaldata, we're in a subfolder deployment
    if (path.startsWith('/artedigitaldata')) return '/artedigitaldata';
    // Else, we assume root deployment
    return '';
  },

  get API_URL() {
    // El usuario pidió: "en el local cargues los datos que se levantan desde el VPS"
    if (this.isLocal) return VPS_ORIGIN + '/artedigitaldata/api';
    
    // En otros entornos, usar el origin actual con el BASE detectado
    // Se recomienda siempre una ruta absoluta para evitar ambigüedades
    return window.location.origin + this.BASE + '/api';
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

console.log("%c[CONFIG] Loaded:", "color: #00F5FF; font-weight: bold;", window.CONFIG);
