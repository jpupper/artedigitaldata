// IDs reales tomados de la API pública para que las páginas de detalle rendericen
// contenido en vez de un estado de error.
const POST_ID = '6a7f7430dc1c465540652090';
const RECURSO_ID = '6a796ddedc1c465540651898';
const EVENTO_ID = '69b81ad9c6180e5cfdfbb2a7';
const USERNAME = 'Agustin';

module.exports = [
  { name: 'index', url: '/' },
  { name: 'obras', url: '/obras' },
  { name: 'recursos', url: '/recursos' },
  { name: 'eventos', url: '/eventos' },
  { name: 'artistas', url: '/artistas' },
  { name: 'calendario', url: '/calendario' },
  { name: 'concurso', url: '/concurso' },
  { name: 'manifiesto', url: '/manifiesto' },
  { name: 'quienessomos', url: '/quienessomos' },
  { name: 'guiaingreso', url: '/guiaingreso' },
  { name: 'formularioingreso', url: '/formularioingreso' },
  { name: 'login', url: '/login' },
  { name: 'register', url: '/register' },
  { name: 'forgot-password', url: '/forgot-password' },
  { name: 'reset-password', url: '/reset-password?token=demo' },
  { name: 'create', url: '/create' },
  { name: 'chat', url: '/chat' },
  { name: 'search', url: '/search?q=arte' },
  { name: 'profile', url: `/profile?user=${USERNAME}` },
  { name: 'post', url: `/post?id=${POST_ID}` },
  { name: 'recurso', url: `/recurso?id=${RECURSO_ID}` },
  { name: 'evento', url: `/evento?id=${EVENTO_ID}` },
  { name: 'eventgallery', url: `/eventgallery?id=${EVENTO_ID}` },
  { name: 'event-tickets', url: `/event-tickets?id=${EVENTO_ID}` },
  { name: 'ticket-purchase', url: `/ticket-purchase?id=${EVENTO_ID}` },
  { name: 'ticket-success', url: '/ticket-success' },
  { name: 'scan-redeem', url: '/scan-redeem' },
  { name: 'admin', url: '/admin' },
  { name: 'admin-tickets', url: '/admin-tickets' },
  // 404 no carga Tailwind (es un canvas de p5.js generativo): no puede verse
  // afectada por el cambio de CSS y su render es aleatorio por diseño.
  { name: '404', url: '/404', nondeterministic: true },
];
