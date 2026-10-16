document.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get('id');
      if (!postId) {
        window.location.href = CONFIG.BASE + '/index.html';
        return;
      }
      await loadPost(postId);
    });

    let currentPostLikesUsers = [];

    function renderLikesUsersList(users) {
      if (!users || users.length === 0) {
        return `<div class="text-xs text-gray-400 py-3 text-center italic">Aún no hay likes</div>`;
      }
      return users.map(u => `
        <a href="${CONFIG.BASE}/profile.html?user=${encodeURIComponent(u.username)}" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/5 transition-colors group">
          <div class="w-7 h-7 rounded-full overflow-hidden bg-cyan-500 text-black flex items-center justify-center text-xs font-bold shrink-0">
            ${u.avatar ? `<img src="${sanitizeUrl(u.avatar)}" alt="${escapeHTML(u.username)}" class="w-full h-full object-cover">` : (u.username || '?')[0].toUpperCase()}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
              ${escapeHTML(u.displayName || u.username)}
            </p>
            <p class="text-[10px] text-gray-400 truncate">@${escapeHTML(u.username)}</p>
          </div>
        </a>
      `).join('');
    }

    function showLikesPopup() {
      const popup = document.getElementById('likes-popup');
      if (popup) popup.classList.remove('hidden');
    }

    function hideLikesPopup() {
      const popup = document.getElementById('likes-popup');
      if (popup) popup.classList.add('hidden');
    }

    async function loadPost(postId) {
      const isYouTubeURL = (url) => {
        if (!url) return false;
        return /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(url);
      };

      const container = document.getElementById('post-detail-container');
      try {
        const res = await fetch(`${CONFIG.API_URL}/posts/${postId}`);
        if (!res.ok) throw new Error('Post no encontrado');
        const post = await res.json();
        cargarFondoJPShaditor(post.fondoShader);   // fondo propio de la obra (o el del sitio)
        currentPostLikesUsers = post.likesUsers || [];
        const isAuthor = isLoggedIn() && getUserId() === post.author?._id;

        document.title = `${post.title} - Arte Digital Data`;

        container.innerHTML = `
          <div class="rounded-3xl overflow-hidden border border-cyan-500/20 card-cyber">
            <div class="p-6 border-b border-white/5 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold bg-cyan-500 text-black shrink-0">
                  ${post.author?.avatar ? `
                    <img src="${sanitizeUrl(post.author.avatar)}" alt="${escapeHTML(post.author.username)}" class="w-full h-full object-cover">
                  ` : (post.author?.username || '?')[0].toUpperCase()}
                </div>
                <div>
                  <a href="${CONFIG.BASE}/profile.html?user=${encodeURIComponent(post.author?.username || '')}" class="text-lg font-bold text-cyan-400 group-hover:text-magenta-400 transition-colors">
                    ${escapeHTML(post.author?.username || 'Anónimo')}
                  </a>
                  ${(typeof cocreadoresInlineHtml === 'function') ? cocreadoresInlineHtml(post) : ''}
                  <p class="text-base md:text-lg font-semibold text-slate-200 mt-1 flex items-center gap-2 tracking-wide">
                    <i class="far fa-calendar-alt text-xs text-cyan-400"></i>
                    <span>${new Date(post.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} hs</span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${(isAuthor || (typeof isAdmin === 'function' && isAdmin())) ? `
                  <button onclick="loadItemToEdit('posts', '${post._id}', true)" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all font-bold text-sm">
                    <i class="fas fa-edit"></i>
                    <span>Editar</span>
                  </button>
                    <button onclick="borrarObra('${post._id}')" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm" title="Eliminar esta obra"><i class="fas fa-trash"></i><span>Borrar</span></button>
                ` : ''}
                <div class="relative inline-block" id="like-container" onmouseenter="showLikesPopup()" onmouseleave="hideLikesPopup()">
                  <button onclick="toggleLike('${post._id}')" id="like-btn" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all ${post.likes?.includes(getUserId()) ? 'text-red-500' : 'text-gray-400'}">
                    <i class="${post.likes?.includes(getUserId()) ? 'fas' : 'far'} fa-heart text-xl"></i>
                    <span id="like-count" class="font-bold">${post.likes?.length || 0}</span>
                  </button>
                  <div id="likes-popup" class="hidden absolute right-0 top-full mt-2 w-64 p-3 rounded-2xl bg-[#0d0d14]/95 border border-cyan-500/30 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(0,245,255,0.15)] z-50 text-left transition-all">
                    <div class="text-[11px] font-black uppercase tracking-wider text-cyan-400 border-b border-white/10 pb-1.5 mb-2 flex items-center justify-between">
                      <span><i class="fas fa-heart text-red-500 mr-1"></i> Les gusta esto</span>
                      <span id="popup-like-count" class="text-gray-400 font-normal text-[10px]">${post.likes?.length || 0}</span>
                    </div>
                    <div id="likes-users-list" class="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 pr-1">
                      ${renderLikesUsersList(currentPostLikesUsers)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="p-0">
              ${post.imageUrl ? `
                <div class="w-full bg-black flex justify-center border-b border-white/5 relative aspect-video overflow-hidden" 
                     ${extractYouTubeId(post) ? `onmouseenter="playVideo(this, '${extractYouTubeId(post)}')" onmouseleave="stopVideo(this)"` : ''}>
                  <img src="${sanitizeUrl(post.imageUrl)}" alt="${escapeHTML(post.title)}" class="max-w-full max-h-[70vh] object-contain transition-transform duration-700">
                  ${extractYouTubeId(post) ? `
                    <div class="video-overlay absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none bg-black">
                      <iframe class="w-full h-full" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              <div class="p-8">
                <div class="flex items-center justify-between gap-4 mb-4">
                  <h1 class="text-3xl font-black text-white">
                    ${escapeHTML(post.title)}
                  </h1>
                  ${post.youtube_video ? `
                    <a href="${sanitizeUrl(post.youtube_video)}" target="_blank" onclick="event.stopPropagation()" class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20 text-xs font-black uppercase tracking-widest hover:bg-red-600/20 transition-all">
                      <i class="fab fa-youtube text-lg"></i> Ver Video
                    </a>
                  ` : ''}
                </div>
                <p class="text-gray-300 text-lg leading-relaxed mb-6 whitespace-pre-wrap">${formatMentions(post.description)}</p>
                ${post.tags?.length ? `
                  <div class="flex flex-wrap gap-2 mb-8">
                    ${post.tags.map(t => `<span class="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-xs">#${escapeHTML(t)}</span>`).join('')}
                  </div>
                ` : ''}

                <!-- Comments Section -->
                <div class="border-t border-white/10 pt-8 mt-8">
                  <h3 class="text-xl font-bold text-white mb-6">
                    <i class="fas fa-comments text-magenta-500 mr-2"></i>Comentarios (${post.comments?.length || 0})
                  </h3>
                  
                  ${isLoggedIn() ? `
                    <form id="comment-form" class="mb-8 group">
                      <div class="flex gap-4">
                        <div class="w-10 h-10 rounded-full bg-magenta-500/20 flex items-center justify-center text-magenta-400 shrink-0">
                          <i class="fas fa-comment-dots"></i>
                        </div>
                        <div class="flex-1">
                          <textarea id="comment-text" required placeholder="Escribe un comentario..." 
                            class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:border-magenta-500 focus:outline-none transition-all resize-none h-24"></textarea>
                          <div class="flex justify-end mt-2">
                            <button type="submit" class="btn-primary px-6 py-2 rounded-xl text-sm transition-all hover:scale-105">
                              Publicar Comentario
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  ` : `
                    <div class="bg-white/5 border border-white/5 rounded-2xl p-6 text-center mb-8">
                      <p class="text-gray-500 text-sm">Debes <button onclick="showLogin()" class="text-cyan-400 hover:underline">iniciar sesión</button> para comentar.</p>
                    </div>
                  `}

                  <div id="comments-list" class="space-y-6">
                    ${post.comments?.length ? post.comments.map(c => {
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
                                  <button onclick="deleteComment('${c._id}', '${post._id}')" class="text-gray-600 hover:text-red-500 transition-colors text-xs" title="Borrar comentario">
                                    <i class="fas fa-trash"></i>
                                  </button>
                                ` : ''}
                              </div>
                            </div>
                            <p class="text-gray-300 text-sm">${formatMentions(c.text)}</p>
                          </div>
                        </div>
                      </div>
                    `;}).reverse().join('') : `
                      <div class="text-center py-10 text-gray-600 italic">
                        No hay comentarios aún. ¡Sé el primero!
                      </div>
                    `}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        if (isLoggedIn()) {
          const form = document.getElementById('comment-form');
          if (form) form.addEventListener('submit', (e) => addComment(e, postId));
        }

      } catch (err) {
        container.innerHTML = `<div class="text-center py-20">Obra no encontrada</div>`;
        // Aunque la obra no cargue, la página conserva el fondo por defecto del sitio.
        cargarFondoJPShaditor('');
      }
    }

    async function deleteComment(commentId, postId) {
      if (!confirm('¿Eliminar este comentario?')) return;
      try {
        const res = await apiRequest(`/posts/${postId}/comment/${commentId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          await loadPost(postId);
        }
      } catch (err) {
        alert('Error al eliminar comentario');
      }
    }

    async function addComment(e, postId) {
      e.preventDefault();
      const textInput = document.getElementById('comment-text');
      const text = textInput.value.trim();
      if (!text) return;

      try {
        const res = await apiRequest(`/posts/${postId}/comment`, {
          method: 'POST',
          body: JSON.stringify({ text })
        });

        if (res.ok) {
          textInput.value = '';
          await loadPost(postId); // Refresh to show new comment
        }
      } catch (err) {
        alert('Error al publicar comentario');
      }
    }

    async function toggleLike(postId) {
      if (!isLoggedIn()) {
        alert('Debes iniciar sesión para dar like');
        return;
      }
      
      try {
        const res = await apiRequest(`/posts/${postId}/like`, { method: 'POST' });
        if (res.ok) {
          const post = await res.json();
          const btn = document.getElementById('like-btn');
          const count = document.getElementById('like-count');
          const isLiked = post.likes.includes(getUserId());
          
          btn.className = `flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all ${isLiked ? 'text-red-500' : 'text-gray-400'}`;
          btn.querySelector('i').className = `${isLiked ? 'fas' : 'far'} fa-heart text-xl`;
          count.innerText = post.likes.length;

          currentPostLikesUsers = post.likesUsers || [];
          const popupCount = document.getElementById('popup-like-count');
          if (popupCount) popupCount.innerText = post.likes.length;
          const usersList = document.getElementById('likes-users-list');
          if (usersList) usersList.innerHTML = renderLikesUsersList(currentPostLikesUsers);
        }
      } catch (err) {
        console.error(err);
      }
    }

