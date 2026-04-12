// Global notifications system using Socket.io
let notificationSocket = null;
let notificationInitialized = false;

// Initialize notifications when user is logged in
function initNotifications() {
  if (!isLoggedIn()) return;
  if (notificationInitialized) return;

  const user = getUser();
  if (!user || !(user.id || user._id)) return;

  // Connect to socket
  notificationSocket = io(CONFIG.SOCKET_URL, { path: CONFIG.SOCKET_PATH });

  notificationSocket.on('connect', () => {
    console.log('[Notifications] Connected to socket');
    
    // Join user-specific room for notifications
    const userId = user.id || user._id;
    notificationSocket.emit('joinUserRoom', userId);
    console.log('[Notifications] Joined room for user:', userId);
  });

  // Listen for ticket redemption notifications
  notificationSocket.on('ticketRedeemed', (data) => {
    console.log('[Notifications] Ticket redeemed:', data);
    showTicketNotification(data);
  });

  notificationSocket.on('disconnect', () => {
    console.log('[Notifications] Disconnected from socket');
  });

  notificationInitialized = true;
}

// Show a browser notification + in-app toast
function showTicketNotification(data) {
  const { eventTitle, message, eventId } = data;
  
  // Show browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Entrada Canjeada', {
      body: message,
      icon: '/img/artedigital.png',
      tag: 'ticket-redeemed'
    });
  }
  
  // Show in-app toast notification
  showToast(message, 'success', eventId);
}

// Show a toast notification
function showToast(message, type = 'info', eventId = null) {
  // Remove existing toast if any
  const existingToast = document.getElementById('ticket-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'ticket-toast';
  toast.className = `fixed top-20 right-4 z-[9999] max-w-sm rounded-2xl border p-4 shadow-2xl animate-slide-in ${
    type === 'success' 
      ? 'bg-green-500/10 border-green-500/30 text-green-400' 
      : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
  }`;
  
  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="shrink-0">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} text-xl"></i>
      </div>
      <div class="flex-1">
        <p class="font-bold text-white mb-1">${type === 'success' ? 'Entrada Canjeada' : 'Notificación'}</p>
        <p class="text-sm text-gray-300">${message}</p>
        ${eventId ? `
          <a href="evento.html?id=${eventId}" class="inline-flex items-center gap-1 mt-2 text-xs font-bold text-fuchsia-400 hover:text-fuchsia-300">
            <i class="fas fa-external-link-alt"></i>Ver Evento
          </a>
        ` : ''}
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-white shrink-0">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('[Notifications] Permission:', permission);
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure auth is loaded
  setTimeout(() => {
    initNotifications();
    requestNotificationPermission();
  }, 1000);
});

// Re-initialize on auth state change (after login)
window.addEventListener('storage', (e) => {
  if (e.key === 'artedigitaldata_token') {
    if (e.newValue && !notificationInitialized) {
      initNotifications();
    }
  }
});
