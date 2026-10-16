let allOportunidades = [];
    let currentFilter = 'all';

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
      await loadOportunidades();
    });

    async function loadOportunidades() {
      const container = document.getElementById('oportunidades-container');
      try {
        const res = await fetch(CONFIG.API_URL + '/oportunidades');
        allOportunidades = await res.json();
        renderOportunidades(allOportunidades);
      } catch {
        container.innerHTML = `<div class="col-span-full text-center text-red-400 py-10"><i class="fas fa-exclamation-triangle mr-2"></i>Error cargando oportunidades</div>`;
      }
    }

    function filterOportunidades(tipo) {
      currentFilter = tipo;
      
      // Update button styles
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('border-emerald-500/30', 'bg-emerald-500/10', 'text-emerald-400');
        btn.classList.add('border-white/10', 'bg-white/5', 'text-gray-500');
      });
      
      const activeBtn = document.getElementById('filter-' + tipo);
      if (activeBtn) {
        activeBtn.classList.remove('border-white/10', 'bg-white/5', 'text-gray-500');
        activeBtn.classList.add('border-emerald-500/30', 'bg-emerald-500/10', 'text-emerald-400');
      }

      const filtered = tipo === 'all' ? allOportunidades : allOportunidades.filter(o => o.tipo === tipo);
      renderOportunidades(filtered);
    }

    function renderOportunidades(oportunidades) {
      const container = document.getElementById('oportunidades-container');
      if (!oportunidades.length) {
        container.innerHTML = `
          <div class="col-span-full text-center text-gray-500 py-20">
            <i class="fas fa-briefcase text-5xl text-emerald-400/30 mb-4"></i>
            <p class="text-xl">Aún no hay oportunidades publicadas</p>
            <p class="text-sm mt-2">¡Sé el primero en crear una!</p>
          </div>`;
        return;
      }

      container.innerHTML = oportunidades.map(opo => {
        const color = tipoColors[opo.tipo] || 'emerald';
        const icon = tipoIcons[opo.tipo] || 'fas fa-briefcase';
        const label = tipoLabels[opo.tipo] || 'Oportunidad';
        
        let extraInfo = '';
        if (opo.tipo === 'convocatoria_obra') {
          if (opo.lugarExposicion) extraInfo = `<span class="text-xs text-gray-500"><i class="fas fa-map-marker-alt mr-1"></i>${opo.lugarExposicion}</span>`;
          if (opo.fechaHasta) extraInfo += `<span class="text-xs text-gray-500 ml-3"><i class="fas fa-clock mr-1"></i>${new Date(opo.fechaHasta).toLocaleDateString('es-AR')}</span>`;
        } else if (opo.tipo === 'oportunidad_laboral') {
          if (opo.nombrePuesto) extraInfo = `<span class="text-xs text-gray-500"><i class="fas fa-user-tie mr-1"></i>${opo.nombrePuesto}</span>`;
          if (opo.productoraEmpresa) extraInfo += `<span class="text-xs text-gray-500 ml-3"><i class="fas fa-building mr-1"></i>${opo.productoraEmpresa}</span>`;
        } else if (opo.tipo === 'colaboracion') {
          if (opo.nombreProyecto) extraInfo = `<span class="text-xs text-gray-500"><i class="fas fa-project-diagram mr-1"></i>${opo.nombreProyecto}</span>`;
        }

        return `
          <div class="rounded-2xl overflow-hidden border border-${color}-500/10 card-cyber transition-all duration-300 flex flex-col h-full group hover:border-${color}-500/30">
            ${opo.imagenUrl ? `
              <div class="relative aspect-video overflow-hidden">
                <img src="${opo.imagenUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="${opo.titulo}">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
            ` : `
              <div class="relative aspect-video overflow-hidden bg-${color}-500/5 flex items-center justify-center">
                <i class="${icon} text-5xl text-${color}-500/20"></i>
              </div>
            `}
            <div class="p-5 flex-1 flex flex-col">
              <div class="flex items-center gap-2 mb-3">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-${color}-500/20 text-${color}-400 border border-${color}-500/30 uppercase tracking-widest">
                  <i class="${icon} mr-1"></i>${label}
                </span>
                ${opo.tipo === 'convocatoria_obra' && opo.sistemaInterno === false ? `
                  <span class="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase tracking-wider flex items-center gap-1">
                    <i class="fas fa-external-link-alt text-[8px]"></i> Link Externo
                  </span>
                ` : ''}
              </div>
              <h3 class="text-lg font-bold text-white mb-2 line-clamp-1">${opo.titulo}</h3>
              <p class="text-gray-400 text-sm mb-3 line-clamp-2">${typeof formatMentions === 'function' ? formatMentions(opo.descripcion) : (opo.descripcion || '')}</p>
              
              ${extraInfo ? `<div class="flex flex-wrap gap-2 mb-4">${extraInfo}</div>` : ''}
              
              <div class="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-cyan-400 shrink-0">
                    ${opo.creador?.avatar 
                      ? `<img src="${opo.creador.avatar}" alt="${opo.creador.username || ''}" class="w-full h-full object-cover">` 
                      : (typeof GenerativeAvatar !== 'undefined' && opo.creador 
                          ? GenerativeAvatar.markup(opo.creador, { className: 'w-full h-full object-cover' }) 
                          : `<span>${(opo.creador?.username || '?')[0].toUpperCase()}</span>`
                        )
                    }
                  </div>
                  <span class="min-w-0 flex flex-col leading-tight">
                    <span class="text-xs text-gray-200 font-bold truncate">${opo.creador?.displayName || opo.creador?.username || 'anónimo'}</span>
                    <span class="text-[10px] text-gray-500 truncate">@${opo.creador?.username || 'anónimo'}</span>
                  </span>
                </div>
                ${opo.tipo === 'convocatoria_obra' && opo.sistemaInterno === false ? `
                  <span class="text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
                    <i class="fas fa-external-link-alt text-[9px]"></i> Externo
                  </span>
                ` : `
                  <span class="text-xs text-gray-500">
                    <i class="fas fa-users mr-1"></i>${opo.inscripciones?.length || 0}
                  </span>
                `}
              </div>
            </div>
            <a href="oportunidad.html?id=${opo._id}" class="block p-3 bg-${color}-500/10 text-${color}-400 hover:bg-${color}-500 hover:text-white transition-all text-xs font-bold w-full text-center">
              VER CONVOCATORIA <i class="fas fa-arrow-right ml-1"></i>
            </a>
          </div>
        `;
      }).join('');
    }
