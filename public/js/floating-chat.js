// Floating Mini Chat Widget — Arte Digital Data
(function() {
  // Do not run on the dedicated chat page
  if (window.location.pathname.includes('chat.html') || window.location.pathname.endsWith('/chat')) {
    return;
  }

  let floatSocket = null;
  let floatCurrentRoomId = null;
  let floatCurrentTab = 'rooms'; // 'rooms' or 'private'
  let floatUnreadCount = 0;
  let floatRoomsCache = {};
  let floatPrivateChatsCache = {};
  let floatUserSearchCache = {};
  let isWindowOpen = false;

  function getActiveUser() {
    return typeof getUser === 'function' ? getUser() : null;
  }

  function userIsLoggedIn() {
    return typeof isLoggedIn === 'function' && isLoggedIn();
  }

  function initFloatingChat() {
    if (document.getElementById('floating-chat-root')) return;

    const root = document.createElement('div');
    root.id = 'floating-chat-root';
    root.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col items-end font-sans';

    root.innerHTML = `
      <!-- Notification toast popup -->
      <div id="floating-chat-toast" class="hidden mb-3 max-w-xs bg-[#12121c] border border-cyan-500/40 rounded-2xl p-3 shadow-[0_0_25px_rgba(6,182,212,0.25)] text-white text-xs cursor-pointer hover:border-cyan-400 transition-all">
        <div class="flex items-center justify-between mb-1">
          <span id="float-toast-title" class="font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fas fa-comment-dots"></i> Nuevo mensaje
          </span>
          <span class="text-[10px] text-gray-500">Ahora</span>
        </div>
        <p id="float-toast-body" class="text-gray-300 truncate"></p>
      </div>

      <!-- Floating Window -->
      <div id="floating-chat-window" class="hidden w-[340px] sm:w-[380px] h-[480px] max-h-[82vh] bg-[#0d0d14]/95 border border-cyan-500/30 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex-col overflow-hidden mb-3 transition-all duration-300">
        
        <!-- Header -->
        <div class="p-3.5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <button id="float-back-btn" class="hidden w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors">
              <i class="fas fa-arrow-left text-xs"></i>
            </button>
            <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
            <div class="min-w-0">
              <h4 id="float-header-title" class="text-xs font-black text-white uppercase tracking-wider truncate">Chat en Vivo</h4>
              <p id="float-header-subtitle" class="text-[10px] text-gray-400 truncate">Comunidad Arte Digital Data</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <a href="${(window.CONFIG ? CONFIG.BASE : '')}/chat.html" target="_blank" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 flex items-center justify-center transition-colors" title="Abrir en pantalla completa">
              <i class="fas fa-expand-alt text-[10px]"></i>
            </a>
            <button id="float-close-btn" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 flex items-center justify-center transition-colors" title="Minimizar">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>

        <!-- Body: Tab / Room List View -->
        <div id="float-list-view" class="flex-1 flex flex-col min-h-0">
          <div class="flex border-b border-white/10 shrink-0 bg-black/20">
            <button id="float-tab-rooms" class="flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider border-b-2 border-cyan-500 text-cyan-400 transition-colors">
              Salas
            </button>
            <button id="float-tab-private" class="flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider border-b-2 border-transparent text-gray-400 hover:text-white transition-colors">
              Mensajes
            </button>
          </div>

          <!-- Private Search Input (shown when on private tab) -->
          <div id="float-search-container" class="hidden p-2.5 border-b border-white/10 bg-white/5 relative shrink-0">
            <div class="relative">
              <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]"></i>
              <input type="text" id="float-user-search" placeholder="Buscar artista..."
                class="w-full bg-black/40 border border-white/10 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500">
            </div>
            <div id="float-search-results" class="hidden absolute left-2.5 right-2.5 top-full mt-1 bg-gray-950 border border-cyan-500/30 rounded-xl overflow-hidden z-50 shadow-2xl max-h-48 overflow-y-auto"></div>
          </div>

          <!-- Rooms / Chats list -->
          <div id="float-items-list" class="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            <div class="text-center text-gray-500 py-10 text-xs">Cargando salas...</div>
          </div>
        </div>

        <!-- Body: Chat Room View -->
        <div id="float-room-view" class="hidden flex-1 flex-col min-h-0">
          <div id="float-messages" class="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            <div class="text-center text-gray-600 py-12">
              <i class="fas fa-comments text-2xl text-cyan-400/30 mb-2"></i>
              <p>Inicia la conversación</p>
            </div>
          </div>

          <form id="float-msg-form" class="p-2.5 border-t border-white/10 bg-white/5 flex gap-2 shrink-0">
            <input type="text" id="float-msg-input" placeholder="Escribe un mensaje..." autocomplete="off"
              class="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400">
            <button type="submit" class="w-9 h-9 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 flex items-center justify-center transition-all shrink-0">
              <i class="fas fa-paper-plane text-xs"></i>
            </button>
          </form>
        </div>
      </div>

      <!-- Toggle Button -->
      <button id="floating-chat-toggle" class="relative group w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-fuchsia-600 text-white flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all border border-white/20" title="Abrir Chat en Vivo">
        <i class="fas fa-comments text-xl group-hover:rotate-6 transition-transform"></i>
        <span id="floating-chat-badge" class="hidden absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0d0d14] shadow animate-bounce">0</span>
      </button>
    `;

    document.body.appendChild(root);

    // Event listeners
    const toggleBtn = document.getElementById('floating-chat-toggle');
    const closeBtn = document.getElementById('float-close-btn');
    const backBtn = document.getElementById('float-back-btn');
    const toast = document.getElementById('floating-chat-toast');
    const tabRooms = document.getElementById('float-tab-rooms');
    const tabPrivate = document.getElementById('float-tab-private');
    const searchInput = document.getElementById('float-user-search');
    const msgForm = document.getElementById('float-msg-form');

    toggleBtn.addEventListener('click', toggleFloatingWindow);
    closeBtn.addEventListener('click', closeFloatingWindow);
    toast.addEventListener('click', () => {
      openFloatingWindow();
      hideToast();
    });

    backBtn.addEventListener('click', () => {
      showListView();
      if (floatCurrentTab === 'rooms') loadRoomsList();
      else loadPrivateList();
    });

    tabRooms.addEventListener('click', () => {
      setTabMode('rooms');
    });

    tabPrivate.addEventListener('click', () => {
      setTabMode('private');
    });

    let searchTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const q = e.target.value.trim();
      if (q.length < 2) {
        document.getElementById('float-search-results').classList.add('hidden');
        return;
      }
      searchTimer = setTimeout(() => searchUsersForPrivate(q), 300);
    });

    msgForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('float-msg-input');
      const content = input.value.trim();
      const u = getActiveUser();
      if (!content || !floatCurrentRoomId || !u || !floatSocket) return;

      floatSocket.emit('chatMessage', {
        roomId: floatCurrentRoomId,
        senderId: u.id || u._id,
        content
      });
      input.value = '';
    });

    initSocketConnection();
  }

  function toggleFloatingWindow() {
    if (isWindowOpen) closeFloatingWindow();
    else openFloatingWindow();
  }

  function openFloatingWindow() {
    if (!userIsLoggedIn()) {
      if (typeof showLogin === 'function') showLogin();
      return;
    }
    const win = document.getElementById('floating-chat-window');
    win.classList.remove('hidden');
    win.classList.add('flex');
    isWindowOpen = true;
    hideToast();
    clearBadge();

    if (!floatCurrentRoomId) {
      showListView();
      if (floatCurrentTab === 'rooms') loadRoomsList();
      else loadPrivateList();
    }
  }

  function closeFloatingWindow() {
    const win = document.getElementById('floating-chat-window');
    win.classList.add('hidden');
    win.classList.remove('flex');
    isWindowOpen = false;
  }

  function showListView() {
    document.getElementById('float-list-view').classList.remove('hidden');
    document.getElementById('float-room-view').classList.add('hidden');
    document.getElementById('float-room-view').classList.remove('flex');
    document.getElementById('float-back-btn').classList.add('hidden');
    document.getElementById('float-header-title').textContent = 'Chat en Vivo';
    document.getElementById('float-header-subtitle').textContent = 'Comunidad Arte Digital Data';
    floatCurrentRoomId = null;
  }

  function showRoomView(roomId, title, subtitle) {
    document.getElementById('float-list-view').classList.add('hidden');
    const roomView = document.getElementById('float-room-view');
    roomView.classList.remove('hidden');
    roomView.classList.add('flex');
    document.getElementById('float-back-btn').classList.remove('hidden');
    document.getElementById('float-header-title').textContent = title || 'Sala de Chat';
    document.getElementById('float-header-subtitle').textContent = subtitle || '';
    floatCurrentRoomId = roomId;

    if (floatSocket) {
      floatSocket.emit('joinRoom', roomId);
    }
    loadRoomMessages(roomId);
  }

  function setTabMode(tab) {
    floatCurrentTab = tab;
    const tabRooms = document.getElementById('float-tab-rooms');
    const tabPrivate = document.getElementById('float-tab-private');
    const searchContainer = document.getElementById('float-search-container');

    if (tab === 'rooms') {
      tabRooms.classList.add('border-cyan-500', 'text-cyan-400');
      tabRooms.classList.remove('border-transparent', 'text-gray-400');
      tabPrivate.classList.remove('border-cyan-500', 'text-cyan-400');
      tabPrivate.classList.add('border-transparent', 'text-gray-400');
      searchContainer.classList.add('hidden');
      loadRoomsList();
    } else {
      tabPrivate.classList.add('border-cyan-500', 'text-cyan-400');
      tabPrivate.classList.remove('border-transparent', 'text-gray-400');
      tabRooms.classList.remove('border-cyan-500', 'text-cyan-400');
      tabRooms.classList.add('border-transparent', 'text-gray-400');
      searchContainer.classList.remove('hidden');
      loadPrivateList();
    }
  }

  async function loadRoomsList() {
    const list = document.getElementById('float-items-list');
    try {
      const res = await apiRequest('/chat/rooms');
      if (!res || !res.ok) {
        list.innerHTML = '<div class="text-center text-gray-500 py-8">No se pudieron cargar las salas.</div>';
        return;
      }
      const rooms = await res.json();
      if (!rooms.length) {
        list.innerHTML = '<div class="text-center text-gray-500 py-8">No hay salas disponibles.</div>';
        return;
      }

      floatRoomsCache = {};
      list.innerHTML = rooms.map(r => {
        floatRoomsCache[r._id] = r;
        return `
          <button onclick="window.floatingChatJoinRoom('${r._id}')" class="w-full text-left p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all flex items-center justify-between group">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-white text-xs truncate group-hover:text-cyan-400 transition-colors"># ${escapeHTML(r.name)}</div>
              <div class="text-[10px] text-gray-500 truncate">${escapeHTML(r.description || 'Sala pública')}</div>
            </div>
            <i class="fas fa-chevron-right text-[10px] text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all"></i>
          </button>
        `;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div class="text-center text-rose-400 py-8">Error al cargar salas.</div>';
    }
  }

  async function loadPrivateList() {
    const list = document.getElementById('float-items-list');
    const u = getActiveUser();
    if (!u) return;

    try {
      const res = await apiRequest('/chat/private');
      if (!res || !res.ok) {
        list.innerHTML = '<div class="text-center text-gray-500 py-8">No se pudieron cargar los chats.</div>';
        return;
      }
      const chats = await res.json();
      if (!chats.length) {
        list.innerHTML = '<div class="text-center text-gray-500 py-8">No tienes chats privados aún. ¡Busca un usuario arriba!</div>';
        return;
      }

      floatPrivateChatsCache = {};
      list.innerHTML = chats.map(c => {
        const other = (c.participants || []).find(p => (p._id || p) !== (u.id || u._id)) || {};
        const name = other.username || 'Usuario';
        const avatar = other.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;
        floatPrivateChatsCache[c._id] = { name, otherId: other._id };

        return `
          <button onclick="window.floatingChatJoinPrivate('${c._id}')" class="w-full text-left p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all flex items-center gap-2.5 group">
            <img src="${sanitizeUrl(avatar)}" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent('${escapeHTML(name)}')" class="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-white text-xs truncate group-hover:text-cyan-400 transition-colors">@${escapeHTML(name)}</div>
              <div class="text-[10px] text-gray-500 truncate">Mensaje directo</div>
            </div>
          </button>
        `;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div class="text-center text-rose-400 py-8">Error al cargar mensajes.</div>';
    }
  }

  async function searchUsersForPrivate(q) {
    const results = document.getElementById('float-search-results');
    try {
      const res = await apiRequest(`/chat/users/search?q=${encodeURIComponent(q)}`);
      if (!res || !res.ok) return;
      const users = await res.json();

      if (!users.length) {
        results.innerHTML = '<div class="p-3 text-center text-[10px] text-gray-400">No se encontraron artistas</div>';
      } else {
        floatUserSearchCache = {};
        users.forEach(u => { floatUserSearchCache[u._id] = u; });
        results.innerHTML = users.map(u => `
          <button onclick="window.floatingChatStartPrivate('${u._id}')" class="w-full flex items-center gap-2 p-2 hover:bg-white/10 text-left border-b border-white/5 last:border-0 transition-colors">
            <img src="${sanitizeUrl(u.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.username)}" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent('${escapeHTML(u.username)}')" class="w-6 h-6 rounded-full object-cover border border-cyan-500/30 shrink-0">
            <span class="text-xs text-white truncate font-medium">${escapeHTML(u.displayName || u.username)}</span>
          </button>
        `).join('');
      }
      results.classList.remove('hidden');
    } catch (e) {}
  }

  async function loadRoomMessages(roomId) {
    const container = document.getElementById('float-messages');
    container.innerHTML = '<div class="text-center text-gray-500 py-10"><i class="fas fa-circle-notch fa-spin text-cyan-400"></i></div>';

    try {
      const res = await apiRequest(`/chat/rooms/${roomId}/messages`);
      if (!res || !res.ok) {
        container.innerHTML = '<div class="text-center text-gray-500 py-10">No se pudieron cargar los mensajes.</div>';
        return;
      }
      const messages = await res.json();
      container.innerHTML = '';
      if (!messages.length) {
        container.innerHTML = `
          <div class="text-center text-gray-600 py-12">
            <i class="fas fa-comments text-2xl text-cyan-400/30 mb-2"></i>
            <p>Aún no hay mensajes. ¡Di hola!</p>
          </div>`;
        return;
      }

      messages.forEach(msg => appendFloatMessage(msg));
      container.scrollTop = container.scrollHeight;
    } catch (e) {
      container.innerHTML = '<div class="text-center text-rose-400 py-10">Error al cargar mensajes.</div>';
    }
  }

  function appendFloatMessage(msg) {
    const container = document.getElementById('float-messages');
    const u = getActiveUser();
    const myId = u ? (u.id || u._id) : null;
    const isMe = msg.sender?._id === myId || msg.sender === myId;
    const senderName = msg.sender?.username || 'Anónimo';
    const senderAvatar = msg.sender?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${senderName}`;
    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';

    const div = document.createElement('div');
    div.className = `flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`;

    div.innerHTML = `
      <img src="${sanitizeUrl(senderAvatar)}" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent('${escapeHTML(senderName)}')" class="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0">
      <div class="max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${isMe ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30 rounded-br-none' : 'bg-white/10 text-gray-200 border border-white/10 rounded-bl-none'}">
        ${!isMe ? `<div class="text-[9px] font-bold text-magenta-400 mb-0.5 truncate">${escapeHTML(senderName)}</div>` : ''}
        <div class="break-words whitespace-pre-wrap">${escapeHTML(msg.content)}</div>
        <div class="text-[8px] text-gray-500 text-right mt-1 font-mono">${time}</div>
      </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function initSocketConnection() {
    if (floatSocket || !userIsLoggedIn()) return;
    const u = getActiveUser();
    if (!u) return;

    try {
      floatSocket = io(CONFIG.SOCKET_URL, { path: CONFIG.SOCKET_PATH });

      floatSocket.on('connect', () => {
        const uid = u.id || u._id;
        floatSocket.emit('joinUserRoom', uid);
        if (floatCurrentRoomId) {
          floatSocket.emit('joinRoom', floatCurrentRoomId);
        }
      });

      floatSocket.on('newMessage', (msg) => {
        if (msg.room === floatCurrentRoomId) {
          appendFloatMessage(msg);
        } else {
          incrementBadge();
          if (floatCurrentTab === 'private') loadPrivateList();
        }
      });

      floatSocket.on('privateMessage', (data) => {
        const senderName = data?.sender?.displayName || data?.sender?.username || 'Alguien';
        const text = data?.message?.content || 'Te envió un mensaje privado';
        showToast(senderName, text);
        incrementBadge();
        if (floatCurrentTab === 'private') loadPrivateList();
      });

    } catch (e) {
      console.warn('[FloatingChat] Error connecting socket:', e);
    }
  }

  function showToast(sender, text) {
    if (isWindowOpen) return;
    const toast = document.getElementById('floating-chat-toast');
    const title = document.getElementById('float-toast-title');
    const body = document.getElementById('float-toast-body');
    if (!toast || !title || !body) return;

    title.innerHTML = `<i class="fas fa-comment-dots"></i> ${escapeHTML(sender)}`;
    body.textContent = text;
    toast.classList.remove('hidden');

    setTimeout(hideToast, 5000);
  }

  function hideToast() {
    const toast = document.getElementById('floating-chat-toast');
    if (toast) toast.classList.add('hidden');
  }

  function incrementBadge() {
    floatUnreadCount++;
    const badge = document.getElementById('floating-chat-badge');
    if (badge) {
      badge.textContent = floatUnreadCount > 99 ? '99+' : floatUnreadCount;
      badge.classList.remove('hidden');
    }
  }

  function clearBadge() {
    floatUnreadCount = 0;
    const badge = document.getElementById('floating-chat-badge');
    if (badge) {
      badge.classList.add('hidden');
    }
  }

  // Global window functions for inline onclick handlers
  window.floatingChatJoinRoom = function(id) {
    const r = floatRoomsCache[id];
    showRoomView(id, r ? r.name : 'Sala de Chat', r ? r.description : '');
  };

  window.floatingChatJoinPrivate = function(id) {
    const c = floatPrivateChatsCache[id];
    showRoomView(id, c ? `@${c.name}` : 'Mensaje Directo', 'Chat Privado');
  };

  window.floatingChatStartPrivate = async function(recipientId) {
    document.getElementById('float-search-results').classList.add('hidden');
    document.getElementById('float-user-search').value = '';
    const u = floatUserSearchCache[recipientId];
    try {
      const res = await apiRequest('/chat/private', {
        method: 'POST',
        body: JSON.stringify({ recipientId })
      });
      if (!res || !res.ok) return;
      const room = await res.json();
      if (room._id) {
        showRoomView(room._id, u ? `@${u.username}` : 'Mensaje Directo', 'Chat Privado');
      }
    } catch (e) {}
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initFloatingChat, 600);
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'artedigitaldata_token' && e.newValue) {
      initFloatingChat();
    }
  });

})();
