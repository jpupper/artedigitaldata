// ============================================================
// FULLSCREEN SHADERS INDEX — Arte Digital Data
// Indexación de shaders de FullScreen siguiendo la lógica
// de jpshadereditorInclude (Galería, Composiciones y Performance)
// ============================================================

(function (window) {
  'use strict';

  const VPS_BASE = 'https://vps-4455523-x.dattaweb.com/jpshadereditor';

  const State = {
    activeTab: 'shaders', // 'shaders' | 'comps' | 'perf'
    searchQuery: '',
    loading: false,
    catalogs: {
      shaders: null,
      comps: null,
      perf: null
    },
    currentSource: {
      kind: '', // 'shader' | 'comp' | 'performance'
      value: '',
      pass: ''
    }
  };

  // Carga e inicialización de jpshadereditorInclude.js si aún no está presente
  function ensureIncludeEngine() {
    return new Promise((resolve) => {
      if (window.JPShaderInclude) {
        return resolve(window.JPShaderInclude);
      }
      const existing = document.querySelector('script[src*="jpshadereditor/include.js"]');
      if (existing) {
        const check = setInterval(() => {
          if (window.JPShaderInclude) {
            clearInterval(check);
            resolve(window.JPShaderInclude);
          }
        }, 50);
        return;
      }
      const script = document.createElement('script');
      script.src = VPS_BASE + '/include.js';
      script.setAttribute('data-hud', '0'); // mantener limpio
      script.onload = () => {
        const check = setInterval(() => {
          if (window.JPShaderInclude) {
            clearInterval(check);
            resolve(window.JPShaderInclude);
          }
        }, 30);
      };
      script.onerror = () => {
        console.warn('[FullScreenShaders] No se pudo cargar include.js desde', VPS_BASE);
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }

  // Lectura de la fuente guardada o activa
  function readCurrentSource() {
    try {
      const cfg = JSON.parse(localStorage.getItem('jpsi:config') || '{}');
      if (cfg.shader) return { kind: 'shader', value: cfg.shader, pass: '' };
      if (cfg.comp) return { kind: 'comp', value: cfg.comp, pass: cfg.pass || '' };
      if (cfg.performance) return { kind: 'performance', value: cfg.performance, pass: '' };
    } catch (e) {}
    if (window.JPShaderInclude && typeof window.JPShaderInclude.state === 'function') {
      const s = window.JPShaderInclude.state();
      if (s && s.fuente && s.valor) {
        return { kind: s.fuente, value: s.valor, pass: s.passes ? s.passes[0] : '' };
      }
    }
    return { kind: '', value: '', pass: '' };
  }

  // Fetch de los catálogos del backend de JP Shader Editor
  async function fetchCatalog(tab) {
    if (State.catalogs[tab]) return State.catalogs[tab];
    State.loading = true;
    renderStatusHeader();

    let endpoint = '/api/shaders';
    if (tab === 'comps') endpoint = '/api/compositions';
    else if (tab === 'perf') endpoint = '/api/performance-sessions';

    try {
      const res = await fetch(VPS_BASE + endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let list = [];
      if (tab === 'shaders') {
        list = Array.isArray(data) ? data : (data && Array.isArray(data.shaders) ? data.shaders : []);
        list.sort((a, b) => new Date(b.fechaActualizacion || 0) - new Date(a.fechaActualizacion || 0));
      } else if (tab === 'comps') {
        list = Array.isArray(data) ? data : [];
      } else {
        list = Array.isArray(data) ? data : [];
      }
      State.catalogs[tab] = list;
    } catch (err) {
      console.error('[FullScreenShaders] Error cargando catálogo:', tab, err);
      State.catalogs[tab] = [];
    } finally {
      State.loading = false;
      renderAll();
    }
    return State.catalogs[tab];
  }

  // Aplicar un shader / comp al fondo WebGL en vivo
  async function applySource(kind, value, pass = '') {
    if (!value) return;
    State.currentSource = { kind, value, pass };

    // Si el shader ASCII anterior está activo, opcionalmente podemos pausarlo para ver el WebGL puro
    if (window.AsciiShaderBG && typeof window.AsciiShaderBG.stop === 'function') {
      const toggleNoise = document.getElementById('param-ASCII_NOISE_ONLY');
      if (toggleNoise && toggleNoise.checked) toggleNoise.checked = false;
    }

    const engine = await ensureIncludeEngine();
    if (engine && typeof engine.setSource === 'function') {
      engine.setSource(kind, value, pass);
    } else {
      console.warn('[FullScreenShaders] JPShaderInclude no está disponible aún.');
    }

    // Notificación
    if (window.showToast) {
      window.showToast(`Fondo FullScreen aplicado: ${value}`, 'success');
    }
    renderStatusHeader();
    renderGrid();
  }

  // Quitar el fondo aplicado
  function clearSource() {
    State.currentSource = { kind: '', value: '', pass: '' };
    if (window.JPShaderInclude && typeof window.JPShaderInclude.clear === 'function') {
      window.JPShaderInclude.clear();
    }
    try {
      localStorage.removeItem('jpsi:config');
    } catch (e) {}

    // Si el usuario quiere restaurar el fondo ASCII tradicional:
    if (window.AsciiShaderBG && typeof window.AsciiShaderBG.start === 'function') {
      window.AsciiShaderBG.start();
    }

    if (window.showToast) {
      window.showToast('Fondo WebGL quitado', 'info');
    }
    renderStatusHeader();
    renderGrid();
  }

  // Filtrado de items por búsqueda
  function getFilteredItems() {
    const list = State.catalogs[State.activeTab] || [];
    const q = State.searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const name = (item.nombre || item.name || item.titulo || '').toLowerCase();
      const author = (item.autor || item.username || '').toLowerCase();
      return name.includes(q) || author.includes(q);
    });
  }

  // Inyección de HTML y Estructura en el panel
  function renderContainer(targetEl) {
    targetEl.innerHTML = `
      <div class="fsc-index-root" style="display: flex; flex-direction: column; gap: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Banner Superior Neo-Brutalista: Contenedor NEGRO con BORDE BLANCO -->
        <div style="background: #000000; border: 1.5px solid #ffffff; box-shadow: 2px 2px 0px #ffffff; border-radius: 12px; padding: 12px 14px; color: #ffffff;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: #000000; border: 1.5px solid #ffffff; border-radius: 8px; box-shadow: 2px 2px 0px #ffffff; font-size: 15px; color: #ffd62c;">
                ✦
              </span>
              <div>
                <h3 style="margin: 0; font-family: 'Bebas Neue', cursive; font-size: 1.45rem; letter-spacing: 0.05em; line-height: 1; text-transform: uppercase; color: #ffffff;">
                  SHADERS FULLSCREEN
                </h3>
                <p style="margin: 2px 0 0; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em;">
                  Indexación viva de JP Shader Editor & Compositions
                </p>
              </div>
            </div>
            <a href="${VPS_BASE}/shader.html" target="_blank" rel="noopener" class="vl-menu-btn" style="padding: 0.25rem 0.6rem; font-size: 0.85rem;" title="Abrir JP Shader Editor en nueva pestaña">
              CREAR ↗
            </a>
          </div>
          <div id="fsc-current-status" style="margin-top: 10px;"></div>
        </div>

        <!-- Pestañas de Selección (Neo-Brutalist: Contenedor NEGRO y Borde BLANCO) -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button type="button" class="fsc-tab-btn ${State.activeTab === 'shaders' ? 'active' : ''}" data-tab="shaders" style="flex: 1; min-width: 90px;">
            <i class="fas fa-palette mr-1"></i> SHADERS <span id="badge-cnt-shaders" style="font-size: 10px; opacity: 0.8;"></span>
          </button>
          <button type="button" class="fsc-tab-btn ${State.activeTab === 'comps' ? 'active' : ''}" data-tab="comps" style="flex: 1; min-width: 90px;">
            <i class="fas fa-project-diagram mr-1"></i> NODOS <span id="badge-cnt-comps" style="font-size: 10px; opacity: 0.8;"></span>
          </button>
          <button type="button" class="fsc-tab-btn ${State.activeTab === 'perf' ? 'active' : ''}" data-tab="perf" style="flex: 1; min-width: 90px;">
            <i class="fas fa-bolt mr-1"></i> SESIONES <span id="badge-cnt-perf" style="font-size: 10px; opacity: 0.8;"></span>
          </button>
        </div>

        <!-- Buscador Directo & Input de Link -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="position: relative; width: 100%;">
            <input type="search" id="fsc-search-input" placeholder="Buscar por nombre o autor..." value="${escapeAttr(State.searchQuery)}"
              style="width: 100%; background: #000000; color: #ffffff; border: 1.5px solid #ffffff; border-radius: 9999px; box-shadow: 2px 2px 0px #ffffff; padding: 7px 14px 7px 34px; font-size: 12px; font-weight: 700; outline: none;">
            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 12px; pointer-events: none;"></i>
          </div>

          <!-- Link directo pegar -->
          <div style="display: flex; gap: 6px;">
            <input type="text" id="fsc-direct-link" placeholder="Pegá link: shader.html?shader=... o nombre"
              style="flex: 1; background: #000000; color: #ffffff; border: 1.5px solid #ffffff; border-radius: 9999px; padding: 5px 12px; font-size: 11px; outline: none; box-shadow: 2px 2px 0px #ffffff;">
            <button type="button" id="fsc-btn-apply-link" class="vl-menu-btn" style="padding: 0.25rem 0.8rem; font-size: 0.95rem;">
              APLICAR
            </button>
          </div>
        </div>

        <!-- Grilla de Cards Indexadas -->
        <div id="fsc-cards-grid" style="max-height: 48vh; overflow-y: auto; overflow-x: hidden; padding: 4px; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">
          <!-- Se inyectan las tarjetas -->
        </div>
      </div>
    `;

    // Listeners
    targetEl.querySelectorAll('.fsc-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (State.activeTab !== tab) {
          State.activeTab = tab;
          targetEl.querySelectorAll('.fsc-tab-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          fetchCatalog(tab);
        }
      });
    });

    const searchInput = targetEl.querySelector('#fsc-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        State.searchQuery = e.target.value;
        renderGrid();
      });
    }

    const btnApplyLink = targetEl.querySelector('#fsc-btn-apply-link');
    const directInput = targetEl.querySelector('#fsc-direct-link');
    if (btnApplyLink && directInput) {
      btnApplyLink.addEventListener('click', () => {
        const val = directInput.value.trim();
        if (!val) return;
        if (val.includes('shader=') || val.includes('shader.html')) {
          const match = val.match(/shader=([^&]+)/);
          applySource('shader', match ? decodeURIComponent(match[1]) : val);
        } else if (val.includes('comp=') || val.includes('nodeeditor.html')) {
          const compMatch = val.match(/comp=([^&]+)/);
          const passMatch = val.match(/pass=([^&]+)/);
          applySource('comp', compMatch ? decodeURIComponent(compMatch[1]) : val, passMatch ? passMatch[1] : '');
        } else if (val.includes('session=') || val.includes('performance')) {
          const match = val.match(/session=([^&]+)/);
          applySource('performance', match ? decodeURIComponent(match[1]) : val);
        } else {
          // Asumir shader por defecto
          applySource('shader', val);
        }
      });
      directInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnApplyLink.click();
      });
    }

    renderStatusHeader();
    renderGrid();
  }

  // Render del estado actual
  function renderStatusHeader() {
    const el = document.getElementById('fsc-current-status');
    if (!el) return;
    const cur = State.currentSource.value ? State.currentSource : readCurrentSource();
    if (cur && cur.value) {
      const typeLabel = cur.kind === 'comp' ? 'Composición' : (cur.kind === 'performance' ? 'Sesión' : 'Shader');
      const openUrl = cur.kind === 'comp'
        ? `${VPS_BASE}/nodeeditor.html?comp=${encodeURIComponent(cur.value)}`
        : (cur.kind === 'performance'
            ? `${VPS_BASE}/performanceoutput.html?session=${encodeURIComponent(cur.value)}`
            : `${VPS_BASE}/shader.html?shader=${encodeURIComponent(cur.value)}`);

      el.innerHTML = `
        <div style="background: #000000; border: 2px solid #ffffff; border-radius: 8px; padding: 6px 10px; display: flex; align-items: center; justify-content: space-between; gap: 6px; box-shadow: 3px 3px 0px #ffffff;">
          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #ffd62c; letter-spacing: 0.05em;">FONDO WEBGL ACTIVO</div>
            <div style="font-family: 'Bebas Neue', cursive; font-size: 1.15rem; color: #ffffff; line-height: 1; letter-spacing: 0.03em;">
              ${escapeHTML(cur.value)} <span style="font-size: 0.85rem; color: #94a3b8;">(${typeLabel})</span>
            </div>
          </div>
          <div style="display: flex; gap: 4px; shrink-0;">
            <a href="${openUrl}" target="_blank" rel="noopener" class="vl-menu-btn" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" title="Ver en editor">
              ↗
            </a>
            <button type="button" id="fsc-btn-clear-source" class="vl-menu-btn" style="padding: 0.2rem 0.55rem; font-size: 0.8rem; color: #f87171 !important;" title="Quitar este fondo">
              ✕
            </button>
          </div>
        </div>
      `;
      const btnClear = el.querySelector('#fsc-btn-clear-source');
      if (btnClear) btnClear.addEventListener('click', clearSource);
    } else {
      el.innerHTML = `
        <div style="background: #000000; border: 1.5px dashed #ffffff; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; color: #ffffff; display: flex; align-items: center; justify-content: space-between; box-shadow: 2px 2px 0px #ffffff;">
          <span>Sin fondo de FullScreen seleccionado</span>
          <span style="font-size: 9px; background: #000000; border: 1px solid #ffffff; padding: 2px 6px; border-radius: 4px; color: #ffd62c;">Shader ASCII nativo</span>
        </div>
      `;
    }

    // Actualizar badges de conteo si ya cargaron
    if (State.catalogs.shaders) {
      const bSh = document.getElementById('badge-cnt-shaders');
      if (bSh) bSh.textContent = `(${State.catalogs.shaders.length})`;
    }
    if (State.catalogs.comps) {
      const bCp = document.getElementById('badge-cnt-comps');
      if (bCp) bCp.textContent = `(${State.catalogs.comps.length})`;
    }
    if (State.catalogs.perf) {
      const bPf = document.getElementById('badge-cnt-perf');
      if (bPf) bPf.textContent = `(${State.catalogs.perf.length})`;
    }
  }

  // Render del Grid de Tarjetas
  function renderGrid() {
    const grid = document.getElementById('fsc-cards-grid');
    if (!grid) return;

    if (State.loading && (!State.catalogs[State.activeTab] || !State.catalogs[State.activeTab].length)) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 30px 10px; color: #94a3b8;">
          <i class="fas fa-spinner fa-spin text-2xl text-yellow-400 mb-2"></i>
          <div style="font-size: 11px; font-weight: 700;">Indexando shaders desde FullScreen...</div>
        </div>
      `;
      return;
    }

    const items = getFilteredItems();
    if (!items.length) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 25px 10px; color: #94a3b8; border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px;">
          <i class="fas fa-ghost text-2xl mb-1 text-gray-500"></i>
          <div style="font-size: 11px; font-weight: 700;">No se encontraron resultados</div>
        </div>
      `;
      return;
    }

    const cur = State.currentSource;

    grid.innerHTML = items.map((item) => {
      let id = '';
      let title = '';
      let author = '';
      let thumb = '';
      let kind = State.activeTab === 'comps' ? 'comp' : (State.activeTab === 'perf' ? 'performance' : 'shader');
      let pass = item.output || '';
      let link = '';
      let badge = '';

      if (kind === 'shader') {
        id = item.nombre || '';
        title = item.nombre || 'Sin título';
        author = item.autor || 'Anónimo';
        thumb = item.imagePath || '';
        link = `${VPS_BASE}/shader.html?shader=${encodeURIComponent(id)}`;
        badge = item.passCounter ? `${item.passCounter} pases` : '1 pase';
      } else if (kind === 'comp') {
        id = item.nombre || '';
        title = item.titulo || item.nombre || 'Composición';
        author = item.autor || 'jpupper';
        thumb = item.thumbnail || '';
        link = `${VPS_BASE}/nodeeditor.html?comp=${encodeURIComponent(id)}`;
        badge = item.nodeCount ? `${item.nodeCount} cajas` : 'Nodos';
      } else {
        id = item.sessionId || item._id || '';
        title = item.name || item.sessionId || 'Sesión';
        author = item.username || 'Anónimo';
        thumb = '';
        link = `${VPS_BASE}/performanceoutput.html?session=${encodeURIComponent(id)}`;
        badge = 'Perf';
      }

      const isCurrentActive = cur && cur.kind === kind && cur.value === id;

      return `
        <div class="fsc-card ${isCurrentActive ? 'active' : ''}" style="background: #000000; border: 1.5px solid #ffffff; border-radius: 12px; box-shadow: ${isCurrentActive ? '2px 2px 0px #ffd62c' : '2px 2px 0px #ffffff'}; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.15s ease, box-shadow 0.15s ease;">
          <!-- Miniatura -->
          <div style="position: relative; aspect-ratio: 16/10; background: #0b0d13; display: flex; align-items: center; justify-content: center; overflow: hidden; border-bottom: 1.5px solid #ffffff;">
            ${thumb ? `
              <img src="${escapeAttr(thumb)}" alt="${escapeAttr(title)}" loading="lazy"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;">
              <div style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%; color: #ffd62c; font-size: 20px;">
                <i class="fas fa-cube"></i>
              </div>
            ` : `
              <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #ffd62c; font-size: 20px;">
                <i class="fas fa-${kind === 'comp' ? 'project-diagram' : (kind === 'performance' ? 'bolt' : 'palette')}"></i>
              </div>
            `}
            <span style="position: absolute; top: 4px; left: 4px; background: rgba(0,0,0,0.85); color: #fff; border: 1px solid #fff; border-radius: 4px; font-size: 9px; font-weight: 800; padding: 1px 4px; text-transform: uppercase;">
              ${badge}
            </span>
            ${isCurrentActive ? `
              <span style="position: absolute; top: 4px; right: 4px; background: #ffd62c; color: #000; border: 1px solid #fff; border-radius: 4px; font-size: 9px; font-weight: 900; padding: 1px 4px;">
                EN VIVO
              </span>
            ` : ''}
          </div>

          <!-- Contenido -->
          <div style="padding: 7px 8px; display: flex; flex-direction: column; flex: 1; justify-content: space-between; background: #000000;">
            <div>
              <div style="font-family: 'Bebas Neue', cursive; font-size: 1.05rem; letter-spacing: 0.04em; color: #ffffff; line-height: 1.1; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeAttr(title)}">
                ${escapeHTML(title)}
              </div>
              <div style="font-size: 9px; font-weight: 800; color: #94a3b8; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                por <span style="color: #ffffff;">${escapeHTML(author)}</span>
              </div>
            </div>

            <!-- Acciones: Contenedor NEGRO y Borde BLANCO -->
            <div style="display: flex; gap: 4px; margin-top: 4px;">
              <button type="button" class="btn-apply-fsc vl-menu-btn" data-kind="${kind}" data-val="${escapeAttr(id)}" data-pass="${escapeAttr(pass)}"
                style="flex: 1; padding: 0.25rem 0.4rem; font-size: 0.85rem; color: ${isCurrentActive ? '#ffd62c' : '#ffffff'} !important;">
                ${isCurrentActive ? 'ACTIVO' : 'USAR'}
              </button>
              <a href="${link}" target="_blank" rel="noopener" class="vl-menu-btn" style="padding: 0.25rem 0.45rem; font-size: 0.8rem;" title="Abrir en JP Shader Editor">
                ↗
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Listeners de aplicación
    grid.querySelectorAll('.btn-apply-fsc').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const k = btn.getAttribute('data-kind');
        const v = btn.getAttribute('data-val');
        const p = btn.getAttribute('data-pass') || '';
        applySource(k, v, p);
      });
    });
  }

  function renderAll() {
    renderStatusHeader();
    renderGrid();
  }

  // Helpers de escape
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;');
  }

  // Inyección de estilos de soporte para el panel
  function injectStyles() {
    if (document.getElementById('fsc-shader-index-styles')) return;
    const style = document.createElement('style');
    style.id = 'fsc-shader-index-styles';
    style.textContent = `
      .fsc-tab-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #000000;
        color: #ffffff;
        font-family: 'Bebas Neue', cursive, sans-serif;
        font-size: 1.05rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        border: 1.5px solid #ffffff;
        border-radius: 9999px;
        box-shadow: 2px 2px 0px #ffffff;
        padding: 0.35rem 0.6rem;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      }
      .fsc-tab-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0px #ffffff;
        background: #ffffff;
        color: #000000;
        border-color: #ffffff;
      }
      .fsc-tab-btn.active {
        background: #000000;
        color: #ffd62c;
        border-color: #ffffff;
        box-shadow: 2px 2px 0px #ffffff;
      }
      .fsc-card:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0px #ffffff !important;
      }
      #fsc-cards-grid::-webkit-scrollbar {
        width: 6px;
      }
      #fsc-cards-grid::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.5);
        border-radius: 4px;
      }
      #fsc-cards-grid::-webkit-scrollbar-thumb {
        background: #ffffff;
        border-radius: 4px;
        border: 1px solid #000;
      }
    `;
    document.head.appendChild(style);
  }

  // Inicialización pública
  function init(containerEl) {
    if (!containerEl) return;
    injectStyles();
    State.currentSource = readCurrentSource();
    renderContainer(containerEl);
    ensureIncludeEngine();
    // Carga inicial del catálogo activo
    fetchCatalog(State.activeTab);
  }

  window.FullScreenShadersIndex = {
    init,
    fetchCatalog,
    applySource,
    clearSource,
    state: () => State
  };

})(window);
