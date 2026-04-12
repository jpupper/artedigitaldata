let currentDate = new Date();
let events = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();
  renderCalendar();
});

window.loadEvents = async function() {
  try {
    const res = await fetch(CONFIG.API_URL + '/eventos');
    events = await res.json();
  } catch (err) {
    console.error('Error loading events:', err);
  }
};

window.renderCalendar = function() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthYearEl = document.getElementById('current-month-year');
  if (monthYearEl) {
    monthYearEl.innerText = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentDate).toUpperCase();
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const body = document.getElementById('calendar-body');
  if (!body) return;
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
    
    const dayEvents = events.filter(e => e.date && e.date.startsWith(dateStr));

    body.innerHTML += `
      <div class="calendar-day ${isToday ? 'today' : ''}">
        <span class="text-xs font-bold ${isToday ? 'text-cyan-400' : 'text-gray-500'}">${i}</span>
        <div class="mt-2">
          ${dayEvents.map(e => `<div class="event-pill" onclick="showEvent('${e._id}')">${e.title}</div>`).join('')}
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
};

window.prevMonth = function() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

window.nextMonth = function() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

window.showEvent = function(id) {
  window.open(`evento.html?id=${id}`, '_blank');
};

window.closeModal = function() {
  const modal = document.getElementById('event-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};
