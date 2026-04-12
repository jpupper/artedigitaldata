const params = new URLSearchParams(window.location.search);
const targetUsername = params.get('user');
const currentUser = getUser();
let isOwner = false;

document.addEventListener('DOMContentLoaded', async () => {
  if (!targetUsername) {
    if (isLoggedIn()) {
      window.location.href = CONFIG.BASE + `/profile.html?user=${currentUser.username}`;
    } else {
      showLogin();
    }
    return;
  }

  isOwner = currentUser && (currentUser.username === targetUsername);
  if (isOwner) {
    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) editBtn.classList.remove('hidden');
  }

  await loadProfile();

  const profileEditForm = document.getElementById('profile-edit-form');
  if (profileEditForm) {
    profileEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let avatar = document.getElementById('edit-avatar-url').value.trim();
      const bio = document.getElementById('edit-bio').value.trim();
      const displayName = document.getElementById('edit-display-name').value.trim();
      const file = document.getElementById('edit-avatar-file').files[0];

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const uploadRes = await fetch(CONFIG.API_URL + '/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            avatar = data.url;
          }
        } catch (err) {
          console.error("Upload error:", err);
        }
      }

      const socials = {
        instagram: document.getElementById('edit-social-instagram').value.trim(),
        discord: document.getElementById('edit-social-discord').value.trim(),
        whatsapp: document.getElementById('edit-social-whatsapp').value.trim(),
        facebook: document.getElementById('edit-social-facebook').value.trim(),
        tiktok: document.getElementById('edit-social-tiktok').value.trim()
      };

      const res = await apiRequest('/profile/me', {
        method: 'PATCH',
        body: JSON.stringify({ bio, avatar: avatar || undefined, displayName, socials })
      });

      if (res?.ok) {
        const updatedUser = await res.json();
        setUser({ ...currentUser, ...updatedUser });
        if (typeof renderHeader === 'function') renderHeader();
        await loadProfile();
        toggleEditMode();
      }
    });
  }
});

window.loadProfile = async function() {
  try {
    const res = await fetch(CONFIG.API_URL + `/profile/${targetUsername}`);
    if (!res.ok) throw new Error('Not found');
    const { user: profile, posts, recursos, eventos, favorites } = await res.json();

    const usernameEl = document.getElementById('profile-username');
    if (usernameEl) usernameEl.textContent = profile.displayName || profile.username;
    
    const bioText = profile.bio || 'Sin bio';
    const bioEl = document.getElementById('profile-bio');
    if (bioEl) bioEl.innerHTML = typeof formatMentions === 'function' ? formatMentions(bioText) : bioText;
    
    const metaEl = document.getElementById('profile-meta');
    if (metaEl) {
      metaEl.innerHTML = `
        <i class="fas fa-calendar-alt mr-1"></i> Se unió el ${new Date(profile.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
        <span class="mx-2">•</span>
        <span class="px-2 py-0.5 rounded text-xs ${profile.role === 'ADMINISTRADOR' ? 'bg-cyan-500/20 text-[var(--color-cyan)] border border-cyan-500/30' : 'bg-white/10 text-gray-400'}">${profile.role}</span>
      `;
    }

    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl) {
      if (profile.avatar) {
        avatarEl.innerHTML = `<img src="${profile.avatar}" class="w-24 h-24 rounded-full object-cover" alt="${profile.displayName || profile.username}">`;
      } else {
        avatarEl.textContent = (profile.displayName || profile.username)[0].toUpperCase();
      }
    }

    if (isOwner) {
      if (document.getElementById('edit-display-name')) document.getElementById('edit-display-name').value = profile.displayName || '';
      if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = profile.bio || '';
      if (document.getElementById('edit-avatar-url')) document.getElementById('edit-avatar-url').value = profile.avatar || '';
      if (profile.socials) {
        if (document.getElementById('edit-social-instagram')) document.getElementById('edit-social-instagram').value = profile.socials.instagram || '';
        if (document.getElementById('edit-social-discord')) document.getElementById('edit-social-discord').value = profile.socials.discord || '';
        if (document.getElementById('edit-social-whatsapp')) document.getElementById('edit-social-whatsapp').value = profile.socials.whatsapp || '';
        if (document.getElementById('edit-social-facebook')) document.getElementById('edit-social-facebook').value = profile.socials.facebook || '';
        if (document.getElementById('edit-social-tiktok')) document.getElementById('edit-social-tiktok').value = profile.socials.tiktok || '';
      }
    }

    const socialsContainer = document.getElementById('profile-socials');
    if (socialsContainer) {
      socialsContainer.innerHTML = '';
      if (profile.socials) {
        const s = profile.socials;
        if (s.instagram) socialsContainer.innerHTML += `<a href="https://instagram.com/${s.instagram.replace('@','')}" target="_blank" class="w-9 h-9 flex items-center justify-center rounded-lg bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white transition-all"><i class="fab fa-instagram"></i></a>`;
        if (s.discord) socialsContainer.innerHTML += `<a href="${s.discord.startsWith('http') ? s.discord : '#'}" target="_blank" class="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"><i class="fab fa-discord"></i></a>`;
        if (s.whatsapp) socialsContainer.innerHTML += `<a href="https://wa.me/${s.whatsapp.replace(/\+/g,'')}" target="_blank" class="w-9 h-9 flex items-center justify-center rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"><i class="fab fa-whatsapp"></i></a>`;
        if (s.facebook) socialsContainer.innerHTML += `<a href="${s.facebook.startsWith('http') ? s.facebook : `https://facebook.com/${s.facebook}`}" target="_blank" class="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"><i class="fab fa-facebook"></i></a>`;
        if (s.tiktok) socialsContainer.innerHTML += `<a href="https://tiktok.com/@${s.tiktok.replace('@','')}" target="_blank" class="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-500/10 text-white hover:bg-white hover:text-black transition-all"><i class="fab fa-tiktok"></i></a>`;
      }
    }
    
    renderUserPosts(posts);
    renderUserRecursos(recursos || []);
    renderUserEventos(eventos || []);
    renderUserFavorites(favorites || { posts: [], recursos: [], eventos: [] });
  } catch (err) {
    console.error("Error loading profile:", err);
    const usernameEl = document.getElementById('profile-username');
    if (usernameEl) usernameEl.textContent = 'Usuario no encontrado';
  }
};

