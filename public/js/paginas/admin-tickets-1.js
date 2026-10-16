let allTickets = [];
    let filteredTickets = [];
    let events = [];
    let currentPage = 1;
    const itemsPerPage = 25;

    document.addEventListener('DOMContentLoaded', async () => {
      if (!isLoggedIn() || !isAdmin()) {
        document.getElementById('access-denied').classList.remove('hidden');
        return;
      }

      document.getElementById('content').classList.remove('hidden');
      await Promise.all([loadTickets(), loadEvents()]);
    });

    async function loadTickets() {
      try {
        const res = await apiRequest('/tickets');
        if (!res.ok) throw new Error();
        allTickets = await res.json();
        calculateStats();
        filterTickets();
      } catch (err) {
        console.error('Error loading tickets:', err);
        alert('Error al cargar entradas');
      }
    }

    async function loadEvents() {
      try {
        const res = await fetch(`${CONFIG.API_URL}/eventos`);
        if (!res.ok) throw new Error();
        events = await res.json();
        
        // Populate event filter
        const select = document.getElementById('filter-event');
        events.forEach(ev => {
          if (ev.ticketConfig?.enabled) {
            const option = document.createElement('option');
            option.value = ev._id;
            option.innerText = ev.title;
            select.appendChild(option);
          }
        });
      } catch (err) {
        console.error('Error loading events:', err);
      }
    }

    function calculateStats() {
      const total = allTickets.length;
      const uniqueEvents = new Set(allTickets.map(t => t.event?._id || t.event)).size;
      const paid = allTickets.filter(t => t.paymentStatus === 'completed').length;
      const redeemed = allTickets.filter(t => t.redeemed).length;
      
      // Calculate estimated revenue (this is a simplified calculation)
      let revenue = 0;
      allTickets.forEach(t => {
        if (t.paymentStatus === 'completed' || t.paymentStatus === 'free') {
          // We would need the event price here, using a placeholder
          revenue += 0; // This would be calculated from event data
        }
      });

      document.getElementById('stat-total').innerText = total;
      document.getElementById('stat-events').innerText = uniqueEvents;
      document.getElementById('stat-paid').innerText = paid;
      document.getElementById('stat-redeemed').innerText = redeemed;
      document.getElementById('stat-revenue').innerText = `$${revenue}`;
    }

    function filterTickets() {
      const search = document.getElementById('search-input').value.toLowerCase();
      const status = document.getElementById('filter-status').value;
      const eventId = document.getElementById('filter-event').value;

      filteredTickets = allTickets.filter(t => {
        const matchesSearch = 
          t.code.toLowerCase().includes(search) ||
          (t.ownerName && t.ownerName.toLowerCase().includes(search)) ||
          (t.ownerEmail && t.ownerEmail.toLowerCase().includes(search)) ||
          (t.event?.title && t.event.title.toLowerCase().includes(search));

        const matchesStatus = status === 'all' || 
          (status === 'redeemed' && t.redeemed) ||
          (status !== 'redeemed' && t.paymentStatus === status);

        const matchesEvent = eventId === 'all' || 
          (t.event?._id === eventId || t.event === eventId);

        return matchesSearch && matchesStatus && matchesEvent;
      });

      currentPage = 1;
      renderTickets();
    }

    function renderTickets() {
      const tbody = document.getElementById('tickets-tbody');
      const noTickets = document.getElementById('no-tickets');
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageTickets = filteredTickets.slice(start, end);

      // Update pagination
      document.getElementById('pagination-info').innerText = 
        `Mostrando ${start + 1}-${Math.min(end, filteredTickets.length)} de ${filteredTickets.length} entradas`;
      document.getElementById('prev-btn').disabled = currentPage === 1;
      document.getElementById('next-btn').disabled = end >= filteredTickets.length;

      if (filteredTickets.length === 0) {
        tbody.innerHTML = '';
        noTickets.classList.remove('hidden');
        return;
      }

      noTickets.classList.add('hidden');

      tbody.innerHTML = pageTickets.map(t => {
        let statusBadge, statusClass;
        if (t.redeemed) {
          statusBadge = '<i class="fas fa-check-double mr-1"></i>Canjeada';
          statusClass = 'bg-cyan-500/20 text-cyan-400';
        } else if (t.paymentStatus === 'completed') {
          statusBadge = '<i class="fas fa-check mr-1"></i>Pagada';
          statusClass = 'bg-green-500/20 text-green-400';
        } else if (t.paymentStatus === 'free') {
          statusBadge = '<i class="fas fa-gift mr-1"></i>Gratuita';
          statusClass = 'bg-blue-500/20 text-blue-400';
        } else if (t.paymentStatus === 'pending') {
          statusBadge = '<i class="fas fa-clock mr-1"></i>Pendiente';
          statusClass = 'bg-yellow-500/20 text-yellow-400';
        } else {
          statusBadge = '<i class="fas fa-times mr-1"></i>Fallida';
          statusClass = 'bg-red-500/20 text-red-400';
        }

        const eventDate = t.event?.date ? new Date(t.event.date).toLocaleDateString('es-AR') : '-';

        return `
          <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="px-6 py-4 font-mono font-bold text-white">${escapeHTML(t.code)}</td>
            <td class="px-6 py-4">
              <a href="evento.html?id=${t.event?._id || t.event}" class="text-white hover:text-magenta-400 transition-colors font-medium">
                ${escapeHTML(t.event?.title || 'Evento desconocido')}
              </a>
            </td>
            <td class="px-6 py-4 text-gray-400">${eventDate}</td>
            <td class="px-6 py-4">
              <div class="text-white font-medium">${escapeHTML(t.ownerName || 'Sin nombre')}</div>
              <div class="text-xs text-gray-500">${escapeHTML(t.ownerEmail || '')}</div>
              ${t.owner ? `
                <div class="mt-1 flex items-center gap-1">
                  <i class="fas fa-user-check text-fuchsia-500 text-xs"></i>
                  <a href="profile.html?user=${escapeHTML(t.owner.username || t.owner)}" class="text-xs text-fuchsia-400 hover:text-fuchsia-300 font-medium">
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
                    : (t.paymentStatus === 'pending' && t.event?.ticketConfig?.price > 0
                        ? `<span class="text-yellow-400">$${Number(t.event.ticketConfig.price).toLocaleString('es-AR')} ARS</span>`
                        : '<span class="text-gray-600">—</span>'))}
            </td>
            <td class="px-6 py-4">
              ${t.redeemed ? 
                `<span class="text-cyan-400"><i class="fas fa-check mr-1"></i>${new Date(t.redeemedAt).toLocaleDateString('es-AR')}</span>` : 
                '<span class="text-gray-500">-</span>'
              }
            </td>
            <td class="px-6 py-4">
              <div class="flex gap-2">
                <a href="ticket-success.html?ticket=${escapeHTML(t.code)}" target="_blank" class="px-3 py-1 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-all text-xs">
                  <i class="fas fa-eye"></i>
                </a>
                <button onclick="deleteTicket('${t._id}')" class="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function changePage(delta) {
      currentPage += delta;
      renderTickets();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function deleteTicket(ticketId) {
      if (!confirm('¿Eliminar esta entrada permanentemente?')) return;

      try {
        const res = await apiRequest(`/tickets/${ticketId}`, { method: 'DELETE' });
        if (res.ok) {
          await loadTickets();
        } else {
          alert('Error al eliminar entrada');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    }

    function exportTickets() {
      const headers = ['Código', 'Evento', 'Fecha Evento', 'Dueño', 'Email', 'Teléfono', 'Estado Pago', 'Canjeada', 'Fecha Canje', 'Fecha Compra'];
      const rows = filteredTickets.map(t => [
        t.code,
        t.event?.title || 'N/A',
        t.event?.date ? new Date(t.event.date).toISOString() : '',
        t.ownerName || '',
        t.ownerEmail || '',
        t.ownerPhone || '',
        t.paymentStatus,
        t.redeemed ? 'Sí' : 'No',
        t.redeemedAt ? new Date(t.redeemedAt).toISOString() : '',
        new Date(t.createdAt).toISOString()
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `entradas_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }
