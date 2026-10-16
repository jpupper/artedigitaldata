let currentEventId = null;
    let currentEvent = null;
    let allTickets = [];
    let filteredTickets = [];
    let scanner = null;

    document.addEventListener('DOMContentLoaded', async () => {
      if (!isLoggedIn()) {
        showLogin();
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      currentEventId = urlParams.get('event');

      if (!currentEventId) {
        window.location.href = 'calendario.html';
        return;
      }

      await loadEvent();
    });

    async function loadEvent() {
      try {
        const res = await fetch(`${CONFIG.API_URL}/eventos/${currentEventId}`);
        if (!res.ok) throw new Error();
        const ev = await res.json();
        currentEvent = ev;

        // Check if user is creator, admin, or door user
        const userId = getUserId();
        const creatorId = ev.creator?._id || ev.creator;
        const isEventCreator = userId && creatorId && userId.toString() === creatorId.toString();
        const userIsAdmin = isAdmin();
        const isDoorUser = ev.doorUsers?.some(u => (u._id || u).toString() === userId);

        if (!isEventCreator && !userIsAdmin && !isDoorUser) {
          document.getElementById('loading').classList.add('hidden');
          document.getElementById('access-denied').classList.remove('hidden');
          return;
        }

        // Store permissions for UI control
        window.eventPermissions = { isEventCreator, userIsAdmin, isDoorUser };

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');

        document.getElementById('event-name').innerText = ev.title;
        document.getElementById('back-link').href = `evento.html?id=${ev._id}`;
        document.getElementById('view-event-link').href = `evento.html?id=${ev._id}`;

        // Show/hide sections based on permissions
        if (isEventCreator || userIsAdmin) {
          document.getElementById('door-users-section').classList.remove('hidden');
          document.getElementById('manual-ticket-section').classList.remove('hidden');
          renderDoorUsers(ev.doorUsers || []);
        }

        await Promise.all([loadTickets(), loadStats(), loadUsersForSelector()]);
      } catch (err) {
        console.error('Error loading event:', err);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('access-denied').classList.remove('hidden');
      }
    }

    // User search cache
    let allUsers = [];
    let selectedUser = null;

    // Load all users for search
    async function loadUsersForSelector() {
      try {
        const res = await apiRequest('/auth/users');
        if (!res.ok) throw new Error();
        allUsers = await res.json();
      } catch (err) {
        console.error('Error loading users:', err);
      }
    }

    // Search users function
    function searchUsers(query) {
      const resultsDiv = document.getElementById('user-search-results');

      if (!query.trim()) {
        resultsDiv.classList.add('hidden');
        return;
      }

      const lowerQuery = query.toLowerCase();
      const matches = allUsers.filter(user =>
        user.username.toLowerCase().includes(lowerQuery) ||
        (user.displayName && user.displayName.toLowerCase().includes(lowerQuery)) ||
        (user.email && user.email.toLowerCase().includes(lowerQuery))
      ).slice(0, 10); // Limit to 10 results

      if (matches.length === 0) {
        resultsDiv.innerHTML = `
          <div class="px-4 py-3 text-sm text-gray-500">
            <i class="fas fa-search mr-2"></i>No se encontraron usuarios
          </div>
        `;
      } else {
        resultsDiv.innerHTML = matches.map(user => {
          const displayName = escapeHTML(user.displayName || user.username);
          const initial = escapeHTML((user.displayName || user.username || '?')[0].toUpperCase());
          const avatar = sanitizeUrl(user.avatar);
          const avatarHtml = avatar
            ? `<img src="${avatar}" class="w-8 h-8 rounded-full object-cover" alt="${displayName}">`
            : `<div class="w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 text-xs font-bold">${initial}</div>`;
          const emailPart = user.email ? ` · ${escapeHTML(user.email)}` : '';
          return `
            <button type="button" onclick="selectUser('${user._id}')"
              class="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0">
              ${avatarHtml}
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white font-medium truncate">${displayName}</p>
                <p class="text-xs text-gray-500 truncate">@${escapeHTML(user.username)}${emailPart}</p>
              </div>
              <i class="fas fa-plus text-fuchsia-500 text-xs"></i>
            </button>
          `;
        }).join('');
      }

      resultsDiv.classList.remove('hidden');
    }

    // Select a user
    function selectUser(userId) {
      const picked = allUsers.find(u => u._id === userId);
      if (!picked) return;
      const displayName = picked.displayName || picked.username;
      const username = `@${picked.username}`;
      selectedUser = { _id: userId, displayName, username };
      document.getElementById('manual-owner-id').value = userId;

      // Show badge (textContent — no HTML injection)
      document.getElementById('selected-user-name').textContent = `${displayName} (${username})`;
      document.getElementById('selected-user-badge').classList.remove('hidden');
      document.getElementById('clear-user-btn').classList.remove('hidden');

      // Hide results and clear input
      document.getElementById('user-search-results').classList.add('hidden');
      document.getElementById('user-search-input').value = '';

      // Auto-fill data if empty
      const user = allUsers.find(u => u._id === userId);
      if (user) {
        const nameField = document.getElementById('manual-name');
        const emailField = document.getElementById('manual-email');

        if (!nameField.value) {
          nameField.value = user.displayName || user.username || '';
        }
        if (!emailField.value) {
          emailField.value = user.email || '';
        }
      }
    }

    // Clear selected user
    function clearSelectedUser() {
      selectedUser = null;
      document.getElementById('manual-owner-id').value = '';
      document.getElementById('selected-user-badge').classList.add('hidden');
      document.getElementById('clear-user-btn').classList.add('hidden');
      document.getElementById('user-search-input').value = '';
      document.getElementById('user-search-results').classList.add('hidden');
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      const container = document.querySelector('.relative:has(#user-search-input)');
      if (container && !container.contains(e.target)) {
        document.getElementById('user-search-results').classList.add('hidden');
      }
    });

    async function loadTickets() {
      try {
        const res = await apiRequest(`/tickets/event/${currentEventId}`);
        if (!res.ok) throw new Error();
        allTickets = await res.json();
        filterTickets();
      } catch (err) {
        console.error('Error loading tickets:', err);
      }
    }

    async function loadStats() {
      try {
        const res = await apiRequest(`/tickets/event/${currentEventId}/stats`);
        if (!res.ok) throw new Error();
        const stats = await res.json();

        document.getElementById('stat-total').innerText = stats.total || 0;
        document.getElementById('stat-completed').innerText = stats.completed || 0;
        document.getElementById('stat-redeemed').innerText = stats.redeemed || 0;
        document.getElementById('stat-pending').innerText = stats.pending || 0;
        
        // Calculate available tickets
        const maxTickets = currentEvent?.ticketConfig?.maxTickets || 100;
        const available = Math.max(0, maxTickets - (stats.total || 0));
        document.getElementById('stat-available').innerText = available;
        document.getElementById('stat-limit').innerText = `Límite: ${maxTickets}`;
        
        // Disable manual ticket button if sold out
        const manualBtn = document.getElementById('manual-ticket-btn');
        if (available === 0) {
          manualBtn.disabled = true;
          manualBtn.classList.add('opacity-50', 'cursor-not-allowed');
          manualBtn.innerHTML = '<i class="fas fa-ban"></i> SOLD OUT';
        } else {
          manualBtn.disabled = false;
          manualBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          manualBtn.innerHTML = '<i class="fas fa-plus"></i> Enviar Entrada Manual';
        }
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    }

    function filterTickets() {
      const search = document.getElementById('search-input').value.toLowerCase();
      const status = document.getElementById('filter-status').value;

      filteredTickets = allTickets.filter(t => {
        const matchesSearch = 
          t.code.toLowerCase().includes(search) ||
          (t.ownerName && t.ownerName.toLowerCase().includes(search)) ||
          (t.ownerEmail && t.ownerEmail.toLowerCase().includes(search));

        if (status === 'all') return matchesSearch;
        if (status === 'redeemed') return matchesSearch && t.redeemed;
        if (status === 'completed') return matchesSearch && !t.redeemed && (t.paymentStatus === 'completed' || t.paymentStatus === 'free');
        if (status === 'pending') return matchesSearch && !t.redeemed && t.paymentStatus === 'pending';

        return matchesSearch;
      });

      renderTickets();
    }

    function renderTickets() {
      const tbody = document.getElementById('tickets-tbody');
      const noTickets = document.getElementById('no-tickets');

      if (filteredTickets.length === 0) {
        tbody.innerHTML = '';
        noTickets.classList.remove('hidden');
        return;
      }

      noTickets.classList.add('hidden');

      tbody.innerHTML = filteredTickets.map(t => {
        let statusBadge, statusClass;
        if (t.redeemed) {
          statusBadge = '<i class="fas fa-check-double mr-1"></i>Canjeada';
          statusClass = 'bg-cyan-500/20 text-cyan-400';
        } else if (t.paymentStatus === 'completed' || t.paymentStatus === 'free') {
          statusBadge = '<i class="fas fa-check mr-1"></i>Válida';
          statusClass = 'bg-green-500/20 text-green-400';
        } else if (t.paymentStatus === 'pending') {
          statusBadge = '<i class="fas fa-clock mr-1"></i>Pendiente';
          statusClass = 'bg-yellow-500/20 text-yellow-400';
        } else {
          statusBadge = '<i class="fas fa-times mr-1"></i>Fallida';
          statusClass = 'bg-red-500/20 text-red-400';
        }

        const perms = window.eventPermissions || {};
        const canDelete = perms.isEventCreator || perms.userIsAdmin;

        return `
          <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="px-6 py-4 font-mono font-bold text-white">${escapeHTML(t.code)}</td>
            <td class="px-6 py-4">
              <div class="text-white font-medium">${escapeHTML(t.ownerName || 'Sin nombre')}</div>
              <div class="text-xs text-gray-500">${escapeHTML(t.ownerEmail || '')}</div>
              ${t.owner ? `
                <div class="mt-1 flex items-center gap-1">
                  <i class="fas fa-user-check text-fuchsia-500 text-xs"></i>
                  <a href="${sanitizeUrl('profile.html?user=' + (t.owner.username || t.owner))}" class="text-xs text-fuchsia-400 hover:text-fuchsia-300 font-medium">
                    @${escapeHTML(t.owner.username || 'usuario')}
                  </a>
                </div>
              ` : '<div class="mt-1 text-xs text-gray-600"><i class="fas fa-user-slash mr-1"></i>Sin usuario vinculado</div>'}
            </td>
            <td class="px-6 py-4">
              <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">
                ${statusBadge}
              </span>
            </td>
            <td class="px-6 py-4 text-gray-300 font-medium">
              ${t.amountPaid > 0
                ? `$${Number(t.amountPaid).toLocaleString('es-AR')} ARS`
                : (t.paymentStatus === 'free' 
                    ? '<span class="text-green-400">Gratis</span>' 
                    : (t.paymentStatus === 'pending' && currentEvent?.ticketConfig?.price > 0
                        ? `<span class="text-yellow-400">$${Number(currentEvent.ticketConfig.price).toLocaleString('es-AR')} ARS</span>`
                        : '<span class="text-gray-600">—</span>'))}
            </td>
            <td class="px-6 py-4 text-xs text-gray-500">${new Date(t.createdAt).toLocaleDateString('es-AR')}</td>
            <td class="px-6 py-4">
              <div class="flex gap-2">
                ${!t.redeemed && (t.paymentStatus === 'completed' || t.paymentStatus === 'free') ? `
                  <button onclick="redeemTicket('${t._id}')" class="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all text-xs font-bold">
                    <i class="fas fa-door-open mr-1"></i>Canjear
                  </button>
                ` : ''}
                ${!t.redeemed && t.paymentStatus === 'pending' && (perms.isEventCreator || perms.userIsAdmin) ? `
                  <button onclick="approvePayment('${t._id}')" class="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all text-xs font-bold" title="Aprobar pago manualmente">
                    <i class="fas fa-check mr-1"></i>Aprobar
                  </button>
                ` : ''}
                ${!t.redeemed && t.paymentStatus === 'pending' ? `
                  <button onclick="redeemTicket('${t._id}', true)" class="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all text-xs font-bold" title="Canjear aunque el pago esté pendiente">
                    <i class="fas fa-door-open mr-1"></i>Canjear
                  </button>
                ` : ''}
                <button onclick="viewTicket('${t._id}')" class="px-3 py-1 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-all text-xs">
                  <i class="fas fa-eye"></i>
                </button>
                ${canDelete ? `
                  <button onclick="deleteTicket('${t._id}')" class="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs">
                    <i class="fas fa-trash"></i>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    async function approvePayment(ticketId) {
      if (!confirm('¿Aprobar el pago de esta entrada manualmente? Esto la marcará como pagada aunque MercadoPago no lo haya confirmado aún.')) return;

      try {
        const res = await apiRequest(`/tickets/${ticketId}/approve-payment`, { method: 'POST' });
        if (res.ok) {
          await Promise.all([loadTickets(), loadStats()]);
        } else {
          const err = await res.json();
          alert(err.error || 'Error al aprobar pago');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    }

    async function redeemTicket(ticketId, isPending = false) {
      const msg = isPending
        ? '¿Canjear esta entrada aunque el pago está pendiente? El pago aún no fue confirmado por MercadoPago.'
        : '¿Marcar esta entrada como canjeada?';
      if (!confirm(msg)) return;

      try {
        const res = await apiRequest(`/tickets/${ticketId}/redeem`, { method: 'POST' });
        if (res.ok) {
          await Promise.all([loadTickets(), loadStats()]);
          alert('Entrada canjeada exitosamente');
        } else {
          const err = await res.json();
          alert(err.error || 'Error al canjear entrada');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    }

    async function deleteTicket(ticketId) {
      if (!confirm('¿Eliminar esta entrada permanentemente?')) return;

      try {
        const res = await apiRequest(`/tickets/${ticketId}`, { method: 'DELETE' });
        if (res.ok) {
          await Promise.all([loadTickets(), loadStats()]);
        } else {
          alert('Error al eliminar entrada');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    }

    function viewTicket(ticketId) {
      const ticket = allTickets.find(t => t._id === ticketId);
      if (!ticket) return;

      // Open ticket success page with ticket code
      window.open(`ticket-success.html?ticket=${ticket.code}`, '_blank');
    }

    // QR Scanner
    function showScanner() {
      const modal = document.getElementById('scanner-modal');
      modal.classList.remove('hidden');

      if (!scanner) {
        scanner = new Html5Qrcode('scanner-container');
      }

      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
      ).catch(err => {
        console.error('Scanner error:', err);
        alert('No se pudo iniciar la cámara. Podés ingresar el código manualmente.');
      });
    }

    function hideScanner() {
      const modal = document.getElementById('scanner-modal');
      modal.classList.add('hidden');

      if (scanner) {
        scanner.stop().catch(() => {});
      }
    }

    async function onScanSuccess(decodedText) {
      // Stop scanning
      if (scanner) {
        await scanner.stop().catch(() => {});
      }

      // Try to parse QR data
      let code;
      try {
        const data = JSON.parse(decodedText);
        code = data.code;
      } catch {
        code = decodedText;
      }

      await redeemByCode(code);
    }

    function onScanFailure(err) {
      // Ignore scan failures (happens frequently when no QR is in view)
    }

    async function redeemManual() {
      const code = document.getElementById('manual-code').value.trim();
      if (!code) return;
      await redeemByCode(code);
    }

    async function redeemByCode(code) {
      try {
        const res = await apiRequest('/tickets/redeem-by-code', {
          method: 'POST',
          body: JSON.stringify({ code })
        });

        const resultDiv = document.getElementById('scan-result');
        const iconDiv = document.getElementById('result-icon');
        const titleEl = document.getElementById('result-title');
        const messageEl = document.getElementById('result-message');
        const detailsEl = document.getElementById('result-details');

        resultDiv.classList.remove('hidden');

        if (res.ok) {
          const data = await res.json();
          iconDiv.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-green-500/20';
          iconDiv.innerHTML = '<i class="fas fa-check text-4xl text-green-500"></i>';
          titleEl.innerText = '¡Entrada Canjeada!';
          titleEl.className = 'text-xl font-bold text-green-400 mb-2';
          messageEl.innerText = 'La entrada ha sido marcada como canjeada exitosamente.';
          
          detailsEl.classList.remove('hidden');
          detailsEl.innerHTML = `
            <p class="text-sm"><strong>Código:</strong> ${escapeHTML(data.ticket.code)}</p>
            <p class="text-sm"><strong>Nombre:</strong> ${escapeHTML(data.ticket.ownerName || 'Sin nombre')}</p>
            ${data.ticket.redeemedAt ? `<p class="text-sm"><strong>Canjeada:</strong> ${new Date(data.ticket.redeemedAt).toLocaleString('es-AR')}</p>` : ''}
          `;

          await Promise.all([loadTickets(), loadStats()]);
        } else {
          const err = await res.json();
          iconDiv.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-red-500/20';
          iconDiv.innerHTML = '<i class="fas fa-times text-4xl text-red-500"></i>';
          titleEl.innerText = 'Error';
          titleEl.className = 'text-xl font-bold text-red-400 mb-2';
          messageEl.innerText = err.error || 'No se pudo canjear la entrada';
          detailsEl.classList.add('hidden');
        }
      } catch (err) {
        console.error('Error redeeming:', err);
      }
    }

    function closeScanResult() {
      document.getElementById('scan-result').classList.add('hidden');
      document.getElementById('manual-code').value = '';
      
      // Restart scanner
      if (scanner && !document.getElementById('scanner-modal').classList.contains('hidden')) {
        scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          onScanFailure
        ).catch(() => {});
      }
    }

    // Manual Ticket Functions
    function showManualTicketModal() {
      document.getElementById('manual-ticket-modal').classList.remove('hidden');
    }

    function closeManualTicketModal() {
      document.getElementById('manual-ticket-modal').classList.add('hidden');
      document.getElementById('manual-ticket-form').reset();
      clearSelectedUser();
    }

    async function issueManualTicket(e) {
      e.preventDefault();

      const name = document.getElementById('manual-name').value.trim();
      const email = document.getElementById('manual-email').value.trim();
      const phone = document.getElementById('manual-phone').value.trim();
      const ownerId = document.getElementById('manual-owner-id').value;

      try {
        const body = {
          ownerName: name,
          ownerEmail: email,
          ownerPhone: phone
        };

        // Only add ownerId if a user was selected
        if (ownerId) {
          body.ownerId = ownerId;
        }

        const res = await apiRequest(`/tickets/event/${currentEventId}/issue-manual`, {
          method: 'POST',
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const ticket = await res.json();
          const linkedUser = ticket.owner ? `\nVinculado a: @${ticket.owner.username}` : '';
          alert(`¡Entrada enviada exitosamente!\nCódigo: ${ticket.code}${linkedUser}`);
          closeManualTicketModal();
          await Promise.all([loadTickets(), loadStats()]);
        } else {
          const err = await res.json();
          alert(err.error || 'Error al enviar entrada');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    }

    // Send Emails Functions
    function showSendEmailsModal() {
      // Count eligible tickets
      const eligibleCount = allTickets.filter(t =>
        t.ownerEmail && t.ownerEmail.trim() !== '' &&
        (t.paymentStatus === 'completed' || t.paymentStatus === 'free')
      ).length;

      document.getElementById('send-emails-count').innerText = eligibleCount;
      document.getElementById('send-emails-confirm').classList.remove('hidden');
      document.getElementById('send-emails-loading').classList.add('hidden');
      document.getElementById('send-emails-result').classList.add('hidden');

      if (eligibleCount === 0) {
        document.getElementById('confirm-send-btn').disabled = true;
        document.getElementById('confirm-send-btn').classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        document.getElementById('confirm-send-btn').disabled = false;
        document.getElementById('confirm-send-btn').classList.remove('opacity-50', 'cursor-not-allowed');
      }

      document.getElementById('send-emails-modal').classList.remove('hidden');
    }

    function closeSendEmailsModal() {
      document.getElementById('send-emails-modal').classList.add('hidden');
    }

    async function sendBulkEmails() {
      document.getElementById('send-emails-confirm').classList.add('hidden');
      document.getElementById('send-emails-loading').classList.remove('hidden');

      try {
        const res = await apiRequest(`/tickets/event/${currentEventId}/send-emails`, {
          method: 'POST'
        });

        const data = await res.json();
        document.getElementById('send-emails-loading').classList.add('hidden');
        document.getElementById('send-emails-result').classList.remove('hidden');

        const iconDiv = document.getElementById('result-send-icon');
        const titleEl = document.getElementById('result-send-title');
        const messageEl = document.getElementById('result-send-message');
        const detailsEl = document.getElementById('result-send-details');

        if (res.ok) {
          iconDiv.className = 'w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 bg-green-500/20';
          iconDiv.innerHTML = '<i class="fas fa-check text-3xl text-green-400"></i>';
          titleEl.innerText = '¡Emails enviados!';
          titleEl.className = 'text-xl font-bold text-green-400 mb-2';
          messageEl.innerText = data.message;

          if (data.failed > 0) {
            detailsEl.classList.remove('hidden');
            detailsEl.innerHTML = `
              <p class="text-yellow-400 font-bold mb-2"><i class="fas fa-exclamation-triangle mr-1"></i> ${data.failed} email(s) fallaron:</p>
              ${(data.errors || []).map(e => `<p class="text-gray-500 text-xs">${escapeHTML(e)}</p>`).join('')}
            `;
          } else {
            detailsEl.classList.add('hidden');
          }
        } else {
          iconDiv.className = 'w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 bg-red-500/20';
          iconDiv.innerHTML = '<i class="fas fa-times text-3xl text-red-400"></i>';
          titleEl.innerText = 'Error';
          titleEl.className = 'text-xl font-bold text-red-400 mb-2';
          messageEl.innerText = data.error || 'Error al enviar emails';
          detailsEl.classList.add('hidden');
        }
      } catch (err) {
        document.getElementById('send-emails-loading').classList.add('hidden');
        document.getElementById('send-emails-result').classList.remove('hidden');

        const iconDiv = document.getElementById('result-send-icon');
        iconDiv.className = 'w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 bg-red-500/20';
        iconDiv.innerHTML = '<i class="fas fa-times text-3xl text-red-400"></i>';
        document.getElementById('result-send-title').innerText = 'Error de conexión';
        document.getElementById('result-send-title').className = 'text-xl font-bold text-red-400 mb-2';
        document.getElementById('result-send-message').innerText = 'No se pudo conectar con el servidor';
        document.getElementById('result-send-details').classList.add('hidden');
      }
    }

    // Door User Management Functions
    function renderDoorUsers(doorUsers) {
      const container = document.getElementById('door-users-list');
      if (!doorUsers || doorUsers.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm italic">No hay usuarios de puerta asignados</p>';
        return;
      }

      container.innerHTML = doorUsers.map(user => {
        const rawName = user.displayName || user.username || '?';
        const displayName = escapeHTML(rawName);
        const initial = escapeHTML(rawName[0].toUpperCase());
        const avatarUrl = sanitizeUrl(user.avatar);
        const avatar = user.avatar
          ? `<img src="${avatarUrl}" class="w-6 h-6 rounded-full object-cover" alt="${displayName}">`
          : `<div class="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">${initial}</div>`;

        return `
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            ${avatar}
            <span class="text-sm text-cyan-400">${displayName}</span>
            <button onclick="removeDoorUser('${user._id}')" class="ml-2 text-cyan-400 hover:text-red-400 transition-colors">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        `;
      }).join('');
    }

    function searchDoorUsers(query) {
      const resultsDiv = document.getElementById('door-user-results');

      if (!query.trim()) {
        resultsDiv.classList.add('hidden');
        return;
      }

      const lowerQuery = query.toLowerCase();
      const matches = allUsers.filter(user =>
        user.username.toLowerCase().includes(lowerQuery) ||
        (user.displayName && user.displayName.toLowerCase().includes(lowerQuery)) ||
        user.email.toLowerCase().includes(lowerQuery)
      ).slice(0, 10);

      if (matches.length === 0) {
        resultsDiv.innerHTML = `
          <div class="px-4 py-3 text-sm text-gray-500">
            <i class="fas fa-search mr-2"></i>No se encontraron usuarios
          </div>
        `;
      } else {
        resultsDiv.innerHTML = matches.map(user => {
          const rawName = user.displayName || user.username;
          const displayName = escapeHTML(rawName);
          const initial = escapeHTML((rawName || '?')[0].toUpperCase());
          const username = escapeHTML(user.username);
          const email = escapeHTML(user.email);
          const avatarUrl = sanitizeUrl(user.avatar);
          const avatar = user.avatar
            ? `<img src="${avatarUrl}" class="w-8 h-8 rounded-full object-cover" alt="${displayName}">`
            : `<div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">${initial}</div>`;

          // Check if user is already a door user
          const currentDoorUsers = currentEvent?.doorUsers || [];
          const isAlreadyDoorUser = currentDoorUsers.some(u => (u._id || u).toString() === user._id);

          if (isAlreadyDoorUser) {
            return `
              <div class="w-full px-4 py-3 text-left bg-white/5 flex items-center gap-3 border-b border-white/5 last:border-0 opacity-50">
                ${avatar}
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-white font-medium truncate">${displayName}</p>
                  <p class="text-xs text-gray-500 truncate">@${username} · Ya es puerta</p>
                </div>
                <i class="fas fa-check text-green-500 text-xs"></i>
              </div>
            `;
          }

          return `
            <button type="button" onclick="addDoorUser('${user._id}')"
              class="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0">
              ${avatar}
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white font-medium truncate">${displayName}</p>
                <p class="text-xs text-gray-500 truncate">@${username} · ${email}</p>
              </div>
              <i class="fas fa-plus text-cyan-500 text-xs"></i>
            </button>
          `;
        }).join('');
      }

      resultsDiv.classList.remove('hidden');
    }

    async function addDoorUser(userId) {
      document.getElementById('door-user-results').classList.add('hidden');
      document.getElementById('door-user-search').value = '';

      try {
        const res = await apiRequest(`/eventos/${currentEventId}/door-users`, {
          method: 'POST',
          body: JSON.stringify({ userId })
        });

        if (res.ok) {
          const data = await res.json();
          currentEvent.doorUsers = data.doorUsers;
          renderDoorUsers(data.doorUsers);
        } else {
          const err = await res.json();
          alert(err.error || 'Error al agregar usuario de puerta');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    }

    async function removeDoorUser(userId) {
      if (!confirm('¿Eliminar este usuario de puerta?')) return;

      try {
        const res = await apiRequest(`/eventos/${currentEventId}/door-users/${userId}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          const data = await res.json();
          currentEvent.doorUsers = data.doorUsers;
          renderDoorUsers(data.doorUsers);
        } else {
          const err = await res.json();
          alert(err.error || 'Error al eliminar usuario de puerta');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    }

    // Close door user search results when clicking outside
    document.addEventListener('click', (e) => {
      const container = document.getElementById('door-users-section');
      if (container && !container.contains(e.target)) {
        document.getElementById('door-user-results').classList.add('hidden');
      }
    });
