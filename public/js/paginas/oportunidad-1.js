let oportunidadId = null;
    let oportunidadData = null;
    let isInscrito = false;
    let esCreador = false;

    const tipoLabels = {
      convocatoria_obra: 'Convocatoria de Obra',
      oportunidad_laboral: 'Oportunidad Laboral',
      colaboracion: 'Colaboración'
    };

    const tipoIcons = {
      convocatoria_obra: 'fas fa-palette',
      oportunidad_laboral: 'fas fa-briefcase',
      colaboracion: 'fas fa-handshake'
    };

    const tipoColors = {
      convocatoria_obra: 'cyan',
      oportunidad_laboral: 'orange',
      colaboracion: 'magenta'
    };

    document.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      oportunidadId = urlParams.get('id');
      
      if (!oportunidadId) {
        showError();
        return;
      }

      await loadOportunidad();
    });

    async function loadOportunidad() {
      try {
        const res = await fetch(CONFIG.API_URL + '/oportunidades/' + oportunidadId);
        if (!res.ok) {
          showError();
          return;
        }

        oportunidadData = await res.json();
        renderOportunidad(oportunidadData);

        const esInterno = oportunidadData.sistemaInterno !== false;

        // Check permissions (creator or admin)
        if (isLoggedIn() && oportunidadData.creador) {
          const userId = getUserId();
          const creatorId = oportunidadData.creador._id || oportunidadData.creador;
          esCreador = userId && (creatorId === userId);
          const userIsAdmin = isAdmin();
          
          // Galería pública y flyer: los ve CUALQUIERA (son páginas públicas)
            { const bg = document.getElementById('btn-galeria-opo'); if (bg) bg.href = `galeria.html?id=${oportunidadId}`; }
            { const fl = document.getElementById('btn-flyer-opo'); if (fl) fl.href = `flyer.html?id=${oportunidadId}`; }

          if (esCreador || userIsAdmin) {
            document.getElementById('opo-edit-btn-container').classList.remove('hidden');
            document.getElementById('btn-edit-opo').href = `crear-oportunidad.html?id=${oportunidadId}`;
            
            document.getElementById('creador-panel').classList.remove('hidden');
            if (userIsAdmin && !esCreador) {
              document.getElementById('panel-titulo').textContent = 'Panel de Administración de Oportunidad';
            }
            if (esInterno) {
              document.getElementById('btn-ver-postulantes').classList.remove('hidden');
              document.getElementById('btn-ver-postulantes').href = `postulantes.html?id=${oportunidadId}`;
              document.getElementById('btn-ver-planilla').classList.remove('hidden');
              document.getElementById('btn-ver-planilla').href = `planilla.html?id=${oportunidadId}`;
            } else {
              document.getElementById('btn-ver-postulantes').classList.add('hidden');
            }
            document.getElementById('btn-edit-panel-opo').href = `crear-oportunidad.html?id=${oportunidadId}`;
          }

          // Usuarios autorizados a VER la planilla (sin permisos de edición)
          const accesoIds = (oportunidadData.accesoPostulantes || [])
            .map(u => String((u && u._id) ? u._id : u));
          if (!esCreador && !userIsAdmin && userId && accesoIds.includes(String(userId)) && esInterno) {
            const panelViewer = document.getElementById('viewer-planilla-panel');
            if (panelViewer) panelViewer.classList.remove('hidden');
            const btnVerPlanilla = document.getElementById('btn-ver-planilla-viewer');
            if (btnVerPlanilla) btnVerPlanilla.href = `planilla.html?id=${oportunidadId}`;
          }

          if (esInterno) {
            document.getElementById('convocatoria-externa-section').classList.add('hidden');
            if (esCreador) {
              document.getElementById('inscripcion-section').classList.add('hidden');
            } else {
              // Check if already inscribed (for admin or standard user)
              checkInscripcion();
            }
          } else {
            document.getElementById('inscripcion-section').classList.add('hidden');
            if (oportunidadData.linkExterno) {
              document.getElementById('convocatoria-externa-section').classList.remove('hidden');
              document.getElementById('btn-link-externo').href = oportunidadData.linkExterno;
            } else {
              document.getElementById('convocatoria-externa-section').classList.add('hidden');
            }
          }
        } else {
          if (esInterno) {
            document.getElementById('convocatoria-externa-section').classList.add('hidden');
            document.getElementById('inscripcion-section').classList.remove('hidden');
          } else {
            document.getElementById('inscripcion-section').classList.add('hidden');
            if (oportunidadData.linkExterno) {
              document.getElementById('convocatoria-externa-section').classList.remove('hidden');
              document.getElementById('btn-link-externo').href = oportunidadData.linkExterno;
            } else {
              document.getElementById('convocatoria-externa-section').classList.add('hidden');
            }
          }
        }

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('oportunidad-content').classList.remove('hidden');
      } catch (err) {
        console.error(err);
        showError();
      }
    }

    function renderOportunidad(opo) {
      const color = tipoColors[opo.tipo] || 'emerald';
      const icon = tipoIcons[opo.tipo] || 'fas fa-briefcase';
      const label = tipoLabels[opo.tipo] || 'Oportunidad';

      // Badge
      const badge = document.getElementById('opo-tipo-badge');
      badge.className = `px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`;
      badge.innerHTML = `<i class="${icon} mr-1"></i>${label}`;

      // Title
      document.getElementById('opo-titulo').textContent = opo.titulo;

      // Creator
      const creador = opo.creador || {};
      const creadorUser = creador.username || 'anónimo';
      const nombreEl = document.getElementById('opo-creador-nombre');
      if (nombreEl) {
        nombreEl.textContent = `@${creadorUser}`;
        nombreEl.href = `profile.html?user=${encodeURIComponent(creadorUser)}`;
      }

      const avatarEl = document.getElementById('opo-creador-avatar');
      if (avatarEl) {
        if (creador.avatar) {
          avatarEl.innerHTML = `<img src="${creador.avatar}" alt="${creadorUser}" class="w-full h-full object-cover rounded-full">`;
        } else if (typeof GenerativeAvatar !== 'undefined' && creador) {
          avatarEl.innerHTML = GenerativeAvatar.markup(creador, { className: 'w-full h-full object-cover rounded-full' });
        } else {
          avatarEl.innerHTML = `<span class="text-cyan-400 font-bold">${(creadorUser || '?')[0].toUpperCase()}</span>`;
        }
      }
      document.getElementById('opo-fecha').textContent = new Date(opo.createdAt).toLocaleDateString('es-AR');

      // Cocreadores
      const cocreadoresEl = document.getElementById('opo-cocreadores');
      if (cocreadoresEl) {
        cocreadoresEl.innerHTML = (typeof cocreadoresInlineHtml === 'function') ? cocreadoresInlineHtml(opo) : '';
      }

      // Description
      document.getElementById('opo-descripcion').innerHTML = (typeof formatMentions === 'function' ? formatMentions(opo.descripcion) : escapeHTML(opo.descripcion)) || 'Sin descripción.';

      // Image
      if (opo.imagenUrl) {
        document.getElementById('opo-imagen-section').classList.remove('hidden');
        document.getElementById('opo-imagen').src = opo.imagenUrl;
        document.getElementById('opo-imagen').alt = opo.titulo;
      }

      // Type-specific fields
      document.getElementById('fields-convocatoria_obra').classList.add('hidden');
      document.getElementById('fields-oportunidad_laboral').classList.add('hidden');
      document.getElementById('fields-colaboracion').classList.add('hidden');
      document.getElementById('fields-' + opo.tipo).classList.remove('hidden');

      if (opo.tipo === 'convocatoria_obra') {
        if (opo.basesCondiciones) {
          document.getElementById('opo-bases-section').classList.remove('hidden');
          document.getElementById('opo-basesCondiciones').innerHTML = typeof formatMentions === 'function' ? formatMentions(opo.basesCondiciones) : escapeHTML(opo.basesCondiciones);
        }
        if (opo.lugarExposicion && opo.lugarExposicion.trim()) {
          const lugar = opo.lugarExposicion.trim();
          document.getElementById('opo-lugar-section').classList.remove('hidden');
          document.getElementById('opo-lugarExposicion').textContent = lugar;

          const mapQuery = encodeURIComponent(lugar);
          const mapLink = document.getElementById('opo-map-link');
          if (mapLink) mapLink.href = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
          const mapIframe = document.getElementById('opo-map-iframe');
          if (mapIframe) mapIframe.src = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
        } else {
          document.getElementById('opo-lugar-section').classList.add('hidden');
        }
        if (Array.isArray(opo.diasEvento) && opo.diasEvento.length) {
          const wrap = document.getElementById('opo-dias-evento-wrap');
          if (wrap) {
            document.getElementById('opo-fechas-section').classList.remove('hidden');
            wrap.classList.remove('hidden');
            document.getElementById('opo-dias-evento').innerHTML = opo.diasEvento.filter(Boolean).slice().sort()
              .map(d => `<span class="fk-subtag px-3 py-1.5 text-xs font-bold text-white bg-black border border-white/15">${new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>`)
              .join('');
          }
        }
        if (opo.fechaDesde || opo.fechaHasta) {
          document.getElementById('opo-fechas-section').classList.remove('hidden');
          const desde = opo.fechaDesde ? new Date(opo.fechaDesde).toLocaleDateString('es-AR') : '?';
          const hasta = opo.fechaHasta ? new Date(opo.fechaHasta).toLocaleDateString('es-AR') : '?';
          document.getElementById('opo-fechas').textContent = `Desde ${desde} hasta ${hasta}`;
        }
        if (opo.linkExterno) {
          document.getElementById('opo-link-externo-row').classList.remove('hidden');
          const linkEl = document.getElementById('opo-link-externo-text');
          linkEl.href = opo.linkExterno;
          linkEl.querySelector('span').textContent = opo.linkExterno;
        } else {
          document.getElementById('opo-link-externo-row').classList.add('hidden');
        }
        const esInterno = opo.sistemaInterno !== false;
        if (esInterno && opo.parametrosPresentacion && opo.parametrosPresentacion.length) {
          document.getElementById('opo-parametros-section').classList.remove('hidden');
          document.getElementById('opo-parametros').innerHTML = opo.parametrosPresentacion.map(p => 
            `<span class="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">${p.label}${p.required ? ' *' : ''}</span>`
          ).join('');
        } else {
          document.getElementById('opo-parametros-section').classList.add('hidden');
        }
      } else if (opo.tipo === 'oportunidad_laboral') {
        document.getElementById('opo-nombrePuesto').textContent = opo.nombrePuesto || '-';
        document.getElementById('opo-productoraEmpresa').textContent = opo.productoraEmpresa || '-';
      } else if (opo.tipo === 'colaboracion') {
        document.getElementById('opo-nombreProyecto').textContent = opo.nombreProyecto || '-';
        document.getElementById('opo-colaboracionPedida').innerHTML = typeof formatMentions === 'function' ? formatMentions(opo.colaboracionPedida || '-') : escapeHTML(opo.colaboracionPedida || '-');
      }

      // Tags
      if (opo.tags && opo.tags.length) {
        document.getElementById('opo-tags-section').classList.remove('hidden');
        document.getElementById('opo-tags').innerHTML = opo.tags.map(t => 
          `<span class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs">#${t}</span>`
        ).join('');
      }
    }

    let inscripcionMode = 'obra'; // 'obra' | 'form'
    let misObras = [];
    let selectedObraId = null;
    let obraOptionalRendered = false;

    function escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function switchInscripcionMode(mode) {
      inscripcionMode = mode;
      const tabObra = document.getElementById('tab-mode-obra');
      const tabForm = document.getElementById('tab-mode-form');
      const panelObra = document.getElementById('panel-postular-obra');
      const panelForm = document.getElementById('panel-completar-form');
      const btnSubmit = document.getElementById('btn-submit-postulacion');
      const btnText = document.getElementById('btn-submit-text');

      if (mode === 'obra') {
        tabObra.className = 'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-cyan-500 text-black shadow-lg';
        tabForm.className = 'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-gray-400 hover:text-white';
        panelObra.classList.remove('hidden');
        panelForm.classList.add('hidden');
        btnSubmit.className = 'flex-1 px-6 py-3.5 rounded-xl bg-cyan-500 text-black font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2';
        btnSubmit.querySelector('i').className = 'fas fa-palette';
        btnText.textContent = 'Postular Obra Seleccionada';

        if (!misObras.length) {
          loadMisObras();
        }
      } else {
        tabForm.className = 'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-emerald-500 text-white shadow-lg';
        tabObra.className = 'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-gray-400 hover:text-white';
        panelForm.classList.remove('hidden');
        panelObra.classList.add('hidden');
        btnSubmit.className = 'flex-1 px-6 py-3.5 rounded-xl bg-emerald-500 text-white font-bold text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2';
        btnSubmit.querySelector('i').className = 'fas fa-paper-plane';
        btnText.textContent = 'Enviar Formulario de Inscripción';
        renderCamposDinamicos();
      }
    }

    async function loadMisObras() {
      const loadingEl = document.getElementById('mis-obras-loading');
      const emptyEl = document.getElementById('mis-obras-empty');
      const gridEl = document.getElementById('mis-obras-grid');
      const countEl = document.getElementById('mis-obras-count');

      loadingEl.classList.remove('hidden');
      emptyEl.classList.add('hidden');
      gridEl.classList.add('hidden');

      try {
        let posts = [];
        const res = await apiRequest('/posts/mis-obras');
        if (res && res.ok) {
          posts = await res.json();
        } else {
          // Fallback a perfil
          const username = getUserUsername();
          if (username) {
            const resProfile = await fetch(CONFIG.API_URL + '/profile/' + encodeURIComponent(username));
            if (resProfile.ok) {
              const dataProfile = await resProfile.json();
              posts = dataProfile.posts || [];
            }
          }
        }

        misObras = Array.isArray(posts) ? posts : [];
        countEl.textContent = misObras.length;
        loadingEl.classList.add('hidden');

        if (!misObras.length) {
          emptyEl.classList.remove('hidden');
          return;
        }

        gridEl.classList.remove('hidden');
        renderMisObras(misObras);

        // Si no hay obra seleccionada aún, preseleccionar la primera
        if (!selectedObraId && misObras.length > 0) {
          selectObra(misObras[0]._id);
        }
      } catch (err) {
        console.error('Error cargando obras:', err);
        loadingEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
      }
    }

    function renderMisObras(obras) {
      const gridEl = document.getElementById('mis-obras-grid');
      if (!obras.length) {
        gridEl.innerHTML = '<div class="col-span-full text-center text-gray-500 py-6 text-xs">No se encontraron obras con ese criterio.</div>';
        return;
      }

      gridEl.innerHTML = obras.map(o => {
        const isSelected = selectedObraId && (selectedObraId === o._id || selectedObraId === String(o._id));
        const img = o.imageUrl || 'img/placeholder.png';
        const title = escapeHTML(o.title || 'Sin título');

        return `
          <div onclick="selectObra('${o._id}')" 
               class="relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group ${isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/40 bg-cyan-500/10 scale-[1.02]' : 'border-white/10 hover:border-cyan-500/40 bg-black/40'}">
            <div class="aspect-square relative overflow-hidden bg-black/60">
              ${o.imageUrl ? `<img src="${img}" alt="${title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">` : `<div class="w-full h-full flex items-center justify-center text-gray-600"><i class="fas fa-palette text-2xl"></i></div>`}
              ${isSelected ? `
                <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg text-xs font-bold">
                  <i class="fas fa-check"></i>
                </div>
              ` : ''}
            </div>
            <div class="p-2.5">
              <h5 class="text-xs font-bold text-white truncate ${isSelected ? 'text-cyan-300' : ''}">${title}</h5>
              <p class="text-[10px] text-gray-500 mt-0.5">${new Date(o.createdAt).toLocaleDateString('es-AR')}</p>
            </div>
          </div>
        `;
      }).join('');
    }

    function filtrarMisObras() {
      const q = (document.getElementById('filtro-mis-obras').value || '').toLowerCase().trim();
      if (!q) {
        renderMisObras(misObras);
        return;
      }
      const filtradas = misObras.filter(o => (o.title || '').toLowerCase().includes(q) || (o.description || '').toLowerCase().includes(q));
      renderMisObras(filtradas);
    }

    function selectObra(obraId) {
      selectedObraId = obraId;
      const obra = misObras.find(o => String(o._id) === String(obraId));
      if (!obra) return;

      const card = document.getElementById('obra-seleccionada-card');
      card.classList.remove('hidden');

      const imgEl = document.getElementById('sel-obra-img');
      imgEl.src = obra.imageUrl || 'img/placeholder.png';
      imgEl.alt = obra.title || '';

      document.getElementById('sel-obra-titulo').textContent = obra.title || 'Sin título';
      document.getElementById('sel-obra-desc').textContent = obra.description || 'Sin descripción adicional.';
      document.getElementById('sel-obra-link').href = `post.html?id=${obra._id}`;

      // Actualizar highlight en el grid
      const q = (document.getElementById('filtro-mis-obras')?.value || '').toLowerCase().trim();
      const currentList = q ? misObras.filter(o => (o.title || '').toLowerCase().includes(q)) : misObras;
      renderMisObras(currentList);
    }

    function toggleObraOptionalFields() {
      const container = document.getElementById('obra-campos-opcionales');
      const arrow = document.getElementById('obra-optional-arrow');
      container.classList.toggle('hidden');

      if (!container.classList.contains('hidden')) {
        arrow.classList.add('rotate-90');
        if (!obraOptionalRendered) {
          renderCamposOpcionalesObra();
          obraOptionalRendered = true;
        }
      } else {
        arrow.classList.remove('rotate-90');
      }
    }

    function renderCamposOpcionalesObra() {
      const container = document.getElementById('obra-campos-opcionales');
      container.innerHTML = '';

      if (oportunidadData?.tipo === 'convocatoria_obra' && oportunidadData.parametrosPresentacion && oportunidadData.parametrosPresentacion.length) {
        oportunidadData.parametrosPresentacion.forEach(param => {
          const div = document.createElement('div');
          div.innerHTML = `
            <label class="block text-xs font-bold text-gray-300 mb-1.5">${escapeHTML(param.label)} <span class="text-gray-500 text-[10px] font-normal">(opcional)</span></label>
            ${param.type === 'textarea' 
              ? `<textarea name="opt_${param.key}" rows="2" class="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-colors text-xs" placeholder="${escapeHTML(param.placeholder || '')}"></textarea>`
              : `<input type="${param.type === 'url' ? 'url' : 'text'}" name="opt_${param.key}" class="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-colors text-xs" placeholder="${escapeHTML(param.placeholder || '')}">`
            }
          `;
          container.appendChild(div);
        });
      } else {
        container.innerHTML = '<p class="text-xs text-gray-500">Esta convocatoria no posee parámetros adicionales.</p>';
      }
    }

    async function checkInscripcion() {
      if (!isLoggedIn()) return;
      
      try {
        const res = await apiRequest('/oportunidades/mis-inscripciones/listar');
        if (res && res.ok) {
          const inscripciones = await res.json();
          const current = inscripciones.find(i => (i.oportunidad?._id === oportunidadId || i.oportunidad === oportunidadId));
          
          if (current) {
            isInscrito = true;
            document.getElementById('btn-inscribirse').classList.add('hidden');
            const msgBox = document.getElementById('ya-inscrito-msg');
            msgBox.classList.remove('hidden');

            const detalleEl = document.getElementById('ya-inscrito-detalle');
            const esObra = current.tipoInscripcion === 'obra' || current.obra || current.datos?.tipoInscripcion === 'obra';
            
            if (esObra) {
              const obraObj = current.obra || {};
              const obraTitulo = escapeHTML(obraObj.title || current.datos?.obraTitulo || 'Obra postulada');
              const obraImg = obraObj.imageUrl || current.datos?.obraImagen || '';
              const obraIdRef = obraObj._id || current.datos?.obraId;

              detalleEl.innerHTML = `
                <div class="inline-flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-left mt-2">
                  ${obraImg ? `<img src="${obraImg}" class="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0">` : `<div class="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0"><i class="fas fa-palette text-cyan-400"></i></div>`}
                  <div>
                    <span class="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block"><i class="fas fa-palette mr-1"></i> Postulado con Obra</span>
                    <a href="post.html?id=${obraIdRef}" target="_blank" class="text-sm font-bold text-white hover:text-cyan-400 transition-colors">${obraTitulo} <i class="fas fa-external-link-alt text-[10px]"></i></a>
                    <span class="block text-[10px] text-gray-400 mt-0.5">Estado: <span class="capitalize font-semibold text-emerald-400">${current.estado}</span></span>
                  </div>
                </div>
              `;
            } else {
              detalleEl.innerHTML = `
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-bold">
                  <i class="fas fa-file-signature"></i> Postulación enviada mediante Formulario Manual (Estado: <span class="capitalize">${current.estado}</span>)
                </span>
              `;
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    function toggleInscripcionForm() {
      if (!isLoggedIn()) {
        showLogin();
        return;
      }
      
      const form = document.getElementById('inscripcion-form');
      form.classList.toggle('hidden');
      
      if (!form.classList.contains('hidden')) {
        // En convocatorias de obra, abrir preferentemente en modo 'obra'
        if (oportunidadData?.tipo === 'convocatoria_obra') {
          switchInscripcionMode('obra');
        } else {
          switchInscripcionMode('form');
        }
      }
    }

    function renderCamposDinamicos() {
      const container = document.getElementById('inscripcion-campos-dinamicos');
      container.innerHTML = '';

      if (oportunidadData.tipo === 'convocatoria_obra' && oportunidadData.parametrosPresentacion) {
        oportunidadData.parametrosPresentacion.forEach(param => {
          const div = document.createElement('div');
          div.innerHTML = `
            <label class="block text-sm font-bold text-gray-300 mb-2">${escapeHTML(param.label)}${param.required ? ' *' : ''}</label>
            ${param.type === 'textarea' 
              ? `<textarea name="${param.key}" data-required="${param.required}" rows="3" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors" placeholder="${escapeHTML(param.placeholder || '')}"></textarea>`
              : `<input type="${param.type === 'url' ? 'url' : 'text'}" name="${param.key}" data-required="${param.required}" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors" placeholder="${escapeHTML(param.placeholder || '')}">`
            }
          `;
          container.appendChild(div);
        });
      } else if (oportunidadData.tipo === 'oportunidad_laboral') {
        container.innerHTML = `
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-2">Tu nombre completo *</label>
            <input type="text" name="nombre" data-required="true" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors" placeholder="Nombre completo">
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-2">Email *</label>
            <input type="email" name="email" data-required="true" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors" placeholder="email@ejemplo.com">
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-2">Portfolio / Reel (URL)</label>
            <input type="url" name="portfolio" data-required="false" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors" placeholder="https://...">
          </div>
        `;
      } else if (oportunidadData.tipo === 'colaboracion') {
        container.innerHTML = `
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-2">Tu nombre *</label>
            <input type="text" name="nombre" data-required="true" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors" placeholder="Nombre">
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-2">¿Qué podés aportar? *</label>
            <textarea name="aporte" data-required="true" rows="3" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors" placeholder="Contanos tus habilidades y qué podés aportar..."></textarea>
          </div>
        `;
      }
    }

    async function submitInscripcion() {
      const mensaje = document.getElementById('insc-mensaje').value;

      if (inscripcionMode === 'obra') {
        if (!selectedObraId) {
          alert('Por favor, seleccioná una obra de tu perfil para postular.');
          return;
        }

        // Datos opcionales si completó alguno
        const datos = {};
        document.querySelectorAll('#obra-campos-opcionales [name]').forEach(input => {
          const rawKey = input.name.replace(/^opt_/, '');
          const val = input.value.trim();
          if (val) datos[rawKey] = val;
        });

        try {
          const res = await apiRequest(`/oportunidades/${oportunidadId}/inscripcion`, {
            method: 'POST',
            body: JSON.stringify({
              tipoInscripcion: 'obra',
              obraId: selectedObraId,
              datos,
              mensaje
            }),
          });

          if (res && res.ok) {
            document.getElementById('inscripcion-form').classList.add('hidden');
            document.getElementById('inscripcion-success').classList.remove('hidden');
            document.getElementById('btn-inscribirse').classList.add('hidden');
            await checkInscripcion();
          } else if (res && res.status === 400) {
            const data = await res.json();
            alert(data.error || 'Error al inscribirse.');
          } else {
            alert('Error al inscribirse. Intentá de nuevo.');
          }
        } catch (err) {
          console.error(err);
          alert('Error al inscribirse. Intentá de nuevo.');
        }
      } else {
        // Modo Formulario: se validan campos requeridos
        const datos = {};
        let hasEmptyRequired = false;

        document.querySelectorAll('#inscripcion-campos-dinamicos [name]').forEach(input => {
          const key = input.name;
          const required = input.dataset.required === 'true';
          const value = input.value.trim();
          
          if (required && !value) {
            hasEmptyRequired = true;
            input.classList.add('border-red-500/50');
          } else {
            input.classList.remove('border-red-500/50');
          }
          
          datos[key] = value;
        });

        if (hasEmptyRequired) {
          alert('Por favor, completá todos los campos obligatorios del formulario.');
          return;
        }

        try {
          const res = await apiRequest(`/oportunidades/${oportunidadId}/inscripcion`, {
            method: 'POST',
            body: JSON.stringify({
              tipoInscripcion: 'formulario',
              datos,
              mensaje
            }),
          });

          if (res && res.ok) {
            document.getElementById('inscripcion-form').classList.add('hidden');
            document.getElementById('inscripcion-success').classList.remove('hidden');
            document.getElementById('btn-inscribirse').classList.add('hidden');
            await checkInscripcion();
          } else if (res && res.status === 400) {
            const data = await res.json();
            alert(data.error || 'Error al inscribirse.');
          } else {
            alert('Error al inscribirse. Intentá de nuevo.');
          }
        } catch (err) {
          console.error(err);
          alert('Error al inscribirse. Intentá de nuevo.');
        }
      }
    }

    async function loadInscripciones() {
      const container = document.getElementById('inscripciones-container');
      
      try {
        const res = await apiRequest(`/oportunidades/${oportunidadId}/inscripciones`);
        if (!res || !res.ok) {
          container.innerHTML = '<p class="text-center text-gray-500">Error cargando inscripciones.</p>';
          return;
        }

        const inscripciones = await res.json();
        
        if (!inscripciones.length) {
          container.innerHTML = `
            <div class="text-center text-gray-500 py-10">
              <i class="fas fa-inbox text-4xl text-gray-600 mb-3"></i>
              <p>Aún no hay inscripciones.</p>
            </div>`;
          return;
        }

        container.innerHTML = inscripciones.map(insc => {
          const user = insc.usuario || {};
          const estadoColors = {
            pendiente: 'yellow',
            aceptada: 'green',
            rechazada: 'red'
          };
          const estadoColor = estadoColors[insc.estado] || 'gray';

          const esObra = insc.tipoInscripcion === 'obra' || insc.obra || insc.datos?.tipoInscripcion === 'obra';
          const obra = insc.obra || null;
          const obraSnapshot = {
            id: obra?._id || insc.datos?.obraId,
            title: obra?.title || insc.datos?.obraTitulo,
            image: obra?.imageUrl || insc.datos?.obraImagen,
            description: obra?.description || insc.datos?.obraDescripcion
          };

          let datosHtml = '';
          if (insc.datos && Object.keys(insc.datos).length) {
            const visibleEntries = Object.entries(insc.datos).filter(([k]) => !['tipoInscripcion', 'obraId', 'obraTitulo', 'obraImagen', 'obraDescripcion', 'obraYoutube'].includes(k));
            if (visibleEntries.length) {
              datosHtml = '<div class="mt-3 space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">' + visibleEntries.map(([key, val]) => 
                `<div class="text-xs"><span class="text-gray-500 font-bold">${escapeHTML(key)}:</span> <span class="text-gray-300">${escapeHTML(String(val))}</span></div>`
              ).join('') + '</div>';
            }
          }

          let obraBoxHtml = '';
          if (esObra) {
            obraBoxHtml = `
              <div class="mt-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  ${obraSnapshot.image ? `<img src="${escapeHTML(obraSnapshot.image)}" class="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0">` : `<div class="w-14 h-14 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0"><i class="fas fa-palette text-cyan-400"></i></div>`}
                  <div>
                    <span class="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block mb-0.5"><i class="fas fa-palette mr-1"></i> Obra Postulada</span>
                    <h5 class="text-sm font-bold text-white">${escapeHTML(obraSnapshot.title || 'Obra')}</h5>
                    ${obraSnapshot.description ? `<p class="text-xs text-gray-400 line-clamp-1">${escapeHTML(obraSnapshot.description)}</p>` : ''}
                  </div>
                </div>
                ${obraSnapshot.id ? `
                  <a href="post.html?id=${obraSnapshot.id}" target="_blank" class="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition-all shrink-0 inline-flex items-center gap-1">
                    <span>Ver Obra</span> <i class="fas fa-external-link-alt text-[10px]"></i>
                  </a>
                ` : ''}
              </div>
            `;
          }

          return `
            <div class="bg-white/5 border border-white/10 rounded-xl p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                    ${(user.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <a href="profile.html?user=${user.username}" class="text-sm font-bold text-white hover:text-emerald-400 transition-colors">@${user.username || 'usuario'}</a>
                    <p class="text-xs text-gray-500">${user.email || ''}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  ${esObra 
                    ? `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase flex items-center gap-1"><i class="fas fa-palette"></i> Obra</span>`
                    : `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase flex items-center gap-1"><i class="fas fa-file-signature"></i> Formulario</span>`
                  }
                  <span class="px-2 py-1 rounded-lg text-[10px] font-bold bg-${estadoColor}-500/20 text-${estadoColor}-400 border border-${estadoColor}-500/30 uppercase">${insc.estado}</span>
                </div>
              </div>
              
              ${obraBoxHtml}
              ${insc.mensaje ? `<p class="mt-3 text-sm text-gray-400 italic">"${escapeHTML(insc.mensaje)}"</p>` : ''}
              ${datosHtml}
              
              ${insc.estado === 'pendiente' ? `
                <div class="mt-4 flex gap-2">
                  <button onclick="actualizarEstado('${insc._id}', 'aceptada')" class="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-all">
                    <i class="fas fa-check mr-1"></i>Aceptar
                  </button>
                  <button onclick="actualizarEstado('${insc._id}', 'rechazada')" class="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">
                    <i class="fas fa-times mr-1"></i>Rechazar
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="text-center text-gray-500">Error cargando inscripciones.</p>';
      }
    }

    async function actualizarEstado(inscripcionId, estado) {
      try {
        const res = await apiRequest(`/oportunidades/${oportunidadId}/inscripciones/${inscripcionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ estado }),
        });

        if (res && res.ok) {
          loadInscripciones();
        } else {
          alert('Error al actualizar el estado.');
        }
      } catch (err) {
        console.error(err);
        alert('Error al actualizar el estado.');
      }
    }

    function showError() {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error-message').classList.remove('hidden');
    }
