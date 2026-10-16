let currentDate = new Date();
    let events = [];

    document.addEventListener('DOMContentLoaded', async () => {
      await loadEvents();
      renderCalendar();
    });

    async function loadEvents() {
      try {
        const res = await fetch(CONFIG.API_URL + '/eventos');
        events = await res.json();
      } catch (err) {
        console.error('Error loading events:', err);
      }
    }

    function renderCalendar() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      document.getElementById('current-month-year').innerText = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentDate).toUpperCase();

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const prevMonthLastDay = new Date(year, month, 0).getDate();

      const body = document.getElementById('calendar-body');
      body.innerHTML = '';

      // Previous month days
      for (let i = firstDay; i > 0; i--) {
        body.innerHTML += `<div class="calendar-day not-current"><span class="text-xs text-gray-700">${prevMonthLastDay - i + 1}</span></div>`;
      }

      // Current month days
      const today = new Date();
      for (let i = 1; i <= daysInMonth; i++) {
        const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        const dayEvents = events.filter(e => {
          if (!e.date) return false;
          const eventDate = new Date(e.date);
          const eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
          return eventDateStr === dateStr;
        });

        body.innerHTML += `
          <div class="calendar-day ${isToday ? 'today' : ''}">
            <span class="text-xs font-bold ${isToday ? 'text-cyan-400' : 'text-gray-500'}">${i}</span>
            <div class="mt-2 space-y-1">
              ${dayEvents.map(e => `
                <div class="event-pill flex items-center gap-1.5 p-1 rounded-lg bg-fuchsia-600/80 hover:bg-fuchsia-500 text-white cursor-pointer transition-all border border-white/10" onclick="showEvent('${e._id}')" title="${escapeHTML(e.title || '')}">
                  ${e.imageUrl ? `<img src="${sanitizeUrl(e.imageUrl)}" class="w-6 h-6 rounded-md object-cover shrink-0 border border-white/20">` : `<div class="w-6 h-6 rounded-md bg-black/40 flex items-center justify-center shrink-0 text-[10px] text-fuchsia-300"><i class="fas fa-calendar-alt"></i></div>`}
                  <span class="truncate text-[11px] font-bold leading-tight flex-1">${escapeHTML(e.title || 'Evento')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Next month days (fill the grid)
      const currentGridCells = firstDay + daysInMonth;
      const totalCells = Math.ceil(currentGridCells / 7) * 7;
      for (let i = 1; i <= (totalCells - currentGridCells); i++) {
        body.innerHTML += `<div class="calendar-day not-current"><span class="text-xs text-gray-700">${i}</span></div>`;
      }
    }

    function prevMonth() {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    }

    function nextMonth() {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    }

    function showEvent(id) {
      window.open(`evento.html?id=${id}`, '_blank');
    }

    function closeModal() {
      const modal = document.getElementById('event-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
