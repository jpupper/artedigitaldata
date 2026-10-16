let selectedTipo = null;
    let uploadedImageUrl = '';
    let editingId = null;

    // Verificar autenticación e inicializar edición si hay parámetro id
    document.addEventListener('DOMContentLoaded', async () => {
      if (!isLoggedIn()) {
        showLogin();
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      editingId = urlParams.get('id');

      renderCocreadoresSection('opo-cocreadores-root', 'opo');

      if (editingId) {
        await loadOportunidadToEdit(editingId);
      }
    });

    async function loadOportunidadToEdit(id) {
      try {
        const res = await fetch(CONFIG.API_URL + '/oportunidades/' + id);
        if (!res.ok) {
          alert('No se pudo cargar la oportunidad para editar.');
          window.location.href = 'oportunidades.html';
          return;
        }

        const data = await res.json();
        const userId = getUserId();
        const creatorId = data.creador?._id || data.creador;
        const esCreador = userId && (creatorId === userId);
        const userIsAdmin = isAdmin();

        if (!esCreador && !userIsAdmin) {
          alert('No tenés permisos para editar esta oportunidad.');
          window.location.href = `oportunidad.html?id=${id}`;
          return;
        }

        // Títulos de edición
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = 'Editar Oportunidad';
        const subEl = document.getElementById('page-subtitle');
        if (subEl) subEl.textContent = 'Modificá los datos de tu convocatoria, búsqueda laboral o colaboración.';
        
        document.title = 'Editar Oportunidad - Arte Digital Data';

        const submitBtn = document.querySelector('#oportunidad-form button[type="submit"]');
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar Cambios';
        }

        // Seleccionar tipo
        selectTipo(data.tipo);

        // Campos comunes
        document.getElementById('opo-titulo').value = data.titulo || '';
        document.getElementById('opo-descripcion').value = data.descripcion || '';
        document.getElementById('opo-tags').value = (data.tags || []).join(', ');
        if (document.getElementById('opo-visibility')) {
          document.getElementById('opo-visibility').value = data.visibility || 'public';
        }

        if (data.imagenUrl) {
          uploadedImageUrl = data.imagenUrl;
          const previewDiv = document.getElementById('opo-imagen-preview');
          if (previewDiv) {
            previewDiv.classList.remove('hidden');
            const img = previewDiv.querySelector('img');
            if (img) img.src = data.imagenUrl;
            const label = document.getElementById('opo-imagen-label');
            if (label) label.textContent = 'Imagen actual cargada';
          }
        }

        // Campos específicos
        if (data.tipo === 'convocatoria_obra') {
          const sistemaInterno = data.sistemaInterno !== false;
          const switchEl = document.getElementById('opo-sistemaInterno');
          if (switchEl) switchEl.checked = sistemaInterno;
          const linkEl = document.getElementById('opo-linkExterno');
          if (linkEl) linkEl.value = data.linkExterno || '';
          toggleSistemaInterno(sistemaInterno);

          document.getElementById('opo-basesCondiciones').value = data.basesCondiciones || '';
          document.getElementById('opo-lugarExposicion').value = data.lugarExposicion || '';
          if (data.fechaDesde) {
        if (Array.isArray(data.diasEvento) && data.diasEvento.length) {
          const chk = document.getElementById('opo-marcarDias');
          if (chk) { chk.checked = true; toggleDiasEvento(true); }
          const cont = document.getElementById('dias-evento-container');
          if (cont) { cont.innerHTML = ''; data.diasEvento.forEach(d => addDiaEvento(d)); }
        }
            document.getElementById('opo-fechaDesde').value = new Date(data.fechaDesde).toISOString().split('T')[0];
          }
          if (data.fechaHasta) {
            document.getElementById('opo-fechaHasta').value = new Date(data.fechaHasta).toISOString().split('T')[0];
          }
          const container = document.getElementById('parametros-container');
          if (container) {
            container.innerHTML = '';
            if (data.parametrosPresentacion && data.parametrosPresentacion.length > 0) {
              data.parametrosPresentacion.forEach(param => addParametro(param));
            }
          }
          if (data.lugarExposicion) {
            updateMapPreview(data.lugarExposicion);
          }
          if (sistemaInterno) {
            mostrarAccesoPlanilla(id);
          }
        } else if (data.tipo === 'oportunidad_laboral') {
          document.getElementById('opo-nombrePuesto').value = data.nombrePuesto || '';
          document.getElementById('opo-productoraEmpresa').value = data.productoraEmpresa || '';
        } else if (data.tipo === 'colaboracion') {
          document.getElementById('opo-nombreProyecto').value = data.nombreProyecto || '';
          document.getElementById('opo-colaboracionPedida').value = data.colaboracionPedida || '';
        }

        renderCocreadoresSection('opo-cocreadores-root', 'opo', data);
      } catch (err) {
        console.error('Error al cargar datos para edición:', err);
        alert('Error de conexión al cargar la oportunidad.');
      }
    }

    let mapPreviewTimeout = null;
    function updateMapPreview(val) {
      clearTimeout(mapPreviewTimeout);
      const container = document.getElementById('opo-map-preview-container');
      const iframe = document.getElementById('opo-map-preview-iframe');
      if (!container || !iframe) return;

      const query = (val || '').trim();
      if (!query) {
        container.classList.add('hidden');
        iframe.src = '';
        return;
      }

      mapPreviewTimeout = setTimeout(() => {
        iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
        container.classList.remove('hidden');
      }, 500);
    }

    function toggleSistemaInterno(enabled) {
      const sectionLink = document.getElementById('section-link-externo');
      const sectionParams = document.getElementById('section-parametros-presentacion');
      const linkInput = document.getElementById('opo-linkExterno');

      if (enabled) {
        if (sectionLink) sectionLink.classList.add('hidden');
        if (sectionParams) sectionParams.classList.remove('hidden');
      } else {
        if (sectionLink) sectionLink.classList.remove('hidden');
        if (sectionParams) sectionParams.classList.add('hidden');
        if (linkInput && !linkInput.value) {
          linkInput.focus();
        }
      }
    }

    function selectTipo(tipo) {
      selectedTipo = tipo;
      
      // Update button styles
      document.querySelectorAll('.tipo-btn').forEach(btn => {
        btn.classList.remove('border-emerald-500/50', 'bg-emerald-500/10', 'ring-2', 'ring-emerald-500/30');
        btn.classList.add('border-white/10', 'bg-white/5');
      });
      
      const activeBtn = document.getElementById('btn-' + tipo);
      if (activeBtn) {
        activeBtn.classList.remove('border-white/10', 'bg-white/5');
        activeBtn.classList.add('border-emerald-500/50', 'bg-emerald-500/10', 'ring-2', 'ring-emerald-500/30');
      }

      // Show form
      document.getElementById('step-form').classList.remove('hidden');
      
      // Show specific fields
      document.getElementById('fields-convocatoria_obra').classList.add('hidden');
      document.getElementById('fields-oportunidad_laboral').classList.add('hidden');
      document.getElementById('fields-colaboracion').classList.add('hidden');
      document.getElementById('fields-' + tipo).classList.remove('hidden');

      if (tipo === 'convocatoria_obra') {
        const switchEl = document.getElementById('opo-sistemaInterno');
        if (!editingId && switchEl) {
          switchEl.checked = true;
        }
        toggleSistemaInterno(switchEl ? switchEl.checked : true);
      }

      // Scroll to form
      document.getElementById('step-form').scrollIntoView({ behavior: 'smooth' });
    }

    // Parámetros de presentación
    function addParametro(paramData = null) {
      const container = document.getElementById('parametros-container');
      const row = document.createElement('div');
      row.className = 'parametro-row grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-white/5 rounded-xl p-4 border border-white/5';
      const label = paramData ? (paramData.label || '') : '';
      const type = paramData ? (paramData.type || 'text') : 'text';
      const required = paramData ? !!paramData.required : false;

      row.innerHTML = `
        <div>
          <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre</label>
          <input type="text" class="param-label w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" placeholder="Ej: Portfolio" value="${label}">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo</label>
          <select class="param-type w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
            <option value="text" ${type === 'text' ? 'selected' : ''}>Texto</option>
            <option value="textarea" ${type === 'textarea' ? 'selected' : ''}>Texto largo</option>
            <option value="url" ${type === 'url' ? 'selected' : ''}>URL / Link</option>
            <option value="file" ${type === 'file' ? 'selected' : ''}>Archivo</option>
            <option value="reel" ${type === 'reel' ? 'selected' : ''}>Reel / Video</option>
          </select>
        </div>
        <div class="flex items-center h-full pb-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="param-required w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50" ${required ? 'checked' : ''}>
            <span class="text-xs text-gray-400">Obligatorio</span>
          </label>
        </div>
        <div class="flex items-center h-full pb-2">
          <button type="button" onclick="removeParametro(this)" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      `;
      container.appendChild(row);
    }

    function removeParametro(btn) {
      btn.closest('.parametro-row').remove();
    }

    // Image handling
    function handleImagePreview(input) {
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('opo-imagen-preview').classList.remove('hidden');
          document.getElementById('opo-imagen-preview').querySelector('img').src = e.target.result;
          document.getElementById('opo-imagen-label').textContent = input.files[0].name;
        };
        reader.readAsDataURL(input.files[0]);
      }
    }

    function clearImage() {
      document.getElementById('opo-imagen').value = '';
      document.getElementById('opo-imagen-preview').classList.add('hidden');
      document.getElementById('opo-imagen-label').textContent = 'Subir imagen';
      uploadedImageUrl = '';
    }

    // Submit
    /* ── Días de evento: el tilde muestra/oculta la lista de días ── */
    function addDiaEvento(valor) {
      const cont = document.getElementById('dias-evento-container');
      if (!cont) return;
      const row = document.createElement('div');
      row.className = 'dia-evento-row flex items-center gap-2';
      row.innerHTML = '<input type="date" class="dia-evento w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-500/50 focus:outline-none transition-colors">' +
        '<button type="button" onclick="this.closest('.dia-evento-row').remove()" class="w-11 h-11 shrink-0 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center" title="Quitar día"><i class="fas fa-times"></i></button>';
      cont.appendChild(row);
      if (valor) row.querySelector('.dia-evento').value = String(valor).slice(0, 10);
    }
    function toggleDiasEvento(on) {
      const sec = document.getElementById('section-diasEvento');
      if (!sec) return;
      sec.classList.toggle('hidden', !on);
      const cont = document.getElementById('dias-evento-container');
      if (on && cont && !cont.children.length) addDiaEvento();
    }
    function getDiasEvento() {
      return [...document.querySelectorAll('.dia-evento')].map(i => i.value).filter(Boolean);
    }

    document.getElementById('oportunidad-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!selectedTipo) {
        alert('Por favor, seleccioná un tipo de oportunidad.');
        return;
      }

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = editingId
        ? '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...'
        : '<i class="fas fa-spinner fa-spin mr-2"></i>Publicando...';

      try {
        // Upload image if selected
        const imageInput = document.getElementById('opo-imagen');
        if (imageInput.files && imageInput.files[0]) {
          const formData = new FormData();
          formData.append('file', imageInput.files[0]);
          
          const uploadRes = await fetch(CONFIG.API_URL + '/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
          });
          
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            uploadedImageUrl = uploadData.url;
          }
        }

        // Build data object
        const data = {
          tipo: selectedTipo,
          titulo: document.getElementById('opo-titulo').value,
          descripcion: document.getElementById('opo-descripcion').value,
          imagenUrl: uploadedImageUrl,
          tags: document.getElementById('opo-tags').value.split(',').map(t => t.trim()).filter(t => t),
          visibility: document.getElementById('opo-visibility').value,
          cocreadores: (typeof getCocreadoresIds === 'function') ? getCocreadoresIds('opo') : [],
        };

        // Add type-specific fields
        if (selectedTipo === 'convocatoria_obra') {
          const switchEl = document.getElementById('opo-sistemaInterno');
          const sistemaInterno = switchEl ? switchEl.checked : true;
          const linkExterno = (document.getElementById('opo-linkExterno')?.value || '').trim();

          if (!sistemaInterno && !linkExterno) {
            alert('Por favor, ingresá el link de la convocatoria externa para que las personas puedan inscribirse.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = editingId
              ? '<i class="fas fa-save mr-2"></i>Guardar Cambios'
              : '<i class="fas fa-rocket mr-2"></i>Publicar Oportunidad';
            document.getElementById('opo-linkExterno').focus();
            return;
          }

          data.sistemaInterno = sistemaInterno;
          data.linkExterno = linkExterno;
          data.basesCondiciones = document.getElementById('opo-basesCondiciones').value;
          data.lugarExposicion = document.getElementById('opo-lugarExposicion').value;
          data.fechaDesde = document.getElementById('opo-fechaDesde').value || null;
          data.fechaHasta = document.getElementById('opo-fechaHasta').value || null;
          data.diasEvento = document.getElementById('opo-marcarDias')?.checked ? getDiasEvento() : [];
          
          if (sistemaInterno) {
            // Get parametros
            const parametros = [];
            document.querySelectorAll('.parametro-row').forEach(row => {
              const label = row.querySelector('.param-label').value;
              const type = row.querySelector('.param-type').value;
              const required = row.querySelector('.param-required').checked;
              if (label) {
                parametros.push({
                  key: label.toLowerCase().replace(/\s+/g, '_'),
                  label,
                  type,
                  required,
                });
              }
            });
            data.parametrosPresentacion = parametros;
          } else {
            data.parametrosPresentacion = [];
          }
        } else if (selectedTipo === 'oportunidad_laboral') {
          data.nombrePuesto = document.getElementById('opo-nombrePuesto').value;
          data.productoraEmpresa = document.getElementById('opo-productoraEmpresa').value;
        } else if (selectedTipo === 'colaboracion') {
          data.nombreProyecto = document.getElementById('opo-nombreProyecto').value;
          data.colaboracionPedida = document.getElementById('opo-colaboracionPedida').value;
        }

        let res;
        if (editingId) {
          res = await apiRequest('/oportunidades/' + editingId, {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
        } else {
          res = await apiRequest('/oportunidades', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        }

        if (res && res.ok) {
          const oportunidad = await res.json();
          document.getElementById('step-tipo').classList.add('hidden');
          document.getElementById('step-form').classList.add('hidden');

          const successTitle = document.querySelector('#success-message h2');
          const successSub = document.querySelector('#success-message p');
          if (editingId) {
            if (successTitle) successTitle.textContent = '¡OPORTUNIDAD ACTUALIZADA!';
            if (successSub) successSub.textContent = 'Los cambios fueron guardados exitosamente.';
          }

          document.getElementById('success-message').classList.remove('hidden');
          document.getElementById('success-opo-id').value = oportunidad._id;
          document.getElementById('btn-ver-opo').href = `oportunidad.html?id=${oportunidad._id}`;
        } else {
          alert(`Error al ${editingId ? 'guardar' : 'publicar'}. Intentá de nuevo.`);
          submitBtn.disabled = false;
          submitBtn.innerHTML = editingId
            ? '<i class="fas fa-save mr-2"></i>Guardar Cambios'
            : '<i class="fas fa-rocket mr-2"></i>Publicar Oportunidad';
        }
      } catch (err) {
        console.error(err);
        alert(`Error al ${editingId ? 'guardar' : 'publicar'}. Intentá de nuevo.`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = editingId
          ? '<i class="fas fa-save mr-2"></i>Guardar Cambios'
          : '<i class="fas fa-rocket mr-2"></i>Publicar Oportunidad';
      }
    });

    // ─────────────────────────────────────────── ACCESO A LA PLANILLA ────
    let accesoPlanillaLista = [];

    async function mostrarAccesoPlanilla(opoId) {
      const section = document.getElementById('section-acceso-planilla');
      if (!section) return;

      section.classList.remove('hidden');
      const link = document.getElementById('link-ver-planilla');
      if (link) link.href = `planilla.html?id=${opoId}`;

      await AccesoPlanilla.ensureUsers();
      const lista = await AccesoPlanilla.list(opoId);
      accesoPlanillaLista = lista || [];
      renderAccesoPlanillaLista();
    }

    function renderAccesoPlanillaLista() {
      const cont = document.getElementById('acceso-lista');
      const vacio = document.getElementById('acceso-vacio');
      if (!cont) return;

      if (!accesoPlanillaLista.length) {
        cont.innerHTML = '';
        if (vacio) vacio.classList.remove('ui-hidden');
        return;
      }

      if (vacio) vacio.classList.add('ui-hidden');
      cont.innerHTML = accesoPlanillaLista.map(u => AccesoPlanilla.userChip(u, { removable: true })).join('');
    }

    function buscarAcceso(query) {
      const cont = document.getElementById('acceso-resultados');
      if (!cont) return;

      if (!query.trim()) {
        cont.classList.add('ui-hidden');
        return;
      }

      const yaIds = accesoPlanillaLista.map(u => String(u._id));
      const matches = AccesoPlanilla.search(query, yaIds);

      cont.innerHTML = matches.length
        ? matches.map(u => AccesoPlanilla.resultRow(u)).join('')
        : '<div style="padding:14px 16px; font-size:13px; color: var(--ui-text-mute);"><i class="fas fa-search" style="margin-right:8px;"></i>No se encontraron usuarios</div>';
      cont.classList.remove('ui-hidden');
    }

    AccesoPlanilla.onPick = async (userId) => {
      const cont = document.getElementById('acceso-resultados');
      const input = document.getElementById('acceso-buscar');
      if (cont) cont.classList.add('ui-hidden');
      if (input) input.value = '';

      const res = await AccesoPlanilla.add(editingId, userId);
      if (res && res.ok) {
        const data = await res.json();
        accesoPlanillaLista = data.accesoPostulantes || [];
        renderAccesoPlanillaLista();
      } else {
        const err = res ? await res.json().catch(() => ({})) : {};
        alert(err.error || 'No se pudo agregar el usuario.');
      }
    };

    AccesoPlanilla.onRemove = async (userId) => {
      if (!confirm('¿Quitarle a este usuario el acceso a la planilla?')) return;

      const res = await AccesoPlanilla.remove(editingId, userId);
      if (res && res.ok) {
        const data = await res.json();
        accesoPlanillaLista = data.accesoPostulantes || [];
        renderAccesoPlanillaLista();
      } else {
        alert('No se pudo quitar el acceso.');
      }
    };

    document.addEventListener('click', (e) => {
      const wrap = document.querySelector('.pl-acceso-wrap');
      if (wrap && !wrap.contains(e.target)) {
        const cont = document.getElementById('acceso-resultados');
        if (cont) cont.classList.add('ui-hidden');
      }
    });

    function resetForm() {
      selectedTipo = null;
      uploadedImageUrl = '';
      editingId = null;
      document.getElementById('oportunidad-form').reset();
      clearImage();
      
      const switchEl = document.getElementById('opo-sistemaInterno');
      if (switchEl) switchEl.checked = true;
      const linkEl = document.getElementById('opo-linkExterno');
      if (linkEl) linkEl.value = '';
      toggleSistemaInterno(true);

      document.querySelectorAll('.tipo-btn').forEach(btn => {
        btn.classList.remove('border-emerald-500/50', 'bg-emerald-500/10', 'ring-2', 'ring-emerald-500/30');
        btn.classList.add('border-white/10', 'bg-white/5');
      });
      
      const titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = 'Crear Oportunidad';
      const subEl = document.getElementById('page-subtitle');
      if (subEl) subEl.textContent = 'Publicá tu convocatoria, búsqueda laboral o colaboración.';
      
      const submitBtn = document.querySelector('#oportunidad-form button[type="submit"]');
      if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-rocket mr-2"></i>Publicar Oportunidad';

      document.getElementById('step-tipo').classList.remove('hidden');
      document.getElementById('step-form').classList.add('hidden');
      document.getElementById('success-message').classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
