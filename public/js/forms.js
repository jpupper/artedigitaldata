/**
 * Centralized Form Components for Arte Digital Data
 * Ensures Create and Edit forms always stay synchronized
 */

const FORM_TEMPLATES = {
  post: (prefix, item = {}) => `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Título de la Obra</label>
        <input type="text" id="${prefix}-title" name="title" value="${item.title || ''}" required placeholder="Ej: Paisaje Cyberpunk 2077"
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Etiquetas (separadas por coma)</label>
        <input type="text" id="${prefix}-tags" name="tags" value="${(item.tags || []).join(', ')}" placeholder="3d, blender, neon..."
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Descripción</label>
        <textarea id="${prefix}-desc" name="description" rows="4" placeholder="Contanos sobre tu proceso creativo..."
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors resize-none mb-1">${item.description || ''}</textarea>
        <div id="${prefix}-desc-preview" class="px-2 text-[10px] text-gray-600 min-h-[1.5em] italic"></div>
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2 text-red-400">Video de YouTube (Link)</label>
        <div class="relative">
          <i class="fab fa-youtube absolute left-4 top-1/2 -translate-y-1/2 text-red-500"></i>
          <input type="url" id="${prefix}-youtube" name="youtube_video" value="${item.youtube_video || ''}" placeholder="https://www.youtube.com/watch?v=..."
            class="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors">
        </div>
        <p class="text-[9px] text-gray-600 mt-1 uppercase tracking-wider">Se mostrará una vista previa al pasar el mouse.</p>
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">${item._id ? 'Cambiar Imagen (opcional)' : 'Imagen de la Obra'}</label>
        <input type="file" id="${prefix}-file" name="file" accept="image/*" ${item._id ? '' : 'required'}
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-400 file:cursor-pointer">
      </div>
    </div>
  `,

  recurso: (prefix, item = {}) => `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Título del Recurso</label>
        <input type="text" id="${prefix}-title" name="title" value="${item.title || ''}" required placeholder="Ej: Pack de Brushes Sci-Fi"
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de Recurso</label>
          <select id="${prefix}-type" name="type" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-300 focus:border-orange-500 focus:outline-none">
            <option value="software" ${item.type === 'software' ? 'selected' : ''}>Software</option>
            <option value="github" ${item.type === 'github' ? 'selected' : ''}>GitHub / Código</option>
            <option value="drive" ${item.type === 'drive' ? 'selected' : ''}>Drive / Descarga</option>
            <option value="tutorial" ${item.type === 'tutorial' ? 'selected' : ''}>Tutorial / Guía</option>
            <option value="texto" ${item.type === 'texto' ? 'selected' : ''}>Texto / Artículo</option>
            <option value="other" ${item.type === 'other' ? 'selected' : ''}>Otro</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-2 text-orange-400 font-black">Link de Descarga / Web</label>
          <input type="url" id="${prefix}-url" name="url" value="${item.url || ''}" required placeholder="https://..."
            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
        </div>
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Descripción</label>
        <textarea id="${prefix}-desc" name="description" rows="3" placeholder="¿Para qué sirve este recurso?"
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none resize-none mb-1">${item.description || ''}</textarea>
        <div id="${prefix}-desc-preview" class="px-2 text-[10px] text-gray-600 min-h-[1.5em] italic"></div>
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2 text-red-400">Video de YouTube (Opcional)</label>
        <input type="url" id="${prefix}-youtube" name="youtube_video" value="${item.youtube_video || ''}" placeholder="https://www.youtube.com/watch?v=..."
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Etiquetas</label>
        <input type="text" id="${prefix}-tags" name="tags" value="${(item.tags || []).join(', ')}" placeholder="herramientas, free, assets..."
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none">
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">${item._id ? 'Cambiar Imagen (opcional)' : 'Imagen de Previsualización'}</label>
        <input type="file" id="${prefix}-file" name="file" accept="image/*"
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500/20 file:text-orange-400 file:cursor-pointer">
      </div>
    </div>
  `,

  evento: (prefix, item = {}) => {
    const tc = item.ticketConfig || {};
    return `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Nombre del Evento</label>
        <input type="text" id="${prefix}-title" name="title" value="${item.title || ''}" required placeholder="Ej: Meetup Arte Digital BsAs"
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none transition-colors">
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Fecha y Hora</label>
          <input type="datetime-local" id="${prefix}-date" name="date" value="${item.date ? new Date(item.date).toISOString().slice(0, 16) : ''}" required
            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Lugar / Enlace</label>
          <input type="text" id="${prefix}-location" name="location" value="${item.location || ''}" placeholder="Club X o Link de Meet"
            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none">
        </div>
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Descripción</label>
        <textarea id="${prefix}-desc" name="description" rows="4" placeholder="¡No se lo pierdan! Estarán @tolch y @jp..."
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none resize-none mb-1">${item.description || ''}</textarea>
        <div id="${prefix}-desc-preview" class="px-2 text-[10px] text-gray-600 min-h-[1.5em] italic"></div>
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2 text-red-400">Video de YouTube (Flyer animado)</label>
        <input type="url" id="${prefix}-youtube" name="youtube_video" value="${item.youtube_video || ''}" placeholder="https://www.youtube.com/watch?v=..."
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">${item._id ? 'Cambiar Imagen / Flyer' : 'Imagen / Flyer (File)'}</label>
        <input type="file" id="${prefix}-file" name="file" accept="image/*"
          class="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:bg-magenta-500/20 file:text-magenta-400 file:cursor-pointer w-full">
        <input type="text" id="${prefix}-img-url" name="imageUrl" value="${item._id ? (item.imageUrl || '') : (item.imageUrl || '')}" placeholder="O pegá el enlace de la imagen..."
          class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none transition-colors mt-2">
      </div>
      
      <!-- Ticket System Section -->
      <div class="border-t border-white/10 pt-6 mt-6">
        <div class="flex items-center gap-3 mb-4">
          <input type="checkbox" id="${prefix}-ticket-enabled" ${tc.enabled ? 'checked' : ''}
            class="w-5 h-5 rounded border-white/20 bg-white/5 text-magenta-500 focus:ring-magenta-500 focus:ring-offset-0"
            onchange="toggleTicketConfig('${prefix}')">
          <label for="${prefix}-ticket-enabled" class="text-sm font-bold text-white cursor-pointer">
            <i class="fas fa-ticket-alt text-magenta-500 mr-2"></i>Activar sistema de entradas
          </label>
        </div>
        
        <div id="${prefix}-ticket-config" class="space-y-4 ${tc.enabled ? '' : 'hidden'}">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Precio (ARS)</label>
              <input type="number" id="${prefix}-ticket-price" value="${tc.price || 0}" min="0" placeholder="0"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none">
              <p class="text-[10px] text-gray-500 mt-1">0 = entrada gratuita</p>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Cantidad máxima de entradas</label>
              <input type="number" id="${prefix}-ticket-max" value="${tc.maxTickets || 100}" min="1"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none">
            </div>
          </div>
          
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Link de pago (MercadoPago)</label>
            <input type="url" id="${prefix}-ticket-link" value="${tc.paymentLink || ''}" placeholder="https://mpago.la/..."
              class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none">
            <p class="text-[10px] text-gray-500 mt-1">Opcional - si no se especifica, se usa la API de MercadoPago</p>
          </div>
          
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Mensaje en página de compra</label>
            <textarea id="${prefix}-ticket-purchase-message" rows="2" placeholder="Ej: Todos los asistentes entran al sorteo de una tablet..."
              class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none resize-none">${tc.purchaseMessage || ''}</textarea>
            <p class="text-[10px] text-gray-500 mt-1">Se muestra en la pantalla de compra, antes de confirmar.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Mensaje post-compra</label>
            <textarea id="${prefix}-ticket-message" rows="2" placeholder="¡Gracias por tu compra! Presentá este QR en la entrada..."
              class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-magenta-500 focus:outline-none resize-none">${tc.successMessage || ''}</textarea>
          </div>
          
          <div class="flex items-center gap-3">
            <input type="checkbox" id="${prefix}-ticket-contribution" ${tc.isContribution ? 'checked' : ''}
              class="w-5 h-5 rounded border-white/20 bg-white/5 text-magenta-500 focus:ring-magenta-500 focus:ring-offset-0">
            <label for="${prefix}-ticket-contribution" class="text-sm text-gray-300 cursor-pointer">
              Evento con bono contribución (el usuario decide cuánto pagar)
            </label>
          </div>
        </div>
      </div>
    </div>
    `;
  }
};

