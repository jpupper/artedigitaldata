const tipoLabels = {
      convocatoria_obra: 'Convocatoria de Obra',
      oportunidad_laboral: 'Oportunidad Laboral',
      colaboracion: 'Colaboración'
    };

    const RESERVED_DATOS = ['tipoInscripcion', 'obraId', 'obraTitulo', 'obraImagen', 'obraDescripcion', 'obraYoutube', 'respuesta'];

    let oportunidadId = null;
    let oportunidadData = null;
    let inscripciones = [];
    let columnas = [];
    let puedeGestionar = false;
    let accesoLista = [];

    document.addEventListener('DOMContentLoaded', async () => {
      const params = new URLSearchParams(window.location.search);
      oportunidadId = params.get('id');

      if (!oportunidadId) {
        mostrarDenegado('No se especificó la convocatoria. Abrí la planilla desde la convocatoria o con el link que te compartieron.');
        return;
      }

      await inicializar();

      if (params.get('acceso') === '1') abrirAcceso();
    });

    async function inicializar() {
      try {
        const res = await fetch(CONFIG.API_URL + '/oportunidades/' + oportunidadId, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {}
        });
        if (!res.ok) {
          mostrarDenegado('La convocatoria solicitada no existe o fue eliminada.');
          return;
        }

        oportunidadData = await res.json();
        puedeGestionar = !!oportunidadData.puedeGestionar;

        const userId = getUserId();
        const accesoIds = (oportunidadData.accesoPostulantes || [])
          .map(u => String((u && u._id) ? u._id : u));
        const esViewer = !!userId && accesoIds.includes(String(userId));

        document.getElementById('opo-titulo').textContent = oportunidadData.titulo || 'Convocatoria';
        const badge = document.getElementById('opo-tipo-badge');
        badge.textContent = tipoLabels[oportunidadData.tipo] || 'Oportunidad';
        document.getElementById('btn-back-opo').href = `oportunidad.html?id=${oportunidadId}`;

        if (oportunidadData.sistemaInterno === false) {
          document.getElementById('aviso-externo').classList.remove('ui-hidden');
          const link = document.getElementById('btn-link-externo');
          link.href = sanitizeUrl(oportunidadData.linkExterno) || '#';
          document.getElementById('btn-acceso').classList.add('ui-hidden');
          finalizarCarga();
          return;
        }

        if (!puedeGestionar && !esViewer) {
          mostrarDenegado(isLoggedIn()
            ? 'Tu cuenta no tiene permiso para ver la planilla de inscriptos de esta convocatoria. Pedile acceso a quien la organiza.'
            : 'Iniciá sesión con una cuenta autorizada para ver la planilla de inscriptos.');
          return;
        }

        if (puedeGestionar) {
          document.getElementById('btn-acceso').classList.remove('ui-hidden');
          const tarjetas = document.getElementById('btn-ver-tarjetas');
          tarjetas.href = `postulantes.html?id=${oportunidadId}`;
          tarjetas.classList.remove('ui-hidden');
          const galeria = document.getElementById('btn-ver-galeria');
          if (galeria) galeria.href = `galeria.html?id=${oportunidadId}`;
          const flyer = document.getElementById('btn-ver-flyer');
          if (flyer) flyer.href = `flyer.html?id=${oportunidadId}`;
        }

        await cargarInscriptos();
        finalizarCarga();
      } catch (err) {
        console.error(err);
        mostrarDenegado('Error de conexión al validar el acceso a la planilla.');
      }
    }

    function finalizarCarga() {
      document.getElementById('loading').classList.add('ui-hidden');
      document.getElementById('planilla-content').classList.remove('ui-hidden');
    }

    async function cargarInscriptos() {
      const res = await apiRequest(`/oportunidades/${oportunidadId}/inscripciones`);
      if (!res || !res.ok) {
        document.getElementById('planilla-body').innerHTML =
          '<tr><td colspan="20" class="pl-empty"><i class="fas fa-triangle-exclamation"></i><p>Error al cargar las postulaciones.</p></td></tr>';
        return;
      }

      inscripciones = await res.json();
      await resolverObrasVinculadas();
      columnas = construirColumnas(oportunidadData, inscripciones);
      renderCabecera();
      renderFilas();
      actualizarStats();
    }

    // ─────────────────────────────────────────────────── COLUMNAS ─────────
    function construirColumnas(opo, lista) {
      const cols = [];

      cols.push({
        id: 'num', label: '#', cls: 'pl-col-num',
        render: (i, idx) => String(idx + 1),
        csv: (i, idx) => idx + 1,
      });

      cols.push({
        id: 'obra', label: 'Nombre de la obra',
        render: (i) => obraCell(i),
        csv: (i) => nombreObra(i),
      });

      cols.push({
        id: 'artista', label: 'Artista',
        render: (i) => usuarioCell(i),
        csv: (i) => nombreArtista(i),
      });

      cols.push({
        id: 'descripcion', label: 'Descripción de la obra',
        render: (i) => {
          const d = descripcionObra(i);
          return d
            ? `<div class="pl-desc" title="${escapeHTML(d)}" onclick="toggleTexto(this)">${escapeHTML(d)}</div>`
            : '<span class="pl-valor pl-valor--vacio">—</span>';
        },
        csv: (i) => descripcionObra(i),
      });

      cols.push({
        id: 'media', label: 'Imagen / Video',
        render: (i) => mediaCell(i),
        csv: (i) => [imagenObra(i), videoObra(i)].filter(Boolean).join(' | '),
      });

      cols.push({
        id: 'fecha', label: 'Subido el',
        render: (i) => fechaCell(i),
        csv: (i) => i.createdAt ? new Date(i.createdAt).toLocaleString('es-AR') : '',
      });

      // Campos dinámicos definidos por el creador en el formulario
      const params = (opo.parametrosPresentacion || []).filter(p => p && p.key);
      const keys = [];
      params.forEach(p => { if (!keys.includes(p.key)) keys.push(p.key); });
      lista.forEach(insc => {
        Object.keys(insc.datos || {}).forEach(k => {
          if (!RESERVED_DATOS.includes(k) && !keys.includes(k)) keys.push(k);
        });
      });

      const tipos = {};
      params.forEach(p => { tipos[p.key] = p.type; });

      keys.forEach(key => {
        const param = params.find(p => p.key === key);
        const label = param ? param.label : key.replace(/_/g, ' ');
        const tipo = tipos[key] || 'text';
        cols.push({
          id: 'dato_' + key,
          label: label,
          render: (i) => renderValor((i.datos || {})[key], tipo),
          csv: (i) => (i.datos || {})[key] || '',
        });
      });

      cols.push({
        id: 'mensaje', label: 'Mensaje',
        render: (i) => i.mensaje
          ? `<div class="pl-desc" style="max-width:260px;" title="${escapeHTML(i.mensaje)}" onclick="toggleTexto(this)">${escapeHTML(i.mensaje)}</div>`
          : '<span class="pl-valor pl-valor--vacio">—</span>',
        csv: (i) => i.mensaje || '',
      });

      cols.push({
        id: 'estado', label: 'Aceptada por el curador',
        render: (i) => estadoBadge(i.estado),
        csv: (i) => estadoLabel(i.estado),
      });

      cols.push({
        id: 'acciones', label: 'Acciones', sinCsv: true,
        render: (i) => accionesCell(i),
      });

      return cols;
    }

    function renderCabecera() {
      document.getElementById('planilla-head').innerHTML =
        '<tr>' + columnas.map(c => `<th class="${c.cls || ''}">${escapeHTML(c.label)}</th>`).join('') + '</tr>';
    }

    // ─────────────────────────────────────────────────── CELDAS ───────────
    // Una inscripción puede traer su obra de dos maneras:
    //  a) como obra de la plataforma (obra ref / datos.obraId), o
    //  b) como LINK a una obra subida en Arte Digital Data (post?id=...) escrito
    //     en alguna respuesta del formulario ("obra tipo link").
    // Si la obra vino como link a una obra de ADD, se busca su ficha pública
    // para mostrar el nombre, la imagen y la descripción reales.
    async function resolverObrasVinculadas() {
      const pendientes = inscripciones.filter(i => {
        const tieneTitulo = (i.obra && i.obra.title) || i.datos?.obraTitulo;
        return !tieneTitulo && !!obraIdVinculado(i);
      }).slice(0, 20);

      await Promise.all(pendientes.map(async (insc) => {
        const id = obraIdVinculado(insc);
        try {
          const res = await fetch(`${CONFIG.API_URL}/posts/${id}`);
          if (!res.ok) return;
          const post = await res.json();
          insc._obraVinculada = {
            _id: id,
            title: post.title,
            imageUrl: post.imageUrl,
            description: post.description,
            youtube_video: post.youtube_video,
          };
        } catch (e) { /* si falla, queda el link pelado */ }
      }));
    }

    function obraIdEnTexto(txt) {
      if (!txt || typeof txt !== 'string') return '';
      const m = txt.match(/(?:post|obra)(?:\.html)?\?id=([a-fA-F0-9]{24})/);
      return m ? m[1] : '';
    }

    function obraIdVinculado(insc) {
      const obra = insc.obra || {};
      const vinc = insc._obraVinculada || {};
      const directo = obra._id || insc.datos?.obraId || vinc._id;
      if (directo) return String(directo);
      for (const valor of Object.values(insc.datos || {})) {
        const id = obraIdEnTexto(valor);
        if (id) return id;
      }
      return '';
    }

    function obraDeInsc(insc) {
      const obra = insc.obra || {};
      const vinc = insc._obraVinculada || {};
      const id = obraIdVinculado(insc);
      return {
        id,
        viaLink: !!id && !obra._id && !insc.datos?.obraId,
        title: obra.title || insc.datos?.obraTitulo || vinc.title || '',
        image: obra.imageUrl || insc.datos?.obraImagen || vinc.imageUrl || '',
        description: obra.description || insc.datos?.obraDescripcion || vinc.description || '',
        youtube: obra.youtube_video || insc.datos?.obraYoutube || vinc.youtube_video || '',
      };
    }

    function esObra(insc) {
      return insc.tipoInscripcion === 'obra' || !!insc.obra || insc.datos?.tipoInscripcion === 'obra' || !!obraIdVinculado(insc);
    }

    function nombreObra(insc) { return obraDeInsc(insc).title; }
    function descripcionObra(insc) { return obraDeInsc(insc).description; }
    function imagenObra(insc) { return obraDeInsc(insc).image; }
    function videoObra(insc) { return obraDeInsc(insc).youtube; }

    function nombreArtista(insc) {
      const u = insc.usuario || {};
      return u.displayName || u.username || '';
    }

    function obraCell(insc) {
      const o = obraDeInsc(insc);
      const href = o.id ? `post.html?id=${encodeURIComponent(o.id)}` : '';

      let tituloHtml;
      if (o.title && href) {
        tituloHtml = `<a class="pl-obra-title" href="${href}" target="_blank" rel="noopener" title="${escapeHTML(o.title)}">${escapeHTML(o.title)}</a>`;
      } else if (o.title) {
        tituloHtml = `<span class="pl-obra-title" title="${escapeHTML(o.title)}">${escapeHTML(o.title)}</span>`;
      } else if (href) {
        tituloHtml = `<a class="pl-obra-title" href="${href}" target="_blank" rel="noopener" title="Obra subida en Arte Digital Data">Ver obra en ADD</a>`;
      } else {
        tituloHtml = '<span class="pl-obra-title" style="color: var(--ui-text-mute); font-weight:700;">Sin obra adjunta</span>';
      }

      let origen;
      if (o.viaLink) {
        origen = '<span class="pl-origen pl-origen--link"><i class="fas fa-link"></i> Obra por link</span>';
      } else if (esObra(insc)) {
        origen = '<span class="pl-origen pl-origen--obra"><i class="fas fa-palette"></i> Obra</span>';
      } else {
        origen = '<span class="pl-origen pl-origen--form"><i class="fas fa-file-signature"></i> Formulario</span>';
      }

      return tituloHtml + '<br>' + origen;
    }

    function usuarioCell(insc) {
      const u = insc.usuario || {};
      const nombre = escapeHTML(u.displayName || u.username || 'Usuario');
      const username = escapeHTML(u.username || '');
      const email = escapeHTML(u.email || '');
      const avatarUrl = sanitizeUrl(u.avatar);
      const inicial = escapeHTML(((u.displayName || u.username || '?')[0] || '?').toUpperCase());

      const avatar = avatarUrl
        ? `<img src="${avatarUrl}" alt="${nombre}">`
        : `<span class="pl-user-inicial">${inicial}</span>`;

      const extra = [username ? '@' + username : '', email].filter(Boolean).join(' · ');

      const contenido = `
          ${avatar}
          <div style="min-width:0;">
            <div class="pl-user-nombre">${nombre}</div>
            <div class="pl-user-extra">${extra}</div>
          </div>`;

      // Toda la celda del artista lleva a su perfil.
      if (!u.username) return `<div class="pl-user">${contenido}</div>`;
      return `<a class="pl-user pl-user--link" href="profile.html?user=${encodeURIComponent(u.username)}" target="_blank" rel="noopener" title="Ver el perfil de ${nombre}">${contenido}</a>`;
    }

    function mediaCell(insc) {
      const img = sanitizeUrl(imagenObra(insc));
      const yt = youtubeId(videoObra(insc));
      const partes = [];

      if (img) {
        partes.push(`<a class="pl-thumb" href="${img}" target="_blank" rel="noopener" title="Imagen de la obra"><img src="${img}" alt="Imagen de la obra"></a>`);
      }
      if (yt) {
        partes.push(`<a class="pl-thumb" href="https://www.youtube.com/watch?v=${yt}" target="_blank" rel="noopener" title="Video de la obra"><img src="https://img.youtube.com/vi/${yt}/mqdefault.jpg" alt="Video"><span class="pl-play"><i class="fas fa-play"></i></span></a>`);
      }

      if (!partes.length) return '<span class="pl-valor pl-valor--vacio">—</span>';
      return `<div class="pl-media">${partes.join('')}</div>`;
    }

    function fechaCell(insc) {
      if (!insc.createdAt) return '<span class="pl-valor pl-valor--vacio">—</span>';
      const d = new Date(insc.createdAt);
      return `<div class="pl-fecha"><b>${d.toLocaleDateString('es-AR')}</b><span>${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span></div>`;
    }

    function estadoLabel(estado) {
      return ({ pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada' })[estado] || 'Pendiente';
    }

    function estadoBadge(estado) {
      const e = ['aceptada', 'rechazada'].includes(estado) ? estado : 'pendiente';
      const icono = e === 'aceptada' ? 'fa-check' : (e === 'rechazada' ? 'fa-xmark' : 'fa-hourglass-half');
      return `<span class="pl-badge pl-badge--${e}"><i class="fas ${icono}"></i> ${estadoLabel(e)}</span>`;
    }

    function accionesCell(insc) {
      if (!puedeGestionar) {
        return '<span class="pl-valor pl-valor--vacio" title="Solo lectura"><i class="fas fa-eye"></i> Solo lectura</span>';
      }
      const e = insc.estado || 'pendiente';
      return `
        <div class="pl-acciones">
          <button type="button" class="pl-btn pl-btn--ok" onclick="setEstado('${insc._id}', 'aceptada')" ${e === 'aceptada' ? 'disabled' : ''} title="Aceptar obra">
            <i class="fas fa-check"></i> Aceptar
          </button>
          <button type="button" class="pl-btn pl-btn--no" onclick="setEstado('${insc._id}', 'rechazada')" ${e === 'rechazada' ? 'disabled' : ''} title="Rechazar obra">
            <i class="fas fa-xmark"></i> Rechazar
          </button>
          ${e !== 'pendiente'
            ? `<button type="button" class="pl-btn pl-btn--reset" onclick="setEstado('${insc._id}', 'pendiente')" title="Volver a pendiente"><i class="fas fa-rotate-left"></i></button>`
            : ''}
            <button type="button" class="pl-btn pl-btn--borrar" onclick="borrarInscripcion('${insc._id}')" title="Borrar la inscripción de esta obra"><i class="fas fa-trash"></i> Borrar</button>
        </div>`;
    }

    function renderValor(val, tipo) {
      if (val === undefined || val === null || String(val).trim() === '') {
        return '<span class="pl-valor pl-valor--vacio">—</span>';
      }

      const texto = String(val);
      const url = sanitizeUrl(texto);

      if (url) {
        const yt = youtubeId(url);
        if (yt) {
          return `<a href="${url}" target="_blank" rel="noopener" title="Ver video"><img class="pl-img-mini" src="https://img.youtube.com/vi/${yt}/mqdefault.jpg" alt="Video"></a>`;
        }
        if (/\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(url)) {
          return `<a href="${url}" target="_blank" rel="noopener" title="Ver archivo"><img class="pl-img-mini" src="${url}" alt="Archivo"></a>`;
        }
        return `<span class="pl-valor"><a href="${url}" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square" style="margin-right:4px;"></i>Ver enlace</a></span>`;
      }

      const largo = texto.length > 120;
      return `<span class="pl-valor${largo ? ' pl-valor--clamp' : ''}"${largo ? ' onclick="toggleTexto(this)"' : ''} title="${escapeHTML(texto)}">${escapeHTML(texto)}</span>`;
    }

    // ─────────────────────────────────────────────── FILAS / FILTROS ──────
    function inscripcionFiltrada(insc) {
      const estado = document.getElementById('filtro-estado').value;
      const origen = document.getElementById('filtro-origen').value;
      const texto = (document.getElementById('filtro-texto').value || '').trim().toLowerCase();

      if (estado !== 'all' && (insc.estado || 'pendiente') !== estado) return false;

      const obra = esObra(insc);
      if (origen === 'obra' && !obra) return false;
      if (origen === 'formulario' && obra) return false;

      if (texto) {
        const u = insc.usuario || {};
        const blob = [
          nombreObra(insc), descripcionObra(insc),
          u.username, u.displayName, u.email,
          insc.mensaje,
          ...Object.values(insc.datos || {}).map(v => (v === null || v === undefined) ? '' : String(v)),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(texto)) return false;
      }

      return true;
    }

    function listaFiltrada() {
      const orden = document.getElementById('filtro-orden').value;
      const lista = inscripciones.filter(inscripcionFiltrada);

      if (orden === 'recientes') {
        lista.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      } else if (orden === 'antiguos') {
        lista.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      } else if (orden === 'obra') {
        lista.sort((a, b) => (nombreObra(a) || '').localeCompare(nombreObra(b) || '', 'es'));
      } else if (orden === 'artista') {
        lista.sort((a, b) => nombreArtista(a).localeCompare(nombreArtista(b), 'es'));
      }

      return lista;
    }

    function renderFilas() {
      const lista = listaFiltrada();
      const body = document.getElementById('planilla-body');
      const vacia = document.getElementById('planilla-vacia');

      if (!lista.length) {
        body.innerHTML = '';
        vacia.classList.remove('ui-hidden');
        return;
      }

      vacia.classList.add('ui-hidden');

      body.innerHTML = lista.map((insc, idx) => {
        const celdas = columnas.map(c => {
          const clase = c.cls ? ` class="${c.cls}"` : '';
          return `<td${clase}>${c.render(insc, idx)}</td>`;
        }).join('');
        return `<tr>${celdas}</tr>`;
      }).join('');
    }

    function actualizarStats() {
      const contar = (estado) => inscripciones.filter(i => (i.estado || 'pendiente') === estado).length;
      document.getElementById('stat-total').textContent = inscripciones.length;
      document.getElementById('stat-pendiente').textContent = contar('pendiente');
      document.getElementById('stat-aceptada').textContent = contar('aceptada');
      document.getElementById('stat-rechazada').textContent = contar('rechazada');
      document.getElementById('stat-obras').textContent = inscripciones.filter(esObra).length;
      document.getElementById('total-inline').textContent = inscripciones.length;
    }

    // ─────────────────────────────────────────────── ACEPTAR / RECHAZAR ──
    /* Borrar la inscripción de una obra (creador o admin; lo valida el backend) */
    window.borrarInscripcion = async function (inscripcionId) {
      if (!confirm('¿Borrar la inscripción de esta obra? Se saca de la planilla, de la galería y del flyer.')) return;
      try {
        const res = await apiRequest('/oportunidades/' + oportunidadId + '/inscripciones/' + inscripcionId, { method: 'DELETE' });
        if (res && res.ok) { await cargarPlanilla(); }
        else { alert('No se pudo borrar la inscripción (¿tenés permiso?).'); }
      } catch (e) { alert('Error al borrar: ' + e.message); }
    };

    async function setEstado(inscripcionId, estado) {
      const res = await apiRequest(`/oportunidades/${oportunidadId}/inscripciones/${inscripcionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });

      if (res && res.ok) {
        const actualizada = await res.json();
        const idx = inscripciones.findIndex(i => i._id === inscripcionId);
        if (idx !== -1) inscripciones[idx] = { ...inscripciones[idx], estado: actualizada.estado };
        renderFilas();
        actualizarStats();
      } else {
        alert('No se pudo actualizar el estado de la postulación.');
      }
    }

    // ──────────────────────────────────────────────────────── EXPORTAR ───
    function exportarCSV() {
      const lista = listaFiltrada();
      if (!lista.length) {
        alert('No hay filas para exportar.');
        return;
      }

      const cols = columnas.filter(c => !c.sinCsv);
      const escapar = (v) => {
        const s = (v === null || v === undefined) ? '' : String(v);
        return '"' + s.replace(/"/g, '""').replace(/\r?\n/g, ' ').trim() + '"';
      };

      const filas = [cols.map(c => escapar(c.label)).join(';')];
      lista.forEach((insc, idx) => {
        filas.push(cols.map(c => escapar(c.csv ? c.csv(insc, idx) : '')).join(';'));
      });

      const titulo = (oportunidadData?.titulo || 'planilla').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const contenido = '\uFEFF' + filas.join('\r\n');
      const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planilla-${titulo || 'inscriptos'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    // Descarga completa: el servidor arma el ZIP (CSV + imágenes nombradas
    // "<obra> - <artista>") y acá sólo se baja autenticado.
    async function descargarTodo() {
      const btn = document.getElementById('btn-descargar-todo');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span class="pl-solo-desktop">Generando ZIP...</span>';

      try {
        const res = await fetch(`${CONFIG.API_URL}/oportunidades/${oportunidadId}/descargar`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        });

        if (!res.ok) {
          let msg = 'No se pudo generar la descarga.';
          try {
            const err = await res.json();
            if (err && err.error) msg = err.error;
          } catch (e) {}
          alert(msg);
          return;
        }

        const blob = await res.blob();
        const slug = (oportunidadData?.titulo || 'inscriptos').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planilla-${slug || 'inscriptos'}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
        alert('Error de conexión al generar la descarga.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    }

    async function copiarLink() {
      const url = window.location.origin + window.location.pathname + '?id=' + oportunidadId;
      try {
        await navigator.clipboard.writeText(url);
        alert('Link de la planilla copiado:\n' + url);
      } catch (err) {
        window.prompt('Copiá el link de la planilla:', url);
      }
    }

    // ──────────────────────────────────────────────── ACCESOS / MODAL ────
    async function abrirAcceso() {
      if (!puedeGestionar) return;
      document.getElementById('acceso-modal').classList.add('is-open');
      await AccesoPlanilla.ensureUsers();

      const lista = await AccesoPlanilla.list(oportunidadId);
      accesoLista = lista || [];
      renderAccesoLista();
    }

    function cerrarAcceso() {
      document.getElementById('acceso-modal').classList.remove('is-open');
      document.getElementById('acceso-resultados').classList.add('ui-hidden');
      document.getElementById('acceso-buscar').value = '';
    }

    function renderAccesoLista() {
      const cont = document.getElementById('acceso-lista');
      const vacio = document.getElementById('acceso-vacio');

      if (!accesoLista.length) {
        cont.innerHTML = '';
        vacio.classList.remove('ui-hidden');
        return;
      }

      vacio.classList.add('ui-hidden');
      cont.innerHTML = accesoLista.map(u => AccesoPlanilla.userChip(u, { removable: true })).join('');
    }

    function renderAccesoResultados() {
      const cont = document.getElementById('acceso-resultados');
      const query = document.getElementById('acceso-buscar').value;
      const yaIds = accesoLista.map(u => String(u._id));

      if (!query.trim()) {
        cont.classList.add('ui-hidden');
        return;
      }

      const matches = AccesoPlanilla.search(query, yaIds);
      cont.innerHTML = matches.length
        ? matches.map(u => AccesoPlanilla.resultRow(u)).join('')
        : '<div style="padding:14px 16px; font-size:13px; color: var(--ui-text-mute);"><i class="fas fa-search" style="margin-right:8px;"></i>No se encontraron usuarios</div>';
      cont.classList.remove('ui-hidden');
    }

    AccesoPlanilla.onPick = async (userId) => {
      document.getElementById('acceso-resultados').classList.add('ui-hidden');
      document.getElementById('acceso-buscar').value = '';

      const res = await AccesoPlanilla.add(oportunidadId, userId);
      if (res && res.ok) {
        const data = await res.json();
        accesoLista = data.accesoPostulantes || [];
        renderAccesoLista();
      } else {
        const err = res ? await res.json().catch(() => ({})) : {};
        alert(err.error || 'No se pudo agregar el usuario.');
      }
    };

    AccesoPlanilla.onRemove = async (userId) => {
      if (!confirm('¿Quitarle a este usuario el acceso a la planilla?')) return;

      const res = await AccesoPlanilla.remove(oportunidadId, userId);
      if (res && res.ok) {
        const data = await res.json();
        accesoLista = data.accesoPostulantes || [];
        renderAccesoLista();
      } else {
        alert('No se pudo quitar el acceso.');
      }
    };

    document.addEventListener('click', (e) => {
      const wrap = document.querySelector('.pl-acceso-wrap');
      if (wrap && !wrap.contains(e.target)) {
        document.getElementById('acceso-resultados').classList.add('ui-hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarAcceso();
    });

    // ────────────────────────────────────────────────────── UTILIDADES ───
    // Despliega/recorta una celda de texto largo (la fila queda siempre compacta).
    function toggleTexto(el) {
      if (el) el.classList.toggle('pl-abierto');
    }

    function youtubeId(url) {
      if (!url) return '';
      const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/);
      return m ? m[1] : '';
    }

    function mostrarDenegado(reason) {
      document.getElementById('loading').classList.add('ui-hidden');
      document.getElementById('planilla-content').classList.add('ui-hidden');

      if (reason) document.getElementById('unauthorized-reason').textContent = reason;

      if (!isLoggedIn()) {
        const btn = document.getElementById('btn-login');
        btn.href = '#';
        btn.classList.remove('ui-hidden');
        btn.onclick = (e) => { e.preventDefault(); showLogin(); };
      }

      document.getElementById('unauthorized-message').classList.remove('ui-hidden');
    }
