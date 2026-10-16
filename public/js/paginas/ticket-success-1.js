let currentTicket = null;

    document.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const ticketCode = urlParams.get('ticket');
      const paymentId = urlParams.get('payment_id');
      const paymentStatus = urlParams.get('status');

      if (!ticketCode) {
        showError();
        return;
      }

      // If MP redirected back with a payment_id, sync payment status first
      if (paymentId && paymentStatus === 'approved' && isLoggedIn()) {
        try {
          await apiRequest('/tickets/sync-payment', {
            method: 'POST',
            body: JSON.stringify({ payment_id: paymentId, ticket_code: ticketCode })
          });
        } catch (e) {
          console.warn('sync-payment failed:', e);
        }
      }

      await loadTicket(ticketCode);
    });

    async function loadTicket(code) {
      try {
        // Try to get ticket details from the public endpoint
        const res = await fetch(`${CONFIG.API_URL}/tickets/code/${code}`);
        if (!res.ok) throw new Error();
        const ticket = await res.json();
        currentTicket = ticket;
        renderTicket(ticket);
      } catch (err) {
        // If not logged in, show generic success
        if (!isLoggedIn()) {
          document.getElementById('loading').classList.add('hidden');
          document.getElementById('content').classList.remove('hidden');
          document.getElementById('success-message').innerText = '¡Tu compra fue exitosa! Revisá tu email para obtener la entrada.';
          document.getElementById('ticket-code').innerText = code.toUpperCase();
          return;
        }
        showError();
      }
    }

    function renderTicket(ticket) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('content').classList.remove('hidden');

      const ev = ticket.event;
      document.title = `Entrada - ${ev.title}`;

      // Success message from event config
      if (ev.ticketConfig?.successMessage) {
        document.getElementById('success-message').innerText = ev.ticketConfig.successMessage;
      }

      // Event info with link
      const eventLink = document.getElementById('event-link');
      document.getElementById('event-title').innerText = ev.title;
      eventLink.href = `evento.html?id=${ev._id || ev.id}`;
      document.getElementById('event-date').querySelector('span').innerText = new Date(ev.date).toLocaleDateString('es-AR', { 
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
      // Render location with Google Maps button
      const locationEl = document.getElementById('event-location');
      if (ev.location && ev.location.startsWith('http')) {
        // It's already a URL
        locationEl.innerHTML = `<a href="${sanitizeUrl(ev.location)}" target="_blank" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all text-xs font-bold">
          <i class="fas fa-map-marker-alt"></i>Ver Ubicación
        </a>`;
      } else if (ev.location) {
        // Create Google Maps search URL
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`;
        locationEl.innerHTML = `<a href="${sanitizeUrl(mapsUrl)}" target="_blank" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all text-xs font-bold truncate max-w-[200px] md:max-w-xs">
          <i class="fas fa-map-marker-alt"></i>${escapeHTML(ev.location)}
        </a>`;
      } else {
        locationEl.querySelector('span').innerText = 'Virtual';
      }
      
      // Check if user is admin or event creator
      const user = getUser();
      const isAdmin = user && (user.role === 'ADMINISTRADOR' || user.role === 'ADMIN');
      const creatorId = ev.creator?._id || ev.creator;
      const isCreator = user && creatorId && user._id === creatorId;
      
      if (isAdmin || isCreator) {
        // Show admin actions
        document.getElementById('admin-actions').classList.remove('hidden');
        document.getElementById('regenerate-qr-btn').classList.remove('hidden');
        document.getElementById('manage-tickets-link').href = `event-tickets.html?event=${ev._id || ev.id}`;
      }

      // Ticket info
      document.getElementById('ticket-code').innerText = ticket.code;
      
      // Debug QR data
      console.log('Ticket QR Data:', ticket.qrData ? 'Present (length: ' + ticket.qrData.length + ')' : 'MISSING');
      
      // Set QR image with fallback
      const qrImg = document.getElementById('qr-code');
      if (ticket.qrData && ticket.qrData.startsWith('data:')) {
        qrImg.src = ticket.qrData;
        qrImg.onerror = () => {
          qrImg.style.display = 'none';
          qrImg.parentElement.innerHTML += '<p class="text-red-400 text-sm">Error cargando QR</p>';
        };
      } else {
        qrImg.style.display = 'none';
        qrImg.parentElement.innerHTML += '<p class="text-yellow-400 text-sm">QR no disponible</p>';
      }

      // Owner info
      const ownerInfo = document.getElementById('owner-info');
      const linkedUserHtml = ticket.owner ? `
        <div class="mt-3 pt-3 border-t border-white/10">
          <p class="flex items-center gap-2">
            <i class="fas fa-user-check text-fuchsia-500"></i>
            <strong>Vinculado a:</strong>
            <a href="profile.html?user=${escapeHTML(ticket.owner.username || ticket.owner)}" class="text-fuchsia-400 hover:text-fuchsia-300">
              @${escapeHTML(ticket.owner.username || 'usuario')}
            </a>
          </p>
        </div>
      ` : '';

      ownerInfo.innerHTML = `
        <p><strong>Nombre:</strong> ${escapeHTML(ticket.ownerName || 'No especificado')}</p>
        <p><strong>Email:</strong> ${escapeHTML(ticket.ownerEmail || 'No especificado')}</p>
        ${ticket.ownerPhone ? `<p><strong>Teléfono:</strong> ${escapeHTML(ticket.ownerPhone)}</p>` : ''}
        ${ticket.amountPaid > 0 ? `<p><strong>Monto pagado:</strong> $${ticket.amountPaid.toLocaleString('es-AR')} ARS</p>` : ''}
        ${linkedUserHtml}
      `;

      // Status badge
      const statusBadge = document.getElementById('status-badge');
      if (ticket.redeemed) {
        statusBadge.className = 'px-6 py-3 bg-gray-500/10 border-t border-gray-500/20 text-center';
        statusBadge.innerHTML = `
          <span class="text-gray-400 font-bold flex items-center justify-center gap-2">
            <i class="fas fa-check-double"></i>
            Entrada Canjeada el ${new Date(ticket.redeemedAt).toLocaleDateString('es-AR')}
          </span>
        `;
      } else if (ticket.paymentStatus === 'pending') {
        statusBadge.className = 'px-6 py-3 bg-yellow-500/10 border-t border-yellow-500/20 text-center';
        statusBadge.innerHTML = `
          <span class="text-yellow-400 font-bold flex items-center justify-center gap-2">
            <i class="fas fa-clock"></i>
            Pago Pendiente
          </span>
        `;
      }
    }

    function showError() {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error').classList.remove('hidden');
    }

    function downloadTicket() {
      if (!currentTicket) return;
      
      // Create a simple print/download of the ticket section
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Entrada - ${escapeHTML(currentTicket.event.title)}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #000; color: #fff; }
              .ticket { border: 2px solid #e91e63; padding: 30px; border-radius: 20px; max-width: 400px; margin: 0 auto; }
              h1 { color: #e91e63; }
              .qr { margin: 20px 0; }
              .code { font-size: 24px; font-family: monospace; letter-spacing: 4px; color: #e91e63; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <h1>${escapeHTML(currentTicket.event.title)}</h1>
              <p>${escapeHTML(new Date(currentTicket.event.date).toLocaleDateString('es-AR'))}</p>
              <p>${escapeHTML(currentTicket.event.location || 'Virtual')}</p>
              <div class="qr">
                <img src="${escapeHTML(currentTicket.qrData)}" width="200" height="200">
              </div>
              <p class="code">${escapeHTML(currentTicket.code)}</p>
              <p>${escapeHTML(currentTicket.ownerName || '')}</p>
            </div>
            <!-- botón FSC: solo el isotipo, abajo a la izquierda -->
  <script src="https://vps-4455523-x.dattaweb.com/fscauth/js/fsc-button.js?v=10">
