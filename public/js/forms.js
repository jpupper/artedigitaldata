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

  evento: (prefix, item = {}) => `
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
    </div>
  `
};

window.renderFields = (type, prefix, data = {}) => {
  if (!FORM_TEMPLATES[type]) return 'Tipo no soportado';
  return FORM_TEMPLATES[type](prefix, data);
};
