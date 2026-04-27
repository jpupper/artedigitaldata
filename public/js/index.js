document.addEventListener('DOMContentLoaded', async () => {
  const heroCta = document.getElementById('hero-cta');
  if (!isLoggedIn()) {
    heroCta.innerHTML = `
      <div class="mt-6">
        <button onclick="showRegister()" class="btn-primary inline-block text-black font-bold px-8 py-3 rounded-xl text-lg transition-all hover:scale-105">
          <i class="fas fa-rocket mr-2"></i>Únete Ahora
        </button>
      </div>`;
  }
  await Promise.all([loadPinnedEvents(), loadFeed()]);
  renderContestPin();
});

async function loadPinnedEvents() {
  try {
    const res = await fetch(CONFIG.API_URL + '/eventos/pinned/list');
    if (!res.ok) throw new Error('Error loading pinned events');
    const pinnedEvents = await res.json();
    if (pinnedEvents.length > 0) {
      document.getElementById('pinned-section').classList.remove('hidden');
      renderPinnedEvents(pinnedEvents);
    }
  } catch (err) {
    console.error('Error loading pinned events:', err);
  }
}

function renderContestPin() {
  const container = document.getElementById('pinned-container');
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const now = new Date();
  const currentMonthDisplay = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const pinHTML = `
    <div class="group rounded-2xl overflow-hidden border-2 border-yellow-500/30 bg-[#0d0d12]/80 backdrop-blur-xl transition-all duration-500 hover:border-yellow-500/60 hover:shadow-[0_0_30px_rgba(234,179,8,0.2)] flex flex-col h-full card-cyber relative">
      <div class="absolute top-3 right-3 z-20">
        <span class="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-wider border border-yellow-500/30">
          <i class="fas fa-trophy mr-1"></i>CONCURSO ACTIVO
        </span>
      </div>
      <div class="relative aspect-video overflow-hidden">
        <a href="concurso.html" class="block w-full h-full relative">
          <img src="img/artedigital.png" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-50">
          <div class="absolute inset-0 flex items-center justify-center">
             <i class="fas fa-trophy text-6xl text-yellow-500 animate-pulse"></i>
          </div>
        </a>
      </div>
      <div class="p-5 flex-1 flex flex-col">
        <div class="flex items-center gap-2 mb-3">
          <span class="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-lg text-xs font-bold uppercase tracking-wider">
            ${currentMonthDisplay}
          </span>
        </div>
        <h3 class="text-xl font-black text-white mb-2 leading-tight group-hover:text-yellow-500 transition-colors">
          Concurso Mensual de Arte Digital
        </h3>
        <p class="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
          ¡Participá con tu mejor obra y convertite en el artista del mes! Subí tu imagen y sumá votos de la comunidad.
        </p>
        <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
           <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Organizado por Arte Digital Data</span>
           <a href="concurso.html" class="px-5 py-2 rounded-lg bg-yellow-500 text-black text-xs font-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              PARTICIPAR <i class="fas fa-chevron-right ml-1"></i>
           </a>
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('afterbegin', pinHTML);
  document.getElementById('pinned-section').classList.remove('hidden');
}

function renderPinnedEvents(events) {
  const container = document.getElementById('pinned-container');
  container.innerHTML = events.map(ev => {
    const youtubeId = extractYouTubeId(ev);
    const userIsAdmin = isAdmin();
    return `
      <div class="group rounded-2xl overflow-hidden border-2 border-cyan-500/30 bg-[#0d0d12]/80 backdrop-blur-xl transition-all duration-500 hover:border-cyan-500/60 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col h-full card-cyber relative">
        ${userIsAdmin ? `
          <div class="absolute top-3 right-3 z-20">
            <button onclick="unpinEvent('${ev._id}')" class="w-8 h-8 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center" title="Despinnar evento">
              <i class="fas fa-thumbtack transform rotate-45 text-xs"></i>
            </button>
          </div>
        ` : `
          <div class="absolute top-3 right-3 z-20">
            <span class="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-wider border border-cyan-500/30">
              <i class="fas fa-thumbtack mr-1"></i>DESTACADO
            </span>
          </div>
        `}
        <div class="relative aspect-video overflow-hidden">
          <div class="block w-full h-full relative cursor-pointer"
               ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
               onclick="window.location.href='evento.html?id=${ev._id}'"
            ${ev.imageUrl ? `
              <img src="${sanitizeUrl(ev.imageUrl)}" alt="${escapeHTML(ev.title)}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
            ` : `
              <div class="w-full h-full bg-cyan-500/10 flex items-center justify-center">
                <i class="fas fa-calendar-alt text-4xl text-cyan-500/30"></i>
              </div>
            `}
            ${youtubeId ? `
              <div class="video-overlay absolute inset-0 opacity-0 pointer-events-none z-10">
                <iframe class="w-full h-full" src="" frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen></iframe>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex items-center gap-2 mb-3">
            <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold uppercase tracking-wider">
              ${new Date(ev.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
            </span>
            <span class="text-xs text-gray-500">${new Date(ev.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>
          </div>
          <h3 class="text-lg font-black text-white mb-2 leading-tight group-hover:text-cyan-400 transition-colors line-clamp-1">
            ${escapeHTML(ev.title)}
          </h3>
          <p class="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
            ${formatMentions(ev.description) || 'Sin descripción'}
          </p>
          <div class="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <i class="fas fa-map-marker-alt text-cyan-500"></i>
            <span class="truncate">${escapeHTML(ev.location || 'Virtual')}</span>
          </div>
          <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center">
                ${ev.creator?.avatar ? `
                  <img src="${sanitizeUrl(ev.creator.avatar)}" alt="${escapeHTML(ev.creator.username)}" class="w-full h-full object-cover">
                ` : `
                  <span class="text-[10px] font-bold text-gray-500">${escapeHTML((ev.creator?.username || '?')[0].toUpperCase())}</span>
                `}
              </div>
              <span class="text-xs font-bold text-gray-400">${escapeHTML(ev.creator?.username || 'Anónimo')}</span>
            </div>
            ${ev.ticketConfig?.enabled ? `
              <a href="ticket-purchase?event=${ev._id}" class="group relative flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-magenta-500 to-fuchsia-500 text-white text-xs font-bold hover:scale-105 transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] overflow-hidden">
                <span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
                <i class="fas fa-ticket-alt"></i>
                ${ev.ticketConfig.price === 0 ? 'RESERVAR' : 'COMPRAR'}
              </a>
            ` : `
              <a href="evento.html?id=${ev._id}" class="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold hover:bg-cyan-500 hover:text-black transition-all">
                Ver Evento <i class="fas fa-arrow-right ml-1"></i>
              </a>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function unpinEvent(eventId) {
  if (!confirm('¿Despinnar este evento?')) return;
  try {
    const res = await apiRequest(`/eventos/${eventId}/unpin`, { method: 'POST' });
    if (res.ok) {
      await loadPinnedEvents();
      const pinnedContainer = document.getElementById('pinned-container');
      if (pinnedContainer.children.length === 0) {
        document.getElementById('pinned-section').classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Error unpinning event:', err);
    alert('Error al despinnar el evento');
  }
}

async function pinEventFromFeed(eventId) {
  if (!confirm('¿Pinnar este evento como destacado?')) return;
  try {
    const res = await apiRequest(`/eventos/${eventId}/pin`, { method: 'POST' });
    if (res.ok) {
      await Promise.all([loadPinnedEvents(), loadFeed()]);
      document.getElementById('pinned-section').classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error pinning event:', err);
    alert('Error al pinear el evento');
  }
}

let allFeedItems = [];
let activeFilters = { post: true, recurso: true, evento: true };

function updateFilterStyles() {
  const colors = { post: 'cyan', recurso: 'orange', evento: 'fuchsia' };
  Object.keys(activeFilters).forEach(type => {
    const btn = document.getElementById(`filter-${type}`);
    if (activeFilters[type]) {
      btn.classList.remove('text-gray-500', 'bg-white/5', 'border-white/10');
      btn.classList.add(`text-${colors[type]}-400`, `bg-${colors[type]}-500/10`, `border-${colors[type]}-500/40`, 'shadow-[0_0_15px_rgba(0,0,0,0.3)]');
    } else {
      btn.classList.add('text-gray-500', 'bg-white/5', 'border-white/10');
      btn.classList.remove('text-cyan-400', 'bg-cyan-500/10', 'border-cyan-500/40', 'text-orange-400', 'bg-orange-500/10', 'border-orange-500/40', 'text-fuchsia-400', 'bg-fuchsia-500/10', 'border-fuchsia-500/40', 'shadow-[0_0_15px_rgba(0,0,0,0.3)]');
    }
  });
}

function toggleFilter(type) {
  activeFilters[type] = !activeFilters[type];
  if (!activeFilters.post && !activeFilters.recurso && !activeFilters.evento) {
    activeFilters = { post: true, recurso: true, evento: true };
  }
  updateFilterStyles();
  renderFeed();
}

async function loadFeed() {
  const container = document.getElementById('feed-container');
  try {
    const [postsRes, recursosRes, eventosRes] = await Promise.all([
      fetch(CONFIG.API_URL + '/posts'),
      fetch(CONFIG.API_URL + '/recursos'),
      fetch(CONFIG.API_URL + '/eventos')
    ]);

    if (!postsRes.ok || !recursosRes.ok || !eventosRes.ok) {
      throw new Error('Error al cargar el feed.');
    }

    const [posts, recursos, eventos] = await Promise.all([
      postsRes.json(),
      recursosRes.json(),
      eventosRes.json()
    ]);

    allFeedItems = [
      ...posts.map(p => ({ ...p, feedType: 'post' })),
      ...recursos.map(r => ({ ...r, feedType: 'recurso' })),
      ...eventos.map(e => ({ ...e, feedType: 'evento' }))
    ].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    updateFilterStyles();
    renderFeed();
  } catch (err) {
    console.error('Error cargando el feed:', err);
    container.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">
      <i class="fas fa-exclamation-triangle mb-2"></i><br>
      Error cargando el feed. Intenta recargar la página.
    </div>`;
  }
}

function renderFeed() {
  const container = document.getElementById('feed-container');
  const filtered = allFeedItems.filter(item => activeFilters[item.feedType]);

  if (!filtered.length) {
    container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-20 px-8 bg-white/5 rounded-3xl border border-dashed border-white/10">
      <i class="fas fa-search text-4xl mb-4 opacity-20"></i>
      <p class="text-xl">No hay publicaciones para los filtros seleccionados</p>
    </div>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const type = item.feedType;
    const isPost = type === 'post';
    const isRecurso = type === 'recurso';
    const isEvento = type === 'evento';

    const link = isPost ? `post.html?id=${item._id}` :
                 (isRecurso ? `recurso.html?id=${item._id}` : `evento.html?id=${item._id}`);

    const accentColor = isPost ? 'cyan' : (isRecurso ? 'orange' : 'fuchsia');
    const badgeText = isPost ? 'OBRA' : (isRecurso ? 'RECURSO' : 'EVENTO');
    const author = item.author || item.creator || { username: 'Anónimo' };
    const date = new Date(item.createdAt || item.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const youtubeId = extractYouTubeId(item);

    return `
      <div class="group rounded-[2rem] overflow-hidden border border-white/5 bg-[#0d0d12]/60 hover:bg-[#0d0d12]/80 backdrop-blur-xl transition-all duration-500 hover:border-${accentColor}-500/30 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col h-full card-cyber">
        <div class="relative aspect-video overflow-hidden">
          <a href="${link}" class="block w-full h-full relative"
               ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}>
            ${item.imageUrl ? `
              <img src="${sanitizeUrl(item.imageUrl)}" alt="${escapeHTML(item.title)}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
            ` : `
              <div class="w-full h-full bg-white/5 flex items-center justify-center cursor-pointer">
                <i class="fas fa-${isPost ? 'palette' : (isEvento ? 'calendar-alt' : (item.type === 'texto' ? 'file-alt' : (item.type === 'software' ? 'desktop' : (item.type === 'tutorial' ? 'graduation-cap' : 'box-open'))))} text-3xl text-gray-700"></i>
              </div>
            `}
            ${youtubeId ? `
              <div class="video-overlay absolute inset-0 opacity-0 pointer-events-none z-10">
                <iframe class="w-full h-full" src="" frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen></iframe>
              </div>
            ` : ''}
          </a>
          <div class="absolute top-4 right-4 z-10 flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-[10px] font-black border border-${accentColor}-500/30 bg-black/60 text-${accentColor}-400 backdrop-blur-md uppercase tracking-widest">
              ${badgeText}
            </span>
            ${isEvento && isAdmin() && !item.pinned ? `
            <button onclick="event.stopPropagation(); pinEventFromFeed('${item._id}')" class="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center" title="Pinnar evento destacado">
              <i class="fas fa-thumbtack text-[10px] transform rotate-45"></i>
            </button>
            ` : ''}
          </div>
        </div>
        <div class="p-6 flex-1 flex flex-col">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-inner bg-white/5">
                ${author.avatar ? `
                  <img src="${sanitizeUrl(author.avatar)}" alt="${escapeHTML(author.username)}" class="w-full h-full object-cover">
                ` : `
                  <div class="w-full h-full flex items-center justify-center text-xs font-bold bg-white/5 text-gray-500">
                    ${escapeHTML((author.username || '?')[0].toUpperCase())}
                  </div>
                `}
              </div>
              <div>
                <a href="profile?user=${encodeURIComponent(author.username)}" class="block text-sm font-bold text-white hover:text-${accentColor}-400 transition-colors">
                  ${escapeHTML(author.username)}
                </a>
                <span class="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">${date}</span>
              </div>
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-black text-white mb-2 leading-tight group-hover:text-${accentColor}-400 transition-colors line-clamp-1">
              ${(item.title && (item.title.includes('youtube.com') || item.title.includes('youtu.be'))) ? `
                <a href="${sanitizeUrl(item.title)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-600/10 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border border-red-500/20 hover:bg-red-600/20 transition-all cursor-alias">
                  <i class="fab fa-youtube text-xs"></i> Ver Video
                </a>
              ` : `<a href="${link}" class="hover:text-${accentColor}-400 transition-colors">${escapeHTML(item.title)}</a>`}
            </h3>
            <p class="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
              ${formatMentions(item.description)}
            </p>
          </div>
          <div class="flex items-center justify-between pt-4 border-t border-white/5">
            <div class="flex items-center gap-4">
              <button onclick="toggleFeedLike(event, '${item._id}', '${item.feedType}')" class="flex items-center gap-1.5 text-xs font-bold transition-colors ${(item.likes || []).includes(getUserId()) ? 'text-red-500' : 'text-gray-500 hover:text-cyan-400'}">
                <i class="${(item.likes || []).includes(getUserId()) ? 'fas' : 'far'} fa-heart"></i>
                <span class="like-count">${item.likes?.length || 0}</span>
              </button>
              <a href="${link}" class="flex items-center gap-1.5 text-xs text-gray-500 font-bold hover:text-magenta-400 transition-colors">
                <i class="fas fa-comment"></i> ${item.comments?.length || 0}
              </a>
            </div>
            <a href="${link}" class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-${accentColor}-500 hover:text-black transition-all">
              <i class="fas fa-arrow-right text-xs"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function toggleFeedLike(event, id, type) {
  event.preventDefault();
  if (!isLoggedIn()) {
    alert('Inicia sesión para dar like');
    return;
  }
  const endpoint = type === 'post' ? `/posts/${id}/like` :
                   (type === 'recurso' ? `/recursos/${id}/like` : `/eventos/${id}/like`);
  const btn = event.currentTarget;
  const icon = btn.querySelector('i');
  const countSpan = btn.querySelector('.like-count');
  try {
    const res = await apiRequest(endpoint, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const userId = getUserId();
      const isLiked = data.likes.includes(userId);
      icon.className = `${isLiked ? 'fas' : 'far'} fa-heart`;
      btn.className = `flex items-center gap-1.5 text-xs font-bold transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-cyan-400'}`;
      countSpan.innerText = data.likes.length;
    }
  } catch (err) {
    console.error(err);
  }
}
