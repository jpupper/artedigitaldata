let currentTab = 'users';
let data = { users: [], posts: [], recursos: [], eventos: [] };
let filteredData = { users: [], posts: [], recursos: [], eventos: [] };

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
    const urls = [
      '/admin/users',
      '/posts',
      '/recursos',
      '/eventos'
    ];
    
    // We use apiRequest for admin/users because it likely needs auth headers handled by apiRequest
    const usersRes = await apiRequest('/admin/users');
    const postsRes = await fetch(CONFIG.API_URL + '/posts');
    const recursosRes = await fetch(CONFIG.API_URL + '/recursos');
    const eventosRes = await fetch(CONFIG.API_URL + '/eventos');

    data.users = await usersRes.json();
    data.posts = await postsRes.json();
    data.recursos = await recursosRes.json();
    data.eventos = await eventosRes.json();
    
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
    p.title.toLowerCase().includes(q) || p.author?.username?.toLowerCase().includes(q)
  );

  filteredData.recursos = data.recursos.filter(r => 
    r.title.toLowerCase().includes(q) || r.author?.username?.toLowerCase().includes(q)
  );

  filteredData.eventos = data.eventos.filter(e => 
    e.title.toLowerCase().includes(q) || e.creator?.username?.toLowerCase().includes(q)
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
          <td class="px-6 py-4 font-bold text-white">${u.username}</td>
          <td class="px-6 py-4 text-gray-400">${u.email}</td>
          <td class="px-6 py-4">
            <select onchange="changeRole('${u._id}', this.value)" class="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs">
              <option value="USUARIO" ${u.role === 'USUARIO' ? 'selected' : ''}>USUARIO</option>
              <option value="ADMINISTRADOR" ${u.role === 'ADMINISTRADOR' ? 'selected' : ''}>ADMIN</option>
            </select>
          </td>
          <td class="px-6 py-4 text-xs text-gray-500">${new Date(u.createdAt).toLocaleDateString()}</td>
          <td class="px-6 py-4">
            <a href="${CONFIG.BASE}/profile.html?user=${u.username}" class="text-cyan-400 hover:underline">Ver Perfil</a>
          </td>
        </tr>
      `).join('');
    }
  } else if (currentTab === 'posts') {
    const tbody = document.getElementById('posts-tbody');
    if (tbody) {
      tbody.innerHTML = filteredData.posts.map(p => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td class="px-6 py-4 font-bold text-white">${p.title}</td>
          <td class="px-6 py-4 text-gray-400">${p.author?.username || 'Anónimo'}</td>
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
          <td class="px-6 py-4 font-bold text-white">${r.title}</td>
          <td class="px-6 py-4 uppercase text-xs text-orange-400">${r.type}</td>
          <td class="px-6 py-4 text-gray-400">${r.author?.username || 'Anónimo'}</td>
          <td class="px-6 py-4 truncate max-w-[150px]"><a href="${r.url}" target="_blank" class="text-gray-500 hover:text-cyan-400">${r.url}</a></td>
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
          <td class="px-6 py-4 font-bold text-white">${e.title}</td>
          <td class="px-6 py-4 text-gray-400">${e.creator?.username || 'Anónimo'}</td>
          <td class="px-6 py-4 text-xs text-magenta-400">${new Date(e.date).toLocaleString()}</td>
          <td class="px-6 py-4 text-gray-500">${e.location || 'Virtual'}</td>
          <td class="px-6 py-4 flex gap-3">
            <a href="${CONFIG.BASE}/evento.html?id=${e._id}" target="_blank" class="text-cyan-400 hover:text-white"><i class="fas fa-external-link-alt"></i></a>
            <button onclick="openEdit('eventos', '${e._id}')" class="text-yellow-500 hover:text-yellow-400"><i class="fas fa-edit"></i></button>
            <button onclick="deleteItem('eventos', '${e._id}')" class="text-red-500 hover:text-red-400"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
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
  if (!confirm(`¿Estás seguro de que querés eliminar este ${type === 'posts' ? 'posteo' : type === 'eventos' ? 'evento' : 'recurso'}?`)) return;
  const endpoint = type === 'posts' ? `/posts/${id}` : type === 'eventos' ? `/eventos/${id}` : `/recursos/${id}`;
  const res = await apiRequest(endpoint, { method: 'DELETE' });
  if (res?.ok) refreshAll();
};

window.openEdit = function(type, id) {
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
