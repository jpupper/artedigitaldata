document.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();
});

window.loadEvents = async function() {
  const container = document.getElementById('events-container');
  if (!container) return;

  try {
    const res = await fetch(CONFIG.API_URL + '/eventos');
    const eventos = await res.json();
    
    if (!eventos.length) {
      container.innerHTML = `
        <div class="col-span-full text-center py-20 text-gray-500">
          <i class="fas fa-calendar-times text-6xl opacity-20 mb-4"></i>
          <p class="text-xl">No hay eventos programados próximamente.</p>
        </div>`;
      return;
    }

    container.innerHTML = eventos.map(ev => {
      const youtubeId = extractYouTubeId(ev);
      return `
        <div class="rounded-3xl overflow-hidden border border-white/5 card-cyber flex flex-col h-full hover:border-[var(--color-magenta)] group">
          <div class="relative aspect-video overflow-hidden">
            <div class="block w-full h-full relative cursor-pointer"
               ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
               onclick="window.location.href='evento.html?id=${ev._id}'">
              ${ev.imageUrl ? `
                <img src="${ev.imageUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="${ev.title}">
              ` : `
                <div class="w-full h-full bg-magenta-500/10 flex items-center justify-center">
                  <i class="fas fa-calendar-alt text-4xl text-magenta-500/30"></i>
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
          <div class="p-6 flex-1 flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <span class="px-3 py-1 bg-magenta-500/20 text-magenta-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                ${new Date(ev.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              </span>
              <span class="text-xs text-gray-500">Por ${ev.creator?.username}</span>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">${ev.title}</h3>
            <p class="text-gray-400 text-sm mb-4 line-clamp-2">${ev.description || ''}</p>
            
            <div class="flex items-center gap-2 text-xs text-gray-500 mb-6">
              <i class="fas fa-clock text-magenta-500"></i>
              <span>${new Date(ev.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>
              <i class="fas fa-map-marker-alt text-magenta-500 ml-2"></i>
              <span class="truncate">${ev.location || 'Virtual'}</span>
            </div>

            <!-- Participants -->
            <div class="mt-auto">
              <h4 class="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Participantes</h4>
              <div class="flex flex-wrap gap-2">
                ${ev.participants?.length ? ev.participants.map(p => `
                  <a href="profile.html?user=${p.username}" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500 transition-all">
                    <div class="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center text-[8px] font-black text-black">
                      ${p.username[0].toUpperCase()}
                    </div>
                    <span class="text-[10px] text-gray-300 font-medium">${p.username}</span>
                  </a>
                `).join('') : '<span class="text-xs text-gray-600 italic">No hay participantes etiquetados</span>'}
              </div>
            </div>
          </div>
          ${(isLoggedIn() && (ev.creator?._id === getUserId() || isAdmin())) ? `
            <button onclick="deleteEvent('${ev._id}')" class="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 transition-all hover:text-white text-xs font-bold w-full">
              ELIMINAR EVENTO
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("loadEvents error:", err);
    if (container) container.innerHTML = `<div class="col-span-full py-20 text-center text-red-400">Error cargando eventos</div>`;
  }
};

window.deleteEvent = async function(id) {
  if (!confirm('¿Seguro querés eliminar este evento?')) return;
  const res = await apiRequest(`/eventos/${id}`, { method: 'DELETE' });
  if (res?.ok) await loadEvents();
};