window.switchTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active', 'text-[var(--color-cyan)]', 'border-primary-500');
    btn.classList.add('text-gray-500');
  });
  const activeBtn = document.getElementById('tab-' + tab);
  if (activeBtn) {
    activeBtn.classList.add('active', 'text-[var(--color-cyan)]', 'border-primary-500');
    activeBtn.classList.remove('text-gray-500');
  }
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
  const section = document.getElementById('section-' + tab);
  if (section) section.classList.remove('hidden');
};

window.renderUserPosts = function(posts) {
  const container = document.getElementById('user-posts');
  if (!container) return;
  if (!posts.length) {
    container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10"><i class="fas fa-image text-4xl text-fuchsia-400/30 mb-3"></i><p>Este artista aún no tiene obras publicadas</p></div>`;
    return;
  }
  container.innerHTML = posts.map(p => {
    const youtubeId = extractYouTubeId(p);
    return `
      <div class="rounded-2xl overflow-hidden border border-cyan-500/10 card-cyber transition-all duration-300 group">
        <div class="relative aspect-video overflow-hidden">
          <div class="block w-full h-full relative cursor-pointer"
             ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
             onclick="window.location.href='${CONFIG.BASE}/post.html?id=${p._id}'">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">` : `<div class="w-full h-full bg-white/5 flex items-center justify-center"><i class="fas fa-palette text-3xl text-gray-700"></i></div>`}
            ${youtubeId ? `<div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black"><iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ''}
          </div>
        </div>
        <div class="p-4">
          <div class="flex items-start justify-between gap-2 mb-1">
            <a href="${CONFIG.BASE}/post.html?id=${p._id}" target="_blank" class="block hover:text-[var(--color-cyan)] transition-colors flex-1">
              <h3 class="font-bold text-white line-clamp-1">${p.title}</h3>
            </a>
            ${(isLoggedIn() && (isOwner || isAdmin())) ? `
              <div class="flex gap-1">
                <button onclick="openEditPost('${p._id}')" class="text-gray-500 hover:text-cyan-400 transition-colors p-1" title="Editar"><i class="fas fa-edit text-xs"></i></button>
                <button onclick="deletePost('${p._id}')" class="text-gray-500 hover:text-red-500 transition-colors p-1" title="Eliminar"><i class="fas fa-trash-alt text-xs"></i></button>
              </div>
            ` : ''}
          </div>
          <p class="text-gray-400 text-sm line-clamp-2">${p.description || ''}</p>
          <div class="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <span><i class="fas fa-heart text-fuchsia-400 mr-1"></i>${p.likes?.length || 0}</span>
            <a href="${CONFIG.BASE}/post.html?id=${p._id}" target="_blank" class="hover:text-cyan-400"><i class="fas fa-comment mr-1"></i>${p.comments?.length || 0}</a>
            <span>${new Date(p.createdAt).toLocaleDateString('es-AR')}</span>
          </div>
        </div>
      </div>`;
  }).join('');
};