// ============================================================================
// FONDO ANIMADO DE LA OBRA (JP Shader Editor)
// ----------------------------------------------------------------------------
// El fondo de la página lo elige el DUEÑO de la obra (campo `fondoShader` del
// posteo). El include NO va fijo en el HTML: se carga UNA sola vez desde acá,
// cuando ya sabemos qué obra es, y con la fuente que corresponde:
//
//   · obra con fondoShader → data-page="artedigitaldata-obra" + data-comp=<comp>
//   · sin fondoShader     → exactamente lo que declaraba el HTML del sitio
//                           (data-page="artedigitaldata" + artedigital-ascii)
//
// POR QUÉ UNA CLAVE DE PÁGINA DISTINTA (data-page) PARA LA OBRA CON FONDO:
// el include guarda en el SERVIDOR la fuente "fijada" de cada página y esa
// fuente fijada le GANA al data-comp del HTML (el sitio tiene fijado su fondo
// para la clave "alias:artedigitaldata", que es compartida por todas las
// secciones: por eso elegir con S en una sección vale para todas). Si la obra
// declarara su comp con data-page="artedigitaldata", la fuente fijada del sitio
// la taparía y el fondo elegido por el dueño nunca se vería. Con una clave
// propia ("artedigitaldata-obra") no hay fuente fijada que gane y la composición
// de la obra se aplica tal cual. Verificado en producción: en post.html el
// server devuelve fijado=true (shader:sancarlopoliroso6) e ignora el
// data-comp="artedigital-ascii" del HTML.
//
// Un solo canvas: el include se inyecta una única vez (bandera `fondoJPCargado`)
// y el engine reusa su propio #jpsi-canvas. No se duplica ni se pisa el fondo
// por defecto (misma declaración que el resto del sitio cuando no hay comp).
// ============================================================================
const JP_FONDO = {
  src: 'https://vps-4455523-x.dattaweb.com/jpshadereditor/include.js',
  pageObra: 'artedigitaldata-obra',   // clave sin fuente fijada → manda data-comp
  pageSitio: 'artedigitaldata',       // misma clave del resto del sitio (fondo fijado por el admin)
  compSitio: 'artedigital-ascii',
  passSitio: 'ascii1',
  compRe: /^[A-Za-z0-9._-]{1,120}$/    // mismo formato que valida el backend
};

