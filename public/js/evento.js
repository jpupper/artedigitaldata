let currentEventId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentEventId = urlParams.get('id');

  if (!currentEventId) {
    showError();
    return;
  }

  await loadEvent();
});

window.loadEvent = async function() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/eventos/${currentEventId}`);
    if (!res.ok) throw new Error();
    const ev = await res.json();
    renderEvent(ev);
  } catch (err) {
    showError();
  }
};

window.renderEvent = function(ev) {
  const loading = document.getElementById('loading');
  const eventContent = document.getElementById('event-content');
  if (loading) loading.classList.add('hidden');
  if (eventContent) eventContent.classList.remove('hidden');

  const isCreator = isLoggedIn() && getUserId() === ev.creator?._id;

  document.title = `${ev.title} - Arte Digital Data`;
  const titleEl = document.getElementById('event-title');
  if (titleEl) titleEl.innerText = ev.title;
  
  const descEl = document.getElementById('event-description');
  if (descEl) descEl.innerHTML = formatMentions(ev.description) || 'Sin descripción disponible.';
  
  const locEl = document.getElementById('event-location');
  if (locEl) locEl.innerText = ev.location || 'Virtual / Por definir';
  
  const date = new Date(ev.date);
  const dateBadge = document.getElementById('event-date-badge');
  if (dateBadge) dateBadge.innerText = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  const timeEl = document.getElementById('event-time');
  if (timeEl) timeEl.innerText = `${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;

  const creator = document.getElementById('event-creator');
  if (creator) {
    creator.innerText = ev.creator?.username || 'Anónimo';
    creator.href = `profile.html?user=${ev.creator?.username}`;
  }

  const avatarCont = document.getElementById('creator-avatar');
  if (avatarCont) {
    avatarCont.innerHTML = ev.creator?.avatar ? `<img src="${ev.creator.avatar}" class="w-full h-full object-cover">` : (ev.creator?.username || '?')[0].toUpperCase();
  }

  // Edit Button
  const editBtnContainer = document.createElement('div');
  if (isCreator) {
      editBtnContainer.innerHTML = `
        <button onclick="loadItemToEdit('eventos', '${ev._id}', true)" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-magenta-500/30 text-magenta-400 hover:bg-magenta-500/10 transition-all font-bold text-sm">
          <i class="fas fa-edit"></i>
          <span>Editar</span>
        </button>
      `;
      const headerFlex = document.querySelector('.flex.flex-wrap.items-center');
      if (headerFlex) headerFlex.appendChild(editBtnContainer);
  }

  const imgContainer = document.getElementById('event-image-container');
  if (imgContainer) {
    const youtubeId = extractYouTubeId(ev);
    imgContainer.className = "aspect-video w-full overflow-hidden bg-magenta-500/5 flex items-center justify-center relative";
    
    if (ev.imageUrl) {
      imgContainer.innerHTML = `<img src="${ev.imageUrl}" class="w-full h-full object-cover" alt="${ev.title}">`;
      if (youtubeId) {
        imgContainer.setAttribute('onmouseenter', `playVideo(this, '${youtubeId}')`);
        imgContainer.setAttribute('onmouseleave', 'stopVideo(this)');
        imgContainer.innerHTML += `<div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black"><iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      }
    } else {
      imgContainer.innerHTML = `<i class="fas fa-calendar-alt text-6xl text-magenta-500/20"></i>`;
      if (youtubeId) {
        imgContainer.setAttribute('onmouseenter', `playVideo(this, '${youtubeId}')`);
        imgContainer.setAttribute('onmouseleave', 'stopVideo(this)');
        imgContainer.innerHTML += `<div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black"><iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      }
    }
  }

  // YouTube Badge
  if (ev.youtube_video) {
    const existingYouTube = document.getElementById('youtube-badge');
    if (!existingYouTube) {
        const badge = document.createElement('div');
        badge.id = 'youtube-badge';
        badge.className = "mb-6";
        badge.innerHTML = `
          <a href="${ev.youtube_video}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20 text-sm font-black uppercase tracking-widest hover:bg-red-600/20 transition-all">
            <i class="fab fa-youtube text-lg"></i> Ver Streaming / Video
          </a>
        `;
        const desc = document.getElementById('event-description');
        if (desc) desc.after(badge);
    }
  }

  // Likes
  const btn = document.getElementById('like-btn');
  const countSpan = document.getElementById('like-count');
  if (btn) {
    const isLiked = ev.likes?.includes(getUserId());
    btn.className = `flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all ${isLiked ? 'text-red-500' : 'text-gray-400'}`;
    const icon = btn.querySelector('i');
    if (icon) icon.className = `${isLiked ? 'fas' : 'far'} fa-heart text-lg`;
    if (countSpan) countSpan.innerText = ev.likes?.length || 0;
    btn.onclick = () => toggleLike();
  }

  // Participants
  const participantsSection = document.getElementById('participants-section');
  const participantsList = document.getElementById('participants-list');
  if (participantsSection && participantsList) {
    if (ev.participants?.length) {
      participantsSection.classList.remove('hidden');
      participantsList.innerHTML = ev.participants.map(p => `
        <a href="profile.html?user=${p.username}" class="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500 transition-all group">
          <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black group-hover:bg-cyan-500 group-hover:text-black transition-all">
            ${(p.username || '?')[0].toUpperCase()}
          </div>
          <span class="text-sm font-bold text-gray-300 group-hover:text-white">${p.username}</span>
        </a>
      `).join('');
    } else {
      participantsSection.classList.add('hidden');
    }
  }

  // Comments
  const commCount = document.getElementById('comment-count');
  if (commCount) commCount.innerText = ev.comments?.length || 0;
  
  const formContainer = document.getElementById('comment-form-container');
  if (formContainer) {
    if (isLoggedIn()) {
      formContainer.innerHTML = `
        <form id="comment-form" class="group">
          <div class="flex gap-4">
            <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <i class="fas fa-comment-dots"></i>
            </div>
            <div class="flex-1">
              <textarea id="comment-text" required placeholder="Haz una pregunta o deja un mensaje sobre el evento..." 
                class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-all resize-none h-24"></textarea>
              <div class="flex justify-end mt-2">
                <button type="submit" class="btn-primary px-6 py-2 rounded-xl text-sm transition-all hover:scale-105">
                  Enviar Mensaje
                </button>
              </div>
            </div>
          </div>
        </form>`;
      const form = document.getElementById('comment-form');
      if (form) form.addEventListener('submit', addComment);
    } else {
      formContainer.innerHTML = `
        <div class="bg-white/5 border border-white/5 rounded-2xl p-6 text-center">
          <p class="text-gray-500 text-sm">Debes <button onclick="showLogin()" class="text-cyan-400 hover:underline">iniciar sesión</button> para dejar mensajes.</p>
        </div>`;
    }
  }

  const commentsList = document.getElementById('comments-list');
  if (commentsList) {
    commentsList.innerHTML = (ev.comments || []).map(c => `
      <div class="flex gap-4 scroll-mt-24">
        <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
          ${c.user?.avatar ? `<img src="${c.user.avatar}" class="w-full h-full object-cover">` : `
            <div class="w-full h-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <i class="fas fa-user-astronaut text-xs"></i>
            </div>
          `}
        </div>
        <div class="flex-1">
          <div class="bg-white/5 rounded-2xl px-4 py-3 border border-white/5">
            <div class="flex justify-between items-center mb-1">
              <a href="profile.html?user=${c.user?.username}" class="font-bold text-cyan-400 text-sm hover:underline">@${c.user?.username || 'Anónimo'}</a>
              <span class="text-[10px] text-gray-500">${new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="text-gray-300 text-sm">${formatMentions(c.text)}</p>
          </div>
        </div>
      </div>
    `).reverse().join('') || `<div class="text-center py-10 text-gray-600 italic">No hay mensajes aún.</div>`;
  }
};

window.addComment = async function(e) {
  e.preventDefault();
  const textInput = document.getElementById('comment-text');
  const text = textInput ? textInput.value.trim() : '';
  if (!text) return;

  try {
    const res = await apiRequest(`/eventos/${currentEventId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });

    if (res.ok) {
      if (textInput) textInput.value = '';
      await loadEvent();
    }
  } catch (err) {
    alert('Error al enviar mensaje');
  }
};

window.toggleLike = async function() {
  if (!isLoggedIn()) {
    alert('Debes iniciar sesión para dar like');
    return;
  }
  
  try {
    const res = await apiRequest(`/eventos/${currentEventId}/like`, { method: 'POST' });
    if (res.ok) {
      const ev = await res.json();
      const btn = document.getElementById('like-btn');
      const count = document.getElementById('like-count');
      const isLiked = ev.likes.includes(getUserId());
      
      if (btn) {
        btn.className = `flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all ${isLiked ? 'text-red-500' : 'text-gray-400'}`;
        const icon = btn.querySelector('i');
        if (icon) icon.className = `${isLiked ? 'fas' : 'far'} fa-heart text-lg`;
      }
      if (count) count.innerText = ev.likes.length;
    }
  } catch (err) {
    console.error(err);
  }
};

window.showError = function() {
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  if (loading) loading.classList.add('hidden');
  if (error) error.classList.remove('hidden');
};

window.shareEvent = function() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> URL COPIADA!';
    btn.classList.add('bg-green-500/20', 'text-green-400');
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove('bg-green-500/20', 'text-green-400');
    }, 2000);
  });
};

window.closeGlobalEdit = function() {
  const modal = document.getElementById('global-edit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};
