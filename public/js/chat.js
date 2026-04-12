// Variables globales para que las funciones fuera de DOMContentLoaded puedan acceder
let socket;
let currentRoomId = null;
let currentTab = 'rooms'; // 'rooms' or 'private'
const user = getUser();

// Redirección si no está logueado (sin usar return en top-level)
if (!isLoggedIn()) { 
  showLogin(); 
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) return;

  socket = io(CONFIG.SOCKET_URL, { path: CONFIG.SOCKET_PATH });

  socket.on('newMessage', (msg) => {
    if (msg.room === currentRoomId) {
      appendMessage(msg);
    } else {
      if (currentTab === 'private') loadPrivateChats();
    }
  });

  await loadRooms();

  // User search logic
  const searchInput = document.getElementById('user-search');
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const q = e.target.value.trim();
      if (q.length < 2) {
        document.getElementById('search-results').classList.add('hidden');
        return;
      }
      searchTimeout = setTimeout(() => searchUsers(q), 300);
    });
  }

  const msgForm = document.getElementById('msg-form');
  if (msgForm) {
    msgForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('msg-input');
      const content = input.value.trim();
      if (!content || !currentRoomId || !user) return;

      socket.emit('chatMessage', { roomId: currentRoomId, senderId: user.id || user._id, content });
      input.value = '';
    });
  }

  const createRoomForm = document.getElementById('create-room-form');
  if (createRoomForm) {
    createRoomForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('room-name-input').value.trim();
      const description = document.getElementById('room-desc-input').value.trim();
      const res = await apiRequest('/chat/rooms', { method: 'POST', body: JSON.stringify({ name, description }) });
      if (res?.ok) {
        hideCreateRoom();
        await loadRooms();
      }
    });
  }
});

// --- FUNCIONES GLOBALES ---

window.setTab = function(tab) {
  currentTab = tab;
  const tabRooms = document.getElementById('tab-rooms');
  const tabPrivate = document.getElementById('tab-private');
  const searchContainer = document.getElementById('search-container');
  
  if (tab === 'rooms') {
    if (tabRooms) {
      tabRooms.classList.add('border-cyan-500', 'text-cyan-500');
      tabRooms.classList.remove('border-transparent', 'text-gray-500');
    }
    if (tabPrivate) {
      tabPrivate.classList.remove('border-cyan-500', 'text-cyan-500');
      tabPrivate.classList.add('border-transparent', 'text-gray-500');
    }
    if (searchContainer) searchContainer.classList.add('hidden');
    const newRoomBtn = document.getElementById('new-room-btn');
    if (newRoomBtn) newRoomBtn.classList.remove('hidden');
    loadRooms();
  } else {
    if (tabPrivate) {
      tabPrivate.classList.add('border-cyan-500', 'text-cyan-500');
      tabPrivate.classList.remove('border-transparent', 'text-gray-500');
    }
    if (tabRooms) {
      tabRooms.classList.remove('border-cyan-500', 'text-cyan-500');
      tabRooms.classList.add('border-transparent', 'text-gray-500');
    }
    if (searchContainer) searchContainer.classList.remove('hidden');
    const newRoomBtn = document.getElementById('new-room-btn');
    if (newRoomBtn) newRoomBtn.classList.add('hidden');
    loadPrivateChats();
  }
};

window.searchUsers = async function(q) {
  try {
    const res = await apiRequest(`/chat/users/search?q=${q}`);
    if (!res) return;
    const users = await res.json();
    const results = document.getElementById('search-results');
    
    if (!users.length) {
      results.innerHTML = '<div class="p-4 text-center text-xs text-gray-400">No se encontraron usuarios</div>';
    } else {
      results.innerHTML = users.map(u => `
        <button onclick="startPrivateChat('${u._id}', '${u.username}')" class="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-all text-left border-b border-white/5 last:border-0">
          <img src="${u.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.username}" class="w-8 h-8 rounded-full border border-cyan-500/30">
          <span class="text-sm text-white font-medium">${u.username}</span>
        </button>
      `).join('');
    }
    results.classList.remove('hidden');
  } catch (err) {
    console.error('Error searching users:', err);
  }
};

