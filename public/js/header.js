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
            <a href="${CONFIG.BASE}/login.html" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-[var(--color-cyan)] hover:bg-white/5 transition-all">
              Iniciar Sesión
            </a>
            <a href="${CONFIG.BASE}/register.html" class="btn-primary px-5 py-2 rounded-lg text-sm transition-all">
              Registrarse
            </a>
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
            <a href="${CONFIG.BASE}/login.html" class="px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5">
              Iniciar Sesión
            </a>
            <a href="${CONFIG.BASE}/register.html" class="btn-primary px-4 py-3 rounded-lg text-center mt-2">
              Registrarse
            </a>
          `}
        </div>
      </div>
    </div>
  </header>
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

document.addEventListener('DOMContentLoaded', renderHeader);
