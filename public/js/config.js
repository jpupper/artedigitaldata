const VPS_ORIGIN = 'https://vps-4455523-x.dattaweb.com';

const CONFIG = {
  isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168'),

  get BASE() {
    const path = window.location.pathname;
    if (path.startsWith('/artedigitaldata')) return '/artedigitaldata';
    return '';
  },

  get API_URL() {
    // El usuario pidió: "en el local cargues los datos que se levantan desde el VPS"
    if (this.isLocal) return VPS_ORIGIN + '/artedigitaldata/api';
    
    // En otros entornos, usar el origin actual con el BASE detectado
    return window.location.origin + this.BASE + '/api';
  },

  get SOCKET_URL() {
    if (this.isLocal) return VPS_ORIGIN;
    return window.location.origin;
  },

  get SOCKET_PATH() {
    return '/artedigitaldata/socket.io';
  },

  get STATIC_ORIGIN() {
    return window.location.origin;
  }
};