window.startPrivateChat = async function(recipientId, username) {
  document.getElementById('search-results').classList.add('hidden');
  const searchInput = document.getElementById('user-search');
  if (searchInput) searchInput.value = '';
  
  try {
    const res = await apiRequest('/chat/private', {
      method: 'POST',
      body: JSON.stringify({ recipientId })
    });
    if (!res) return;
    const room = await res.json();
    if (room._id) {
      joinRoom(room._id, username, 'Chat Privado');
      loadPrivateChats();
    }
  } catch (err) {
    console.error('Error starting private chat:', err);
  }
};

window.loadPrivateChats = async function() {
  const list = document.getElementById('rooms-list');
  try {
    const res = await apiRequest('/chat/private');
    if (!res) return;
    const chats = await res.json();

    if (!chats.length) {
      list.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm">No tienes mensajes privados aún. ¡Busca a alguien para chatear!</div>';
      return;
    }

    list.innerHTML = chats.map(c => {
      const otherUser = c.participants.find(p => p._id !== user.id);
      const name = otherUser?.username || 'Usuario';
      const avatar = otherUser?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + name;
      return `
        <button onclick="joinRoom('${c._id}', '${name}', 'Chat Privado')"
          class="room-btn w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all flex items-center gap-3 ${currentRoomId === c._id ? 'border border-cyan-500/30 bg-cyan-500/10' : ''}">
          <img src="${avatar}" class="w-10 h-10 rounded-full border border-white/10">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-white text-sm truncate">${name}</div>
            <div class="text-xs text-gray-500 truncate mt-0.5">Mensaje privado</div>
          </div>
        </button>
      `;
    }).join('');
  } catch (err) {
    list.innerHTML = '<div class="text-center text-red-400 py-4 text-sm">Error cargando mensajes</div>';
  }
};

window.loadRooms = async function() {
  const list = document.getElementById('rooms-list');
  try {
    const res = await apiRequest('/chat/rooms');
    if (!res) return;
    const rooms = await res.json();

    if (!rooms.length) {
      list.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm">No hay salas aún. ¡Crea la primera!</div>';
      return;
    }

    list.innerHTML = rooms.map(r => `
      <button onclick="joinRoom('${r._id}', '${r.name}', '${r.description || ''}')"
        class="room-btn w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all ${currentRoomId === r._id ? 'border border-cyan-500/30 bg-cyan-500/10' : ''}">
        <div class="flex-1 min-w-0">
          <div class="font-bold text-white text-sm truncate">${r.name}</div>
          <div class="text-[10px] text-gray-500 truncate mt-0.5 uppercase tracking-wider">${r.creator?.username || 'Anónimo'}</div>
        </div>
      </button>
    `).join('');
  } catch {
    list.innerHTML = '<div class="text-center text-red-400 py-4 text-sm">Error cargando salas</div>';
  }
};

window.joinRoom = async function(roomId, name, desc) {
  if (currentRoomId) socket.emit('leaveRoom', currentRoomId);
  currentRoomId = roomId;

  const roomNameEl = document.getElementById('room-name');
  if (roomNameEl) roomNameEl.textContent = name;
  const roomDescEl = document.getElementById('room-desc');
  if (roomDescEl) roomDescEl.textContent = desc;
  const chatInputArea = document.getElementById('chat-input-area');
  if (chatInputArea) chatInputArea.classList.remove('hidden');

  // Mobile: show chat, hide rooms
  const roomsPanel = document.getElementById('rooms-panel');
  if (roomsPanel) {
    roomsPanel.classList.add('hidden', 'md:flex');
    roomsPanel.classList.remove('flex');
  }
  const chatArea = document.getElementById('chat-area');
  if (chatArea) {
    chatArea.classList.remove('hidden');
    chatArea.classList.add('flex');
  }

  socket.emit('joinRoom', roomId);

  const container = document.getElementById('messages-container');
  if (container) {
    container.innerHTML = '<div class="text-center text-gray-500 py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando mensajes...</div>';

    try {
      const res = await apiRequest(`/chat/rooms/${roomId}/messages`);
      if (!res) {
          container.innerHTML = '<div class="text-center text-red-400 py-4">Sesión expirada</div>';
          return;
      }
      const messages = await res.json();
      container.innerHTML = '';
      messages.forEach(appendMessage);
      container.scrollTop = container.scrollHeight;
    } catch {
      container.innerHTML = '<div class="text-center text-red-400 py-4">Error cargando mensajes</div>';
    }
  }

  if (currentTab === 'rooms') await loadRooms();
  else await loadPrivateChats();
};