window.renderFields = (type, prefix, data = {}) => {
  if (!FORM_TEMPLATES[type]) return 'Tipo no soportado';
  return FORM_TEMPLATES[type](prefix, data);
};

window.toggleTicketConfig = (prefix) => {
  const checkbox = document.getElementById(`${prefix}-ticket-enabled`);
  const configDiv = document.getElementById(`${prefix}-ticket-config`);
  if (checkbox && configDiv) {
    configDiv.classList.toggle('hidden', !checkbox.checked);
  }
};

window.getTicketConfig = (prefix) => {
  const enabled = document.getElementById(`${prefix}-ticket-enabled`)?.checked || false;
  if (!enabled) return { enabled: false };
  
  return {
    enabled: true,
    price: parseFloat(document.getElementById(`${prefix}-ticket-price`)?.value) || 0,
    maxTickets: parseInt(document.getElementById(`${prefix}-ticket-max`)?.value) || 100,
    paymentLink: document.getElementById(`${prefix}-ticket-link`)?.value || '',
    successMessage: document.getElementById(`${prefix}-ticket-message`)?.value || '',
    purchaseMessage: document.getElementById(`${prefix}-ticket-purchase-message`)?.value || '',
    isContribution: document.getElementById(`${prefix}-ticket-contribution`)?.checked || false
  };
};
