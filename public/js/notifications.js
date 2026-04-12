// Notifications system — persistent DB-backed + socket live events
let notificationSocket = null;
let notificationInitialized = false;

// ─── Socket init ──────────────────────────────────────────────────────────────
function initNotifications() {
  if (!isLoggedIn()) return;
  if (notificationInitialized) return;

  const user = getUser();
  if (!user || !(user.id || user._id)) return;

  notificationSocket = io(CONFIG.SOCKET_URL, { path: CONFIG.SOCKET_PATH });

  notificationSocket.on('connect', () => {
    const userId = user.id || user._id;
    notificationSocket.emit('joinUserRoom', userId);
  });

  notificationSocket.on('ticketRedeemed', (data) => {
    showBrowserNotification('Entrada Canjeada', data.message);
  });

  notificationSocket.on('disconnect', () => {});

  notificationInitialized = true;
}

// ─── Browser native notification ─────────────────────────────────────────────
function showBrowserNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/img/artedigital.png' });
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ─── Profile section: load & render ──────────────────────────────────────────
async function loadUserNotifications() {
  const container = document.getElementById('user-notifications');
  if (!container) return;

  try {
    const res = await apiRequest('/notifications');
    if (!res || !res.ok) throw new Error('Error al cargar notificaciones');
    const notifications = await res.json();
    renderNotifications(notifications);
    updateNotifBadge(notifications);
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-10">
          <i class="fas fa-exclamation-circle text-3xl text-red-400/50 mb-3"></i>
          <p>Error al cargar notificaciones</p>
        </div>`;
    }
  }
}

function updateNotifBadge(notifications) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const unread = notifications.filter(n => !n.read).length;
  if (unread > 0) {
    badge.textContent = unread > 99 ? '99+' : unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function getNotifMeta(n) {
  const typeMap = {
    like_post:        { icon: 'fa-heart',          color: 'text-fuchsia-400',  label: 'le dio like a tu obra' },
    like_recurso:     { icon: 'fa-heart',          color: 'text-orange-400',   label: 'le dio like a tu recurso' },
    like_evento:      { icon: 'fa-heart',          color: 'text-red-400',      label: 'le dio like a tu evento' },
    private_message:  { icon: 'fa-envelope',       color: 'text-cyan-400',     label: 'te envió un mensaje privado' },
    ticket_purchased: { icon: 'fa-ticket-alt',     color: 'text-green-400',    label: 'Entrada confirmada' },
    ticket_sold:      { icon: 'fa-money-bill-wave', color: 'text-yellow-400',  label: 'Se vendió una entrada' },
  };
  return typeMap[n.type] || { icon: 'fa-bell', color: 'text-gray-400', label: 'Notificación' };
}

function getNotifLink(n) {
  if (n.type === 'like_post')        return `${CONFIG.BASE}/post.html?id=${n.resourceId}`;
  if (n.type === 'like_recurso')     return `${CONFIG.BASE}/recurso.html?id=${n.resourceId}`;
  if (n.type === 'like_evento')      return `${CONFIG.BASE}/evento.html?id=${n.resourceId}`;
  if (n.type === 'private_message')  return `${CONFIG.BASE}/chat.html`;
  if (n.type === 'ticket_purchased') return `${CONFIG.BASE}/ticket-success.html?ticket=${n.resourceId}`;
  if (n.type === 'ticket_sold')      return `${CONFIG.BASE}/event-tickets.html`;
  return '#';
}

function renderNotifications(notifications) {
  const container = document.getElementById('user-notifications');
  if (!container) return;

  if (!notifications.length) {
    container.innerHTML = `
      <div class="text-center text-gray-500 py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
        <i class="fas fa-bell-slash text-4xl text-gray-600 mb-3"></i>
        <p>No tenés notificaciones todavía</p>
      </div>`;
    return;
  }

  container.innerHTML = notifications.map(n => {
    const meta = getNotifMeta(n);
    const link = getNotifLink(n);
    const actorAvatar = n.actorAvatar
      ? `<img src="${n.actorAvatar}" class="w-10 h-10 rounded-full object-cover" alt="">`
      : `<div class="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-gray-400 text-sm font-bold">${(n.actorName || '?')[0].toUpperCase()}</div>`;
    const timeAgo = formatTimeAgo(n.createdAt);
    const unreadClass = n.read ? '' : 'border-l-2 border-yellow-400 bg-yellow-400/5';

    let bodyText = '';
    if (['like_post', 'like_recurso', 'like_evento'].includes(n.type)) {
      bodyText = `<span class="font-semibold text-white">${n.actorName || 'Alguien'}</span> ${meta.label}${n.resourceTitle ? `: <em class="text-gray-300">"${n.resourceTitle}"</em>` : ''}`;
    } else if (n.type === 'private_message') {
      bodyText = `<span class="font-semibold text-white">${n.actorName || 'Alguien'}</span> ${meta.label}${n.message ? `: <span class="text-gray-400 italic">"${n.message}"</span>` : ''}`;
    } else {
      bodyText = n.message || meta.label;
    }

    return `
      <div class="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 flex items-start gap-4 hover:border-white/20 transition-all ${unreadClass}" data-notif-id="${n._id}">
        <div class="shrink-0">${actorAvatar}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <i class="fas ${meta.icon} ${meta.color} text-sm"></i>
            <span class="text-xs text-gray-500">${timeAgo}</span>
            ${!n.read ? '<span class="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>' : ''}
          </div>
          <p class="text-sm text-gray-300 leading-relaxed">${bodyText}</p>
          ${link !== '#' ? `
            <a href="${link}" class="inline-flex items-center gap-1 mt-2 text-xs font-bold ${meta.color} hover:underline" onclick="markNotifRead('${n._id}')">
              <i class="fas fa-arrow-right text-[10px]"></i>Ver
            </a>` : ''}
        </div>
      </div>`;
  }).join('');
}

async function markNotifRead(id) {
  await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
}

async function markAllNotificationsRead() {
  await apiRequest('/notifications/mark-all-read', { method: 'PATCH' }).catch(() => {});
  await loadUserNotifications();
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Ahora';
  if (mins < 60)  return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days < 7)   return `Hace ${days} d`;
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initNotifications();
    requestNotificationPermission();
  }, 800);
});

window.addEventListener('storage', (e) => {
  if (e.key === 'artedigitaldata_token' && e.newValue && !notificationInitialized) {
    initNotifications();
  }
});
