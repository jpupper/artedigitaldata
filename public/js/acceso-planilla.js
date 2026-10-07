// Gestión de accesos a la planilla de inscriptos de una oportunidad.
// Mismo patrón que los "usuarios de puerta" de los eventos: solo el creador
// de la oportunidad y los administradores pueden agregar o quitar usuarios.
window.AccesoPlanilla = {
  users: null,
  usersPromise: null,

  // Hooks que cada página sobreescribe al inicializar
  onPick: null,
  onRemove: null,
  _onPick(id) { if (this.onPick) this.onPick(id); },
  _onRemove(id) { if (this.onRemove) this.onRemove(id); },

  async ensureUsers() {
    if (this.users) return this.users;
    if (!this.usersPromise) {
      this.usersPromise = apiRequest('/auth/users')
        .then(async (res) => {
          this.users = (res && res.ok) ? await res.json() : [];
          return this.users;
        })
        .catch(() => {
          this.users = [];
          return this.users;
        });
    }
    return this.usersPromise;
  },

  async list(oportunidadId) {
    const res = await apiRequest(`/oportunidades/${oportunidadId}/acceso-postulantes`);
    if (!res || !res.ok) return null;
    return res.json();
  },

  async add(oportunidadId, userId) {
    return apiRequest(`/oportunidades/${oportunidadId}/acceso-postulantes`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async remove(oportunidadId, userId) {
    return apiRequest(`/oportunidades/${oportunidadId}/acceso-postulantes/${userId}`, {
      method: 'DELETE',
    });
  },

  search(query, excludeIds = []) {
    const q = (query || '').trim().toLowerCase();
    if (!q || !this.users) return [];
    return this.users.filter((u) => {
      if (excludeIds.includes(String(u._id))) return false;
      return (
        (u.username || '').toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }).slice(0, 10);
  },

  userChip(user, { removable = false } = {}) {
    const name = escapeHTML(user.displayName || user.username || 'Usuario');
    const username = escapeHTML(user.username || '');
    const avatarUrl = sanitizeUrl(user.avatar);
    const initial = escapeHTML(((user.displayName || user.username || '?')[0] || '?').toUpperCase());
    const avatar = avatarUrl
      ? `<img src="${avatarUrl}" class="w-6 h-6 rounded-full object-cover" alt="${name}">`
      : `<div class="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 text-[10px] font-bold">${initial}</div>`;
    return `
      <div class="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        ${avatar}
        <span class="text-xs text-emerald-200 font-semibold">${name}</span>
        <span class="text-[10px] text-emerald-400/70">@${username}</span>
        ${removable ? `<button type="button" onclick="AccesoPlanilla._onRemove('${user._id}')" class="ml-1 text-emerald-300 hover:text-red-400 transition-colors" title="Quitar acceso"><i class="fas fa-times text-xs"></i></button>` : ''}
      </div>`;
  },

  resultRow(user, { onPick = '_onPick' } = {}) {
    const name = escapeHTML(user.displayName || user.username || 'Usuario');
    const username = escapeHTML(user.username || '');
    const email = escapeHTML(user.email || '');
    const avatarUrl = sanitizeUrl(user.avatar);
    const initial = escapeHTML(((user.displayName || user.username || '?')[0] || '?').toUpperCase());
    const avatar = avatarUrl
      ? `<img src="${avatarUrl}" class="w-8 h-8 rounded-full object-cover" alt="${name}">`
      : `<div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 text-xs font-bold">${initial}</div>`;
    return `
      <button type="button" onclick="AccesoPlanilla.${onPick}('${user._id}')"
        class="w-full px-3 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0">
        ${avatar}
        <div class="flex-1 min-w-0">
          <p class="text-sm text-white font-medium truncate">${name}</p>
          <p class="text-xs text-gray-500 truncate">@${username}${email ? ' · ' + email : ''}</p>
        </div>
        <i class="fas fa-plus text-emerald-400 text-xs"></i>
      </button>`;
  },
};
