let currentTab = 'users';
let data = { users: [], posts: [], recursos: [], eventos: [], oportunidades: [] };
let filteredData = { users: [], posts: [], recursos: [], eventos: [], oportunidades: [] };

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof isLoggedIn === 'undefined' || typeof isAdmin === 'undefined' || !isLoggedIn() || !isAdmin()) {
    const deniedEl = document.getElementById('admin-access-denied');
    if (deniedEl) deniedEl.classList.remove('hidden');
    return;
  }

  const panelEl = document.getElementById('admin-panel');
  if (panelEl) panelEl.classList.remove('hidden');
  await refreshAll();
});

window.refreshAll = async function() {
  try {
    const t = Date.now();
    const [usersRes, postsRes, recursosRes, eventosRes, oportunidadesRes] = await Promise.all([
      apiRequest('/admin/users?t=' + t),
      apiRequest('/posts?t=' + t),
      apiRequest('/recursos?t=' + t),
      apiRequest('/eventos?t=' + t),
      apiRequest('/oportunidades?all=true&t=' + t)
    ]);

    data.users = await usersRes.json();
    data.posts = await postsRes.json();
    data.recursos = await recursosRes.json();
    data.eventos = await eventosRes.json();
    data.oportunidades = await oportunidadesRes.json();
    
    handleSearch();
  } catch (err) {
    console.error('Error refreshing admin data:', err);
  }
};

window.handleSearch = function() {
  const searchInput = document.getElementById('admin-search');
  const q = searchInput ? searchInput.value.toLowerCase() : '';
  
  filteredData.users = data.users.filter(u => 
    u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );

  filteredData.posts = data.posts.filter(p => 
    (p.title || '').toLowerCase().includes(q) || p.author?.username?.toLowerCase().includes(q)
  );

  filteredData.recursos = data.recursos.filter(r => 
    (r.title || '').toLowerCase().includes(q) || r.author?.username?.toLowerCase().includes(q)
  );

  filteredData.eventos = data.eventos.filter(e => 
    (e.title || '').toLowerCase().includes(q) || (e.creator?.username || e.author?.username)?.toLowerCase().includes(q)
  );

  filteredData.oportunidades = data.oportunidades.filter(o => 
    (o.titulo || o.title || '').toLowerCase().includes(q) || (o.creador?.username || o.author?.username)?.toLowerCase().includes(q)
  );

  renderTable();
};

window.switchTab = function(tab) {
  currentTab = tab;
  document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
  const section = document.getElementById(`section-${tab}`);
  if (section) section.classList.remove('hidden');
  
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('bg-cyan-500', 'text-black');
    b.classList.add('text-gray-400');
  });
  
  const tabBtn = document.getElementById(`tab-${tab}`);
  if (tabBtn) {
    tabBtn.classList.add('bg-cyan-500', 'text-black');
    tabBtn.classList.remove('text-gray-400');
  }
  
  renderTable();
};

