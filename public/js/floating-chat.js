// Floating Docked Chat Widget — Arte Digital Data
// Permite chatear en tiempo real mientras se scrollea cualquier página del sitio
(function() {
  // No ejecutar en la página dedicada de chat completo
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.includes('chat.html') || pathname.endsWith('/chat')) {
    return;
  }

  // Evitar doble inicialización
  if (window.__floatingChatInitialized) return;
  window.__floatingChatInitialized = true;

  let floatSocket = null;
  let floatCurrentRoomId = null;
  let floatCurrentTab = 'private'; // 'private' (Mensajes, por defecto) | 'rooms'
  let floatUnreadCount = parseInt(localStorage.getItem('add_floating_chat_unread') || '0', 10) || 0;
  let floatRoomsCache = {};
  let floatPrivateChatsCache = {};
  let floatUserSearchCache = {};
  let isWindowOpen = true; // Abierto por defecto para permitir chatear mientras se scrollea

  function getActiveUser() {
    return typeof getUser === 'function' ? getUser() : null;
  }

  function userIsLoggedIn() {
    return typeof isLoggedIn === 'function' && isLoggedIn();
  }

  // Asegurar Socket.IO en páginas que no lo importan directamente
  function ensureSocketIO(callback) {
    if (typeof io !== 'undefined') {
      callback();
      return;
    }
    const existing = document.querySelector('script[src*="socket.io"]');
    if (existing) {
      existing.addEventListener('load', callback);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
    script.onload = callback;
    document.head.appendChild(script);
  }

  function initFloatingChat() {
    if (document.getElementById('floating-chat-root')) return;

    // Verificar preferencia guardada en localStorage (minimizado por defecto)
    const savedState = localStorage.getItem('add_floating_chat_state');
    if (savedState === 'open') {
      isWindowOpen = true;
    } else {
      isWindowOpen = false;
    }

    const root = document.createElement('div');
    root.id = 'floating-chat-root';
    root.innerHTML = `
      <style>
        #floating-chat-root {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 99999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          pointer-events: none;
        }
        #floating-chat-window, #floating-chat-dock, #floating-chat-toast {
          pointer-events: auto;
        }
        .float-dock-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: rgba(13, 13, 20, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(0, 242, 254, 0.2);
          color: #00f2fe;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 0;
          outline: none;
        }
        .float-dock-btn:hover {
          transform: translateY(-2px);
          background: rgba(18, 18, 28, 0.98);
          border-color: rgba(0, 242, 254, 0.6);
          color: #38bdf8;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.75), 0 0 18px rgba(0, 242, 254, 0.32);
        }
        .float-dock-btn:active {
          transform: translateY(0) scale(0.96);
        }
        .float-dock-icon {
          transition: transform 0.2s ease;
        }
        .float-dock-btn:hover .float-dock-icon {
          transform: scale(1.08);
        }
        .float-dock-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 17px;
          height: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ef4444;
          color: #ffffff;
          font-size: 9px;
          font-weight: 900;
          border-radius: 5px;
          padding: 0 4px;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.3);
          pointer-events: none;
        }
        .float-chat-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .float-chat-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .float-chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 242, 254, 0.25);
          border-radius: 4px;
        }
        .float-chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 242, 254, 0.5);
        }
        @keyframes floatPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.9); }
        }
        .float-live-pulse {
          animation: floatPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      </style>

      <!-- Toast de mensaje entrante si la ventana está minimizada -->
      <div id="floating-chat-toast" style="display: none; margin-bottom: 10px; max-width: 320px; background: rgba(13, 13, 20, 0.95); border: 1px solid rgba(0,242,254,0.35); border-radius: 12px; padding: 10px 14px; box-shadow: 0 12px 30px rgba(0,0,0,0.8), 0 0 15px rgba(0,242,254,0.15); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); color: #fff; font-size: 12px; cursor: pointer; transition: all 0.25s ease;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <span id="float-toast-title" style="font-weight: 800; color: #00f2fe; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /></svg>
            Nuevo mensaje
          </span>
          <span style="font-size: 9px; color: #64748b;">Ahora</span>
        </div>
        <p id="float-toast-body" style="color: #cbd5e1; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px;"></p>
      </div>

      <!-- Ventana de Chat Flotante / Emergente -->
      <div id="floating-chat-window" style="display: ${isWindowOpen ? 'flex' : 'none'}; width: 360px; max-width: calc(100vw - 32px); height: 500px; max-height: calc(85vh - 32px); background: rgba(12, 12, 18, 0.96); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; box-shadow: 0 24px 60px rgba(0,0,0,0.85), 0 0 1px 1px rgba(0,242,254,0.22); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); flex-direction: column; overflow: hidden; margin-bottom: 0; transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;">
        
        <!-- Header de la ventana -->
        <div style="padding: 11px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.02); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <button id="float-back-btn" style="display: none; width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8; cursor: pointer; align-items: center; justify-content: center; transition: all 0.2s;" title="Volver a la lista">
              <i class="fas fa-arrow-left" style="font-size: 11px;"></i>
            </button>
            <div class="float-live-pulse" style="width: 8px; height: 8px; border-radius: 50%; background: #00f2fe; box-shadow: 0 0 8px #00f2fe; flex-shrink: 0;"></div>
            <div style="min-width: 0;">
              <h4 id="float-header-title" style="margin: 0; font-size: 12px; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Chat en Vivo</h4>
              <p id="float-header-subtitle" style="margin: 0; font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Arte Digital Data</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <a href="${(window.CONFIG ? CONFIG.BASE : '')}/chat.html" target="_blank" style="width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.06); color: #94a3b8; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s;" title="Abrir en pantalla completa">
              <i class="fas fa-expand-alt" style="font-size: 11px;"></i>
            </a>
            <button id="float-minimize-btn" style="width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.06); color: #94a3b8; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" title="Minimizar">
              <i class="fas fa-minus" style="font-size: 11px;"></i>
            </button>
          </div>
        </div>

        <!-- Vista cuando NO está logueado -->
        <div id="float-guest-view" style="display: none; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center;">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.25); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: #00f2fe;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
            </svg>
          </div>
          <h3 style="margin: 0 0 6px 0; color: #fff; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Comunidad en Vivo</h3>
          <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 11px; line-height: 1.5; max-width: 260px;">
            Inicia sesión para chatear con otros artistas y creadores en tiempo real.
          </p>
          <div style="display: flex; gap: 8px; width: 100%; max-width: 240px;">
            <a href="${(window.CONFIG ? CONFIG.BASE : '')}/login.html" style="flex: 1; padding: 10px; background: #00f2fe; color: #000; font-weight: 800; font-size: 11px; border-radius: 10px; text-decoration: none; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">
              Ingresar
            </a>
            <a href="${(window.CONFIG ? CONFIG.BASE : '')}/register.html" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-weight: 800; font-size: 11px; border-radius: 10px; text-decoration: none; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">
              Crear Cuenta
            </a>
          </div>
        </div>

        <!-- Vista de Lista de Salas / Chats Privados -->
        <div id="float-list-view" style="display: flex; flex: 1; flex-direction: column; min-height: 0;">
          <div style="display: flex; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0,0,0,0.25); flex-shrink: 0;">
            <button id="float-tab-private" style="flex: 1; padding: 10px; background: none; border: none; border-bottom: 2px solid #00f2fe; color: #00f2fe; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s;">
              Mensajes
            </button>
            <button id="float-tab-rooms" style="flex: 1; padding: 10px; background: none; border: none; border-bottom: 2px solid transparent; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s;">
              Salas
            </button>
          </div>

          <!-- Buscador de Usuarios para Chat Privado -->
          <div id="float-search-container" style="display: none; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); position: relative; flex-shrink: 0;">
            <div style="position: relative;">
              <i class="fas fa-search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 10px;"></i>
              <input type="text" id="float-user-search" placeholder="Buscar artista para chatear..." style="width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 10px 6px 28px; font-size: 11px; color: #fff; outline: none;">
            </div>
            <div id="float-search-results" style="display: none; position: absolute; left: 10px; right: 10px; top: calc(100% + 4px); background: #090910; border: 1px solid rgba(0,242,254,0.3); border-radius: 12px; z-index: 100; max-height: 180px; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.9);" class="float-chat-scrollbar"></div>
          </div>

          <!-- Contenedor scrollable de salas/chats -->
          <div id="float-items-list" style="flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 8px; display: flex; flex-direction: column; gap: 4px;" class="float-chat-scrollbar">
            <div style="text-align: center; color: #64748b; padding: 40px 0; font-size: 11px;">Cargando salas...</div>
          </div>
        </div>

        <!-- Vista de Conversación Activa dentro de una Sala/Chat -->
        <div id="float-room-view" style="display: none; flex: 1; flex-direction: column; min-height: 0;">
          <!-- Contenedor de mensajes con scroll independiente de la página -->
          <div id="float-messages" style="flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 12px; display: flex; flex-direction: column; gap: 8px; font-size: 11px;" class="float-chat-scrollbar">
            <div style="text-align: center; color: #64748b; padding: 50px 0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: rgba(0,242,254,0.3); margin-bottom: 8px; display: inline-block;">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
              </svg>
              <div>Inicia la conversación</div>
            </div>
          </div>

          <!-- Formulario de envío de mensajes -->
          <form id="float-msg-form" style="padding: 10px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.3); display: flex; gap: 8px; flex-shrink: 0; margin: 0;">
            <input type="text" id="float-msg-input" placeholder="Escribe un mensaje..." autocomplete="off" style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 8px 12px; font-size: 11px; color: #fff; outline: none; transition: border-color 0.2s;">
            <button type="submit" style="width: 36px; height: 36px; border-radius: 10px; background: #00f2fe; border: none; color: #000; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: transform 0.15s, background-color 0.15s;" title="Enviar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>

      </div>

      <!-- Dock Bar / Botón Emergente Cuadrado Minimalista -->
      <button id="floating-chat-dock" class="float-dock-btn" style="display: ${isWindowOpen ? 'none' : 'flex'};" title="Chat en Vivo" aria-label="Abrir chat">
        <svg class="float-dock-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
        </svg>
        <span id="floating-chat-badge" class="float-dock-badge" style="display: ${floatUnreadCount > 0 ? 'flex' : 'none'};">${floatUnreadCount > 99 ? '99+' : floatUnreadCount}</span>
      </button>
    `;

    document.body.appendChild(root);
    updateBadge();

    // Conectar eventos
    const dockBtn = document.getElementById('floating-chat-dock');
    const minimizeBtn = document.getElementById('float-minimize-btn');
    const backBtn = document.getElementById('float-back-btn');
    const toast = document.getElementById('floating-chat-toast');
    const tabRooms = document.getElementById('float-tab-rooms');
    const tabPrivate = document.getElementById('float-tab-private');
    const searchInput = document.getElementById('float-user-search');
    const msgForm = document.getElementById('float-msg-form');
    const msgInput = document.getElementById('float-msg-input');

    dockBtn.addEventListener('click', expandFloatingChat);
    minimizeBtn.addEventListener('click', minimizeFloatingChat);

    toast.addEventListener('click', () => {
      expandFloatingChat();
      hideToast();
    });

    backBtn.addEventListener('click', () => {
      showListView();
      if (floatCurrentTab === 'rooms') loadRoomsList();
      else loadPrivateList();
    });

    tabRooms.addEventListener('click', () => setTabMode('rooms'));
    tabPrivate.addEventListener('click', () => setTabMode('private'));

    let searchTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const q = e.target.value.trim();
      if (q.length < 2) {
        document.getElementById('float-search-results').style.display = 'none';
        return;
      }
      searchTimer = setTimeout(() => searchUsersForPrivate(q), 300);
    });

    msgForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const content = msgInput.value.trim();
      const u = getActiveUser();
      if (!content || !floatCurrentRoomId || !u || !floatSocket) return;

      floatSocket.emit('chatMessage', {
        roomId: floatCurrentRoomId,
        senderId: u.id || u._id,
        content
      });
      msgInput.value = '';
    });

    updateBadge();

    // Si el usuario está logueado, conectar socket e inicializar datos
    if (userIsLoggedIn()) {
      ensureSocketIO(initSocketConnection);
      if (isWindowOpen) {
        loadPrivateList();
      }
    } else {
      // Si no está logueado, mostrar la vista informativa para invitados
      showGuestView();
    }
  }

  function expandFloatingChat() {
    isWindowOpen = true;
    localStorage.setItem('add_floating_chat_state', 'open');
    document.getElementById('floating-chat-window').style.display = 'flex';
    document.getElementById('floating-chat-dock').style.display = 'none';
    hideToast();
    clearBadge();

    if (!userIsLoggedIn()) {
      showGuestView();
      return;
    }

    ensureSocketIO(initSocketConnection);

    if (!floatCurrentRoomId) {
      showListView();
      if (floatCurrentTab === 'rooms') loadRoomsList();
      else loadPrivateList();
    }
  }

  function minimizeFloatingChat() {
    isWindowOpen = false;
    localStorage.setItem('add_floating_chat_state', 'minimized');
    document.getElementById('floating-chat-window').style.display = 'none';
    document.getElementById('floating-chat-dock').style.display = 'flex';
    updateBadge();
  }

  function showGuestView() {
    document.getElementById('float-guest-view').style.display = 'flex';
    document.getElementById('float-list-view').style.display = 'none';
    document.getElementById('float-room-view').style.display = 'none';
    document.getElementById('float-back-btn').style.display = 'none';
  }

  function showListView() {
    document.getElementById('float-guest-view').style.display = 'none';
    document.getElementById('float-list-view').style.display = 'flex';
    document.getElementById('float-room-view').style.display = 'none';
    document.getElementById('float-back-btn').style.display = 'none';
    document.getElementById('float-header-title').textContent = 'Chat en Vivo';
    document.getElementById('float-header-subtitle').textContent = 'Arte Digital Data';
    floatCurrentRoomId = null;
  }

  function showRoomView(roomId, title, subtitle) {
    document.getElementById('float-guest-view').style.display = 'none';
    document.getElementById('float-list-view').style.display = 'none';
    const roomView = document.getElementById('float-room-view');
    roomView.style.display = 'flex';
    document.getElementById('float-back-btn').style.display = 'flex';
    document.getElementById('float-header-title').textContent = title || 'Sala';
    document.getElementById('float-header-subtitle').textContent = subtitle || 'En vivo';
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
      tabRooms.style.borderBottomColor = '#00f2fe';
      tabRooms.style.color = '#00f2fe';
      tabPrivate.style.borderBottomColor = 'transparent';
      tabPrivate.style.color = '#64748b';
      searchContainer.style.display = 'none';
      loadRoomsList();
    } else {
      tabPrivate.style.borderBottomColor = '#00f2fe';
      tabPrivate.style.color = '#00f2fe';
      tabRooms.style.borderBottomColor = 'transparent';
      tabRooms.style.color = '#64748b';
      searchContainer.style.display = 'block';
      loadPrivateList();
    }
  }

  async function loadRoomsList() {
    const list = document.getElementById('float-items-list');
    try {
      const res = await apiRequest('/chat/rooms');
      if (!res || !res.ok) {
        list.innerHTML = '<div style="text-align: center; color: #64748b; padding: 30px 0; font-size: 11px;">No se pudieron cargar las salas.</div>';
        return;
      }
      const rooms = await res.json();
      if (!rooms.length) {
        list.innerHTML = '<div style="text-align: center; color: #64748b; padding: 30px 0; font-size: 11px;">No hay salas disponibles.</div>';
        return;
      }

      floatRoomsCache = {};
      list.innerHTML = rooms.map(r => {
        floatRoomsCache[r._id] = r;
        return `
          <button onclick="window.floatingChatJoinRoom('${r._id}')" style="width: 100%; text-align: left; padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,242,254,0.08)';this.style.borderColor='rgba(0,242,254,0.3)';" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.06)';">
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 700; color: #fff; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"># ${escapeHTML(r.name)}</div>
              <div style="font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(r.description || 'Sala de discusión')}</div>
            </div>
            <i class="fas fa-chevron-right" style="font-size: 9px; color: #64748b; margin-left: 6px;"></i>
          </button>
        `;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div style="text-align: center; color: #f43f5e; padding: 30px 0; font-size: 11px;">Error al cargar salas.</div>';
    }
  }

  async function loadPrivateList() {
    const list = document.getElementById('float-items-list');
    const u = getActiveUser();
    if (!u) return;

    try {
      const res = await apiRequest('/chat/private');
      if (!res || !res.ok) {
        list.innerHTML = '<div style="text-align: center; color: #64748b; padding: 30px 0; font-size: 11px;">No se pudieron cargar los chats.</div>';
        return;
      }
      const chats = await res.json();
      if (!chats.length) {
        list.innerHTML = '<div style="text-align: center; color: #64748b; padding: 30px 0; font-size: 11px;">Aún no tienes mensajes directos.<br>Busca un artista arriba para iniciar uno.</div>';
        return;
      }

      floatPrivateChatsCache = {};
      list.innerHTML = chats.map(c => {
        const other = (c.participants || []).find(p => (p._id || p) !== (u.id || u._id)) || {};
        const name = other.username || 'Usuario';
        floatPrivateChatsCache[c._id] = { name, otherId: other._id };

        return `
          <button onclick="window.floatingChatJoinPrivate('${c._id}')" style="width: 100%; text-align: left; padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,242,254,0.08)';this.style.borderColor='rgba(0,242,254,0.3)';" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.06)';">
            ${window.GenerativeAvatar ? window.GenerativeAvatar.markup({ username: name, avatar: other.avatar }, { className: 'w-7 h-7 rounded-full object-cover border border-white/15 shrink-0' }) : `<img src="${sanitizeUrl(other.avatar || '')}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">`}
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 700; color: #fff; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">@${escapeHTML(name)}</div>
              <div style="font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Mensaje directo</div>
            </div>
          </button>
        `;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div style="text-align: center; color: #f43f5e; padding: 30px 0; font-size: 11px;">Error al cargar mensajes.</div>';
    }
  }

  async function searchUsersForPrivate(q) {
    const results = document.getElementById('float-search-results');
    try {
      const res = await apiRequest(`/chat/users/search?q=${encodeURIComponent(q)}`);
      if (!res || !res.ok) return;
      const users = await res.json();

      if (!users.length) {
        results.innerHTML = '<div style="padding: 10px; text-align: center; font-size: 10px; color: #64748b;">No se encontraron artistas</div>';
      } else {
        floatUserSearchCache = {};
        users.forEach(u => { floatUserSearchCache[u._id] = u; });
        results.innerHTML = users.map(u => `
          <button onclick="window.floatingChatStartPrivate('${u._id}')" style="width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: none; border: none; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: left; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.08)';" onmouseout="this.style.background='none';">
            ${window.GenerativeAvatar ? window.GenerativeAvatar.markup(u, { className: 'w-6 h-6 rounded-full object-cover shrink-0' }) : `<img src="${sanitizeUrl(u.avatar || '')}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">`}
            <span style="font-size: 11px; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(u.displayName || u.username)}</span>
          </button>
        `).join('');
      }
      results.style.display = 'block';
    } catch (e) {}
  }

  async function loadRoomMessages(roomId) {
    const container = document.getElementById('float-messages');
    container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 40px 0;"><i class="fas fa-circle-notch fa-spin" style="color: #00f2fe;"></i></div>';

    try {
      const res = await apiRequest(`/chat/rooms/${roomId}/messages`);
      if (!res || !res.ok) {
        container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 40px 0;">No se pudieron cargar los mensajes.</div>';
        return;
      }
      const messages = await res.json();
      container.innerHTML = '';
      if (!messages.length) {
        container.innerHTML = `
          <div style="text-align: center; color: #64748b; padding: 40px 0;">
            <i class="fas fa-comments" style="font-size: 24px; color: rgba(0,242,254,0.3); margin-bottom: 8px; display: block;"></i>
            Aún no hay mensajes. ¡Di hola!
          </div>`;
        return;
      }

      messages.forEach(msg => appendFloatMessage(msg));
      container.scrollTop = container.scrollHeight;
    } catch (e) {
      container.innerHTML = '<div style="text-align: center; color: #f43f5e; padding: 40px 0;">Error al cargar mensajes.</div>';
    }
  }

  function appendFloatMessage(msg) {
    const container = document.getElementById('float-messages');
    const u = getActiveUser();
    const myId = u ? (u.id || u._id) : null;
    const isMe = msg.sender?._id === myId || msg.sender === myId;
    const senderName = msg.sender?.username || 'Anónimo';
    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';

    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.flexDirection = isMe ? 'row-reverse' : 'row';
    div.style.alignItems = 'flex-end';

    div.innerHTML = `
      ${window.GenerativeAvatar ? window.GenerativeAvatar.markup({ username: senderName, avatar: msg.sender?.avatar }, { className: 'w-6 h-6 rounded-full object-cover border border-white/15 shrink-0' }) : `<img src="${sanitizeUrl(msg.sender?.avatar || '')}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">`}
      <div style="max-width: 76%; border-radius: 14px; padding: 6px 10px; font-size: 11px; line-height: 1.4; ${isMe ? 'background: rgba(0,242,254,0.15); color: #e0f2fe; border: 1px solid rgba(0,242,254,0.3); border-bottom-right-radius: 2px;' : 'background: rgba(255,255,255,0.08); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); border-bottom-left-radius: 2px;'}">
        ${!isMe ? `<div style="font-size: 9px; font-weight: 800; color: #e040fb; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(senderName)}</div>` : ''}
        <div style="word-break: break-word; white-space: pre-wrap;">${escapeHTML(msg.content)}</div>
        <div style="font-size: 8px; color: #64748b; text-align: right; margin-top: 2px; font-family: monospace;">${time}</div>
      </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function initSocketConnection() {
    if (floatSocket || !userIsLoggedIn() || typeof io === 'undefined') return;
    const u = getActiveUser();
    if (!u) return;

    try {
      floatSocket = io(CONFIG.SOCKET_URL, { path: CONFIG.SOCKET_PATH, auth: { token: localStorage.getItem('artedigitaldata_token') || '' } });

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
      console.warn('[FloatingChat] Error socket:', e);
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
    toast.style.display = 'block';

    setTimeout(hideToast, 5000);
  }

  function hideToast() {
    const toast = document.getElementById('floating-chat-toast');
    if (toast) toast.style.display = 'none';
  }

  // El contador vive sobre el icono: solo visible cuando hay mensajes sin leer.
  function updateBadge() {
    const badge = document.getElementById('floating-chat-badge');
    if (!badge) return;
    badge.textContent = floatUnreadCount > 99 ? '99+' : String(floatUnreadCount);
    const hasUnread = floatUnreadCount > 0;
    badge.style.display = hasUnread ? 'flex' : 'none';
  }

  function persistUnread() {
    try { localStorage.setItem('add_floating_chat_unread', String(floatUnreadCount)); } catch (e) {}
  }

  function incrementBadge() {
    floatUnreadCount++;
    persistUnread();
    updateBadge();
  }

  function clearBadge() {
    floatUnreadCount = 0;
    persistUnread();
    updateBadge();
  }

  // Funciones globales expuestas para onclicks inline
  window.floatingChatJoinRoom = function(id) {
    const r = floatRoomsCache[id];
    showRoomView(id, r ? r.name : 'Sala', r ? r.description : '');
  };

  window.floatingChatJoinPrivate = function(id) {
    const c = floatPrivateChatsCache[id];
    showRoomView(id, c ? `@${c.name}` : 'Mensaje Directo', 'Chat Privado');
  };

  window.floatingChatStartPrivate = async function(recipientId) {
    document.getElementById('float-search-results').style.display = 'none';
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initFloatingChat, 400));
  } else {
    setTimeout(initFloatingChat, 400);
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'artedigitaldata_token' && e.newValue) {
      initFloatingChat();
    }
  });

})();
