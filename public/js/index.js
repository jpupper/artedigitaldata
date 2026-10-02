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
  paintExternalSwitch();
  if (window.ExternalData && ExternalData.enabled() && ExternalData.canUse()) {
    await loadExternal();
  }
});

async function loadPinnedEvents() {
  try {
    let pinnedItems = [];
    try {
      const res = await fetch(CONFIG.API_URL + '/posteos/pinned/list');
      if (res.ok) pinnedItems = await res.json();
    } catch {
      const res = await fetch(CONFIG.API_URL + '/eventos/pinned/list');
      if (res.ok) pinnedItems = await res.json();
    }

    if (pinnedItems && pinnedItems.length > 0) {
      document.getElementById('pinned-section').classList.remove('hidden');
      renderPinnedEvents(pinnedItems);
    } else {
      document.getElementById('pinned-section').classList.add('hidden');
    }
  } catch (err) {
    console.error('Error loading pinned items:', err);
  }
}

function renderPinnedEvents(events) {
  const container = document.getElementById('pinned-container');
  container.innerHTML = events.map(ev => {
    const youtubeId = extractYouTubeId(ev);
    const userIsAdmin = isAdmin();
    const isEvento = ev.feedType === 'evento' || (!ev.feedType && ev.date);
    const isOportunidad = ev.feedType === 'oportunidad' || ev.tipo;
    const isPost = ev.feedType === 'post' || (!ev.feedType && !ev.url && !ev.date && !ev.tipo);
    const isRecurso = ev.feedType === 'recurso' || ev.url;
    
    const link = isPost ? `post.html?id=${ev._id}` :
                 (isRecurso ? `recurso.html?id=${ev._id}` : 
                 (isEvento ? `evento.html?id=${ev._id}` : `oportunidad.html?id=${ev._id}`));

    const accentColor = isPost ? 'cyan' : (isRecurso ? 'lime' : (isEvento ? 'fuchsia' : 'gold'));
    const badgeText = isPost ? 'OBRA DESTACADA' : (isRecurso ? 'RECURSO DESTACADO' : (isEvento ? 'EVENTO DESTACADO' : 'DESTACADO'));
    const title = ev.title || ev.titulo || 'Sin título';
    const description = ev.description || ev.descripcion || '';
    const author = ev.author || ev.creator || ev.creador || { username: 'Anónimo' };
    const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : (ev.createdAt ? new Date(ev.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '');
    const imgUrl = ev.imageUrl || ev.imagenUrl;
    const typeKey = ev.feedType || (isEvento ? 'evento' : (isOportunidad ? 'oportunidad' : (isRecurso ? 'recurso' : 'post')));

    return `
      <div class="group rounded-2xl overflow-hidden border-2 border-${accentColor}-500/30 bg-[#0d0d12]/80 backdrop-blur-xl transition-all duration-500 hover:border-${accentColor}-500/60 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col h-full card-cyber relative">
        ${userIsAdmin ? `
          <div class="absolute top-3 right-3 z-20">
            <button onclick="unpinItem('${ev._id}', '${typeKey}')" class="w-8 h-8 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center" title="Despinnar posteo">
              <i class="fas fa-thumbtack transform rotate-45 text-xs"></i>
            </button>
          </div>
        ` : `
          <div class="absolute top-3 right-3 z-20">
            <span class="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-wider border border-purple-500/40 backdrop-blur-md">
              <i class="fas fa-thumbtack animated-violet-pin mr-1"></i>${badgeText}
            </span>
          </div>
        `}
        <div class="relative aspect-video overflow-hidden">
          <div class="block w-full h-full relative cursor-pointer"
               ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
               onclick="window.location.href='${link}'">
            ${imgUrl ? `
              <img src="${sanitizeUrl(imgUrl)}" alt="${escapeHTML(title)}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
            ` : `
              <div class="w-full h-full bg-cyan-500/10 flex items-center justify-center">
                <i class="fas fa-${isPost ? 'palette' : (isEvento ? 'calendar-alt' : (isOportunidad ? 'briefcase' : 'box-open'))} text-4xl text-cyan-500/30"></i>
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
          ${dateStr ? `
          <div class="flex items-center gap-2 mb-3">
            <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold uppercase tracking-wider">
              ${dateStr}
            </span>
            ${ev.date ? `<span class="text-xs text-gray-500">${new Date(ev.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>` : ''}
          </div>
          ` : ''}
          <h3 class="text-lg font-black text-white mb-2 leading-tight group-hover:text-cyan-400 transition-colors line-clamp-1">
            ${escapeHTML(title)}
          </h3>
          <p class="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
            ${formatMentions(description) || 'Sin descripción'}
          </p>
          ${isEvento ? `
          <div class="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <i class="fas fa-map-marker-alt text-cyan-500"></i>
            <span class="truncate">${escapeHTML(ev.location || 'Virtual')}</span>
          </div>
          ` : ''}
          <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center">
                ${window.GenerativeAvatar
                  ? window.GenerativeAvatar.markup(author, { className: 'w-full h-full object-cover' })
                  : `<span class="text-[10px] font-bold text-gray-500">${escapeHTML((author.username || '?')[0].toUpperCase())}</span>`}
              </div>
              <span class="text-xs font-bold text-gray-400">${escapeHTML(author.username || 'Anónimo')}</span>
            </div>
            ${ev.ticketConfig?.enabled ? `
              <a href="ticket-purchase?event=${ev._id}" class="group relative flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-magenta-500 to-fuchsia-500 text-white text-xs font-bold hover:scale-105 transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] overflow-hidden">
                <span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
                <i class="fas fa-ticket-alt"></i>
                ${ev.ticketConfig.price === 0 ? 'RESERVAR' : 'COMPRAR'}
              </a>
            ` : `
              <a href="${link}" class="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold hover:bg-cyan-500 hover:text-black transition-all">
                Ver más <i class="fas fa-arrow-right ml-1"></i>
              </a>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function unpinItem(itemId, type) {
  if (!confirm('¿Despinnar este posteo?')) return;
  try {
    const endpoint = type === 'evento' ? `/eventos/${itemId}/unpin` : `/posteos/${type}/${itemId}/unpin`;
    const res = await apiRequest(endpoint, { method: 'POST' });
    if (res.ok) {
      await loadPinnedEvents();
      const pinnedContainer = document.getElementById('pinned-container');
      if (pinnedContainer.children.length === 0) {
        document.getElementById('pinned-section').classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Error unpinning item:', err);
    alert('Error al despinnar el posteo');
  }
}

async function pinItemFromFeed(itemId, type) {
  if (!confirm('¿Pinnar este posteo como destacado?')) return;
  try {
    const endpoint = type === 'evento' ? `/eventos/${itemId}/pin` : `/posteos/${type}/${itemId}/pin`;
    const res = await apiRequest(endpoint, { method: 'POST' });
    if (res.ok) {
      await Promise.all([loadPinnedEvents(), loadFeed()]);
      document.getElementById('pinned-section').classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error pinning item:', err);
    alert('Error al pinear el posteo');
  }
}


let allFeedItems = [];
let activeFilters = { post: true, recurso: true, evento: true, oportunidad: true };
let showBotsOnly = false;

// ── Data Externa ─────────────────────────────────────────────────────────────
// Internal = lo que vive en la base de datos de artedigitaldata (allFeedItems).
// External = las creaciones del MISMO usuario en el resto del ecosistema FSC,
// indexadas con el fan-out de fscauth. El switch arranca APAGADO.
let externalApps = [];
let externalItems = [];

function toggleHumanAI() {
  showBotsOnly = !showBotsOnly;
  const btn = document.getElementById('filter-human-ai');
  if (btn) {
    if (showBotsOnly) {
      btn.innerHTML = '<i class="fas fa-robot text-sm"></i>';
      btn.className = 'w-9 h-9 rounded-xl border border-purple-500/40 bg-purple-500/20 text-purple-400 flex items-center justify-center transition-all hover:scale-105 hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] shrink-0';
      btn.title = 'Mostrando contenido IA (Click para cambiar a Humanos)';
    } else {
      btn.innerHTML = '<i class="fas fa-user text-sm"></i>';
      btn.className = 'w-9 h-9 rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-all hover:scale-105 hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0';
      btn.title = 'Mostrando contenido Humano (Click para cambiar a IA)';
    }
  }
  renderFeed();
}

function updateFilterStyles() {
  const colorClasses = {
    post: 'filter-post',
    recurso: 'filter-recurso',
    evento: 'filter-evento',
    oportunidad: 'filter-oportunidad'
  };
  
  Object.keys(activeFilters).forEach(type => {
    const btn = document.getElementById(`filter-${type}`);
    // Remover clase active de todos
    btn.classList.remove('active');
    
    if (activeFilters[type]) {
      // Agregar la clase active correspondiente
      btn.classList.add('active');
    }
  });
}

function toggleFilter(type) {
  activeFilters[type] = !activeFilters[type];
  // Si todos están desactivados, reactivar todos
  const anyActive = Object.values(activeFilters).some(v => v);
  if (!anyActive) {
    activeFilters = { post: true, recurso: true, evento: true, oportunidad: true };
  }
  updateFilterStyles();
  renderFeed();

  // Impulso orbital cósmico al interactuar
  const sunDisc = document.querySelector('.sun-disc');
  if (sunDisc) {
    sunDisc.style.transform = 'scale(1.1)';
    setTimeout(() => { sunDisc.style.transform = ''; }, 350);
  }
}

async function loadFeed() {
  const container = document.getElementById('feed-container');
  try {
    const [postsRes, recursosRes, eventosRes, oportunidadesRes] = await Promise.all([
      fetch(CONFIG.API_URL + '/posts'),
      fetch(CONFIG.API_URL + '/recursos'),
      fetch(CONFIG.API_URL + '/eventos'),
      fetch(CONFIG.API_URL + '/oportunidades')
    ]);

    if (!postsRes.ok || !recursosRes.ok || !eventosRes.ok || !oportunidadesRes.ok) {
      throw new Error('Error al cargar el feed.');
    }

    const [posts, recursos, eventos, oportunidades] = await Promise.all([
      postsRes.json(),
      recursosRes.json(),
      eventosRes.json(),
      oportunidadesRes.json()
    ]);

    allFeedItems = [
      ...posts.map(p => ({ ...p, feedType: 'post' })),
      ...recursos.map(r => ({ ...r, feedType: 'recurso' })),
      ...eventos.map(e => ({ ...e, feedType: 'evento' })),
      ...oportunidades.map(o => ({ ...o, feedType: 'oportunidad' }))
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
  const filtered = allFeedItems.filter(item => activeFilters[item.feedType])
    .filter(item => {
      const hasAutobotTag = (item.tags || []).includes('autobotadd');
      if (!showBotsOnly) return !hasAutobotTag;
      return hasAutobotTag;
    });

  // Data Externa: se mezclan las creaciones del resto del ecosistema con el feed propio.
  // En modo IA (solo bots) no aplica: lo externo es contenido humano de otras apps.
  const mixExt = (window.ExternalData && ExternalData.enabled() && !showBotsOnly) ? externalItems : [];
  const mixed = interleave(filtered, mixExt);

  if (!mixed.length) {
    container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-20 px-8 bg-white/5 rounded-3xl border border-dashed border-white/10">
      <i class="fas fa-search text-4xl mb-4 opacity-20"></i>
      <p class="text-xl">No hay publicaciones para los filtros seleccionados</p>
    </div>`;
    return;
  }

  container.innerHTML = mixed.map(item => {
    if (item.feedType === 'externo') return renderExternalCard(item);
    const type = item.feedType;
    const isPost = type === 'post';
    const isRecurso = type === 'recurso';
    const isEvento = type === 'evento';
    const isOportunidad = type === 'oportunidad';

    const link = isPost ? `post.html?id=${item._id}` :
                 (isRecurso ? `recurso.html?id=${item._id}` : 
                 (isEvento ? `evento.html?id=${item._id}` : `oportunidad.html?id=${item._id}`));

    const accentColor = isPost ? 'cyan' : (isRecurso ? 'lime' : (isEvento ? 'fuchsia' : 'gold'));
    const badgeText = isPost ? 'OBRA' : (isRecurso ? 'RECURSO' : (isEvento ? 'EVENTO' : 'OPORTUNIDAD'));
    const subcategoria = isOportunidad ? (item.tipo === 'convocatoria_obra' ? 'Convocatoria de Obra' : item.tipo === 'oportunidad_laboral' ? 'Oportunidad Laboral' : 'Colaboración') : '';
    const authorObj = (typeof item.author === 'object' && item.author?.username) ? item.author : 
                      ((typeof item.creator === 'object' && item.creator?.username) ? item.creator : 
                      ((typeof item.creador === 'object' && item.creador?.username) ? item.creador : { username: 'Anónimo', avatar: '' }));
    const author = authorObj;
    const title = item.title || item.titulo || 'Sin título';
    const description = item.description || item.descripcion || '';
    const date = new Date(item.createdAt || item.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const youtubeId = extractYouTubeId(item);

    const imgUrl = item.imageUrl || item.imagenUrl;

    return `
      <div class="group rounded-[2rem] overflow-hidden border border-white/5 bg-[#0d0d12]/60 hover:bg-[#0d0d12]/80 backdrop-blur-xl transition-all duration-500 hover:border-${accentColor}-500/30 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col h-full card-cyber">
        <div class="relative aspect-video overflow-hidden">
          <a href="${link}" class="block w-full h-full relative"
               ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}>
            ${imgUrl ? `
              <img src="${sanitizeUrl(imgUrl)}" alt="${escapeHTML(title)}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
            ` : `
              <div class="w-full h-full bg-white/5 flex items-center justify-center cursor-pointer">
                <i class="fas fa-${isPost ? 'palette' : (isEvento ? 'calendar-alt' : (isOportunidad ? 'briefcase' : (item.type === 'texto' ? 'file-alt' : (item.type === 'software' ? 'desktop' : (item.type === 'tutorial' ? 'graduation-cap' : 'box-open')))))} text-3xl text-gray-700"></i>
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
          <div class="absolute top-4 right-4 z-10 flex flex-col items-end gap-1">
            <span class="px-3 py-1 rounded-full text-[10px] font-black border border-${accentColor}-500/30 bg-black/60 text-${accentColor}-400 backdrop-blur-md uppercase tracking-widest">
              ${badgeText}
            </span>
            ${isOportunidad ? `<span class="px-2 py-0.5 rounded text-[8px] font-bold bg-${accentColor}-500/20 text-${accentColor}-400 uppercase tracking-wider">${subcategoria}</span>` : ''}
            ${isAdmin() && !item.pinned ? `
            <button onclick="event.stopPropagation(); pinItemFromFeed('${item._id}', '${item.feedType}')" class="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center" title="Pinnar posteo destacado">
              <i class="fas fa-thumbtack text-[10px] transform rotate-45"></i>
            </button>
            ` : ''}
          </div>
        </div>
        <div class="p-6 flex-1 flex flex-col">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-inner bg-white/5">
                ${window.GenerativeAvatar
                  ? window.GenerativeAvatar.markup(author, { className: 'w-full h-full object-cover' })
                  : `<div class="w-full h-full flex items-center justify-center text-xs font-bold bg-white/5 text-gray-500">${escapeHTML((author.username || '?')[0].toUpperCase())}</div>`}
              </div>
              <div>
                <a href="profile.html?user=${encodeURIComponent(author.username)}" class="block text-sm font-bold text-white hover:text-${accentColor}-400 transition-colors">
                  ${escapeHTML(author.username)}
                </a>
                <span class="text-xs text-slate-300 font-semibold uppercase tracking-wider">${date}</span>
              </div>
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-black text-white mb-2 leading-tight group-hover:text-${accentColor}-400 transition-colors line-clamp-1">
              ${(title && (title.includes('youtube.com') || title.includes('youtu.be'))) ? `
                <a href="${sanitizeUrl(title)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-600/10 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border border-red-500/20 hover:bg-red-600/20 transition-all cursor-alias">
                  <i class="fab fa-youtube text-xs"></i> Ver Video
                </a>
              ` : `<a href="${link}" class="hover:text-${accentColor}-400 transition-colors">${escapeHTML(title)}</a>`}
            </h3>
            <p class="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
              ${formatMentions(description) || 'Sin descripción'}
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
                   (type === 'recurso' ? `/recursos/${id}/like` : 
                   (type === 'evento' ? `/eventos/${id}/like` : 
                   (type === 'oportunidad' ? `/oportunidades/${id}/like` : `/posteos/${type}/${id}/like`)));
  if (!endpoint) return;
  const btn = event.currentTarget;
  const icon = btn.querySelector('i');
  const countSpan = btn.querySelector('.like-count');
  try {
    const res = await apiRequest(endpoint, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const userId = getUserId();
      const isLiked = (data.likes || []).includes(userId);
      icon.className = `${isLiked ? 'fas' : 'far'} fa-heart`;
      btn.className = `flex items-center gap-1.5 text-xs font-bold transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-cyan-400'}`;
      countSpan.innerText = (data.likes || []).length;
    }
  } catch (err) {
    console.error(err);
  }
}



// ═══════════════════════════════════════════════════════════════════════════
//  DATA EXTERNA (Internal vs External)
//  Internal = artedigitaldata (allFeedItems). External = el resto del
//  ecosistema FSC, indexado por fscauth. Switch apagado por defecto.
// ═══════════════════════════════════════════════════════════════════════════

// Reparte los items externos entre los propios para que queden mezclados
// (el índice de fscauth no expone fechas, así que no hay orden cronológico).
function interleave(own, ext) {
  if (!ext.length) return own;
  if (!own.length) return ext;
  const out = [];
  const n = own.length, m = ext.length;
  let ei = 0;
  for (let i = 0; i < n; i++) {
    out.push(own[i]);
    const target = Math.round(((i + 1) / (n + 1)) * m);
    while (ei < target && ei < m) out.push(ext[ei++]);
  }
  while (ei < m) out.push(ext[ei++]);
  return out;
}

function renderExternalCard(item) {
  const label = escapeHTML(item.appLabel || item.app || 'App');
  const typeLabel = escapeHTML(item.typeLabel || '');
  const url = sanitizeUrl(item.url);
  const open = url ? `onclick="window.open('${url}','_blank','noopener')" class="cursor-pointer"` : '';
  return `
      <div class="group rounded-[2rem] overflow-hidden border border-cyan-500/20 bg-[#0d0d12]/60 hover:bg-[#0d0d12]/80 backdrop-blur-xl transition-all duration-500 hover:border-cyan-400/50 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col h-full card-cyber">
        <div class="p-6 flex-1 flex flex-col">
          <div class="flex items-center justify-between gap-2 mb-4">
            <span class="px-3 py-1 rounded-full text-[10px] font-black border border-cyan-500/30 bg-black/60 text-cyan-300 uppercase tracking-widest">Externa</span>
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">${label}</span>
          </div>
          <h3 class="text-xl font-black text-white mb-2 leading-tight group-hover:text-cyan-300 transition-colors line-clamp-2" ${open}>
            ${escapeHTML(item.title)}
          </h3>
          ${typeLabel ? `<p class="text-xs text-gray-500 uppercase tracking-widest font-bold">${typeLabel}</p>` : ''}
          <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-3">
            <span class="text-[10px] text-gray-500 truncate">Creado en <span class="text-gray-300 font-bold">${label}</span></span>
            ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold hover:bg-cyan-500 hover:text-black transition-all whitespace-nowrap">Abrir</a>` : ''}
          </div>
        </div>
      </div>`;
}

function showExternalStatus(msg, kind) {
  const el = document.getElementById('external-status');
  if (!el) return;
  if (!msg) { el.textContent = ''; el.classList.add('hidden'); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
  el.className = (kind === 'warn' ? 'text-red-400' : 'text-cyan-400') + ' text-[11px] font-bold mb-4';
}

function paintExternalSwitch() {
  const btn = document.getElementById('filter-external');
  const knob = document.getElementById('filter-external-knob');
  if (!btn || !knob) return;
  const on = window.ExternalData && ExternalData.enabled();
  const usable = window.ExternalData && ExternalData.canUse();
  btn.className = on
    ? 'h-9 px-3.5 rounded-xl border border-cyan-500/60 bg-cyan-500/20 text-cyan-300 flex items-center gap-2 transition-all hover:border-cyan-400 shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
    : 'h-9 px-3.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 flex items-center gap-2 transition-all hover:border-cyan-500/50 hover:bg-white/10 shrink-0';
  knob.className = on
    ? 'w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)] transition-all'
    : 'w-3.5 h-3.5 rounded-full bg-gray-600 transition-all';
  btn.title = on
    ? (usable ? 'Data Externa ACTIVADA: el feed incluye tus creaciones del resto del ecosistema' : 'Iniciá sesión para ver tus datos externos del ecosistema')
    : 'Data Externa: sumar al feed las creaciones del resto de las apps del ecosistema (apagado por defecto)';
}

async function toggleExternalData() {
  if (!window.ExternalData) return;
  if (ExternalData.enabled()) {
    ExternalData.setEnabled(false);
    externalApps = [];
    externalItems = [];
    showExternalStatus('');
    paintExternalSwitch();
    renderFeed();
    return;
  }
  if (!ExternalData.canUse()) {
    showExternalStatus('Iniciá sesión para indexar tus creaciones del resto del ecosistema.', 'warn');
    return;
  }
  ExternalData.setEnabled(true);
  paintExternalSwitch();
  await loadExternal();
}

async function loadExternal() {
  showExternalStatus('Indexando el resto del ecosistema...');
  try {
    externalApps = await ExternalData.fetchApps();
    externalItems = ExternalData.flatten(externalApps).map(it => ({ ...it, feedType: 'externo' }));
    const ok = externalApps.filter(a => a.ok).length;
    showExternalStatus(externalItems.length
      ? `${externalItems.length} creación(es) de ${ok} app(s) del ecosistema sumadas al feed.`
      : 'Todavía no hay creaciones tuyas en el resto de las apps.');
  } catch (err) {
    externalApps = [];
    externalItems = [];
    showExternalStatus(err.message || 'No se pudo indexar el ecosistema.', 'warn');
  }
  renderFeed();
}
