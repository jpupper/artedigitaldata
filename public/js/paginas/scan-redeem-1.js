let currentTicket = null;
    let currentEvent = null;
    let scanner = null;
    let isAuthorized = false;

    document.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const ticketCode = urlParams.get('code');

      if (ticketCode) {
        // Code provided in URL - load ticket directly
        await loadTicket(ticketCode.toUpperCase());
      } else {
        // No code - show scanner
        showScanner();
      }
    });

    function showScanner() {
      hideAllSections();
      document.getElementById('scanner-section').classList.remove('hidden');
      
      // Initialize scanner
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
        // Don't show alert - let user use manual input
      });
    }

    function hideScanner() {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    }

    async function onScanSuccess(decodedText) {
      // Stop scanning
      hideScanner();

      // Try to parse QR data
      let code;
      try {
        const data = JSON.parse(decodedText);
        code = data.code;
      } catch {
        // If not JSON, check if it's a URL
        if (decodedText.includes('scan-redeem.html') || decodedText.includes('?code=')) {
          // Extract code from URL
          try {
            const url = new URL(decodedText);
            code = url.searchParams.get('code');
          } catch {
            // Not a valid URL, use raw text
            code = decodedText;
          }
        } else {
          // Just the raw code
          code = decodedText;
        }
      }

      if (code) {
        await loadTicket(code.toUpperCase());
      }
    }

    function onScanFailure(err) {
      // Ignore scan failures (happens frequently when no QR is in view)
    }

    function loadTicketByCode() {
      const code = document.getElementById('manual-code-input').value.trim();
      if (!code) {
        showResult('error', 'Ingresá un código', 'Por favor ingresá el código de la entrada.');
        return;
      }
      loadTicket(code.toUpperCase());
    }

    async function loadTicket(code) {
      hideAllSections();
      document.getElementById('loading').classList.remove('hidden');

      try {
        const res = await fetch(`${CONFIG.API_URL}/tickets/code/${code}`);
        
        if (!res.ok) {
          hideAllSections();
          document.getElementById('error-code-display').innerText = `Código: ${code}`;
          document.getElementById('error-section').classList.remove('hidden');
          return;
        }

        const ticket = await res.json();
        currentTicket = ticket;
        currentEvent = ticket.event;

        // Check authorization
        checkAuthorization();

        // Render ticket
        renderTicket();

        hideAllSections();
        document.getElementById('ticket-section').classList.remove('hidden');
        document.getElementById('ticket-card').classList.remove('hidden');
        document.getElementById('actions').classList.remove('hidden');
      } catch (err) {
        console.error('Error loading ticket:', err);
        hideAllSections();
        document.getElementById('error-code-display').innerText = `Código: ${code}`;
        document.getElementById('error-section').classList.remove('hidden');
      }
    }

    function checkAuthorization() {
      // Not logged in -> redirect to home
      if (!isLoggedIn()) {
        window.location.href = 'index.html';
        return;
      }

      const user = getUser();
      const event = currentEvent;
      const ticket = currentTicket;

      if (!event || !user || !ticket) {
        isAuthorized = false;
        return;
      }

      // Get user ID (handle both _id and id fields)
      const userId = user._id || user.id;
      if (!userId) {
        isAuthorized = false;
        return;
      }

      // Check if user can redeem (creator, admin, door user)
      const eventCreatorId = event.creator?._id?.toString() || event.creator?.toString();
      const isCreator = eventCreatorId === userId.toString();
      const isAdmin = user.role === 'ADMINISTRADOR' || user.role === 'ADMIN';
      const isDoorUser = event.doorUsers?.some(id => id.toString() === userId.toString());

      // Check if user is the ticket owner
      const ticketOwnerId = ticket.owner?._id?.toString() || ticket.owner?.toString();
      const isTicketOwner = ticketOwnerId === userId.toString() || 
                            (ticket.ownerEmail && user.email && ticket.ownerEmail.toLowerCase() === user.email.toLowerCase());

      // Can redeem if creator, admin, or door user
      const canRedeem = isCreator || isAdmin || isDoorUser;
      
      // Can view if can redeem OR is the ticket owner
      const canView = canRedeem || isTicketOwner;

      isAuthorized = canRedeem;

      // If not authorized to view -> redirect to home
      if (!canView) {
        window.location.href = 'index.html';
        return;
      }

      // Update role text
      let roleText = '';
      if (isCreator) roleText = 'creador del evento';
      else if (isAdmin) roleText = 'administrador';
      else if (isDoorUser) roleText = 'usuario de puerta';
      else if (isTicketOwner) roleText = 'dueño de la entrada';
      document.getElementById('user-role-text').innerText = roleText;
    }

    function renderTicket() {
      const ticket = currentTicket;
      const event = currentEvent;

      // Event info
      document.getElementById('event-title').innerText = event.title;
      document.getElementById('event-link').href = `evento.html?id=${event._id || event.id}`;
      document.getElementById('event-date').querySelector('span').innerText = new Date(event.date).toLocaleDateString('es-AR', { 
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      // Ticket code
      document.getElementById('ticket-code').innerText = ticket.code;

      // Status badge
      const statusBadge = document.getElementById('ticket-status-badge');
      if (ticket.redeemed) {
        statusBadge.innerHTML = `
          <div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-500/20 text-gray-400">
            <i class="fas fa-check-double"></i>
            <span class="font-bold">Entrada Canjeada</span>
            <span class="text-sm ml-auto">${new Date(ticket.redeemedAt).toLocaleString('es-AR')}</span>
          </div>
        `;
      } else if (ticket.paymentStatus === 'pending') {
        statusBadge.innerHTML = `
          <div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/20 text-yellow-400">
            <i class="fas fa-clock"></i>
            <span class="font-bold">Pago Pendiente</span>
          </div>
        `;
      } else {
        statusBadge.innerHTML = `
          <div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 text-green-400">
            <i class="fas fa-check-circle"></i>
            <span class="font-bold">Entrada Válida</span>
          </div>
        `;
      }

      // Owner info
      const ownerInfo = document.getElementById('owner-info');
      ownerInfo.innerHTML = `
        <p><strong>Nombre:</strong> ${escapeHTML(ticket.ownerName || 'No especificado')}</p>
        <p><strong>Email:</strong> ${escapeHTML(ticket.ownerEmail || 'No especificado')}</p>
        ${ticket.ownerPhone ? `<p><strong>Teléfono:</strong> ${escapeHTML(ticket.ownerPhone)}</p>` : ''}
        ${ticket.owner ? `
          <div class="mt-2 pt-2 border-t border-white/10">
            <p class="flex items-center gap-2">
              <i class="fas fa-user-check text-fuchsia-500"></i>
              <strong>Vinculado a:</strong>
              <a href="profile.html?user=${escapeHTML(ticket.owner.username || ticket.owner)}" class="text-fuchsia-400 hover:text-fuchsia-300">
                @${escapeHTML(ticket.owner.username || 'usuario')}
              </a>
            </p>
          </div>
        ` : ''}
      `;

      // Show/hide redeem action based on authorization and ticket status
      document.getElementById('access-denied').classList.add('hidden');
      document.getElementById('not-logged-in').classList.add('hidden');

      if (!isLoggedIn()) {
        // Already handled in checkAuthorization - redirect
        window.location.href = 'index.html';
        return;
      }

      if (!isAuthorized) {
        // User is ticket owner but cannot redeem - show ticket without redeem button
        document.getElementById('redeem-action').classList.add('hidden');
        document.getElementById('already-redeemed').classList.add('hidden');
        document.getElementById('view-only-message').classList.remove('hidden');
      } else if (ticket.redeemed) {
        document.getElementById('view-only-message').classList.add('hidden');
        document.getElementById('redeem-action').classList.add('hidden');
        document.getElementById('already-redeemed').classList.remove('hidden');
        document.getElementById('redeemed-date').innerText = new Date(ticket.redeemedAt).toLocaleString('es-AR');
      } else if (ticket.paymentStatus === 'pending') {
        document.getElementById('view-only-message').classList.add('hidden');
        document.getElementById('redeem-action').classList.remove('hidden');
        document.getElementById('already-redeemed').classList.add('hidden');
        // Add warning about pending payment
        const redeemBtn = document.getElementById('redeem-btn');
        redeemBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> CANJEAR (PAGO PENDIENTE)';
        redeemBtn.classList.remove('bg-green-500', 'hover:bg-green-400');
        redeemBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-400');
      } else {
        document.getElementById('view-only-message').classList.add('hidden');
        document.getElementById('redeem-action').classList.remove('hidden');
        document.getElementById('already-redeemed').classList.add('hidden');
        // Reset button style
        const redeemBtn = document.getElementById('redeem-btn');
        redeemBtn.innerHTML = '<i class="fas fa-door-open"></i> CANJEAR ENTRADA';
        redeemBtn.classList.add('bg-green-500', 'hover:bg-green-400');
        redeemBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-400');
      }
    }

    async function redeemTicket() {
      if (!currentTicket || !isAuthorized) return;

      const btn = document.getElementById('redeem-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

      try {
        const res = await apiRequest('/tickets/redeem-by-code', {
          method: 'POST',
          body: JSON.stringify({ code: currentTicket.code })
        });

        if (res.ok) {
          const data = await res.json();
          currentTicket = data.ticket;
          
          showResult('success', '¡Entrada Canjeada!', 
            `La entrada ${data.ticket.code} ha sido canjeada exitosamente.`);
          
          // Update UI
          renderTicket();
        } else {
          const err = await res.json();
          showResult('error', 'Error', err.error || 'No se pudo canjear la entrada');
        }
      } catch (err) {
        console.error('Error redeeming:', err);
        showResult('error', 'Error', 'Error de conexión. Intentá de nuevo.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-door-open"></i> CANJEAR ENTRADA';
      }
    }

    function showResult(type, title, message) {
      const modal = document.getElementById('result-modal');
      const iconDiv = document.getElementById('result-icon');
      const titleEl = document.getElementById('result-title');
      const messageEl = document.getElementById('result-message');

      modal.classList.remove('hidden');

      if (type === 'success') {
        iconDiv.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-green-500/20';
        iconDiv.innerHTML = '<i class="fas fa-check text-4xl text-green-500"></i>';
        titleEl.className = 'text-xl font-bold text-green-400 mb-2';
      } else {
        iconDiv.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-red-500/20';
        iconDiv.innerHTML = '<i class="fas fa-times text-4xl text-red-500"></i>';
        titleEl.className = 'text-xl font-bold text-red-400 mb-2';
      }

      titleEl.innerText = title;
      messageEl.innerText = message;
    }

    function closeResultModal() {
      document.getElementById('result-modal').classList.add('hidden');
    }

    function resetView() {
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);

      // Reset state
      currentTicket = null;
      currentEvent = null;
      isAuthorized = false;

      // Hide view-only message and error code
      document.getElementById('view-only-message').classList.add('hidden');
      document.getElementById('error-code-display').innerText = '';

      // Show scanner
      document.getElementById('manual-code-input').value = '';
      showScanner();
    }

    function redirectToLogin() {
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = `login.html?redirect=${currentUrl}`;
    }

    function hideAllSections() {
      document.getElementById('scanner-section').classList.add('hidden');
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('ticket-section').classList.add('hidden');
      document.getElementById('error-section').classList.add('hidden');
      document.getElementById('view-only-message').classList.add('hidden');
    }
