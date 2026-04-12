if (!isLoggedIn()) { 
  showLogin(); 
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) return;

  // Initialize Forms
  document.getElementById('post-fields-root').innerHTML = renderFields('post', 'post');
  document.getElementById('recurso-fields-root').innerHTML = renderFields('recurso', 'rec');
  document.getElementById('evento-fields-root').innerHTML = renderFields('evento', 'event');

  // Initialize Tagging and Previews
  ['post', 'rec', 'event'].forEach(prefix => {
    const desc = document.getElementById(`${prefix}-desc`);
    const preview = document.getElementById(`${prefix}-desc-preview`);
    
    if (desc && preview) {
      enableTagging(desc.id);
      desc.addEventListener('input', () => {
        preview.innerHTML = formatMentions(desc.value) || 'Vista previa de menciones...';
      });
    }
  });

  // File preview logic (attach to future elements)
  document.addEventListener('change', (e) => {
    if (e.target.id === 'post-file') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('post-file-preview');
          if (preview) preview.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover">`;
        }
        reader.readAsDataURL(file);
      }
    }
    if (e.target.id === 'rec-file') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('rec-file-preview');
          if (preview) preview.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover">`;
        }
        reader.readAsDataURL(file);
      }
    }
  });

  // Form handlers
  document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('post-title').value.trim();
    const description = document.getElementById('post-desc').value.trim();
    const youtube_video = document.getElementById('post-youtube').value.trim();
    const tags = document.getElementById('post-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const file = document.getElementById('post-file').files[0];

    showStatus('Subiendo Obra', 'Optimizando imagen y procesando datos...');

    let imageUrl = '';
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
        console.error("Upload error:", err);
      }
    }

    const res = await apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify({ title, description, imageUrl, youtube_video, tags })
    });

    if (res?.ok) {
      const post = await res.json();
      showStatus('¡LISTO!', 'Gracias por contribuir a la comunidad', true);
      setTimeout(() => {
        window.location.href = `post.html?id=${post._id}`;
      }, 2000);
    } else {
      document.getElementById('status-overlay').classList.add('hidden');
      alert('Error al publicar. Reintenta por favor.');
    }
  });

  document.getElementById('recurso-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('rec-title').value.trim();
    const type = document.getElementById('rec-type').value;
    const url = document.getElementById('rec-url').value.trim();
    const youtube_video = document.getElementById('rec-youtube').value.trim();
    const description = document.getElementById('rec-desc').value.trim();
    const tags = document.getElementById('rec-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const file = document.getElementById('rec-file').files[0];

    showStatus('Guardando Recurso', 'Vinculando enlace y herramientas...');

    let imageUrl = '';
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
        console.error("Upload error:", err);
      }
    }

    const res = await apiRequest('/recursos', {
      method: 'POST',
      body: JSON.stringify({ title, type, url, description, youtube_video, tags, imageUrl })
    });

    if (res?.ok) {
      showStatus('¡RECURSO SUBIDO!', 'Gracias por compartir tus herramientas', true);
      setTimeout(() => {
        window.location.href = 'recursos.html';
      }, 2000);
    } else {
      document.getElementById('status-overlay').classList.add('hidden');
      alert('Error al subir recurso.');
    }
  });

  document.getElementById('evento-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('event-title').value.trim();
    const description = document.getElementById('event-desc').value.trim();
    const youtube_video = document.getElementById('event-youtube').value.trim();
    const date = document.getElementById('event-date').value;
    const location = document.getElementById('event-location').value.trim();
    const file = document.getElementById('event-file').files[0];
    let imageUrl = document.getElementById('event-img-url').value.trim(); // Corregido el ID

    showStatus('Publicando Evento', 'Notificando a los artistas etiquedados...');

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
         console.error("Upload error:", err);
      }
    }

    const res = await apiRequest('/eventos', {
      method: 'POST',
      body: JSON.stringify({ title, description, date, location, imageUrl, youtube_video })
    });

    if (res?.ok) {
      showStatus('¡FECHA PUBLICADA!', '¡Nos vemos en el evento!', true);
      setTimeout(() => {
        window.location.href = 'calendario.html';
      }, 2000);
    } else {
      document.getElementById('status-overlay').classList.add('hidden');
      alert('Error al publicar fecha.');
    }
  });
});

window.switchType = function(type) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
  const btn = document.getElementById(`btn-${type}`);
  if (btn) btn.classList.add('active');

  document.getElementById('post-form').classList.add('hidden');
  document.getElementById('recurso-form').classList.add('hidden');
  document.getElementById('evento-form').classList.add('hidden');
  document.getElementById(`${type}-form`).classList.remove('hidden');
};

window.showStatus = function(title, msg, isSuccess = false) {
  const overlay = document.getElementById('status-overlay');
  const titleEl = document.getElementById('status-title');
  const msgEl = document.getElementById('status-msg');
  const spinner = document.getElementById('status-spinner');
  const iconContainer = document.getElementById('status-icon');

  if (!overlay || !titleEl || !msgEl || !spinner || !iconContainer) return;

  titleEl.innerText = title;
  msgEl.innerText = msg;
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');

  if (isSuccess) {
    spinner.classList.add('hidden');
    iconContainer.innerHTML = `<div class="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 text-5xl animate-bounce"><i class="fas fa-check"></i></div>`;
  } else {
    spinner.classList.remove('hidden');
    iconContainer.innerHTML = `<div class="relative w-24 h-24"><div class="absolute inset-0 border-4 border-white/5 rounded-full"></div><div id="status-spinner" class="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin"></div></div>`;
  }
};
