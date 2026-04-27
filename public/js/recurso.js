let currentResourceId = null;
const typeIcons = { software: 'fas fa-desktop', github: 'fab fa-github', drive: 'fab fa-google-drive', tutorial: 'fas fa-graduation-cap', other: 'fas fa-link' };
const typeColors = { software: 'bg-fuchsia-500/20 text-fuchsia-400', github: 'bg-gray-500/20 text-gray-400', drive: 'bg-yellow-500/20 text-yellow-500', tutorial: 'bg-green-500/20 text-green-400', other: 'bg-orange-500/20 text-orange-400' };

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentResourceId = urlParams.get('id');

  if (!currentResourceId) {
    showError();
    return;
  }

  await loadResource();
});

window.loadResource = async function() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/recursos/${currentResourceId}`);
    if (!res.ok) throw new Error();
    const r = await res.json();
    renderResource(r);
  } catch (err) {
    showError();
  }
};

window.renderResource = function(r) {
  const loading = document.getElementById('loading');
  const resourceContent = document.getElementById('resource-content');
  if (loading) loading.classList.add('hidden');
  if (resourceContent) resourceContent.classList.remove('hidden');

  const isAuthor = isLoggedIn() && getUserId() === r.author?._id;

  document.title = `${r.title} - Arte Digital Data`;
  const titleEl = document.getElementById('resource-title');
  if (titleEl) titleEl.innerText = r.title;
  
  const descEl = document.getElementById('resource-description');
  if (descEl) descEl.innerHTML = formatMentions(r.description) || 'Sin descripción disponible.';
  
  const typeTextEl = document.getElementById('resource-type-text');
  if (typeTextEl) typeTextEl.innerText = r.type;

  const authorLink = document.getElementById('resource-author');
  if (authorLink) {
    authorLink.innerText = `@${r.author?.username || 'anónimo'}`;
    authorLink.href = `profile.html?user=${r.author?.username}`;
  }

  const avatarCont = document.getElementById('author-avatar');
  if (avatarCont) {
    avatarCont.innerHTML = r.author?.avatar ? `<img src="${r.author.avatar}" class="w-full h-full object-cover">` : (r.author?.username || '?')[0].toUpperCase();
  }

  // Edit Button
  if (isAuthor) {
    const existingEdit = document.getElementById('edit-btn-recurso');
    if (!existingEdit) {
        const editBtnContainer = document.createElement('div');
        editBtnContainer.id = 'edit-btn-recurso';
        editBtnContainer.innerHTML = `
          <button onclick="loadItemToEdit('recursos', '${r._id}', true)" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all font-bold text-sm">
            <i class="fas fa-edit"></i>
            <span>Editar</span>
          </button>
        `;
        const actionFlex = document.querySelector('.flex.items-center.gap-4');
        if (actionFlex) actionFlex.appendChild(editBtnContainer);
    }
  }

  const youtubeId = extractYouTubeId(r);
  const imgContainer = document.getElementById('resource-image-container');
  const link = document.getElementById('resource-link');
  if (link) link.href = r.url;

  if (imgContainer) {
    if (r.imageUrl) {
      imgContainer.classList.remove('hidden');
      imgContainer.className = "mb-8 rounded-2xl overflow-hidden border border-white/5 aspect-video relative";
      imgContainer.innerHTML = `<img src="${sanitizeUrl(r.imageUrl)}" class="w-full h-full object-cover">`;
      if (youtubeId) {
        imgContainer.setAttribute('onmouseenter', `playVideo(this, '${youtubeId}')`);
        imgContainer.setAttribute('onmouseleave', 'stopVideo(this)');
        imgContainer.innerHTML += `<div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black"><iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      }
    } else {
      imgContainer.classList.add('hidden');
    }
  }

  // YouTube Badge
  if (r.youtube_video) {
    const existingYT = document.getElementById('youtube-badge-recurso');
    if (!existingYT) {
        const badge = document.createElement('div');
        badge.id = 'youtube-badge-recurso';
        badge.className = "mb-6";
        badge.innerHTML = `
          <a href="${r.youtube_video}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20 text-sm font-black uppercase tracking-widest hover:bg-red-600/20 transition-all">
            <i class="fab fa-youtube text-lg"></i> Ver Tutorial / Video
          </a>
        `;
        const desc = document.getElementById('resource-description');
        if (desc) desc.after(badge);
    }
  }

  const iconContainer = document.getElementById('resource-type-icon');
  if (iconContainer) {
    iconContainer.className = `w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0 ${typeColors[r.type] || typeColors.other}`;
    iconContainer.innerHTML = `<i class="${typeIcons[r.type] || typeIcons.other}"></i>`;
  }

  const tagsContainer = document.getElementById('resource-tags');
  if (tagsContainer) {
    tagsContainer.innerHTML = (r.tags || []).map(t => `<span class="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-xs font-bold">#${t}</span>`).join('');
  }

  // Likes
  const btn = document.getElementById('like-btn');
  const countSpan = document.getElementById('like-count');
  if (btn) {
    const isLiked = r.likes?.includes(getUserId());
    btn.className = `flex items-center gap-2 px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-sm ${isLiked ? 'text-red-500' : 'text-gray-400'}`;
    const icon = btn.querySelector('i');
    if (icon) icon.className = `${isLiked ? 'fas' : 'far'} fa-heart`;
    if (countSpan) countSpan.innerText = r.likes?.length || 0;
    btn.onclick = () => toggleLike();
  }

  // Comments
  const commCount = document.getElementById('comment-count');
  if (commCount) commCount.innerText = r.comments?.length || 0;
  
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
              <textarea id="comment-text" required placeholder="Duda, agradecimiento o comentario sobre este recurso..." 
                class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-all resize-none h-24"></textarea>
              <div class="flex justify-end mt-2">
                <button type="submit" class="btn-primary px-6 py-2 rounded-xl text-sm transition-all hover:scale-105">
                  Comentar
                </button>
              </div>
            </div>
          </div>
        </form>`;
      const form = document.getElementById('comment-form');
      if (form) form.addEventListener('submit', addComment);
    } else {
      formContainer.innerHTML = `<div class="bg-white/5 border border-white/5 rounded-2xl p-6 text-center text-gray-500 text-sm">Debes <button onclick="showLogin()" class="text-cyan-400 hover:underline">iniciar sesión</button> para comentar.</div>`;
    }
  }

  const commentsList = document.getElementById('comments-list');
  if (commentsList) {
    commentsList.innerHTML = (r.comments || []).map(c => `
      <div class="flex gap-4">
        <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
          ${c.user?.avatar ? `<img src="${c.user.avatar}" class="w-full h-full object-cover">` : `
            <div class="w-full h-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <i class="fas fa-user text-xs"></i>
            </div>
          `}
        </div>
        <div class="flex-1">
          <div class="bg-white/5 rounded-2xl px-4 py-3">
            <div class="flex justify-between items-center mb-1">
              <a href="profile.html?user=${c.user?.username}" class="font-bold text-cyan-400 text-sm hover:underline">@${c.user?.username || 'Anónimo'}</a>
              <span class="text-[10px] text-gray-500">${new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="text-gray-300 text-sm">${formatMentions(c.text)}</p>
          </div>
        </div>
      </div>
    `).reverse().join('') || `<div class="text-center py-10 text-gray-600 italic">No hay comentarios aún.</div>`;
  }
};

window.addComment = async function(e) {
  e.preventDefault();
  const textInput = document.getElementById('comment-text');
  const text = textInput ? textInput.value.trim() : '';
  if (!text) return;

  try {
    const res = await apiRequest(`/recursos/${currentResourceId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });

    if (res.ok) {
      if (textInput) textInput.value = '';
      await loadResource();
    }
  } catch (err) {
    alert('Error al publicar comentario');
  }
};

window.toggleLike = async function() {
  if (!isLoggedIn()) {
    alert('Debes iniciar sesión para dar like');
    return;
  }
  
  try {
    const res = await apiRequest(`/recursos/${currentResourceId}/like`, { method: 'POST' });
    if (res.ok) {
      const r = await res.json();
      const btn = document.getElementById('like-btn');
      const countSpan = document.getElementById('like-count');
      const isLiked = r.likes.includes(getUserId());
      
      if (btn) {
        btn.className = `flex items-center gap-2 px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-sm ${isLiked ? 'text-red-500' : 'text-gray-400'}`;
        const icon = btn.querySelector('i');
        if (icon) icon.className = `${isLiked ? 'fas' : 'far'} fa-heart`;
      }
      if (countSpan) countSpan.innerText = r.likes.length;
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
