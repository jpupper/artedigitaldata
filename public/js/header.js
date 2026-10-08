/* ============================================================
   🧭 HEADER + FOOTER ÚNICOS de Arte Digital Data
   ------------------------------------------------------------
   El estilo sale TODO del sistema de diseño (css/fsc-ui.css):
   este archivo no define colores, bordes ni radios propios.

   Estructura: rejilla de 3 columnas (logo | navegación | acciones).
   El bloque del medio es `minmax(0,1fr)`, así NADA se puede encimar:
   antes la fila medía 1086px dentro de un contenedor de 992px y el
   logo quedaba pegado a COLABORAR con el bloque de sesión afuera de
   la pantalla. Los ítems que no entran en 1024px viven en el
   desplegable "MÁS" (no se ocultan ni se superponen).
   ============================================================ */

// Ítems que NO entran en la fila: van al desplegable "MÁS".
const NAV_MAS = [
  { href: '/search.html', label: 'Buscar', icon: 'fa-magnifying-glass' },
  { href: '/visualeffects.html', label: 'Efectos', icon: 'fa-wand-magic-sparkles' },
  { href: '/concurso.html', label: 'Concurso', icon: 'fa-trophy' },
  { href: '/quienessomos.html', label: 'Quiénes somos', icon: 'fa-circle-info' }
];

function navActivo(href) {
  const p = (window.location.pathname || '').toLowerCase();
  const base = (CONFIG.BASE || '').toLowerCase();
  let rel = p.startsWith(base) ? p.slice(base.length) : p;
  if (!rel || rel === '/') rel = '/index.html';
  if (rel.startsWith('/') === false) rel = '/' + rel;
  const cleanRel = rel.replace(/\.html$/, '');
  const cleanHref = href.replace(/\.html$/, '');
  return cleanRel === cleanHref ? ' is-active' : '';
}

