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

    async function loadResource() {
      try {
        const res = await fetch(`${CONFIG.API_URL}/recursos/${currentResourceId}`);
        if (!res.ok) throw new Error();
        const r = await res.json();
        renderResource(r);
      } catch (err) {
        showError();
      }
    }

    function renderResource(r) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('resource-content').classList.remove('hidden');

      const isAuthor = isLoggedIn() && getUserId() === r.author?._id;

      document.title = `${r.title} - Arte Digital Data`;
      document.getElementById('resource-title').innerText = r.title;
      document.getElementById('resource-description').innerHTML = formatMentions(r.description) || 'Sin descripción disponible.';
      document.getElementById('resource-type-text').innerText = r.type;

      // Icon and Author
      const authorLink = document.getElementById('resource-author');
      authorLink.innerText = `@${r.author?.username || 'anónimo'}`;
      authorLink.href = `profile.html?user=${encodeURIComponent(r.author?.username || '')}`;

      let coEl = document.getElementById('resource-cocreadores');
      if (!coEl) {
        coEl = document.createElement('div');
        coEl.id = 'resource-cocreadores';
        const authorP = authorLink.closest('p') || authorLink.parentElement;
        authorP.insertAdjacentElement('afterend', coEl);
      }
      coEl.innerHTML = (typeof cocreadoresInlineHtml === 'function') ? cocreadoresInlineHtml(r) : '';

      const avatarCont = document.getElementById('author-avatar');
      avatarCont.innerHTML = r.author?.avatar ? `<img src="${sanitizeUrl(r.author.avatar)}" class="w-full h-full object-cover">` : escapeHTML((r.author?.username || '?')[0].toUpperCase());

      // Edit Button
      if (isAuthor) {
          let editBtnContainer = document.getElementById('edit-btn-recurso');
          if (!editBtnContainer) {
              editBtnContainer = document.createElement('div');
              editBtnContainer.id = 'edit-btn-recurso';
              const actionFlex = document.querySelector('.flex.items-center.gap-4');
              if (actionFlex) actionFlex.appendChild(editBtnContainer);
          }
          editBtnContainer.innerHTML = `
            <button onclick="loadItemToEdit('recursos', '${r._id}', true)" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all font-bold text-sm">
              <i class="fas fa-edit"></i>
              <span>Editar</span>
            </button>
          `;
      }

      // YouTube and Link
      const youtubeId = extractYouTubeId(r);
      const imgContainer = document.getElementById('resource-image-container');
      const link = document.getElementById('resource-link');
      link.href = sanitizeUrl(r.url);

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

      // YouTube Badge
      if (r.youtube_video) {
        let badge = document.getElementById('youtube-badge-recurso');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'youtube-badge-recurso';
            badge.className = "mb-6";
            document.getElementById('resource-description').after(badge);
        }
        badge.innerHTML = `
          <a href="${sanitizeUrl(r.youtube_video)}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20 text-sm font-black uppercase tracking-widest hover:bg-red-600/20 transition-all">
            <i class="fab fa-youtube text-lg"></i> Ver Tutorial / Video
          </a>
        `;
      } else {
        const badge = document.getElementById('youtube-badge-recurso');
        if (badge) badge.remove();
      }

      const iconContainer = document.getElementById('resource-type-icon');
      iconContainer.className = `w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0 ${typeColors[r.type] || typeColors.other}`;
      iconContainer.innerHTML = `<i class="${typeIcons[r.type] || typeIcons.other}"></i>`;

      const tagsContainer = document.getElementById('resource-tags');
      tagsContainer.innerHTML = (r.tags || []).map(t => `<span class="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-xs font-bold">#${escapeHTML(t)}</span>`).join('');

      // Likes
      const btn = document.getElementById('like-btn');
      const count = document.getElementById('like-count');
      const isLiked = r.likes?.includes(getUserId());
      btn.className = `flex items-center gap-2 px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-sm ${isLiked ? 'text-red-500' : 'text-gray-400'}`;
      btn.querySelector('i').className = `${isLiked ? 'fas' : 'far'} fa-heart`;
      count.innerText = r.likes?.length || 0;
      btn.onclick = () => toggleLike();

      // Comments
      document.getElementById('comment-count').innerText = r.comments?.length || 0;
      const formContainer = document.getElementById('comment-form-container');
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
        document.getElementById('comment-form').addEventListener('submit', addComment);
      } else {
        formContainer.innerHTML = `<div class="bg-white/5 border border-white/5 rounded-2xl p-6 text-center text-gray-500 text-sm">Debes <button onclick="showLogin()" class="text-cyan-400 hover:underline">iniciar sesión</button> para comentar.</div>`;
      }

      const commentsList = document.getElementById('comments-list');
      commentsList.innerHTML = (r.comments || []).map(c => {
        const isCommentOwner = isLoggedIn() && (getUserId() === c.user?._id || isAdmin());
        return `
        <div class="flex gap-4">
          <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
            ${c.user?.avatar ? `<img src="${sanitizeUrl(c.user.avatar)}" class="w-full h-full object-cover">` : `
              <div class="w-full h-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <i class="fas fa-user text-xs"></i>
              </div>
            `}
          </div>
          <div class="flex-1">
            <div class="bg-white/5 rounded-2xl px-4 py-3">
              <div class="flex justify-between items-center mb-1">
                <a href="profile.html?user=${encodeURIComponent(c.user?.username || '')}" class="font-bold text-cyan-400 text-sm hover:underline">@${escapeHTML(c.user?.username || 'Anónimo')}</a>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-gray-500">${new Date(c.createdAt).toLocaleDateString()}</span>
                  ${isCommentOwner ? `
                    <button onclick="deleteComment('${c._id}')" class="text-gray-600 hover:text-red-500 transition-colors text-xs" title="Borrar comentario">
                      <i class="fas fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
              <p class="text-gray-300 text-sm">${formatMentions(c.text)}</p>
            </div>
          </div>
        </div>
      `;}).reverse().join('') || `<div class="text-center py-10 text-gray-600 italic">No hay comentarios aún.</div>`;
    }

    async function deleteComment(commentId) {
      if (!confirm('¿Eliminar este comentario?')) return;
      try {
        const res = await apiRequest(`/recursos/${currentResourceId}/comment/${commentId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          await loadResource();
        }
      } catch (err) {
        alert('Error al eliminar comentario');
      }
    }

    async function addComment(e) {
      e.preventDefault();
      const textInput = document.getElementById('comment-text');
      const text = textInput.value.trim();
      if (!text) return;

      try {
        const res = await apiRequest(`/recursos/${currentResourceId}/comment`, {
          method: 'POST',
          body: JSON.stringify({ text })
        });

        if (res.ok) {
          textInput.value = '';
          await loadResource();
        }
      } catch (err) {
        alert('Error al publicar comentario');
      }
    }

    async function toggleLike() {
      if (!isLoggedIn()) {
        alert('Debes iniciar sesión para dar like');
        return;
      }
      
      try {
        const res = await apiRequest(`/recursos/${currentResourceId}/like`, { method: 'POST' });
        if (res.ok) {
          const r = await res.json();
          const btn = document.getElementById('like-btn');
          const count = document.getElementById('like-count');
          const isLiked = r.likes.includes(getUserId());
          
          btn.className = `flex items-center gap-2 px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-sm ${isLiked ? 'text-red-500' : 'text-gray-400'}`;
          btn.querySelector('i').className = `${isLiked ? 'fas' : 'far'} fa-heart`;
          count.innerText = r.likes.length;
        }
      } catch (err) {
        console.error(err);
      }
    }

    function showError() {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error').classList.remove('hidden');
    }
