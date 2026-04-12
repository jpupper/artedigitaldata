let allRecursos = [];
const typeIcons = { software: 'fas fa-desktop', github: 'fab fa-github', drive: 'fab fa-google-drive', tutorial: 'fas fa-graduation-cap', texto: 'fas fa-file-alt', other: 'fas fa-link' };
const typeColors = { software: 'fuchsia', github: 'gray', drive: 'yellow', tutorial: 'green', texto: 'cyan', other: 'orange' };

document.addEventListener('DOMContentLoaded', async () => {
  await loadRecursos();
});

window.loadRecursos = async function() {
  const container = document.getElementById('recursos-container');
  try {
    const res = await fetch(CONFIG.API_URL + '/recursos');
    allRecursos = await res.json();
    renderRecursos(allRecursos);
  } catch (err) {
    console.error("loadRecursos error:", err);
    if (container) container.innerHTML = `<div class="col-span-full text-center text-red-400 py-10"><i class="fas fa-exclamation-triangle mr-2"></i>Error cargando recursos</div>`;
  }
};

window.filterRecursos = function(type) {
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('bg-cyan-500/20', 'text-[var(--color-cyan)]', 'border-cyan-500/30');
    b.classList.add('bg-white/5', 'text-gray-400', 'border-white/10');
  });
  
  const btn = event.currentTarget;
  if (btn) {
    btn.classList.add('bg-cyan-500/20', 'text-[var(--color-cyan)]', 'border-cyan-500/30');
    btn.classList.remove('bg-white/5', 'text-gray-400', 'border-white/10');
  }

  const filtered = type === 'all' ? allRecursos : allRecursos.filter(r => r.type === type);
  renderRecursos(filtered);
};

window.renderRecursos = function(recursos) {
  const container = document.getElementById('recursos-container');
  if (!container) return;

  if (!recursos.length) {
    container.innerHTML = `
      <div class="col-span-full text-center text-gray-500 py-20">
        <i class="fas fa-folder-open text-5xl text-cyan-400/30 mb-4"></i>
        <p class="text-xl">No hay recursos</p>
      </div>`;
    return;
  }

  container.innerHTML = recursos.map(r => {
    const youtubeId = extractYouTubeId(r);
    return `
      <div class="rounded-2xl border border-cyan-500/10 card-cyber transition-all duration-300 flex flex-col h-full group overflow-hidden">
        <div class="relative aspect-video overflow-hidden border-b border-white/5">
          <div class="block w-full h-full relative cursor-pointer"
             ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
             onclick="window.location.href='recurso.html?id=${r._id}'">
            ${r.imageUrl ? `
              <img src="${r.imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="${r.title}">
            ` : `
              <div class="w-full h-full bg-white/5 flex items-center justify-center">
                <i class="${typeIcons[r.type] || typeIcons.other} text-4xl text-gray-700 opacity-30"></i>
              </div>
            `}
            
            ${youtubeId ? `
              <div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black">
                <iframe class="w-full h-full" 
                        src="" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen></iframe>
              </div>
            ` : ''}
          </div>
        </div>
        <a href="recurso.html?id=${r._id}" class="p-6 flex-1 flex flex-col">
          <div class="flex items-center gap-2 mb-4">
            <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-${typeColors[r.type] || typeColors.other}-500/20 text-${typeColors[r.type] || typeColors.other}-400 border border-${typeColors[r.type] || typeColors.other}-500/30 uppercase tracking-widest">
              <i class="${typeIcons[r.type] || typeIcons.other} mr-1"></i>${r.type}
            </span>
          </div>
          <h3 class="text-xl font-black text-white mb-2 leading-tight group-hover:text-cyan-400 transition-colors line-clamp-1">${r.title}</h3>
          <p class="text-gray-400 text-sm mb-5 line-clamp-2 leading-relaxed">${formatMentions(r.description)}</p>
          
          <div class="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
            <div class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500">
                ${(r.author?.username || '?')[0].toUpperCase()}
              </div>
              <span class="text-xs text-gray-500 font-medium">@${r.author?.username || 'anónimo'}</span>
            </div>
            <div class="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
              <span><i class="fas fa-heart mr-1"></i>${r.likes?.length || 0}</span>
              <span><i class="fas fa-comment mr-1"></i>${r.comments?.length || 0}</span>
            </div>
          </div>
        </a>
      </div>
    `;
  }).join('');
};
