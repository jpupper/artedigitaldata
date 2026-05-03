/**
 * Centralized Edit Logic for Posts, Recursos and Eventos
 * Requires: forms.js, config.js, auth.js, tagging.js
 */

let editingItem = null;
let editOnComplete = null;

function closeGlobalEdit() {
  const modal = document.getElementById('global-edit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function loadItemToEdit(type, id, onComplete) {
  try {
    editOnComplete = onComplete;
    const res = await fetch(`${CONFIG.API_URL}/${type}/${id}`);
    const item = await res.json();
    
    // Normalize type
    const normalizedType = type === 'posts' ? 'post' : (type === 'recursos' ? 'recurso' : 'evento');
    
    editingItem = { 
      type: normalizedType, 
      apiType: type,
      id, 
      currentImageUrl: item.imageUrl 
    };
    
    const modal = document.getElementById('global-edit-modal');
    const content = document.getElementById('edit-modal-content');
    if (!modal || !content) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const titleMap = { post: 'Obra', recurso: 'Recurso', evento: 'Evento' };
    const colorMap = { post: 'cyan', recurso: 'orange', evento: 'magenta' };

    content.innerHTML = `
      <h3 class="text-xl font-bold text-white mb-6 uppercase tracking-tighter sticky top-0 bg-[#0d0d12] py-2 z-10">Editar <span class="text-${colorMap[normalizedType]}-400">${titleMap[normalizedType]}</span></h3>
      <div class="space-y-6">
        ${renderFields(normalizedType, 'edit', item)}
      </div>
      <div class="pt-6 mt-6 border-t border-white/5 sticky bottom-0 bg-[#0d0d12] pb-2">
        <button id="save-edit-btn" onclick="saveEdit()" class="btn-primary w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-[1.02]">
          <i class="fas fa-save mr-2"></i>Guardar Cambios
        </button>
      </div>
    `;

    // Initialize tagging and ticket config
    setTimeout(() => {
      if (typeof enableTagging === 'function') {
        enableTagging('edit-desc');
        const desc = document.getElementById('edit-desc');
        const preview = document.getElementById('edit-desc-preview');
        if (desc && preview) {
          desc.addEventListener('input', () => {
            preview.innerHTML = formatMentions(desc.value) || 'Vista previa...';
            if (normalizedType === 'evento' && typeof syncParticipantsFromDescription === 'function') {
              syncParticipantsFromDescription('edit', desc.value);
            }
          });
          preview.innerHTML = formatMentions(desc.value) || 'Vista previa...';
        }
      }
      // Initialize ticket config visibility
      if (typeof toggleTicketConfig === 'function') {
        toggleTicketConfig('edit');
      }
    }, 100);

  } catch (err) {
    console.error('Error loading item:', err);
    alert('Error al cargar datos');
  }
}

async function saveEdit() {
  const btn = document.getElementById('save-edit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';

  const { type, apiType, id, currentImageUrl } = editingItem;
  const file = document.getElementById('edit-file')?.files[0];
  
  let imageUrl = currentImageUrl;
  if (type === 'evento' && document.getElementById('edit-img-url')) {
    imageUrl = document.getElementById('edit-img-url').value.trim();
  }

  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadRes = await fetch(CONFIG.API_URL + '/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        imageUrl = data.url;
      }
    } catch (err) {
      console.error('Error uploading image:', err);
    }
  }

  const body = {
    title: document.getElementById('edit-title').value.trim(),
    description: document.getElementById('edit-desc').value.trim(),
    youtube_video: document.getElementById('edit-youtube').value.trim(),
    imageUrl
  };

  if (type === 'post') {
    body.tags = document.getElementById('edit-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  } else if (type === 'recurso') {
    body.type = document.getElementById('edit-type').value;
    body.url = document.getElementById('edit-url').value.trim();
    body.tags = document.getElementById('edit-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  } else if (type === 'evento') {
    const dateVal = document.getElementById('edit-date').value;
    body.date = dateVal ? new Date(dateVal).toISOString() : null;
    body.location = document.getElementById('edit-location').value.trim();
    body.ticketConfig = window.getTicketConfig('edit');
    if (typeof getParticipantIds === 'function') {
      body.manualParticipants = getParticipantIds('edit');
    }
  }

  try {
    const res = await apiRequest(`/${apiType}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });

    if (res?.ok) {
      closeGlobalEdit();
      if (editOnComplete === true) {
        window.location.reload();
      } else if (typeof editOnComplete === 'function') {
        await editOnComplete();
      } else if (typeof loadProfile === 'function') {
        await loadProfile();
      }
    } else {
      alert('Error al guardar cambios');
    }
  } catch (err) {
    alert('Error de conexión');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar Cambios';
  }
}
