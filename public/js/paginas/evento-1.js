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

    async function loadEvent() {
      try {
        const res = await fetch(`${CONFIG.API_URL}/eventos/${currentEventId}`);
        if (!res.ok) throw new Error();
        const ev = await res.json();
        console.log('Evento cargado:', ev);
        console.log('ticketConfig:', ev.ticketConfig);
        renderEvent(ev);
      } catch (err) {
        showError();
      }
    }

    function renderEvent(ev) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('event-content').classList.remove('hidden');

      const isCreator = isLoggedIn() && getUserId() === ev.creator?._id;
      
      // Show pin button for admins
      if (isAdmin()) {
        renderPinButton(ev.pinned);
      }

      document.title = `${ev.title} - Arte Digital Data`;
      document.getElementById('event-title').innerText = ev.title;
      document.getElementById('event-description').innerHTML = formatMentions(ev.description) || 'Sin descripción disponible.';
      const locationEl = document.getElementById('event-location');
      const loc = ev.location || 'Virtual / Por definir';
      const isUrl = /^https?:\/\//i.test(loc);
      if (isUrl) {
        const isGoogleMaps = /google\.com\/maps|maps\.google|maps\.app\.goo\.gl/i.test(loc);
        locationEl.innerHTML = `
          <a href="${sanitizeUrl(loc)}" target="_blank" rel="noopener"
            class="inline-flex items-center gap-2 mt-1 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/60 transition-all font-bold text-sm">
            <i class="fas ${isGoogleMaps ? 'fa-map-marker-alt' : 'fa-external-link-alt'}"></i>
            ${isGoogleMaps ? 'Ver en Google Maps' : 'Ver ubicación'}
          </a>`;
      } else {
        locationEl.innerText = loc;
      }
      
      const date = new Date(ev.date);
      document.getElementById('event-date-badge').innerText = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
      document.getElementById('event-time').innerText = `${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;

      const creator = document.getElementById('event-creator');
      creator.innerText = ev.creator?.username || 'Anónimo';
      creator.href = `profile.html?user=${ev.creator?.username}`;

      let coEvEl = document.getElementById('event-cocreadores');
      if (!coEvEl) {
        coEvEl = document.createElement('div');
        coEvEl.id = 'event-cocreadores';
        creator.closest('span').insertAdjacentElement('afterend', coEvEl);
      }
      coEvEl.innerHTML = (typeof cocreadoresInlineHtml === 'function') ? cocreadoresInlineHtml(ev) : '';

      const avatarCont = document.getElementById('creator-avatar');
      avatarCont.innerHTML = ev.creator?.avatar ? `<img src="${sanitizeUrl(ev.creator.avatar)}" class="w-full h-full object-cover">` : escapeHTML((ev.creator?.username || '?')[0].toUpperCase());

      // Edit Button and Ticket Management
      if (isCreator) {
          let editBtnContainer = document.getElementById('edit-btn-evento');
          if (!editBtnContainer) {
              editBtnContainer = document.createElement('div');
              editBtnContainer.id = 'edit-btn-evento';
              editBtnContainer.className = 'flex gap-2';
              const actionFlex = document.querySelector('.flex.flex-wrap.items-center');
              if (actionFlex) actionFlex.appendChild(editBtnContainer);
          }
          editBtnContainer.innerHTML = `
            <button onclick="loadItemToEdit('eventos', '${ev._id}', true)" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-magenta-500/30 text-magenta-400 hover:bg-magenta-500/10 transition-all font-bold text-sm">
              <i class="fas fa-edit"></i>
              <span>Editar</span>
            </button>
            ${ev.ticketConfig?.enabled ? `
            <a href="event-tickets.html?event=${ev._id}" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all font-bold text-sm">
              <i class="fas fa-ticket-alt"></i>
              <span>Administrar Entradas</span>
            </a>
            ` : ''}
          `;
      }
      
      // Ticket actions for buyers
      const ticketActions = document.getElementById('ticket-actions');
      if (ev.ticketConfig?.enabled) {
        const now = new Date();
        const eventDate = new Date(ev.date);
        if (eventDate > now) {
          // Check ticket availability
          checkTicketAvailability(ev);
        } else {
          ticketActions.classList.remove('hidden');
          ticketActions.innerHTML = `
            <button disabled class="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gray-500/20 text-gray-500 cursor-not-allowed h-full">
              <i class="fas fa-calendar-times"></i>
              EVENTO FINALIZADO
            </button>
          `;
        }
      }

      const imgContainer = document.getElementById('event-image-container');
      const youtubeId = extractYouTubeId(ev);
      imgContainer.className = "aspect-video w-full overflow-hidden bg-magenta-500/5 flex items-center justify-center relative";
      
      if (ev.imageUrl) {
        imgContainer.innerHTML = `<img src="${sanitizeUrl(ev.imageUrl)}" class="w-full h-full object-cover" alt="${escapeHTML(ev.title)}">`;
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

      // YouTube Badge
      if (ev.youtube_video) {
        let badge = document.getElementById('youtube-badge-evento');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'youtube-badge-evento';
            badge.className = "mb-6";
            document.getElementById('event-description').after(badge);
        }
        badge.innerHTML = `
          <a href="${sanitizeUrl(ev.youtube_video)}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20 text-sm font-black uppercase tracking-widest hover:bg-red-600/20 transition-all">
            <i class="fab fa-youtube text-lg"></i> Ver Streaming / Video
          </a>
        `;
      } else {
        const badge = document.getElementById('youtube-badge-evento');
        if (badge) badge.remove();
      }

      // Likes
      const btn = document.getElementById('like-btn');
      const count = document.getElementById('like-count');
      const isLiked = ev.likes?.includes(getUserId());
      btn.className = `flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all ${isLiked ? 'text-red-500' : 'text-gray-400'}`;
      btn.querySelector('i').className = `${isLiked ? 'fas' : 'far'} fa-heart text-lg`;
      count.innerText = ev.likes?.length || 0;
      btn.onclick = () => toggleLike();

      // Participants
      const participantsSection = document.getElementById('participants-section');
      const participantsList = document.getElementById('participants-list');
      const galleryLink = document.getElementById('gallery-link');
      if (galleryLink) galleryLink.href = `eventgallery.html?id=${ev._id}`;
      if (ev.participants?.length) {
        participantsSection.classList.remove('hidden');
        participantsList.innerHTML = ev.participants.map(p => `
          <a href="profile.html?user=${encodeURIComponent(p.username)}" class="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500 transition-all group">
            <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black group-hover:bg-cyan-500 group-hover:text-black transition-all">
              ${escapeHTML((p.username || '?')[0].toUpperCase())}
            </div>
            <span class="text-sm font-bold text-gray-300 group-hover:text-white">${escapeHTML(p.username)}</span>
          </a>
        `).join('');
      } else {
        participantsSection.classList.add('hidden');
      }

      // Tags
      const tagsContainer = document.getElementById('event-tags-container');
      if (ev.tags?.length) {
        tagsContainer.classList.remove('hidden');
        tagsContainer.innerHTML = ev.tags.map(t => `
          <span class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/15 to-fuchsia-500/15 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-wide">
            #${escapeHTML(t.trim())}
          </span>
        `).join('');
      } else {
        tagsContainer.classList.add('hidden');
      }

      // Comments
      document.getElementById('comment-count').innerText = ev.comments?.length || 0;
      const formContainer = document.getElementById('comment-form-container');
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
        document.getElementById('comment-form').addEventListener('submit', addComment);
      } else {
        formContainer.innerHTML = `
          <div class="bg-white/5 border border-white/5 rounded-2xl p-6 text-center">
            <p class="text-gray-500 text-sm">Debes <button onclick="showLogin()" class="text-cyan-400 hover:underline">iniciar sesión</button> para dejar mensajes.</p>
          </div>`;
      }

      const commentsList = document.getElementById('comments-list');
      commentsList.innerHTML = (ev.comments || []).map(c => {
        const isCommentOwner = isLoggedIn() && (getUserId() === c.user?._id || isAdmin());
        return `
        <div class="flex gap-4 scroll-mt-24">
          <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
            ${c.user?.avatar ? `<img src="${sanitizeUrl(c.user.avatar)}" class="w-full h-full object-cover">` : `
              <div class="w-full h-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <i class="fas fa-user-astronaut text-xs"></i>
              </div>
            `}
          </div>
          <div class="flex-1">
            <div class="bg-white/5 rounded-2xl px-4 py-3 border border-white/5">
              <div class="flex justify-between items-center mb-1">
                <a href="profile.html?user=${encodeURIComponent(c.user?.username || '')}" class="font-bold text-cyan-400 text-sm hover:underline">@${escapeHTML(c.user?.username || 'Anónimo')}</a>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-gray-500">${new Date(c.createdAt).toLocaleDateString()}</span>
                  ${isCommentOwner ? `
                    <button onclick="deleteComment('${c._id}')" class="text-gray-600 hover:text-red-500 transition-colors text-xs" title="Borrar mensaje">
                      <i class="fas fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
              <p class="text-gray-300 text-sm">${formatMentions(c.text)}</p>
            </div>
          </div>
        </div>
      `;}).reverse().join('') || `<div class="text-center py-10 text-gray-600 italic">No hay mensajes aún.</div>`;
    }

    async function deleteComment(commentId) {
      if (!confirm('¿Eliminar este mensaje?')) return;
      try {
        const res = await apiRequest(`/eventos/${currentEventId}/comment/${commentId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          await loadEvent();
        }
      } catch (err) {
        alert('Error al eliminar mensaje');
      }
    }

    async function addComment(e) {
      e.preventDefault();
      const textInput = document.getElementById('comment-text');
      const text = textInput.value.trim();
      if (!text) return;

      try {
        const res = await apiRequest(`/eventos/${currentEventId}/comment`, {
          method: 'POST',
          body: JSON.stringify({ text })
        });

        if (res.ok) {
          textInput.value = '';
          await loadEvent();
        }
      } catch (err) {
        alert('Error al enviar mensaje');
      }
    }

    async function toggleLike() {
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
          
          btn.className = `flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all ${isLiked ? 'text-red-500' : 'text-gray-400'}`;
          btn.querySelector('i').className = `${isLiked ? 'fas' : 'far'} fa-heart text-lg`;
          count.innerText = ev.likes.length;
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function checkTicketAvailability(ev) {
      const ticketActions = document.getElementById('ticket-actions');
      try {
        const res = await fetch(`${CONFIG.API_URL}/tickets/event/${ev._id}/stats`);
        if (res.ok) {
          const stats = await res.json();
          const maxTickets = ev.ticketConfig.maxTickets || 100;
          const total = stats.total || 0;
          const available = maxTickets - total;
          
          if (available <= 0) {
            // SOLD OUT
            ticketActions.classList.remove('hidden');
            ticketActions.innerHTML = `
              <button disabled class="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-500/20 text-red-500 cursor-not-allowed border border-red-500/30 h-full">
                <i class="fas fa-times-circle"></i>
                SOLD OUT
              </button>
            `;
          } else {
            // Available - Botón más llamativo con glow y animación
            ticketActions.classList.remove('hidden');
            ticketActions.innerHTML = `
              <a href="ticket-purchase.html?event=${ev._id}" class="group relative flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 bg-[length:200%_100%] text-white hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] h-full w-full overflow-hidden animate-gradient">
                <span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
                <i class="fas fa-ticket-alt text-xl group-hover:animate-bounce"></i>
                <span class="relative">
                  ${ev.ticketConfig.price === 0 ? 'RESERVAR ENTRADA' : 'COMPRAR ENTRADA'}
                </span>
              </a>
            `;
          }
        } else {
          // If can't get stats, show button anyway
          ticketActions.classList.remove('hidden');
          ticketActions.innerHTML = `
            <a href="ticket-purchase.html?event=${ev._id}" class="group relative flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 bg-[length:200%_100%] text-white hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] h-full w-full overflow-hidden animate-gradient">
              <span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
              <i class="fas fa-ticket-alt text-xl group-hover:animate-bounce"></i>
              <span class="relative">
                ${ev.ticketConfig.price === 0 ? 'RESERVAR ENTRADA' : 'COMPRAR ENTRADA'}
              </span>
            </a>
          `;
        }
      } catch (err) {
        console.error('Error checking ticket availability:', err);
        // Show button on error
        ticketActions.classList.remove('hidden');
        ticketActions.innerHTML = `
          <a href="ticket-purchase.html?event=${ev._id}" class="group relative flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-magenta-500 via-fuchsia-500 to-magenta-500 bg-[length:200%_100%] text-white hover:scale-[1.02] transition-all shadow-[0_0_20px_ravicon(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] h-full w-full overflow-hidden animate-gradient">
            <span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
            <i class="fas fa-ticket-alt text-xl group-hover:animate-bounce"></i>
            <span class="relative">
              ${ev.ticketConfig.price === 0 ? 'RESERVAR ENTRADA' : 'COMPRAR ENTRADA'}
            </span>
          </a>
        `;
      }
    }

    function showError() {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error').classList.remove('hidden');
    }

    function shareEvent() {
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
    }

    function closeGlobalEdit() {
      const modal = document.getElementById('global-edit-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    // Pin/Unpin event (admin only)
    async function togglePinEvent() {
      if (!isLoggedIn() || !isAdmin()) {
        alert('Solo administradores pueden pinear/despinear eventos');
        return;
      }
      
      try {
        const ev = await (await fetch(`${CONFIG.API_URL}/eventos/${currentEventId}`)).json();
        const isPinned = ev.pinned;
        const action = isPinned ? 'unpin' : 'pin';
        const confirmMsg = isPinned ? '¿Despinnar este evento?' : '¿Pinnar este evento como destacado?';
        
        if (!confirm(confirmMsg)) return;
        
        const res = await apiRequest(`/eventos/${currentEventId}/${action}`, { method: 'POST' });
        if (res.ok) {
          const result = await res.json();
          renderPinButton(result.pinned);
          alert(isPinned ? 'Evento despinnado' : 'Evento pinnado como destacado');
        }
      } catch (err) {
        console.error('Error toggling pin:', err);
        alert('Error al cambiar estado del pin');
      }
    }

    // Render pin button for admin
    function renderPinButton(isPinned) {
      let btn = document.getElementById('pin-event-btn');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'pin-event-btn';
        btn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-sm';
        // Insert after like button
        const likeBtn = document.getElementById('like-btn');
        if (likeBtn) {
          likeBtn.after(btn);
        }
      }
      
      if (isPinned) {
        btn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all font-bold text-sm';
        btn.innerHTML = '<i class="fas fa-thumbtack"></i><span>DESPINS</span>';
      } else {
        btn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-all font-bold text-sm';
        btn.innerHTML = '<i class="fas fa-thumbtack transform rotate-45"></i><span>PIN</span>';
      }
      btn.onclick = togglePinEvent;
    }