window.renderUserRecursos = function(recursos) {
  const container = document.getElementById('user-recursos');
  if (!container) return;
  if (!recursos.length) {
    container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10"><i class="fas fa-box-open text-4xl text-orange-400/30 mb-3"></i><p>Este usuario aún no tiene recursos compartidos</p></div>`;
    return;
  }
  container.innerHTML = recursos.map(r => {
    const youtubeId = extractYouTubeId(r);
    return `
      <div class="rounded-2xl p-5 border border-orange-500/10 card-cyber transition-all duration-300 group">
         <div class="relative aspect-video w-full overflow-hidden rounded-xl mb-4">
           <div class="block w-full h-full relative cursor-pointer"
              ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
              onclick="window.location.href='${CONFIG.BASE}/recurso.html?id=${r._id}'">
             ${r.imageUrl ? `<img src="${r.imageUrl}" alt="${r.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">` : `<div class="w-full h-full bg-white/5 flex items-center justify-center"><i class="fas fa-box-open text-3xl text-gray-700 opacity-30"></i></div>`}
             ${youtubeId ? `<div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black"><iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ''}
           </div>
         </div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <a href="${CONFIG.BASE}/recurso.html?id=${r._id}" target="_blank" class="block hover:text-orange-400 transition-colors flex-1">
            <h3 class="font-bold text-white line-clamp-1">${r.title}</h3>
          </a>
          ${(isLoggedIn() && (isOwner || isAdmin())) ? `
            <div class="flex gap-1">
              <button onclick="openEditRecurso('${r._id}')" class="text-gray-500 hover:text-orange-400 transition-colors p-1" title="Editar"><i class="fas fa-edit text-xs"></i></button>
              <button onclick="deleteRecurso('${r._id}')" class="text-gray-500 hover:text-red-500 transition-colors p-1" title="Eliminar"><i class="fas fa-trash-alt text-xs"></i></button>
            </div>
          ` : ''}
        </div>
        <p class="text-xs text-gray-400 line-clamp-2 mb-3">${r.description || ''}</p>
        <div class="flex items-center gap-2 mb-3"><span class="px-2 py-0.5 rounded text-[10px] bg-orange-500/10 text-orange-400 uppercase font-bold">${r.type}</span></div>
        <div class="flex items-center justify-between text-[10px] text-gray-500 pt-3 border-t border-white/5"><span><i class="fas fa-comment mr-1"></i>${r.comments?.length || 0}</span><span>${new Date(r.createdAt).toLocaleDateString()}</span></div>
      </div>`;
  }).join('');
};

window.renderUserEventos = function(eventos) {
  const container = document.getElementById('user-eventos');
  if (!container) return;
  if (!eventos.length) {
    container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10"><i class="fas fa-calendar-times text-4xl text-magenta-400/30 mb-3"></i><p>Este usuario no tiene eventos registrados</p></div>`;
    return;
  }
  container.innerHTML = eventos.map(ev => {
    const youtubeId = extractYouTubeId(ev);
    return `
      <div class="rounded-2xl p-5 border border-magenta-500/10 bg-white/5 hover:border-magenta-500/30 transition-all flex flex-col h-full group">
        <div class="relative aspect-video w-full overflow-hidden rounded-xl mb-4">
           <div class="block w-full h-full relative cursor-pointer"
              ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
              onclick="window.location.href='${CONFIG.BASE}/evento.html?id=${ev._id}'">
             ${ev.imageUrl ? `<img src="${ev.imageUrl}" alt="${ev.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">` : `<div class="w-full h-full bg-magenta-500/10 flex items-center justify-center"><i class="fas fa-calendar-alt text-3xl text-magenta-500/30"></i></div>`}
             ${youtubeId ? `<div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black"><iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ''}
           </div>
        </div>
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-magenta-500/20 flex flex-col items-center justify-center text-magenta-400 font-bold shrink-0">
             <span class="text-[10px] leading-none uppercase">${new Date(ev.date).toLocaleDateString('es-AR', { month: 'short' })}</span>
             <span class="text-sm leading-none">${new Date(ev.date).getDate()}</span>
          </div>
          <div class="flex-1 min-w-0">
            <a href="${CONFIG.BASE}/evento.html?id=${ev._id}" target="_blank"><h3 class="font-bold text-white group-hover:text-magenta-400 transition-colors truncate">${ev.title}</h3></a>
            <p class="text-[10px] text-gray-500 truncate"><i class="fas fa-map-marker-alt mr-1"></i>${ev.location || 'Online'}</p>
          </div>
          ${(isLoggedIn() && (isOwner || isAdmin())) ? `
            <div class="flex gap-1 shrink-0">
              <button onclick="openEditEvento('${ev._id}')" class="text-gray-500 hover:text-magenta-400 transition-colors p-1" title="Editar"><i class="fas fa-edit text-xs"></i></button>
              <button onclick="deleteEvento('${ev._id}')" class="text-gray-500 hover:text-red-500 transition-colors p-1" title="Eliminar"><i class="fas fa-trash-alt text-xs"></i></button>
            </div>
          ` : ''}
        </div>
        <p class="text-xs text-gray-400 line-clamp-2">${ev.description || ''}</p>
      </div>`;
  }).join('');
};

window.renderUserFavorites = function(favs) {
  const container = document.getElementById('user-favs');
  if (!container) return;
  const allFavs = [
      ...favs.posts.map(p => ({ ...p, type: 'post' })),
      ...favs.recursos.map(r => ({ ...r, type: 'recurso' })),
      ...favs.eventos.map(e => ({ ...e, type: 'evento' }))
  ].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  if (!allFavs.length) {
    container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-16 bg-white/5 rounded-3xl border border-dashed border-white/10"><i class="fas fa-heart-broken text-4xl text-gray-600 mb-3"></i><p>Aún no hay favoritos guardados</p></div>`;
    return;
  }
  container.innerHTML = allFavs.map(item => {
    const isPost = item.type === 'post';
    const isRecurso = item.type === 'recurso';
    const link = isPost ? `post.html?id=${item._id}` : (isRecurso ? `recurso.html?id=${item._id}` : `evento.html?id=${item._id}`);
    const color = isPost ? 'cyan' : (isRecurso ? 'orange' : 'magenta');
    const icon = isPost ? 'palette' : (isRecurso ? 'box-open' : 'calendar-alt');
    const youtubeId = extractYouTubeId(item);
    return `
      <div class="rounded-2xl overflow-hidden border border-${color}-500/10 card-cyber group">
        <div class="block aspect-video bg-white/5 relative overflow-hidden cursor-pointer"
           ${youtubeId ? `onmouseenter="playVideo(this, '${youtubeId}')" onmouseleave="stopVideo(this)"` : ''}
           onclick="window.open('${link}', '_blank')">
           ${item.imageUrl ? `<img src="${item.imageUrl}" class="w-full h-full object-cover transition-transform group-hover:scale-110">` : `<div class="w-full h-full flex items-center justify-center text-gray-700"><i class="fas fa-${icon} text-3xl"></i></div>`}
           ${youtubeId ? `<div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black"><iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ''}
           <div class="absolute top-3 left-3 z-10"><span class="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-${color}-400 uppercase tracking-widest">${item.type}</span></div>
        </div>
        <div class="p-4"><a href="${link}" target="_blank" class="block"><h3 class="font-bold text-white group-hover:text-${color}-400 transition-colors truncate mb-1">${item.title}</h3></a><p class="text-[10px] text-gray-500 flex items-center gap-2"><i class="fas fa-user-circle"></i> @${(item.author || item.creator)?.username || 'anónimo'}</p></div>
      </div>`;
  }).join('');
};

window.deletePost = async function(postId) {
  if (!confirm('¿Estás seguro de que querés eliminar esta obra?')) return;
  const res = await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
  if (res?.ok) await loadProfile();
};

window.deleteRecurso = async function(id) {
  if (!confirm('¿Estás seguro de que querés eliminar este recurso?')) return;
  const res = await apiRequest(`/recursos/${id}`, { method: 'DELETE' });
  if (res?.ok) await loadProfile();
};

window.deleteEvento = async function(id) {
  if (!confirm('¿Estás seguro de que querés eliminar este evento?')) return;
  const res = await apiRequest(`/eventos/${id}`, { method: 'DELETE' });
  if (res?.ok) await loadProfile();
};

window.toggleEditMode = function() {
  const editForm = document.getElementById('edit-form');
  if (editForm) editForm.classList.toggle('hidden');
};

// --- EDIT MODALS LOGIC ---
window.openEditPost = function(id) { if (typeof loadItemToEdit === 'function') loadItemToEdit('posts', id); };
window.openEditRecurso = function(id) { if (typeof loadItemToEdit === 'function') loadItemToEdit('recursos', id); };
window.openEditEvento = function(id) { if (typeof loadItemToEdit === 'function') loadItemToEdit('eventos', id); };

window.closeGlobalEdit = function() {
  const modal = document.getElementById('global-edit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};
