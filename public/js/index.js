document.addEventListener('DOMContentLoaded', async () => {
  const heroCta = document.getElementById('hero-cta');
  if (heroCta && !isLoggedIn()) {
    heroCta.innerHTML = `
      <div class="mt-6">
        <button onclick="showRegister()" class="btn-primary inline-block text-black font-bold px-8 py-3 rounded-xl text-lg transition-all hover:scale-105">
          <i class="fas fa-rocket mr-2"></i>Únete Ahora
        </button>
      </div>`;
  }
  await loadFeed();
});

let allFeedItems = [];
let activeFilters = { post: true, recurso: true, evento: true };

window.updateFilterStyles = function() {
  const colors = { post: 'cyan', recurso: 'orange', evento: 'fuchsia' };
  Object.keys(activeFilters).forEach(type => {
    const btn = document.getElementById(`filter-${type}`);
    if (btn) {
      if (activeFilters[type]) {
        btn.classList.remove('text-gray-500', 'bg-white/5', 'border-white/10');
        btn.classList.add(`text-${colors[type]}-400`, `bg-${colors[type]}-500/10`, `border-${colors[type]}-500/40`, 'shadow-[0_0_15px_rgba(0,0,0,0.3)]');
      } else {
        btn.classList.add('text-gray-500', 'bg-white/5', 'border-white/10');
        btn.classList.remove(`text-cyan-400`, `bg-cyan-500/10`, `border-cyan-500/40`, `text-orange-400`, `bg-orange-500/10`, `border-orange-500/40`, `text-fuchsia-400`, `bg-fuchsia-500/10`, `border-fuchsia-500/40`, 'shadow-[0_0_15px_rgba(0,0,0,0.3)]');
      }
    }
  });
};

window.toggleFilter = function(type) {
  activeFilters[type] = !activeFilters[type];
  
  // If none active, show all (optional, or keep blank)
  if (!activeFilters.post && !activeFilters.recurso && !activeFilters.evento) {
    activeFilters = { post: true, recurso: true, evento: true };
  }
  
  updateFilterStyles();
  renderFeed();
};

window.loadFeed = async function() {
  const container = document.getElementById('feed-container');
  try {
    console.log("[Feed] Loading feed from:", CONFIG.API_URL);
    const [postsRes, recursosRes, eventosRes] = await Promise.all([
      fetch(CONFIG.API_URL + '/posts'),
      fetch(CONFIG.API_URL + '/recursos'),
      fetch(CONFIG.API_URL + '/eventos')
    ]);
    
    // Debugging logs to identify which one is returning HTML
    const responses = [
      { name: 'posts', res: postsRes },
      { name: 'recursos', res: recursosRes },
      { name: 'eventos', res: eventosRes }
    ];

    for (const item of responses) {
      const contentType = item.res.headers.get("content-type");
      console.log(`[Feed] Response for ${item.name}:`, {
        status: item.res.status,
        ok: item.res.ok,
        contentType: contentType
      });

      if (!item.res.ok || !contentType || !contentType.includes("application/json")) {
        const bodyText = await item.res.text();
        console.error(`[Feed] Error in ${item.name}: Server returned ${item.res.status} with content-type ${contentType}. First 100 chars:`, bodyText.substring(0, 100));
        throw new Error(`Error en ${item.name}: El servidor no devolvió JSON.`);
      }
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
    console.error("[Feed] loadFeed error:", err);
    if (container) {
      container.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">
        <i class="fas fa-exclamation-triangle mb-2"></i><br>
        Error cargando el feed: ${err.message}
      </div>`;
    }
  }
};

window.renderFeed = function() {
  const container = document.getElementById('feed-container');
  const filtered = allFeedItems.filter(item => activeFilters[item.feedType]);

  if (!container) return;

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

    const link = isPost ? `${CONFIG.BASE}/post.html?id=${item._id}` : 
                 (isRecurso ? `${CONFIG.BASE}/recurso.html?id=${item._id}` : `${CONFIG.BASE}/evento.html?id=${item._id}`);
    
    const accentColor = isPost ? 'cyan' : (isRecurso ? 'orange' : 'fuchsia');
    const badgeText = isPost ? 'OBRA' : (isRecurso ? 'RECURSO' : 'EVENTO');
    const author = item.author || item.creator || { username: 'Anónimo' };
    const date = new Date(item.createdAt || item.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    const youtubeId = extractYouTubeId(item);

    return `
      <div class="group rounded-[2rem] overflow-hidden border border-white/5 bg-[#0d0d12]/60 hover:bg-[#0d0d12]/80 backdrop-blur-xl transition-all duration-500 hover:border-${accentColor}-500/30 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col h-full card-cyber">
        <!-- Image Container -->
        <div class="relative aspect-video overflow-hidden">
          <div class="block w-full h-full relative cursor-pointer" 
               ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
               onclick="window.location.href='${link}'">
            ${item.imageUrl ? `
              <img src="${item.imageUrl}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
            ` : `
              <div class="w-full h-full bg-white/5 flex items-center justify-center">
                <i class="fas fa-${isPost ? 'palette' : (isEvento ? 'calendar-alt' : (item.type === 'texto' ? 'file-alt' : (item.type === 'software' ? 'desktop' : (item.type === 'tutorial' ? 'graduation-cap' : 'box-open'))))} text-3xl text-gray-700"></i>
              </div>
            `}
            
            ${youtubeId ? `
              <div class="video-overlay absolute inset-0 opacity-0 pointer-events-none z-10">
                <iframe class="w-full h-full" 
                        src="" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen></iframe>
              </div>
            ` : ''}
          </div>
          <div class="absolute top-4 right-4 z-10">
             <span class="px-3 py-1 rounded-full text-[10px] font-black border border-${accentColor}-500/30 bg-black/60 text-${accentColor}-400 backdrop-blur-md uppercase tracking-widest">
              ${badgeText}
             </span>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 flex-1 flex flex-col">
          <!-- Author Header -->
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-inner bg-white/5">
                ${author.avatar ? `
                  <img src="${author.avatar}" alt="${author.username}" class="w-full h-full object-cover">
                ` : `
                  <div class="w-full h-full flex items-center justify-center text-xs font-bold bg-white/5 text-gray-500">
                    ${(author.username || '?')[0].toUpperCase()}
                  </div>
                `}
              </div>
              <div>
                <a href="${CONFIG.BASE}/profile.html?user=${author.username}" class="block text-sm font-bold text-white hover:text-${accentColor}-400 transition-colors">
                  ${author.username}
                </a>
                <span class="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">${date}</span>
              </div>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1">
            <h3 class="text-xl font-black text-white mb-2 leading-tight group-hover:text-${accentColor}-400 transition-colors line-clamp-1">
              ${(item.title && (item.title.includes('youtube.com') || item.title.includes('youtu.be'))) ? `
                <a href="${item.title}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-600/10 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border border-red-500/20 hover:bg-red-600/20 transition-all cursor-alias">
                  <i class="fab fa-youtube text-xs"></i> Ver Video
                </a>
              ` : item.title}
            </h3>
            <p class="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
              ${formatMentions(item.description)}
            </p>
          </div>

          <!-- Footer -->
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
};

window.toggleFeedLike = async function(event, id, type) {
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
};