window.renderTable = function() {
  if (currentTab === 'users') {
    const tbody = document.getElementById('users-tbody');
    if (tbody) {
      tbody.innerHTML = filteredData.users.map(u => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td class="px-6 py-4 font-bold text-white">${escapeHTML(u.username)}</td>
          <td class="px-6 py-4 text-gray-400">${escapeHTML(u.email)}</td>
          <td class="px-6 py-4">
            <select onchange="changeRole('${u._id}', this.value)" class="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs">
              <option value="USUARIO" ${u.role === 'USUARIO' ? 'selected' : ''}>USUARIO</option>
              <option value="ADMINISTRADOR" ${u.role === 'ADMINISTRADOR' ? 'selected' : ''}>ADMIN</option>
            </select>
          </td>
          <td class="px-6 py-4 text-xs text-gray-500">${new Date(u.createdAt).toLocaleDateString()}</td>
          <td class="px-6 py-4">
            <a href="${CONFIG.BASE}/profile.html?user=${escapeHTML(u.username)}" class="text-cyan-400 hover:underline">Ver Perfil</a>
          </td>
        </tr>
      `).join('');
    }
  } else if (currentTab === 'posts') {
    const tbody = document.getElementById('posts-tbody');
    if (tbody) {
      tbody.innerHTML = filteredData.posts.map(p => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td class="px-6 py-4 font-bold text-white">${escapeHTML(p.title)}</td>
          <td class="px-6 py-4 text-gray-400">${escapeHTML(p.author?.username || 'Anónimo')}</td>
          <td class="px-6 py-4 text-xs text-gray-500">${new Date(p.createdAt).toLocaleDateString()}</td>
          <td class="px-6 py-4 text-gray-500">${p.likes?.length || 0} / ${p.comments?.length || 0}</td>
          <td class="px-6 py-4 flex gap-3">
            <a href="${CONFIG.BASE}/post.html?id=${p._id}" target="_blank" class="text-cyan-400 hover:text-white"><i class="fas fa-external-link-alt"></i></a>
            <button onclick="openEdit('posts', '${p._id}')" class="text-yellow-500 hover:text-yellow-400"><i class="fas fa-edit"></i></button>
            <button onclick="deleteItem('posts', '${p._id}')" class="text-red-500 hover:text-red-400"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } else if (currentTab === 'recursos') {
    const tbody = document.getElementById('recursos-tbody');
    if (tbody) {
      tbody.innerHTML = filteredData.recursos.map(r => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td class="px-6 py-4 font-bold text-white">${escapeHTML(r.title)}</td>
          <td class="px-6 py-4 uppercase text-xs text-orange-400">${escapeHTML(r.type)}</td>
          <td class="px-6 py-4 text-gray-400">${escapeHTML(r.author?.username || 'Anónimo')}</td>
          <td class="px-6 py-4 truncate max-w-[150px]"><a href="${sanitizeUrl(r.url)}" target="_blank" class="text-gray-500 hover:text-cyan-400">${escapeHTML(r.url)}</a></td>
          <td class="px-6 py-4 flex gap-3">
            <a href="${CONFIG.BASE}/recurso.html?id=${r._id}" target="_blank" class="text-cyan-400 hover:text-white"><i class="fas fa-external-link-alt"></i></a>
            <button onclick="openEdit('recursos', '${r._id}')" class="text-yellow-500 hover:text-yellow-400"><i class="fas fa-edit"></i></button>
            <button onclick="deleteItem('recursos', '${r._id}')" class="text-red-500 hover:text-red-400"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } else if (currentTab === 'eventos') {
    const tbody = document.getElementById('eventos-tbody');
    if (tbody) {
      tbody.innerHTML = filteredData.eventos.map(e => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td class="px-6 py-4 font-bold text-white">${escapeHTML(e.title)}</td>
          <td class="px-6 py-4 text-gray-400">${escapeHTML(e.creator?.username || e.author?.username || 'Anónimo')}</td>
          <td class="px-6 py-4 text-xs text-magenta-400">${new Date(e.date).toLocaleString()}</td>
          <td class="px-6 py-4 text-gray-500">${escapeHTML(e.location || 'Virtual')}</td>
          <td class="px-6 py-4 flex gap-3">
            <a href="${CONFIG.BASE}/evento.html?id=${e._id}" target="_blank" class="text-cyan-400 hover:text-white"><i class="fas fa-external-link-alt"></i></a>
            ${e.ticketConfig?.enabled ? `<a href="${CONFIG.BASE}/event-tickets.html?event=${e._id}" target="_blank" class="text-green-400 hover:text-green-300" title="Administrar entradas"><i class="fas fa-ticket-alt"></i></a>` : ''}
            <button onclick="openEdit('eventos', '${e._id}')" class="text-yellow-500 hover:text-yellow-400"><i class="fas fa-edit"></i></button>
            <button onclick="deleteItem('eventos', '${e._id}')" class="text-red-500 hover:text-red-400"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } else if (currentTab === 'oportunidades') {
    const tbody = document.getElementById('oportunidades-tbody');
    if (tbody) {
      tbody.innerHTML = filteredData.oportunidades.map(o => {
        const title = o.titulo || o.title || 'Sin título';
        const creatorName = o.creador?.username || o.author?.username || 'Anónimo';
        const isPublic = o.visibility === 'public';
        const inscCount = o.inscripciones?.length || 0;
        return `
          <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="px-6 py-4 font-bold text-white">${escapeHTML(title)}</td>
            <td class="px-6 py-4 uppercase text-xs text-emerald-400 font-bold">${escapeHTML((o.tipo || '').replace('_', ' '))}</td>
            <td class="px-6 py-4 text-gray-400">${escapeHTML(creatorName)}</td>
            <td class="px-6 py-4">
              <span class="px-2.5 py-1 rounded-full text-xs font-bold ${isPublic ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}">
                ${isPublic ? '🌍 Público' : '🔗 No listado'}
              </span>
            </td>
            <td class="px-6 py-4">
              <a href="${CONFIG.BASE}/postulantes.html?id=${o._id}" class="text-xs font-bold text-gray-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5" title="Ver postulantes">
                <i class="fas fa-users text-[10px]"></i> ${inscCount}
              </a>
            </td>
            <td class="px-6 py-4 flex items-center gap-3">
              <a href="${CONFIG.BASE}/oportunidad.html?id=${o._id}" target="_blank" class="text-cyan-400 hover:text-white" title="Ver"><i class="fas fa-external-link-alt"></i></a>
              <a href="${CONFIG.BASE}/crear-oportunidad.html?id=${o._id}" class="text-yellow-500 hover:text-yellow-400" title="Editar"><i class="fas fa-edit"></i></a>
              <button onclick="deleteItem('oportunidades', '${o._id}')" class="text-red-500 hover:text-red-400" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
};


window.changeRole = async function(userId, newRole) {
  const res = await apiRequest(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role: newRole })
  });
  if (res?.ok) refreshAll();
};

