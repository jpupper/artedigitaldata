function renderHeader() {
  const user = getUser();
  const loggedIn = isLoggedIn();
  const admin = isAdmin();

  const headerHTML = `
  <header class="fixed top-0 left-0 w-full z-50 border-b border-cyan-500/30" style="background: rgba(13, 13, 18, 0.9); backdrop-filter: blur(10px);">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        
        <!-- Logo -->
        <a href="${CONFIG.BASE}/" class="flex items-center gap-2 group">
          <img src="${CONFIG.BASE}/img/artedigital.png" alt="Arte Digital" class="w-10 h-10 rounded-lg object-cover">
          <span class="hidden sm:block text-lg font-bold gradient-text">
            Arte Digital Data
          </span>
        </a>

        <!-- Colaborar Button -->
        <button onclick="showDonationModal()" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-all uppercase ml-2">
          <i class="fas fa-heart text-yellow-500"></i> COLABORAR
        </button>

        <!-- Desktop Nav -->
        <nav class="hidden lg:flex items-center gap-0.5">
          <a href="${CONFIG.BASE}/" class="nav-link flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-gray-400 hover:text-[var(--color-cyan)] hover:bg-white/5 transition-all">
            <i class="fas fa-home text-[10px]"></i> INICIO
          </a>
          <a href="${CONFIG.BASE}/obras.html" class="nav-link flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-gray-400 hover:text-[var(--color-cyan)] hover:bg-white/5 transition-all">
            <i class="fas fa-palette text-[10px]"></i> OBRAS
          </a>
          <a href="${CONFIG.BASE}/recursos.html" class="nav-link flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-gray-400 hover:text-[var(--color-cyan)] hover:bg-white/5 transition-all">
            <i class="fas fa-box-open text-[10px]"></i> RECURSOS
          </a>
          <a href="${CONFIG.BASE}/search.html" class="nav-link flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-gray-400 hover:text-[var(--color-cyan)] hover:bg-white/5 transition-all">
            <i class="fas fa-search text-[10px]"></i> BUSCAR
          </a>
          <a href="${CONFIG.BASE}/calendario.html" class="nav-link flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-gray-400 hover:text-[var(--color-cyan)] hover:bg-white/5 transition-all">
            <i class="fas fa-calendar-alt text-[10px]"></i> CALENDARIO
          </a>
          ${loggedIn ? `
          <a href="${CONFIG.BASE}/chat.html" class="nav-link flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-gray-400 hover:text-[var(--color-magenta)] hover:bg-white/5 transition-all">
            <i class="fas fa-comments text-[10px]"></i> CHAT
          </a>
          ` : ''}
          ${admin ? `
          <a href="${CONFIG.BASE}/admin.html" class="nav-link flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[var(--color-cyan)] hover:text-white hover:bg-cyan-500/10 transition-all border border-cyan-500/30 ml-1">
            <i class="fas fa-shield-alt text-[9px]"></i> Admin
          </a>
          ` : ''}
        </nav>

        <!-- Auth Buttons / User Menu -->
        <div class="hidden md:flex items-center gap-3">
          ${loggedIn ? `
            <a href="${CONFIG.BASE}/create.html" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black text-gray-400 hover:text-[var(--color-cyan)] hover:bg-white/5 transition-all border border-white/10 uppercase mr-1">
              <i class="fas fa-plus-circle text-xs"></i> CREAR
            </a>
            <a href="${CONFIG.BASE}/profile.html?user=${user?.username}" class="flex items-center gap-2 group p-1 pr-3 rounded-full hover:bg-white/5 transition-all">
              ${user?.avatar ? `
                <img src="${user.avatar}" alt="${user.username}" class="w-8 h-8 rounded-full object-cover border border-cyan-500/30 group-hover:border-cyan-400">
              ` : `
                <div class="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/30">
                  <i class="fas fa-user-astronaut"></i>
                </div>
              `}
              <span class="text-sm font-bold text-gray-300 group-hover:text-cyan-400 transition-colors uppercase">
                ${user?.displayName || user?.username || 'Usuario'}
              </span>
            </a>
            <button onclick="logout()" class="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Salir">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          ` : `
            <button onclick="showLogin()" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-[var(--color-cyan)] hover:bg-white/5 transition-all">
              Iniciar Sesión
            </button>
            <button onclick="showRegister()" class="btn-primary px-5 py-2 rounded-lg text-sm transition-all">
              Registrarse
            </button>
          `}
        </div>

        <!-- Mobile Hamburger -->
        <button id="mobile-menu-btn" class="md:hidden text-gray-300 hover:text-[var(--color-cyan)] transition-colors p-2">
          <i class="fas fa-bars text-xl"></i>
        </button>
      </div>

      <!-- Mobile Menu -->
      <div id="mobile-menu" class="md:hidden hidden pb-4 border-t border-white/10 mt-2 pt-3">
        <div class="flex flex-col gap-1">
          <a href="${CONFIG.BASE}/" class="px-4 py-3 rounded-lg text-sm font-bold text-gray-300 hover:text-[var(--color-cyan)] hover:bg-white/5">
            <i class="fas fa-home mr-2"></i> INICIO
          </a>
          <a href="${CONFIG.BASE}/obras.html" class="px-4 py-3 rounded-lg text-sm font-bold text-gray-300 hover:text-[var(--color-cyan)] hover:bg-white/5">
            <i class="fas fa-palette mr-2"></i> OBRAS
          </a>
          <a href="${CONFIG.BASE}/recursos.html" class="px-4 py-3 rounded-lg text-sm font-bold text-gray-300 hover:text-[var(--color-cyan)] hover:bg-white/5">
            <i class="fas fa-box-open mr-2"></i> RECURSOS
          </a>
          ${loggedIn ? `
          <a href="${CONFIG.BASE}/create.html" class="px-4 py-3 rounded-lg text-sm font-bold text-gray-300 hover:text-[var(--color-magenta)] hover:bg-white/5 border border-white/10">
            <i class="fas fa-plus-circle mr-2"></i> CREAR
          </a>
          ` : ''}
          <a href="${CONFIG.BASE}/search.html" class="px-4 py-3 rounded-lg text-sm font-bold text-gray-300 hover:text-[var(--color-cyan)] hover:bg-white/5">
            <i class="fas fa-search mr-2"></i> BUSCAR
          </a>
          <a href="${CONFIG.BASE}/calendario.html" class="px-4 py-3 rounded-lg text-sm font-bold text-gray-300 hover:text-[var(--color-cyan)] hover:bg-white/5">
            <i class="fas fa-calendar-alt mr-2"></i> CALENDARIO
          </a>
          ${loggedIn ? `
          <a href="${CONFIG.BASE}/chat.html" class="px-4 py-3 rounded-lg text-sm font-bold text-gray-300 hover:text-[var(--color-magenta)] hover:bg-white/5">
            <i class="fas fa-comments mr-2"></i> CHAT
          </a>
          <a href="${CONFIG.BASE}/profile.html?user=${user?.username || ''}" class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-300 hover:text-[var(--color-cyan)] hover:bg-white/5">
            ${user?.avatar ? `
              <img src="${user.avatar}" alt="${user.username}" class="w-8 h-8 rounded-full object-cover border border-cyan-500/30">
            ` : `
              <div class="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <i class="fas fa-user-astronaut text-xs"></i>
              </div>
            `}
            <span class="uppercase">${user?.displayName || user?.username || 'MI PERFIL'}</span>
          </a>
          ` : ''}
          ${admin ? `
          <a href="${CONFIG.BASE}/admin.html" class="px-4 py-3 rounded-lg text-sm font-medium text-[var(--color-cyan)] hover:bg-cyan-500/10 border border-cyan-500/30">
            <i class="fas fa-shield-alt mr-2"></i> Admin
          </a>
          ` : ''}
          <hr class="border-white/10 my-2">
          ${loggedIn ? `
            <button onclick="logout()" class="px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 text-left w-full">
              <i class="fas fa-sign-out-alt mr-2"></i> Cerrar Sesión
            </button>
          ` : `
            <button onclick="showLogin()" class="px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 text-left w-full">
              Iniciar Sesión
            </button>
            <button onclick="showRegister()" class="btn-primary px-4 py-3 rounded-lg text-center mt-2 w-full">
              Registrarse
            </button>
          `}
          <button onclick="showDonationModal()" class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-yellow-400 hover:bg-yellow-500/5 mt-2 border border-yellow-500/10">
            <i class="fas fa-heart text-yellow-500"></i> COLABORAR
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Global Donation Modal -->
  <div id="donation-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 backdrop-blur-md">
    <div class="w-full max-w-md rounded-[2.5rem] border border-yellow-500/30 card-cyber bg-[#0d0d12] overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.1)]">
      <div class="p-8 text-center relative">
        <button onclick="hideDonationModal()" class="absolute top-6 right-6 text-gray-500 hover:text-white transition-all">
          <i class="fas fa-times text-xl"></i>
        </button>
        <div class="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-yellow-500/20">
          <i class="fas fa-heart text-3xl text-yellow-500"></i>
        </div>
        <h3 class="text-2xl font-black text-white uppercase tracking-tighter mb-2">Apoyá al <span class="text-yellow-500">Proyecto</span></h3>
        <p class="text-sm text-gray-400 mb-8">Tu colaboración nos ayuda a seguir creciendo y manteniendo esta plataforma libre.</p>
        
        <div class="grid grid-cols-1 gap-3">
          <!-- Mercado Pago (Active) -->
          <a href="${CONFIG.DONATIONS.MERCADOPAGO}" rel="noopener" target="_blank" class="flex items-center gap-4 p-4 rounded-2xl bg-[#009ee3]/10 border border-[#009ee3]/50 hover:border-[#009ee3] hover:bg-[#009ee3]/20 transition-all group no-underline relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-[#009ee3]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="w-10 h-10 rounded-xl bg-[#009ee3] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,158,227,0.3)] group-hover:scale-110 transition-transform relative z-10">
              <i class="fas fa-wallet text-white"></i>
            </div>
            <div class="text-left flex-1 relative z-10">
              <div class="text-sm font-black text-white uppercase tracking-tight">Mercado Pago</div>
              <div class="text-[10px] text-[#009ee3] font-bold uppercase tracking-wider">¡Donaciones en Pesos!</div>
            </div>
            <div class="relative z-10 flex flex-col items-center">
               <i class="fas fa-external-link-alt text-[#009ee3] transition-transform group-hover:translate-x-1"></i>
            </div>
          </a>

          <!-- Cafecito (Active) -->
          <a href="${CONFIG.DONATIONS.CAFECITO}" rel="noopener" target="_blank" class="flex items-center gap-4 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/50 hover:border-yellow-400 hover:bg-yellow-500/20 transition-all group no-underline relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="w-10 h-10 rounded-xl bg-[#ffdd00] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,221,0,0.3)] group-hover:scale-110 transition-transform relative z-10">
              <i class="fas fa-coffee text-[#333]"></i>
            </div>
            <div class="text-left flex-1 relative z-10">
              <div class="text-sm font-black text-white uppercase tracking-tight">Cafecito</div>
              <div class="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">¡Apoyanos con un café!</div>
            </div>
            <div class="relative z-10 flex flex-col items-center">
               <i class="fas fa-external-link-alt text-yellow-500 transition-transform group-hover:translate-x-1"></i>
            </div>
          </a>

          <!-- PayPal (Disabled) -->
          <div class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 grayscale opacity-30 select-none cursor-not-allowed">
            <div class="w-10 h-10 rounded-xl bg-[#003087] flex items-center justify-center shrink-0">
              <i class="fab fa-paypal text-white"></i>
            </div>
            <div class="text-left flex-1">
              <div class="text-sm font-bold text-white">PayPal</div>
              <div class="text-[10px] text-gray-500 uppercase tracking-widest font-black">Próximamente</div>
            </div>
          </div>

          <!-- Patreon (Disabled) -->
          <div class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 grayscale opacity-30 select-none cursor-not-allowed">
            <div class="w-10 h-10 rounded-xl bg-[#ff424d] flex items-center justify-center shrink-0">
              <i class="fab fa-patreon text-white"></i>
            </div>
            <div class="text-left flex-1">
              <div class="text-sm font-bold text-white">Patreon</div>
              <div class="text-[10px] text-gray-500 uppercase tracking-widest font-black">Próximamente</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;

  document.getElementById('app-header').innerHTML = headerHTML;

  // Mobile toggle
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
      const icon = btn.querySelector('i');
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-times');
    });
  }
}


function showDonationModal() {
  const modal = document.getElementById('donation-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function hideDonationModal() {
  const modal = document.getElementById('donation-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function extractYouTubeId(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = item.match(regex);
    return match ? match[1] : null;
  }
  const searchStrings = [item.youtube_video, item.title, item.description, item.url, item.location];
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
  
  // Agregar loader visual
  let loader = overlay.querySelector('.video-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.className = 'video-loader absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none';
    loader.innerHTML = '<i class="fas fa-circle-notch fa-spin text-4xl text-cyan-500"></i>';
    overlay.appendChild(loader);
  }
  loader.style.display = 'flex';

  // Ocultar loader cuando el iframe cargue
  iframe.onload = () => {
    loader.style.display = 'none';
  };

  if (!iframe.src || iframe.src === 'about:blank') {
    const url = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&rel=0&enablejsapi=1`;
    console.log('[YouTube] Loading:', url);
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    // Use thumbnail as background
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
  footerContainer.className = 'mt-auto border-t border-white/5 bg-[#0d0d12]/80 backdrop-blur-xl py-12 px-4';
  
  const footerHTML = `
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
      <div class="flex flex-col items-center md:items-start gap-4">
        <a href="${CONFIG.BASE}/" class="flex items-center gap-3">
          <img src="${CONFIG.BASE}/img/artedigital.png" alt="Arte Digital" class="w-12 h-12 rounded-xl object-cover grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
          <span class="text-xl font-black gradient-text opacity-70">Arte Digital Data</span>
        </a>
        <p class="text-gray-500 text-xs text-center md:text-left max-w-xs">
          La red social definitiva para artistas digitales, músicos y diseñadores. 
          Unite a la revolución creativa.
        </p>
      </div>

      <div class="flex flex-wrap justify-center gap-4">
        <a href="https://chat.whatsapp.com/FaIpZjZFVT49gzfUKqKuHN" target="_blank" class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all font-bold text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(37,211,102,0.1)]">
          <i class="fab fa-whatsapp text-lg"></i> WhatsApp
        </a>
        <a href="https://discord.gg/sapq5a58" target="_blank" class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20 hover:bg-[#5865F2]/20 transition-all font-bold text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(88,101,242,0.1)]">
          <i class="fab fa-discord text-lg"></i> Discord
        </a>
        <a href="https://github.com/jpupper/artedigitaldata" target="_blank" class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all font-bold text-sm uppercase tracking-widest">
          <i class="fab fa-github text-lg"></i> Github
        </a>
      </div>

      <div class="flex flex-col items-center md:items-end gap-2 text-gray-600">
        <a href="https://fullscreencode.com" target="_blank" class="text-[10px] font-black uppercase tracking-[0.2em] hover:text-cyan-400 transition-colors">Desarrollado por FullScreenCode</a>
        <div class="flex gap-4 text-sm">
          <a href="#" class="hover:text-cyan-500 transition-colors">Terminos</a>
          <a href="#" class="hover:text-magenta-500 transition-colors">Privacidad</a>
        </div>
      </div>
    </div>
  `;
  
  footerContainer.innerHTML = footerHTML;
  document.body.appendChild(footerContainer);
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
});

