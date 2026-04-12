document.addEventListener('DOMContentLoaded', async () => {
  await loadObras();
});

window.loadObras = async function() {
  const container = document.getElementById('obras-container');
  try {
    const res = await fetch(CONFIG.API_URL + '/posts');
    const posts = await res.json();
    renderObras(posts);
  } catch (err) {
    console.error("loadObras error:", err);
    if (container) container.innerHTML = `<div class="col-span-full text-center text-red-400 py-10"><i class="fas fa-exclamation-triangle mr-2"></i>Error cargando obras</div>`;
  }
};

window.renderObras = function(posts) {
  const container = document.getElementById('obras-container');
  if (!container) return;

  if (!posts.length) {
    container.innerHTML = `
      <div class="col-span-full text-center text-gray-500 py-20">
        <i class="fas fa-image text-5xl text-cyan-400/30 mb-4"></i>
        <p class="text-xl">Aún no hay obras publicadas</p>
      </div>`;
    return;
  }

  container.innerHTML = posts.map(p => {
    const youtubeId = extractYouTubeId(p);
    return `
      <div class="rounded-2xl overflow-hidden border border-cyan-500/10 card-cyber transition-all duration-300 flex flex-col h-full group">
        <div class="relative aspect-video overflow-hidden">
          <div class="block w-full h-full relative cursor-pointer"
             ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
             onclick="window.location.href='post.html?id=${p._id}'">
            ${p.imageUrl ? `
              <img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
            ` : `
              <div class="w-full h-full bg-white/5 flex items-center justify-center">
                <i class="fas fa-palette text-3xl text-gray-700"></i>
              </div>
            `}
            
            ${youtubeId ? `
              <div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none z-10" style="background: rgba(0,0,0,0.8);">
                <iframe class="w-full h-full" 
                        src="" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen></iframe>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-cyan-500 text-black">
              ${(p.author?.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <a href="${CONFIG.BASE}/profile.html?user=${p.author?.username}" class="text-sm font-medium text-cyan-400">
                ${p.author?.username || 'Anónimo'}
              </a>
              <p class="text-[10px] text-gray-500">${new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <h3 class="text-lg font-bold text-white mb-2 line-clamp-1">${p.title}</h3>
          <p class="text-gray-400 text-sm mb-3 line-clamp-2">${formatMentions(p.description)}</p>
          <div class="mt-auto flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-white/5">
            <span><i class="fas fa-heart mr-1"></i>${p.likes?.length || 0}</span>
            <span><i class="fas fa-comment mr-1"></i>${p.comments?.length || 0}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
};
