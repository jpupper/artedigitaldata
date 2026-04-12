const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results-sections');
let debounceTimer;

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div id="initial-state" class="text-center py-20 text-gray-500">
            <i class="fas fa-rocket text-5xl mb-4 opacity-20"></i>
            <p class="text-xl">Escribe algo para empezar a explorar...</p>
          </div>`;
      }
      return;
    }

    debounceTimer = setTimeout(() => performSearch(query), 300);
  });
}

window.performSearch = async function(query) {
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="text-center py-20">
        <i class="fas fa-spinner fa-spin text-4xl text-cyan-400 mb-4"></i>
        <p class="text-gray-400">Buscando en el metaverso...</p>
      </div>`;
  }

  try {
    const res = await fetch(`${CONFIG.API_URL}/tagging?q=${encodeURIComponent(query)}`);
    const results = await res.json();
    renderResults(results);
  } catch (err) {
    console.error("performSearch error:", err);
    if (resultsContainer) resultsContainer.innerHTML = `<p class="text-red-500 text-center">Error al buscar</p>`;
  }
};

window.renderResults = function(results) {
  if (!resultsContainer) return;
  
  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="text-center py-20 text-gray-500">
        <i class="fas fa-ghost text-5xl mb-4 opacity-20"></i>
        <p class="text-xl">No encontramos nada con ese nombre...</p>
      </div>`;
    return;
  }

  const users = results.filter(r => r.type === 'user');
  const posts = results.filter(r => r.type === 'post');
  const events = results.filter(r => r.type === 'event');
  const resources = results.filter(r => r.type === 'resource');

  let html = '';

  if (users.length) {
    html += `
      <section>
        <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <i class="fas fa-users text-cyan-400"></i> Usuarios
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          ${users.map(u => `
            <a href="profile.html?user=${u.id}" class="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all text-center">
              <div class="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden border-2 border-transparent group-hover:border-cyan-400 transition-all">
                ${u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : `
                  <div class="w-full h-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <i class="fas fa-user text-xl"></i>
                  </div>
                `}
              </div>
              <div class="text-white font-bold text-sm truncate">${u.label}</div>
              <div class="text-gray-500 text-xs truncate">@${u.id}</div>
            </a>
          `).join('')}
        </div>
      </section>`;
  }

  if (posts.length) {
    html += `
      <section>
        <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <i class="fas fa-palette text-magenta-500"></i> Obras
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${posts.map(p => {
            const youtubeId = extractYouTubeId(p);
            return `
            <div class="flex gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-magenta-500/30 transition-all cursor-pointer"
                 onclick="window.location.href='post.html?id=${p.id}'">
              <div class="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative"
                   ${youtubeId ? `onmouseenter="event.stopPropagation(); playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}>
                <img src="${p.image || 'img/artedigital.png'}" class="w-full h-full object-cover">
                ${youtubeId ? `
                  <div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black">
                    <iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                  </div>
                ` : ''}
              </div>
              <div class="flex-1 min-w-0 py-1">
                <h3 class="text-white font-bold truncate">${p.label}</h3>
                <p class="text-magenta-400 text-xs mt-1">por @${p.author}</p>
                <p class="text-gray-500 text-[10px] mt-2">${new Date(p.date).toLocaleDateString()}</p>
              </div>
            </div>
          `; }).join('')}
        </div>
      </section>`;
  }

  if (events.length) {
    html += `
      <section>
        <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <i class="fas fa-calendar-star text-yellow-500"></i> Eventos
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${events.map(e => {
            const youtubeId = extractYouTubeId(e);
            return `
            <div class="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer"
                 onclick="window.location.href='evento.html?id=${e.id}'">
              <div class="w-12 h-12 rounded-xl bg-yellow-500/10 flex flex-col items-center justify-center text-yellow-500 shrink-0 relative overflow-hidden"
                   ${youtubeId ? `onmouseenter="event.stopPropagation(); playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}>
                <div class="date-display text-center">
                  <span class="block text-xs font-bold leading-none">${new Date(e.date).toLocaleDateString('es', {month: 'short'})}</span>
                  <span class="block text-lg font-black leading-none">${new Date(e.date).getDate()}</span>
                </div>
                ${youtubeId ? `
                  <div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black">
                    <iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                  </div>
                ` : ''}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-white font-bold group-hover:text-yellow-400 transition-colors truncate">${e.label}</h3>
                <p class="text-gray-500 text-xs truncate">${e.desc || ''}</p>
              </div>
            </div>
          `; }).join('')}
        </div>
      </section>`;
  }

  if (resources.length) {
    html += `
      <section>
        <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <i class="fas fa-box-open text-cyan-400"></i> Recursos
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${resources.map(r => `
            <a href="recursos.html" class="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <i class="fas fa-${r.resourceType === 'github' ? 'code-branch' : r.resourceType === 'drive' ? 'hdd' : 'link'}"></i>
                </div>
                <h3 class="text-white font-bold text-sm truncate">${r.label}</h3>
              </div>
              <p class="text-gray-500 text-xs">@${r.author}</p>
            </a>
          `).join('')}
        </div>
      </section>`;
  }

  resultsContainer.innerHTML = html;
};