function renderHeader() {
  const user = getUser();
  const loggedIn = isLoggedIn();
  const admin = isAdmin();
  const u = encodeURIComponent((user && user.username) || '');
  const nombre = escapeHTML((user && (user.displayName || user.username)) || 'Usuario');

  const avatar = window.GenerativeAvatar
    ? window.GenerativeAvatar.markup(user, { className: 'w-8 h-8 rounded-full object-cover' })
    : `<span class="ui-btn ui-btn--icon" style="padding:6px"><i class="fas fa-user-astronaut"></i></span>`;

  const masItems = NAV_MAS.map(i =>
    `<a href="${CONFIG.BASE}${i.href}"><i class="fas ${i.icon}"></i> ${i.label}</a>`).join('') +
    (admin ? `<a href="${CONFIG.BASE}/admin.html"><i class="fas fa-shield-halved"></i> Admin</a>` : '');

  const headerHTML = `
  <header class="ui-header">
    <div class="ui-wrap ui-header-bar">

      <a class="ui-logo" href="${CONFIG.BASE}/" title="Arte Digital Data">
        <img src="${CONFIG.BASE}/img/artedigital.png" alt="Arte Digital Data">
        <span class="ui-logo-texto">Arte Digital Data</span>
      </a>

      <nav class="ui-nav">
        <a class="ui-navlink${navActivo('/index.html')}" href="${CONFIG.BASE}/">Inicio</a>
        <a class="ui-navlink${navActivo('/obras.html')}" href="${CONFIG.BASE}/obras.html">Obras</a>
        <a class="ui-navlink${navActivo('/recursos.html')}" href="${CONFIG.BASE}/recursos.html">Recursos</a>
        <a class="ui-navlink is-chances${navActivo('/oportunidades.html')}" href="${CONFIG.BASE}/oportunidades.html">Chances</a>
        <a class="ui-navlink${navActivo('/calendario.html')}" href="${CONFIG.BASE}/calendario.html">Calendario</a>
        <a class="ui-navlink${navActivo('/artistas.html')}" href="${CONFIG.BASE}/artistas.html">Artistas</a>
        ${loggedIn ? `<a class="ui-navlink is-chat${navActivo('/chat.html')}" href="${CONFIG.BASE}/chat.html">Chat</a>` : ''}
        <div class="ui-menu" id="ui-menu-mas">
          <button type="button" class="ui-navlink" data-ui-menu-btn aria-expanded="false">
            Más <i class="fas fa-chevron-down" style="font-size:9px"></i>
          </button>
          <div class="ui-menu-panel">${masItems}</div>
        </div>
      </nav>

      <div class="ui-actions">
        <button type="button" onclick="showDonationModal()" class="ui-btn ui-btn--ghost ui-sheen ui-colab" title="Apoyá el proyecto">
          <i class="fas fa-heart" style="color:var(--ui-c-gold)"></i> <span class="ui-colab-texto">Colaborar</span>
        </button>
        ${loggedIn ? `
          <a href="${CONFIG.BASE}/create.html" class="ui-btn ui-btn--primary ui-solo-desktop"><i class="fas fa-plus"></i> Crear</a>
          <a href="${CONFIG.BASE}/profile.html?user=${u}&tab=notificaciones" class="ui-btn ui-btn--icon ui-solo-desktop" title="Notificaciones">
            <i class="fas fa-bell"></i>
            <span id="header-notif-badge" class="hidden" style="position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#ef4444;color:#fff;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center">0</span>
          </a>
          <a href="${CONFIG.BASE}/profile.html?user=${u}" class="ui-user" title="Mi perfil">${avatar}<span class="ui-user-nombre">${nombre}</span></a>
          <button type="button" onclick="logout()" class="ui-btn ui-btn--icon ui-btn--ghost ui-solo-desktop" title="Salir"><i class="fas fa-right-from-bracket"></i></button>
        ` : `
          <button type="button" onclick="showLogin()" class="ui-btn ui-btn--ghost">Entrar</button>
          <button type="button" onclick="showRegister()" class="ui-btn ui-btn--solid">Registrarse</button>
        `}
        <button type="button" id="mobile-menu-btn" class="ui-btn ui-btn--icon ui-solo-mobile" aria-label="Menú">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>

    <!-- Menú mobile: mismas secciones, targets grandes -->
    <div id="mobile-menu" class="ui-hidden ui-wrap" style="padding-bottom:18px">
      <div class="ui-menu-panel" style="position:static;opacity:1;transform:none;pointer-events:auto;min-width:0">
        <a href="${CONFIG.BASE}/">Inicio</a>
        <a href="${CONFIG.BASE}/obras.html">Obras</a>
        <a href="${CONFIG.BASE}/recursos.html">Recursos</a>
        <a href="${CONFIG.BASE}/oportunidades.html">Chances</a>
        <a href="${CONFIG.BASE}/calendario.html">Calendario</a>
        <a href="${CONFIG.BASE}/artistas.html">Artistas</a>
        ${loggedIn ? `<a href="${CONFIG.BASE}/chat.html">Chat</a><a href="${CONFIG.BASE}/create.html">Crear</a>` : ''}
        ${NAV_MAS.map(i => `<a href="${CONFIG.BASE}${i.href}"><i class="fas ${i.icon}"></i> ${i.label}</a>`).join('')}
        ${admin ? `<a href="${CONFIG.BASE}/admin.html"><i class="fas fa-shield-halved"></i> Admin</a>` : ''}
        ${loggedIn ? `<a href="${CONFIG.BASE}/profile.html?user=${u}">${avatar}<span style="margin-left:8px">${nombre}</span></a>
          <a href="#" onclick="logout();return false" style="color:#f87171"><i class="fas fa-right-from-bracket"></i> Salir</a>`
        : `<a href="#" onclick="showLogin();return false"><i class="fas fa-right-to-bracket"></i> Entrar</a>
           <a href="#" onclick="showRegister();return false"><i class="fas fa-user-plus"></i> Registrarse</a>`}
      </div>
    </div>
  </header>

  <!-- Modal de colaboración (nunca alert nativo) -->
  <div id="donation-modal" class="ui-modal">
    <div class="ui-modal-box" style="max-width:520px">
      <button onclick="hideDonationModal()" class="ui-btn ui-btn--icon ui-btn--ghost" style="position:absolute;top:14px;right:14px" aria-label="Cerrar">
        <i class="fas fa-times"></i>
      </button>
      <span class="ui-badge"><i class="fas fa-heart" style="color:var(--ui-c-gold)"></i> Colaborar</span>
      <h3 class="ui-title" style="font-size:24px;margin:12px 0 6px">Apoyá el proyecto</h3>
      <p class="ui-sub" style="margin-bottom:18px">Tu colaboración mantiene la plataforma libre y sin publicidad.</p>
      <div style="display:grid;gap:10px">
        <a href="${CONFIG.DONATIONS.MERCADOPAGO}" rel="noopener" target="_blank" class="ui-btn ui-btn--primary ui-sheen" style="justify-content:flex-start;text-transform:none;letter-spacing:0">
          <i class="fas fa-wallet"></i> Mercado Pago · donaciones en pesos
        </a>
        <a href="${CONFIG.DONATIONS.CAFECITO}" rel="noopener" target="_blank" class="ui-btn ui-sheen" style="justify-content:flex-start;text-transform:none;letter-spacing:0">
          <i class="fas fa-mug-hot" style="color:var(--ui-c-gold)"></i> Cafecito · invitame un café
        </a>
        <div class="ui-btn is-disabled" style="justify-content:flex-start;text-transform:none;letter-spacing:0">
          <i class="fab fa-paypal"></i> PayPal · próximamente
        </div>
        <div class="ui-btn is-disabled" style="justify-content:flex-start;text-transform:none;letter-spacing:0">
          <i class="fab fa-patreon"></i> Patreon · próximamente
        </div>
      </div>
    </div>
  </div>
  `;

  const host = document.getElementById('app-header');
  if (host) host.innerHTML = headerHTML;

  // Desplegable "MÁS" y menú mobile
  const mas = document.getElementById('ui-menu-mas');
  if (mas) {
    const btn = mas.querySelector('[data-ui-menu-btn]');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const abierto = mas.dataset.open === '1';
      mas.dataset.open = abierto ? '0' : '1';
      btn.setAttribute('aria-expanded', abierto ? 'false' : 'true');
    });
    document.addEventListener('click', (e) => {
      if (!mas.contains(e.target)) { mas.dataset.open = '0'; btn.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { mas.dataset.open = '0'; btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  const btnM = document.getElementById('mobile-menu-btn');
  const menuM = document.getElementById('mobile-menu');
  if (btnM && menuM) {
    btnM.addEventListener('click', () => {
      menuM.classList.toggle('ui-hidden');
      const icon = btnM.querySelector('i');
      if (icon) { icon.classList.toggle('fa-bars'); icon.classList.toggle('fa-times'); }
    });
  }
}

function showDonationModal() {
  const modal = document.getElementById('donation-modal');
  if (modal) modal.classList.add('is-open');
}

function hideDonationModal() {
  const modal = document.getElementById('donation-modal');
  if (modal) modal.classList.remove('is-open');
}

function extractYouTubeId(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = item.match(regex);
    return match ? match[1] : null;
  }
  const searchStrings = [item.youtube_video, item.title, item.titulo, item.description, item.descripcion, item.url, item.location];
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  for (const str of searchStrings) {
    if (str && typeof str === 'string') {
      const match = str.match(regex);
      if (match) return match[1];
    }
  }
  return null;
}

function playVideo(el, youtubeId) {
  console.log('[YouTube] Playing:', youtubeId);
  const overlay = el.querySelector('.video-overlay');
  if (!overlay) return;
  const iframe = overlay.querySelector('iframe');

  let loader = overlay.querySelector('.video-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.className = 'video-loader absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none';
    loader.innerHTML = '<i class="fas fa-circle-notch fa-spin text-4xl text-cyan-500"></i>';
    overlay.appendChild(loader);
  }
  loader.style.display = 'flex';
  iframe.onload = () => { loader.style.display = 'none'; };

  if (!iframe.src || iframe.src === 'about:blank') {
    const url = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&rel=0&enablejsapi=1`;
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    overlay.style.background = `url(https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg) no-repeat center center`;
    overlay.style.backgroundSize = 'cover';
  }
  overlay.style.opacity = '1';
  overlay.style.transition = 'none';
  overlay.style.pointerEvents = 'none';
}

function stopVideo(el) {
  const overlay = el.querySelector('.video-overlay');
  if (!overlay) return;
  const iframe = overlay.querySelector('iframe');
  const loader = overlay.querySelector('.video-loader');
  if (loader) loader.style.display = 'none';
  overlay.style.opacity = '0';
  iframe.src = 'about:blank';
}

function renderFooter() {
  if (document.getElementById('app-footer')) return;

  const footerContainer = document.createElement('div');
  footerContainer.id = 'app-footer';
  footerContainer.className = 'ui-footer';
  footerContainer.style.marginTop = 'auto';

  footerContainer.innerHTML = `
    <div class="ui-wrap ui-footer-grid">
      <div>
        <a href="${CONFIG.BASE}/" class="ui-logo" style="margin-bottom:10px">
          <img src="${CONFIG.BASE}/img/artedigital.png" alt="Arte Digital Data">
          <span>Arte Digital Data</span>
        </a>
        <p class="ui-sub" style="font-size:12px">La red de artistas digitales, música visual y diseño generativo.</p>
      </div>
      <div class="ui-row">
        <a href="https://chat.whatsapp.com/FaIpZjZFVT49gzfUKqKuHN" target="_blank" class="ui-btn ui-sheen"><i class="fab fa-whatsapp" style="color:#25D366"></i> WhatsApp</a>
        <a href="https://discord.gg/sapq5a58" target="_blank" class="ui-btn ui-sheen"><i class="fab fa-discord" style="color:#5865F2"></i> Discord</a>
        <a href="https://github.com/jpupper/artedigitaldata" target="_blank" class="ui-btn ui-sheen"><i class="fab fa-github"></i> GitHub</a>
      </div>
      <div style="display:grid;gap:8px;justify-items:start">
        <a href="https://fullscreencode.com" target="_blank" class="ui-btn ui-btn--ghost">Hecho en FullScreen Code</a>
        <div class="ui-row">
          <a href="${CONFIG.BASE}/terminos.html" class="ui-navlink">Términos</a>
          <a href="${CONFIG.BASE}/privacidad.html" class="ui-navlink">Privacidad</a>
          <button type="button" onclick="showDonationModal()" class="ui-navlink">Colaborar</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(footerContainer);
}

async function updateHeaderNotifBadge() {
  if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return;
  try {
    const res = await apiRequest('/notifications/unread-count');
    if (!res || !res.ok) return;
    const data = await res.json();
    const count = data.count || 0;
    const badges = [
      document.getElementById('header-notif-badge'),
      document.getElementById('mobile-notif-badge')
    ];
    badges.forEach(b => {
      if (!b) return;
      if (count > 0) {
        b.textContent = count > 99 ? '99+' : count;
        b.classList.remove('hidden');
      } else {
        b.classList.add('hidden');
      }
    });
  } catch (e) {}
}
window.updateHeaderNotifBadge = updateHeaderNotifBadge;

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
  if (typeof isLoggedIn === 'function' && isLoggedIn()) {
    updateHeaderNotifBadge();
  }
});

// Cerrar el modal de colaboración: Esc o click afuera (nunca alert nativo).
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideDonationModal();
});
document.addEventListener('click', (e) => {
  const m = document.getElementById('donation-modal');
  if (m && m.classList.contains('is-open') && !m.querySelector('.ui-modal-box').contains(e.target) && !e.target.closest('.ui-colab')) {
    hideDonationModal();
  }
});

// Dynamically load floating chat widget and cookie consent banner on all pages
(function loadGlobalWidgets() {
  const p = window.location.pathname.toLowerCase();

  // Floating Chat
  if (!p.includes('chat.html') && !p.endsWith('/chat') && !document.querySelector('script[src*="floating-chat.js"]')) {
    const scriptChat = document.createElement('script');
    scriptChat.src = (window.CONFIG ? CONFIG.BASE : '') + '/js/floating-chat.js';
    (document.head || document.documentElement).appendChild(scriptChat);
  }

  // Cookie Consent Banner
  if (!document.querySelector('script[src*="cookie-banner.js"]')) {
    const scriptCookie = document.createElement('script');
    scriptCookie.src = (window.CONFIG ? CONFIG.BASE : '') + '/js/cookie-banner.js';
    (document.head || document.documentElement).appendChild(scriptCookie);
  }
})();
