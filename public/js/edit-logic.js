/**
 * Centralized Edit Logic for Posts, Recursos and Eventos
 * Requires: forms.js, config.js, auth.js, tagging.js, cropperjs
 */

let editingItem = null;
let editOnComplete = null;
let editCropper = null;
let editNewImageBlob = null;

function closeGlobalEdit() {
  const modal = document.getElementById('global-edit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if (editCropper) {
    editCropper.destroy();
    editCropper = null;
  }
  editNewImageBlob = null;
  const replaceInput = document.getElementById('edit-img-replace');
  if (replaceInput) replaceInput.value = '';
}

async function loadItemToEdit(type, id, onComplete) {
  try {
    editOnComplete = onComplete;
    editNewImageBlob = null;
    if (editCropper) { editCropper.destroy(); editCropper = null; }

    const res = await fetch(`${CONFIG.API_URL}/${type}/${id}`);
    const item = await res.json();

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
    const borderMap = { post: 'cyan-500/30', recurso: 'orange-500/30', evento: 'magenta-500/30' };
    const c = colorMap[normalizedType];
    const b = borderMap[normalizedType];

    content.innerHTML = `
      <h3 class="text-xl font-bold text-white mb-6 uppercase tracking-tighter sticky top-0 bg-[#0d0d12] py-2 z-10">Editar <span class="text-${c}-400">${titleMap[normalizedType]}</span></h3>
      <div class="space-y-6 overflow-y-auto max-h-[70vh] pr-1">
        ${renderFields(normalizedType, 'edit', item)}

        <!-- Image Adjuster Section -->
        <div class="border-t border-white/10 pt-6 mt-6">
          <h4 class="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <i class="fas fa-image text-${c}-400"></i>
            Ajustar Imagen
          </h4>

          <!-- Current Image Preview -->
          <div id="edit-image-current" class="mb-4 ${item.imageUrl ? '' : 'hidden'}">
            <p class="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Imagen actual:</p>
            <div class="relative rounded-2xl overflow-hidden border border-white/10 bg-black/50">
              <img id="edit-current-img" src="${item.imageUrl || ''}" class="w-full max-h-64 object-contain">
              <button type="button" onclick="removeCurrentImage()" class="absolute top-2 right-2 w-8 h-8 rounded-xl bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-all">
                <i class="fas fa-trash-alt text-xs"></i>
              </button>
            </div>
          </div>

          <!-- Cropper Area -->
          <div id="edit-cropper-area" class="hidden">
            <div class="rounded-2xl overflow-hidden border border-white/10 bg-black/50 mb-3" style="max-height:350px;">
              <img id="edit-cropper-img" src="">
            </div>
            <div class="flex justify-center gap-2 flex-wrap">
              <button type="button" onclick="editCropper.rotate(-90)" class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-${c}-500/50 transition-all flex items-center justify-center"><i class="fas fa-undo"></i></button>
              <button type="button" onclick="editCropper.rotate(90)" class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-${c}-500/50 transition-all flex items-center justify-center"><i class="fas fa-redo"></i></button>
              <button type="button" onclick="editCropper.setAspectRatio(1)" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-${c}-500/50 transition-all text-[10px] font-bold uppercase">1:1</button>
              <button type="button" onclick="editCropper.setAspectRatio(16/9)" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-${c}-500/50 transition-all text-[10px] font-bold uppercase">16:9</button>
              <button type="button" onclick="editCropper.setAspectRatio(NaN)" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-${c}-500/50 transition-all text-[10px] font-bold uppercase">Libre</button>
            </div>
          </div>

          <!-- File Input -->
          <div class="mt-4">
            <label class="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
              <i class="fas fa-upload mr-1"></i>Reemplazar / Recortar imagen
            </label>
            <input type="file" id="edit-img-replace" accept="image/*" onchange="handleEditImageReplace(this)"
              class="w-full bg-white/5 border border-${b} rounded-xl px-4 py-3 text-gray-400 file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:bg-${c}-500/20 file:text-${c}-400 file:cursor-pointer text-sm">
          </div>
        </div>
      </div>
      <div class="pt-6 mt-6 border-t border-white/5 sticky bottom-0 bg-[#0d0d12] pb-2">
        <button id="save-edit-btn" onclick="saveEdit()" class="btn-primary w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-[1.02]">
          <i class="fas fa-save mr-2"></i>Guardar Cambios
        </button>
      </div>
    `;

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
      if (typeof toggleTicketConfig === 'function') {
        toggleTicketConfig('edit');
      }
    }, 100);

  } catch (err) {
    console.error('Error loading item:', err);
    alert('Error al cargar datos');
  }
}

function handleEditImageReplace(input) {
  const file = input.files[0];
  if (!file) return;
  editNewImageBlob = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const cropperArea = document.getElementById('edit-cropper-area');
    const img = document.getElementById('edit-cropper-img');
    const currentSection = document.getElementById('edit-image-current');

    img.src = e.target.result;
    cropperArea.classList.remove('hidden');
    currentSection.classList.add('hidden');

    if (editCropper) {
      editCropper.destroy();
    }
    setTimeout(() => {
      editCropper = new Cropper(img, {
        aspectRatio: NaN,
        viewMode: 1,
        autoCropArea: 0.8,
        background: false,
        responsive: true,
      });
    }, 200);
  };
  reader.readAsDataURL(file);
}

function removeCurrentImage() {
  editingItem.currentImageUrl = '';
  document.getElementById('edit-image-current').classList.add('hidden');
  if (editCropper) {
    editCropper.destroy();
    editCropper = null;
  }
  editNewImageBlob = null;
  const replaceInput = document.getElementById('edit-img-replace');
  if (replaceInput) replaceInput.value = '';
}

async function saveEdit() {
  const btn = document.getElementById('save-edit-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';

  const { type, apiType, id, currentImageUrl } = editingItem;
  let imageUrl = currentImageUrl;

  // Si hay nueva imagen (con o sin cropper), subirla
  if (editNewImageBlob) {
    try {
      let blobToUpload = editNewImageBlob;

      // Si hay cropper activo, obtener la imagen recortada
      if (editCropper) {
        const croppedCanvas = editCropper.getCroppedCanvas();
        blobToUpload = await new Promise(resolve => {
          croppedCanvas.toBlob(resolve, blobToUpload.type);
        });
      }

      const formData = new FormData();
      formData.append('file', blobToUpload, editNewImageBlob.name);

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
  } else if (type === 'evento' && document.getElementById('edit-img-url')) {
    imageUrl = document.getElementById('edit-img-url').value.trim();
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
    body.tags = document.getElementById('edit-tags')?.value.split(',').map(t => t.trim()).filter(Boolean) || [];
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
    btn.innerHTML = originalText;
  }
}