window.deleteItem = async function(type, id) {
  const itemLabel = type === 'posts' ? 'posteo' : type === 'eventos' ? 'evento' : type === 'oportunidades' ? 'oportunidad' : 'recurso';
  if (!confirm(`¿Estás seguro de que querés eliminar este ${itemLabel}?`)) return;
  const endpoint = type === 'posts' ? `/posts/${id}` : type === 'eventos' ? `/eventos/${id}` : type === 'oportunidades' ? `/oportunidades/${id}` : `/recursos/${id}`;
  const res = await apiRequest(endpoint, { method: 'DELETE' });
  if (res?.ok) refreshAll();
};

window.openEdit = function(type, id) {
  if (type === 'oportunidades') {
    window.location.href = `${CONFIG.BASE}/crear-oportunidad.html?id=${id}`;
    return;
  }
  const item = data[type].find(x => x._id === id);
  if (!item) return;
  
  document.getElementById('edit-id').value = item._id;
  document.getElementById('edit-type').value = type;
  document.getElementById('edit-title').value = item.title;
  document.getElementById('edit-description').value = item.description || '';
  document.getElementById('edit-imageUrl').value = item.imageUrl || '';
  document.getElementById('modal-title').innerText = `Editar ${type === 'posts' ? 'Obra' : type === 'recursos' ? 'Recurso' : 'Evento'}`;
  
  // Reset visibility
  ['div-date', 'div-location', 'div-url', 'div-rec-type', 'div-tags'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  if (type === 'posts') {
    const divTags = document.getElementById('div-tags');
    if (divTags) divTags.classList.remove('hidden');
    document.getElementById('edit-tags').value = (item.tags || []).join(', ');
  } else if (type === 'recursos') {
    document.getElementById('div-url').classList.remove('hidden');
    document.getElementById('div-rec-type').classList.remove('hidden');
    document.getElementById('div-tags').classList.remove('hidden');
    document.getElementById('edit-url').value = item.url || '';
    document.getElementById('edit-rec-type').value = item.type || 'other';
    document.getElementById('edit-tags').value = (item.tags || []).join(', ');
  } else if (type === 'eventos') {
    document.getElementById('div-date').classList.remove('hidden');
    document.getElementById('div-location').classList.remove('hidden');
    document.getElementById('edit-location').value = item.location || '';
    if (item.date) {
      const d = new Date(item.date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      document.getElementById('edit-date').value = d.toISOString().slice(0, 16);
    }
  }

  const modal = document.getElementById('edit-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

window.closeEditModal = function() {
  const modal = document.getElementById('edit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.uploadImage = async function(input) {
  if (!input.files?.[0]) return;
  const status = document.getElementById('upload-status');
  if (status) status.innerText = 'Subiendo...';
  
  try {
    const formData = new FormData();
    formData.append('file', input.files[0]);
    const res = await fetch(CONFIG.API_URL + '/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });
    if (res.ok) {
      const d = await res.json();
      document.getElementById('edit-imageUrl').value = d.url;
      if (status) status.innerText = '¡Listo!';
    } else {
      if (status) status.innerText = 'Error';
    }
  } catch (err) {
    if (status) status.innerText = 'Error';
  }
};

const editForm = document.getElementById('edit-form');
if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const type = document.getElementById('edit-type').value;
    
    const body = {
      title: document.getElementById('edit-title').value,
      description: document.getElementById('edit-description').value,
      imageUrl: document.getElementById('edit-imageUrl').value
    };

    if (type === 'posts') {
      body.tags = document.getElementById('edit-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    } else if (type === 'recursos') {
      body.tags = document.getElementById('edit-tags').value.split(',').map(t => t.trim()).filter(Boolean);
      body.url = document.getElementById('edit-url').value;
      body.type = document.getElementById('edit-rec-type').value;
    } else if (type === 'eventos') {
      const dateVal = document.getElementById('edit-date').value;
      body.date = dateVal ? new Date(dateVal).toISOString() : null;
      body.location = document.getElementById('edit-location').value;
    }

    const endpoint = type === 'posts' ? `/posts/${id}` : type === 'eventos' ? `/eventos/${id}` : `/recursos/${id}`;
    const res = await apiRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });

    if (res?.ok) {
      closeEditModal();
      refreshAll();
    }
  });
}