let fondoJPCargado = false;

function cargarFondoJPShaditor(fondoShader) {
  if (fondoJPCargado) return;
  fondoJPCargado = true;

  const comp = typeof fondoShader === 'string' && JP_FONDO.compRe.test(fondoShader.trim())
    ? fondoShader.trim()
    : '';

  const s = document.createElement('script');
  s.src = JP_FONDO.src;
  s.async = false;
  s.setAttribute('data-keep-bg', '1');    // igual que las demás páginas del sitio
  s.setAttribute('data-fondo-obra', comp || 'sitio');
  if (comp) {
    s.setAttribute('data-page', JP_FONDO.pageObra);
    s.setAttribute('data-comp', comp);
  } else {
    s.setAttribute('data-page', JP_FONDO.pageSitio);
    s.setAttribute('data-comp', JP_FONDO.compSitio);
    s.setAttribute('data-pass', JP_FONDO.passSitio);
  }
  // Al final del body: document.currentScript del include queda apuntando a este
  // <script> (y si no, el fallback del engine toma el último del documento).
  document.body.appendChild(s);
}


/* Borrar obra: lo ve el autor y también el ADMIN (lo valida el backend) */
window.borrarObra = async function (postId) {
  if (!confirm('¿Estás seguro de que querés eliminar esta obra? No se puede deshacer.')) return;
  try {
    const res = await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
    if (res && res.ok) { alert('Obra eliminada'); window.location.href = 'obras.html'; }
    else { alert('No se pudo eliminar. ¿Tenés permiso?'); }
  } catch (e) { alert('Error al eliminar: ' + e.message); }
};
