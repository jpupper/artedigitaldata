const VPS_ORIGIN = 'https://vps-4455523-x.dattaweb.com';
const BASE_PATH = '/artedigitaldata';

const CONFIG = {
  isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168'),

  get API_URL() {
    if (this.isLocal) return window.location.origin + BASE_PATH + '/api';
    return VPS_ORIGIN + BASE_PATH + '/api';
  },

  get SOCKET_URL() {
    if (this.isLocal) return window.location.origin;
    return VPS_ORIGIN;
  },

  get SOCKET_PATH() {
    return BASE_PATH + '/socket.io';
  },

  get STATIC_ORIGIN() {
    return window.location.origin;
  },

  get BASE() {
    return BASE_PATH;
  }
};