window.appendMessage = function(msg) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  const isMe = msg.sender?._id === user?.id || msg.sender === user?.id || msg.sender?._id === user?._id;
  const senderName = msg.sender?.username || 'Anónimo';
  const senderAvatar = msg.sender?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${senderName}`;
  const time = new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.className = `msg-bubble flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-6`;
  
  div.innerHTML = `
    <div class="flex-1 w-full max-w-[98%] rounded-[2rem] px-6 py-4 shadow-2xl transition-all hover:scale-[1.01] ${isMe ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-[#1a1a2e] border border-white/5'}">
      <div class="flex items-center gap-3 mb-3 border-b border-white/5 pb-2 ${isMe ? 'flex-row-reverse' : ''}">
        <img src="${senderAvatar}" class="w-8 h-8 rounded-xl border border-white/10 shadow-lg object-cover">
        <span class="text-sm font-black uppercase tracking-tighter ${isMe ? 'text-cyan-400' : 'text-magenta-400'}">
          ${isMe ? 'Tú' : senderName}
        </span>
      </div>
      <div class="text-sm sm:text-base text-white break-words whitespace-pre-wrap leading-relaxed opacity-90">${msg.content}</div>
      <div class="mt-3 flex items-center ${isMe ? 'justify-start' : 'justify-end'}">
        <span class="text-[10px] text-gray-500 font-mono opacity-40 uppercase tracking-widest">${time}</span>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
};

window.backToRooms = function() {
  const roomsPanel = document.getElementById('rooms-panel');
  if (roomsPanel) {
    roomsPanel.classList.remove('hidden', 'md:flex');
    roomsPanel.classList.add('flex');
  }
  const chatArea = document.getElementById('chat-area');
  if (chatArea) {
    chatArea.classList.add('hidden');
    chatArea.classList.remove('flex');
  }
};

window.showCreateRoom = function() {
  const modal = document.getElementById('create-room-modal');
  if (modal) modal.classList.remove('hidden');
};

window.hideCreateRoom = function() {
  const modal = document.getElementById('create-room-modal');
  if (modal) modal.classList.add('hidden');
};

window.showUsersModal = async function() {
  const modal = document.getElementById('users-modal');
  const list = document.getElementById('users-modal-list');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  if (list) {
    try {
      const res = await apiRequest('/chat/users/all');
      if (!res) return;
      const users = await res.json();
      
      list.innerHTML = users.map(u => `
        <div class="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-cyan-500/30 transition-all group">
          <img src="${u.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.username}" 
               class="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover:border-cyan-500/50 transition-all">
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-white truncate">${u.displayName || u.username}</h4>
            <p class="text-[10px] text-gray-500 truncate">@${u.username}</p>
          </div>
          <div class="flex gap-2">
            <a href="profile.html?user=${u.username}" class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-cyan-400 transition-all" title="Ver Perfil">
              <i class="fas fa-user text-xs"></i>
            </a>
            <button onclick="startDFromDirectory('${u._id}', '${u.username}')" 
                    class="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all" title="Enviar Mensaje">
              <i class="fas fa-comment-dots text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = '<div class="col-span-full text-center text-red-500">Error al cargar artistas</div>';
    }
  }
};

window.hideUsersModal = function() {
  const modal = document.getElementById('users-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.startDFromDirectory = async function(userId, username) {
  hideUsersModal();
  setTab('private');
  await startPrivateChat(userId, username);
};
