// Buscador Global con filtros: tipo de contenido, tipo de chance, palabras clave y artistas.
(function () {
  const input = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results-sections');
  if (!input || !resultsContainer) return;

  const chips = Array.from(document.querySelectorAll('.search-filter-chip[data-type]'));
  const subTypeSelect = document.getElementById('filter-subtype');
  const tagInput = document.getElementById('filter-tags');
  const clearBtn = document.getElementById('filters-clear');
  const toggleBtn = document.getElementById('filters-toggle');
  const panel = document.getElementById('filters-panel');

  const selectedTypes = new Set();
  let debounceTimer = null;

  const SECTION_META = {
    post: { title: 'Obras', icon: 'fa-palette', color: 'text-[var(--color-magenta)]' },
    oportunidad: { title: 'Chances', icon: 'fa-briefcase', color: 'text-emerald-400' },
    resource: { title: 'Recursos', icon: 'fa-box-open', color: 'text-cyan-400' },
    user: { title: 'Artistas', icon: 'fa-users', color: 'text-cyan-400' },
    event: { title: 'Eventos', icon: 'fa-calendar-day', color: 'text-yellow-500' }
  };
  const SECTION_ORDER = ['post', 'oportunidad', 'resource', 'user', 'event'];

  function apiUrl() {
    const base = (window.CONFIG && CONFIG.API_URL) ? CONFIG.API_URL : '';
    return base + '/tagging';
  }

  function buildQuery() {
    const params = new URLSearchParams();
    const q = input.value.trim();
    if (q) params.set('q', q);
    if (selectedTypes.size) params.set('types', Array.from(selectedTypes).join(','));
    if (subTypeSelect && subTypeSelect.value) params.set('subType', subTypeSelect.value);
    if (tagInput && tagInput.value.trim()) params.set('tag', tagInput.value.trim());
    return params.toString();
  }

  function shouldSearch() {
    if (input.value.trim().length >= 2) return true;
    if (selectedTypes.size > 0) return true;
    if (subTypeSelect && subTypeSelect.value) return true;
    if (tagInput && tagInput.value.trim().length > 0) return true;
    return false;
  }

  function schedule() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch, 300);
  }

  function renderInitialState() {
    resultsContainer.innerHTML = `
      <div id="initial-state" class="text-center py-20 text-gray-500">
        <i class="fas fa-rocket text-5xl mb-4 opacity-20"></i>
        <p class="text-xl">Escribí algo o elegí un filtro para empezar a explorar...</p>
      </div>`;
  }

  async function runSearch() {
    if (!shouldSearch()) {
      renderInitialState();
      return;
    }

    resultsContainer.innerHTML = `
      <div class="text-center py-20">
        <i class="fas fa-spinner fa-spin text-4xl text-cyan-400 mb-4"></i>
        <p class="text-gray-400">Buscando en el metaverso...</p>
      </div>`;

    try {
      const res = await fetch(`${apiUrl()}?${buildQuery()}`);
      if (!res.ok) throw new Error('Respuesta ' + res.status);
      const results = await res.json();
      renderResults(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('performSearch error:', err);
      resultsContainer.innerHTML = `<p class="text-red-500 text-center">Error al buscar</p>`;
    }
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function youtubeIdOf(item) {
    if (typeof extractYouTubeId === 'function') {
      try { return extractYouTubeId(item); } catch (e) { /* sin video */ }
    }
    return null;
  }

  function videoHandlers(id) {
    return id ? `onmouseenter="event.stopPropagation(); playVideo(this, '${id}')" onmouseleave="stopVideo(this)"` : '';
  }

  function videoOverlay(id) {
    return id ? `
      <div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black">
        <iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>` : '';
  }

  function userAvatarHtml(u) {
    if (u.avatar) return `<img src="${escapeHtml(u.avatar)}" class="w-full h-full object-cover">`;
    const spiral = (window.GenerativeAvatar && window.GenerativeAvatar.dataUri)
      ? window.GenerativeAvatar.dataUri(u.id || u.label, 96)
      : '';
    if (spiral) return `<img src="${spiral}" class="w-full h-full object-cover" alt="${escapeHtml(u.label)}">`;
    return `<div class="w-full h-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><i class="fas fa-user text-xl"></i></div>`;
  }

  function postCard(p) {
    const youtubeId = youtubeIdOf(p);
    return `
      <div class="flex gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-magenta-500/30 transition-all cursor-pointer"
           onclick="window.location.href='post.html?id=${p.id}'">
        <div class="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative" ${videoHandlers(youtubeId)}>
          <img src="${p.image || 'img/artedigital.png'}" class="w-full h-full object-cover">
          ${videoOverlay(youtubeId)}
        </div>
        <div class="flex-1 min-w-0 py-1">
          <h3 class="text-white font-bold truncate">${escapeHtml(p.label)}</h3>
          <p class="text-magenta-400 text-xs mt-1">por @${escapeHtml(p.author)}</p>
          <p class="text-gray-500 text-[10px] mt-2">${p.date ? new Date(p.date).toLocaleDateString() : ''}</p>
        </div>
      </div>`;
  }

  function oportunidadCard(o) {
    const youtubeId = youtubeIdOf(o);
    return `
      <div class="flex gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer"
           onclick="window.location.href='oportunidad.html?id=${o.id}'">
        <div class="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative bg-emerald-950/30 border border-emerald-500/20" ${videoHandlers(youtubeId)}>
          <img src="${o.image || 'img/artedigital.png'}" class="w-full h-full object-cover">
          <span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-black/80 text-emerald-400 border border-emerald-500/30">${escapeHtml(o.subType || 'Oportunidad')}</span>
          ${videoOverlay(youtubeId)}
        </div>
        <div class="flex-1 min-w-0 py-1">
          <h3 class="text-white font-bold truncate">${escapeHtml(o.label)}</h3>
          ${o.author ? `<p class="text-emerald-400 text-xs mt-1">por @${escapeHtml(o.author)}</p>` : ''}
          <p class="text-gray-400 text-xs mt-1 line-clamp-2">${escapeHtml(o.desc || '')}</p>
          <p class="text-gray-500 text-[10px] mt-2">${o.date ? new Date(o.date).toLocaleDateString() : ''}</p>
        </div>
      </div>`;
  }

  function resourceCard(r) {
    const icon = r.resourceType === 'github' ? 'code-branch' : r.resourceType === 'drive' ? 'hdd' : r.resourceType === 'software' ? 'compact-disc' : r.resourceType === 'tutorial' ? 'graduation-cap' : 'link';
    return `
      <a href="${r.url ? escapeHtml(r.url) : 'recursos.html'}" target="_blank" rel="noopener" class="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <i class="fas fa-${icon}"></i>
          </div>
          <h3 class="text-white font-bold text-sm truncate">${escapeHtml(r.label)}</h3>
        </div>
        <p class="text-gray-500 text-xs">@${escapeHtml(r.author)}</p>
        ${r.description ? `<p class="text-gray-400 text-xs mt-2 line-clamp-2">${escapeHtml(r.description)}</p>` : ''}
      </a>`;
  }

  function userCard(u) {
    return `
      <a href="profile.html?user=${encodeURIComponent(u.id)}" class="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all text-center">
        <div class="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden border-2 border-transparent group-hover:border-cyan-400 transition-all">
          ${userAvatarHtml(u)}
        </div>
        <div class="text-white font-bold text-sm truncate">${escapeHtml(u.label)}</div>
        <div class="text-gray-500 text-xs truncate">@${escapeHtml(u.id)}</div>
      </a>`;
  }

  function eventCard(e) {
    const youtubeId = youtubeIdOf(e);
    return `
      <div class="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer"
           onclick="window.location.href='evento.html?id=${e.id}'">
        <div class="w-12 h-12 rounded-xl bg-yellow-500/10 flex flex-col items-center justify-center text-yellow-500 shrink-0 relative overflow-hidden" ${videoHandlers(youtubeId)}>
          <div class="date-display text-center">
            <span class="block text-xs font-bold leading-none">${new Date(e.date).toLocaleDateString('es', { month: 'short' })}</span>
            <span class="block text-lg font-black leading-none">${new Date(e.date).getDate()}</span>
          </div>
          ${videoOverlay(youtubeId)}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-white font-bold group-hover:text-yellow-400 transition-colors truncate">${escapeHtml(e.label)}</h3>
          <p class="text-gray-500 text-xs truncate">${escapeHtml(e.desc || '')}</p>
        </div>
      </div>`;
  }

  function sectionHtml(type, items) {
    if (!items.length) return '';
    const meta = SECTION_META[type];

    let body = '';
    if (type === 'user') {
      body = `<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">${items.map(userCard).join('')}</div>`;
    } else if (type === 'post') {
      body = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${items.map(postCard).join('')}</div>`;
    } else if (type === 'oportunidad') {
      body = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${items.map(oportunidadCard).join('')}</div>`;
    } else if (type === 'resource') {
      body = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${items.map(resourceCard).join('')}</div>`;
    } else {
      body = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${items.map(eventCard).join('')}</div>`;
    }

    return `
      <section>
        <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <i class="fas ${meta.icon} ${meta.color}"></i> ${meta.title}
          <span class="text-xs font-normal text-gray-500">(${items.length})</span>
        </h2>
        ${body}
      </section>`;
  }

  function renderResults(results) {
    if (!results.length) {
      resultsContainer.innerHTML = `
        <div class="text-center py-20 text-gray-500">
          <i class="fas fa-ghost text-5xl mb-4 opacity-20"></i>
          <p class="text-xl">No encontramos nada con esos criterios...</p>
        </div>`;
      return;
    }

    const byType = {};
    results.forEach((r) => {
      if (!byType[r.type]) byType[r.type] = [];
      byType[r.type].push(r);
    });

    // Si hay tipos elegidos, respetamos ese orden; si no, el orden por defecto
    const order = selectedTypes.size
      ? SECTION_ORDER.filter((t) => selectedTypes.has(t))
      : SECTION_ORDER;

    let html = `
      <div class="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
        ${results.length} resultado${results.length === 1 ? '' : 's'}
      </div>`;

    order.forEach((type) => {
      if (byType[type] && byType[type].length) {
        html += sectionHtml(type, byType[type]);
      }
    });

    resultsContainer.innerHTML = html;
  }

  // --- Interacción con los filtros ---

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.type;
      if (selectedTypes.has(type)) {
        selectedTypes.delete(type);
        chip.classList.remove('is-active');
      } else {
        selectedTypes.add(type);
        chip.classList.add('is-active');
      }
      schedule();
    });
  });

  if (subTypeSelect) subTypeSelect.addEventListener('change', schedule);
  if (tagInput) {
    tagInput.addEventListener('input', schedule);
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      selectedTypes.clear();
      chips.forEach((chip) => chip.classList.remove('is-active'));
      if (subTypeSelect) subTypeSelect.value = '';
      if (tagInput) tagInput.value = '';
      schedule();
    });
  }

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? '' : 'none';
      const icon = toggleBtn.querySelector('i');
      if (icon) icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    });
  }

  input.addEventListener('input', schedule);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
  });

  // Compatibilidad con llamadas externas
  window.performSearch = function (query) {
    if (typeof query === 'string') input.value = query;
    runSearch();
  };
  window.renderResults = renderResults;

  // Permite abrir el buscador con ?q=... desde links externos
  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery) {
    input.value = initialQuery;
    runSearch();
  }
})();
