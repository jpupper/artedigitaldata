document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('control-panel');
  const toggleBtn = document.getElementById('toggle-panel-btn');
  const toggleCommunityBtn = document.getElementById('toggle-community-btn');
  const closeBtn = document.getElementById('close-panel-btn');
  const saveBtn = document.getElementById('save-all-btn');
  const resetBtn = document.getElementById('reset-defaults-btn');
  const adminNotice = document.getElementById('admin-notice');
  const toast = document.getElementById('toast');

  const tabBtnParams = document.getElementById('tab-btn-params');
  const tabBtnFlyer = document.getElementById('tab-btn-flyer');
  const tabBtnContributors = document.getElementById('tab-btn-contributors');
  const tabPaneParams = document.getElementById('tab-pane-params');
  const tabPaneFlyer = document.getElementById('tab-pane-flyer');
  const tabPaneContributors = document.getElementById('tab-pane-contributors');

  const newWordInput = document.getElementById('new-word-input');
  const addWordBtn = document.getElementById('add-word-btn');
  const wordsListEl = document.getElementById('words-list');
  const wordsCountBadge = document.getElementById('words-count-badge');
  const filterWordInput = document.getElementById('filter-word-input');

  const filterContribInput = document.getElementById('filter-contributors-input');
  const contributorsListEl = document.getElementById('contributors-list');
  const statTotalWords = document.getElementById('stat-total-words');
  const statTotalContributors = document.getElementById('stat-total-contributors');
  const tabContributorsBadge = document.getElementById('tab-contributors-badge');
  const topContributorsBadge = document.getElementById('top-contributors-badge');

  // Función para resolver URL de la API local o remota
  function getApiUrl() {
    if (window.CONFIG && window.CONFIG.API_URL) return window.CONFIG.API_URL;
    return '/api';
  }

  // Toast helper
  let toastTimer = null;
  function showToast(msg, type = 'success') {
    const span = toast.querySelector('span');
    if (span) span.innerHTML = msg;
    if (type === 'success') {
      toast.style.background = '#00e676';
      toast.style.color = '#032b13';
    } else if (type === 'error') {
      toast.style.background = '#ff5252';
      toast.style.color = '#fff';
    } else {
      toast.style.background = '#00f2fe';
      toast.style.color = '#050b14';
    }
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  }
  window.showToast = showToast;

  function updateWordAuthHint() {
    const hintEl = document.getElementById('word-auth-hint');
    if (!hintEl) return;
    const user = getUser();
    if (user && isLoggedIn()) {
      hintEl.innerHTML = `
        <i class="fas fa-user-check" style="color: var(--accent-green);"></i>
        <span>Conectado como <strong>@${user.username}</strong>. Podés ingresar varias palabras separadas por coma y se sumarán a tu nombre.</span>
      `;
    } else {
      hintEl.innerHTML = `
        <i class="fas fa-lock" style="color: #f59e0b;"></i>
        <span>Solo usuarios registrados pueden agregar palabras. <a href="login.html" style="color: var(--accent-cyan); text-decoration: underline; font-weight: 700;">Iniciá Sesión</a> o <a href="register.html" style="color: var(--accent-cyan); text-decoration: underline; font-weight: 700;">Registrate</a> para sumar las tuyas.</span>
      `;
    }
  }

  // 1) Verificar si es Administrador (rol o username jpupper)
  function checkAdminStatus() {
    const user = getUser();
    const userIsAdmin = isAdmin() || (user && user.username === 'jpupper');

    if (userIsAdmin) {
      saveBtn.style.display = 'flex';
      adminNotice.innerHTML = `
        <span style="color: var(--accent-green); font-weight:700;">
          <i class="fas fa-check-circle"></i> Modo Administrador activo (@${user.username})
        </span>
        <br><span style="font-size: 11px; color:#94a3b8;">Podés guardar parámetros globales y eliminar palabras.</span>
      `;
    } else if (isLoggedIn() && user) {
      saveBtn.style.display = 'none';
      adminNotice.innerHTML = `
        <span>Conectado como <strong>@${user.username}</strong>. Podés agregar palabras y se guardarán en tu perfil de la comunidad.</span>
        <br><a href="login.html" style="color: var(--accent-cyan); text-decoration: underline;">Iniciar sesión como admin para editar físicas globales</a>
      `;
    } else {
      saveBtn.style.display = 'none';
      adminNotice.innerHTML = `
        <span>Cualquiera puede explorar el efecto y ver las palabras creadas por usuarios.</span>
        <br><a href="login.html" style="color: var(--accent-cyan); text-decoration: underline; font-weight: 700;">Iniciá sesión</a> para sumar tus propias palabras a la comunidad.
      `;
    }
    updateWordAuthHint();
    return userIsAdmin;
  }
  checkAdminStatus();

  // Control de Pestañas
  function switchTab(target) {
    if (tabBtnParams) tabBtnParams.classList.remove('active');
    if (tabBtnFlyer) tabBtnFlyer.classList.remove('active');
    if (tabBtnContributors) tabBtnContributors.classList.remove('active');

    if (tabPaneParams) tabPaneParams.classList.remove('active');
    if (tabPaneFlyer) tabPaneFlyer.classList.remove('active');
    if (tabPaneContributors) tabPaneContributors.classList.remove('active');

    if (target === 'contributors') {
      if (tabBtnContributors) tabBtnContributors.classList.add('active');
      if (tabPaneContributors) tabPaneContributors.classList.add('active');
      loadContributors();
    } else if (target === 'flyer') {
      if (tabBtnFlyer) tabBtnFlyer.classList.add('active');
      if (tabPaneFlyer) tabPaneFlyer.classList.add('active');
    } else {
      if (tabBtnParams) tabBtnParams.classList.add('active');
      if (tabPaneParams) tabPaneParams.classList.add('active');
    }
  }

  if (tabBtnParams) tabBtnParams.addEventListener('click', () => switchTab('params'));
  if (tabBtnFlyer) tabBtnFlyer.addEventListener('click', () => switchTab('flyer'));
  if (tabBtnContributors) tabBtnContributors.addEventListener('click', () => switchTab('contributors'));

  const backdrop = document.getElementById('panel-backdrop');

  function openPanel(tab = 'params') {
    panel.classList.remove('hidden-panel');
    if (backdrop) backdrop.classList.add('active');
    switchTab(tab);
  }

  function closePanel() {
    panel.classList.add('hidden-panel');
    if (backdrop) backdrop.classList.remove('active');
  }

  if (toggleCommunityBtn) {
    toggleCommunityBtn.addEventListener('click', () => {
      openPanel('contributors');
    });
  }

  // Toggle UI
  toggleBtn.addEventListener('click', () => {
    if (panel.classList.contains('hidden-panel')) {
      openPanel('params');
    } else {
      closePanel();
    }
  });
  closeBtn.addEventListener('click', closePanel);
  if (backdrop) {
    backdrop.addEventListener('click', closePanel);
  }

  // Atajo de teclado: Tecla 'F' para alternar modo fullscreen/interfaz limpia, 'P' para panel de ajustes
  const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');

  function updateFullscreenButtonState() {
    if (!fullscreenBtn) return;
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    const span = fullscreenBtn.querySelector('span');
    const icon = fullscreenBtn.querySelector('i');
    if (isFullscreen) {
      if (icon) icon.className = 'fas fa-compress';
      if (span) span.textContent = 'Salir Fullscreen';
      fullscreenBtn.setAttribute('title', 'Salir de Pantalla Completa (F)');
    } else {
      if (icon) icon.className = 'fas fa-expand';
      if (span) span.textContent = 'Fullscreen';
      fullscreenBtn.setAttribute('title', 'Pantalla Completa (F)');
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) docEl.requestFullscreen();
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
      else if (docEl.mozRequestFullScreen) docEl.mozRequestFullScreen();
      else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      toggleFullscreen();
    });
  }

  document.addEventListener('fullscreenchange', updateFullscreenButtonState);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButtonState);
  document.addEventListener('mozfullscreenchange', updateFullscreenButtonState);
  document.addEventListener('MSFullscreenChange', updateFullscreenButtonState);

  window.addEventListener('keydown', (e) => {
    const isTextInput = e.target && (
      (e.target.tagName === 'INPUT' && ['text', 'search', 'password', 'email', 'url'].includes((e.target.type || 'text').toLowerCase())) ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.isContentEditable
    );
    if (isTextInput) {
      return;
    }

    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      const isUiHidden = document.body.classList.toggle('ui-hidden');
      if (isUiHidden && !panel.classList.contains('hidden-panel')) {
        closePanel();
      }
      toggleFullscreen();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      if (panel.classList.contains('hidden-panel')) {
        openPanel('params');
      } else {
        closePanel();
      }
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (window.AsciiShaderBG && typeof window.AsciiShaderBG.reloadShaders === 'function') {
        window.AsciiShaderBG.reloadShaders(true);
      }
    }
  });

  // Mapeo bidireccional Slider <-> Textfield numérico
  const numericFields = [
    'BG_ALPHA',
    'TEXT_SIZE_MIN',
    'TEXT_SIZE_MAX',
    'MAX_SPEED',
    'MAX_FORCE',
    'MOUSE_FORCE_MULT',
    'REPULSION_RADIUS',
    'DISPERSION_MAX',
    'SPAWN_RADIUS_MAX',
    'LIFESPAN_DECAY_MAX',
    'SPAWN_INTERVAL_MS',
    'SPAWN_COUNT_MIN',
    'SPAWN_COUNT_MAX',
    'AUTO_INTERVAL_SEC',
    'FLOWFIELD_GRID_X',
    'FLOWFIELD_GRID_Y',
    'FLOWFIELD_FORCE',
    'FLOWFIELD_SCALE_X',
    'FLOWFIELD_SCALE_Y',
    'FLOWFIELD_SPEED',
    'ASCII_OPACITY',
    'ASCII_CHAR_SIZE',
    'ASCII_GLYPH_SCALE',
    'ASCII_TILE',
    'ASCII_SPEED',
    'CHAR_BG_OPACITY',
    'LETTER_SPACING'
  ];

  const autoModeToggle = document.getElementById('param-AUTO_MODE');
  if (autoModeToggle) {
    autoModeToggle.addEventListener('change', () => {
      applyConfigChange('AUTO_MODE', autoModeToggle.checked);
    });
  }

  const flowfieldToggle = document.getElementById('param-FLOWFIELD_ENABLED');
  if (flowfieldToggle) {
    flowfieldToggle.addEventListener('change', () => {
      applyConfigChange('FLOWFIELD_ENABLED', flowfieldToggle.checked);
    });
  }

  const flowfieldVectorsToggle = document.getElementById('param-FLOWFIELD_SHOW_VECTORS');
  if (flowfieldVectorsToggle) {
    flowfieldVectorsToggle.addEventListener('change', () => {
      applyConfigChange('FLOWFIELD_SHOW_VECTORS', flowfieldVectorsToggle.checked);
    });
  }

  const asciiToggle = document.getElementById('param-ASCII_ENABLED');
  if (asciiToggle) {
    asciiToggle.addEventListener('change', () => {
      applyConfigChange('ASCII_ENABLED', asciiToggle.checked);
    });
  }

  const asciiNoiseOnlyToggle = document.getElementById('param-ASCII_NOISE_ONLY');
  if (asciiNoiseOnlyToggle) {
    asciiNoiseOnlyToggle.addEventListener('change', () => {
      applyConfigChange('ASCII_NOISE_ONLY', asciiNoiseOnlyToggle.checked);
    });
  }

  const charBgToggle = document.getElementById('param-CHAR_BG_ENABLED');
  if (charBgToggle) {
    charBgToggle.addEventListener('change', () => {
      applyConfigChange('CHAR_BG_ENABLED', charBgToggle.checked);
    });
  }

  const charBgColorInput = document.getElementById('param-CHAR_BG_COLOR');
  if (charBgColorInput) {
    charBgColorInput.addEventListener('input', () => {
      applyConfigChange('CHAR_BG_COLOR', charBgColorInput.value);
    });
  }

  const flyerModeToggle = document.getElementById('param-FLYER_MODE_ENABLED');
  if (flyerModeToggle) {
    flyerModeToggle.addEventListener('change', () => {
      applyConfigChange('FLYER_MODE_ENABLED', flyerModeToggle.checked);
    });
  }

  // --- Gestión de Palabras de Flyer Mode ---
  const flyerWordInput = document.getElementById('flyer-word-input');
  const addFlyerWordBtn = document.getElementById('add-flyer-word-btn');
  const clearFlyerWordsBtn = document.getElementById('clear-flyer-words-btn');
  const flyerWordsListEl = document.getElementById('flyer-words-list');
  let flyerWords = [];

  function renderFlyerWordsList() {
    if (!flyerWordsListEl) return;
    flyerWordsListEl.innerHTML = '';

    flyerWords.forEach((w, idx) => {
      const pill = document.createElement('div');
      pill.className = 'word-pill';
      pill.title = 'Hacé click para re-posicionar o recrear esta palabra en el centro';

      pill.innerHTML = `
        <span>${w}</span>
        <i class="fas fa-times remove-word-btn" title="Eliminar del flyer"></i>
      `;

      const removeBtn = pill.querySelector('.remove-word-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeFlyerWord(idx);
        });
      }

      pill.addEventListener('click', () => {
        if (window.spawnWordParticles) {
          window.spawnWordParticles(w, window.innerWidth / 2, window.innerHeight / 2, true);
        }
      });

      flyerWordsListEl.appendChild(pill);
    });

    if (flyerWords.length === 0) {
      flyerWordsListEl.innerHTML = '<div style="padding: 10px; font-size: 11px; color: #64748b; width: 100%; text-align: center;">No hay palabras en la lista del flyer</div>';
    }
  }

  function addFlyerWord(text, spawnOnCanvas = true) {
    if (!text || !text.trim()) return;
    const cleanWord = text.trim().toUpperCase();
    flyerWords.push(cleanWord);

    if (spawnOnCanvas && window.spawnWordParticles) {
      window.spawnWordParticles(cleanWord, window.innerWidth / 2, window.innerHeight / 2, true);
    }

    applyConfigChange('FLYER_WORDS', [...flyerWords]);
    renderFlyerWordsList();
  }

  window.addFlyerWordToList = function(text) {
    if (!text || !text.trim()) return;
    const cleanWord = text.trim().toUpperCase();
    if (!flyerWords.includes(cleanWord)) {
      flyerWords.push(cleanWord);
      applyConfigChange('FLYER_WORDS', [...flyerWords]);
      renderFlyerWordsList();
    }
  };

  function removeFlyerWord(idx) {
    if (idx < 0 || idx >= flyerWords.length) return;
    const removedText = flyerWords[idx];
    flyerWords.splice(idx, 1);

    if (window.removeFlyerWordParticles) {
      window.removeFlyerWordParticles(removedText);
    }

    applyConfigChange('FLYER_WORDS', [...flyerWords]);
    renderFlyerWordsList();
  }

  function clearAllFlyerWords() {
    flyerWords = [];
    if (window.clearAllFlyerParticles) {
      window.clearAllFlyerParticles();
    }
    applyConfigChange('FLYER_WORDS', []);
    renderFlyerWordsList();
  }

  if (addFlyerWordBtn && flyerWordInput) {
    addFlyerWordBtn.addEventListener('click', () => {
      if (flyerWordInput.value) {
        addFlyerWord(flyerWordInput.value);
        flyerWordInput.value = '';
      }
    });

    flyerWordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (flyerWordInput.value) {
          addFlyerWord(flyerWordInput.value);
          flyerWordInput.value = '';
        }
      }
    });
  }

  if (clearFlyerWordsBtn) {
    clearFlyerWordsBtn.addEventListener('click', () => {
      if (flyerWords.length === 0) return;
      clearAllFlyerWords();
      showToast('Palabras del flyer borradas', 'info');
    });
  }

  const btnReloadShaders = document.getElementById('btn-reload-ascii-shaders');
  if (btnReloadShaders) {
    btnReloadShaders.addEventListener('click', () => {
      if (window.AsciiShaderBG && typeof window.AsciiShaderBG.reloadShaders === 'function') {
        window.AsciiShaderBG.reloadShaders(true);
      }
    });
  }

  const colorFields = ['COLOR_1', 'COLOR_2', 'COLOR_3', 'COLOR_4', 'CHAR_BG_COLOR'];

  // Aplicar cambio reactivo a p5
  function applyConfigChange(key, val) {
    const patch = {};
    patch[key] = val;

    if (key === 'TEXT_SIZE_MAX') {
      patch['TEXT_SIZE'] = val;
    }
    if (key === 'FLOWFIELD_SCALE_X') {
      patch['FLOWFIELD_SCALE'] = val;
    }
    if (key === 'LIFESPAN_DECAY_MAX') {
      patch['LIFESPAN_DECAY_MIN'] = Math.max(0.2, +(val * 0.4).toFixed(1));
    }
    if (key === 'SPAWN_RADIUS_MAX') {
      patch['SPAWN_RADIUS_MIN'] = Math.max(10, Math.round(val * 0.25));
    }
    if (key === 'SPAWN_COUNT_MAX') {
      const currentMin = window.ParticlesConfig ? (window.ParticlesConfig.get().SPAWN_COUNT_MIN || 1) : 1;
      if (val < currentMin) {
        patch['SPAWN_COUNT_MIN'] = val;
      }
    }
    if (key === 'SPAWN_COUNT_MIN') {
      const currentMax = window.ParticlesConfig ? (window.ParticlesConfig.get().SPAWN_COUNT_MAX || 2) : 2;
      if (val > currentMax) {
        patch['SPAWN_COUNT_MAX'] = val;
      }
    }

    if (window.ParticlesConfig) {
      window.ParticlesConfig.set(patch);
    }
  }

  // Conectar sliders con textfields bidireccionalmente
  numericFields.forEach(key => {
    const slider = document.getElementById(`param-${key}`);
    const textInput = document.getElementById(`num-${key}`);
    if (!slider || !textInput) return;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      textInput.value = val;
      applyConfigChange(key, val);
    });

    textInput.addEventListener('input', () => {
      let val = parseFloat(textInput.value);
      if (isNaN(val)) return;

      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      if (val < min) val = min;
      if (val > max) val = max;

      slider.value = val;
      applyConfigChange(key, val);
    });
  });

  // Color pickers
  colorFields.forEach(key => {
    const el = document.getElementById(`param-${key}`);
    if (!el) return;
    el.addEventListener('input', () => {
      applyConfigChange(key, el.value);
    });
  });

  // Characters input
  const charInput = document.getElementById('param-CHARACTERS');
  if (charInput) {
    charInput.addEventListener('input', () => {
      applyConfigChange('CHARACTERS', charInput.value);
    });
  }

  // --- Gestión de Palabras (Atractor) ---
  function getInitialWords() {
    if (window.ParticlesConfig) {
      const activeCfg = window.ParticlesConfig.get();
      if (Array.isArray(activeCfg.WORDS) && activeCfg.WORDS.length >= 20) {
        return [...activeCfg.WORDS];
      }
      if (window.ParticlesConfig.DEFAULTS && Array.isArray(window.ParticlesConfig.DEFAULTS.WORDS)) {
        return [...window.ParticlesConfig.DEFAULTS.WORDS];
      }
    }
    return [];
  }

  let words = getInitialWords();
  let filterText = '';

  function renderWordsList() {
    wordsListEl.innerHTML = '';
    if (wordsCountBadge) {
      wordsCountBadge.textContent = `${words.length} palabras`;
    }

    const userIsAdmin = checkAdminStatus();

    const filtered = filterText
      ? words.map((w, idx) => ({ w, idx })).filter(item => item.w.includes(filterText))
      : words.map((w, idx) => ({ w, idx }));

    filtered.forEach(({ w, idx }) => {
      const pill = document.createElement('div');
      pill.className = 'word-pill';
      pill.title = 'Hacé click para probar esta palabra en pantalla';

      let removeHtml = '';
      if (userIsAdmin) {
        removeHtml = `<i class="fas fa-times remove-word-btn" title="Eliminar palabra (Admin)"></i>`;
      }

      pill.innerHTML = `
        <span>${w}</span>
        ${removeHtml}
      `;

      if (userIsAdmin) {
        const removeBtn = pill.querySelector('.remove-word-btn');
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeWord(idx);
          });
        }
      }

      // Si hace click en la pastilla, probar esa palabra en el centro
      pill.addEventListener('click', () => {
        if (window.ParticlesConfig && window.ParticlesConfig.spawnWordAt) {
          window.ParticlesConfig.spawnWordAt(w, window.innerWidth / 2, window.innerHeight / 2);
        }
      });
      wordsListEl.appendChild(pill);
    });

    if (filtered.length === 0) {
      wordsListEl.innerHTML = '<div style="padding: 10px; font-size: 11px; color: #64748b; width: 100%; text-align: center;">No se encontraron palabras</div>';
    }
  }

  if (filterWordInput) {
    filterWordInput.addEventListener('input', (e) => {
      filterText = e.target.value.trim().toUpperCase();
      renderWordsList();
    });
  }

  // Agregar palabras (SOLO usuarios registrados pueden persistir palabras en la comunidad)
  async function handleAddWords(rawText) {
    if (!rawText || !rawText.trim()) return;

    // Comprobar autenticación: solo usuarios registrados pueden agregar palabras
    if (!isLoggedIn() || !getUser()) {
      showToast('Solo los usuarios registrados pueden agregar palabras a la comunidad. <a href="login.html" style="color:#fff;text-decoration:underline;margin-left:6px;font-weight:800;">Iniciar sesión</a>', 'error');
      return;
    }

    // Separar por comas
    const pieces = rawText.split(',')
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 0 && w.length <= 120);

    if (pieces.length === 0) return;

    const newWords = [];
    pieces.forEach(w => {
      if (!words.includes(w) && !newWords.includes(w)) {
        newWords.push(w);
      }
    });

    if (newWords.length === 0) {
      showToast('Las palabras ingresadas ya existen en la lista.', 'info');
      return;
    }

    // Guardado automático en el servidor SOLO para usuarios registrados
    addWordBtn.disabled = true;
    addWordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      };

      let endpoint = getApiUrl() + '/public/particles-words';
      let res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ words: newWords })
      });

      if (res.status === 404 && endpoint.includes('/artedigitaldata/api')) {
        endpoint = endpoint.replace('/artedigitaldata/api', '/api');
        res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ words: newWords }) });
      } else if (res.status === 404 && !endpoint.includes('/artedigitaldata/api')) {
        endpoint = endpoint.replace('/api', '/artedigitaldata/api');
        res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ words: newWords }) });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // Se agregan únicamente cuando el servidor las validó y persistió con el usuario registrado
        words.push(...newWords);
        renderWordsList();
        if (window.ParticlesConfig) {
          window.ParticlesConfig.set({ WORDS: [...words] });
        }

        const msg = newWords.length === 1
          ? `¡Palabra "${newWords[0]}" agregada a la comunidad con tu usuario!`
          : `¡${newWords.length} palabras agregadas a la comunidad con tu usuario!`;
        showToast(msg, 'success');
        loadContributors();
      } else {
        showToast(data.error || 'Error al guardar palabras en el servidor', 'error');
      }
    } catch (err) {
      console.warn('Error guardando palabras automáticamente:', err);
      showToast('No se pudo conectar con el servidor', 'error');
    } finally {
      addWordBtn.disabled = false;
      addWordBtn.innerHTML = '<i class="fas fa-plus"></i> Agregar';
    }
  }

  // Eliminar palabra (SOLO ADMIN - eliminación directa sin alert)
  async function removeWord(idx) {
    const userIsAdmin = checkAdminStatus();
    if (!userIsAdmin) {
      showToast('Solo administradores pueden eliminar palabras.', 'error');
      return;
    }
    if (words.length <= 1) {
      showToast('Debe quedar al menos una palabra.', 'error');
      return;
    }
    const wordToRemove = words[idx];

    words.splice(idx, 1);
    renderWordsList();
    if (window.ParticlesConfig) {
      window.ParticlesConfig.set({ WORDS: [...words] });
    }

    try {
      const token = getToken();
      let endpoint = getApiUrl() + '/public/particles-words/' + encodeURIComponent(wordToRemove);
      let res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        }
      });

      if (res.status === 404 && endpoint.includes('/artedigitaldata/api')) {
        endpoint = endpoint.replace('/artedigitaldata/api', '/api');
        res = await fetch(endpoint, { method: 'DELETE', headers: { ...(token ? { 'Authorization': 'Bearer ' + token } : {}) } });
      } else if (res.status === 404 && !endpoint.includes('/artedigitaldata/api')) {
        endpoint = endpoint.replace('/api', '/artedigitaldata/api');
        res = await fetch(endpoint, { method: 'DELETE', headers: { ...(token ? { 'Authorization': 'Bearer ' + token } : {}) } });
      }

      showToast(`Palabra "${wordToRemove}" eliminada.`);
      loadContributors();
    } catch (err) {
      console.warn('Error eliminando palabra:', err);
    }
  }

  addWordBtn.addEventListener('click', () => {
    if (newWordInput.value) {
      handleAddWords(newWordInput.value);
      newWordInput.value = '';
    }
  });

  newWordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newWordInput.value) {
        handleAddWords(newWordInput.value);
        newWordInput.value = '';
      }
    }
  });

  // --- Cargar y Renderizar Colaboradores de Palabras ---
  let contributorsData = null;
  let filterContribText = '';

  async function loadContributors() {
    try {
      let endpoint = getApiUrl() + '/public/particles-words';
      let res = await fetch(endpoint);
      if (res.status === 404 && endpoint.includes('/artedigitaldata/api')) {
        res = await fetch(endpoint.replace('/artedigitaldata/api', '/api'));
      } else if (res.status === 404 && !endpoint.includes('/artedigitaldata/api')) {
        res = await fetch(endpoint.replace('/api', '/artedigitaldata/api'));
      }

      if (!res.ok) return;
      contributorsData = await res.json();
      renderContributors();
    } catch (err) {
      console.warn('[Contributors] Error cargando lista:', err);
    }
  }

  function renderContributors() {
    if (!contributorsData || !contributorsListEl) return;

    const userIsAdmin = checkAdminStatus();
    const totalWords = contributorsData.totalWords || words.length;
    const totalContributors = contributorsData.totalContributors || (contributorsData.byUser ? contributorsData.byUser.length : 0);

    if (statTotalWords) statTotalWords.textContent = totalWords;
    if (statTotalContributors) statTotalContributors.textContent = totalContributors;
    if (tabContributorsBadge) tabContributorsBadge.textContent = totalContributors;
    if (topContributorsBadge) topContributorsBadge.textContent = totalContributors;

    contributorsListEl.innerHTML = '';

    let users = contributorsData.byUser || [];
    if (filterContribText) {
      const q = filterContribText.toUpperCase();
      users = users.filter(u => {
        const nameMatch = (u.username && u.username.toUpperCase().includes(q)) ||
                          (u.displayName && u.displayName.toUpperCase().includes(q));
        const wordMatch = Array.isArray(u.words) && u.words.some(w => w.toUpperCase().includes(q));
        return nameMatch || wordMatch;
      });
    }

    if (users.length === 0) {
      contributorsListEl.innerHTML = '<div style="padding: 16px; font-size: 11px; color: #64748b; text-align: center;">No se encontraron usuarios o palabras</div>';
      return;
    }

    users.forEach(u => {
      const card = document.createElement('div');
      card.className = 'contributor-card';

      const initial = (u.displayName || u.username || 'A').charAt(0).toUpperCase();
      const avatarHtml = u.avatar
        ? `<img src="${u.avatar}" alt="${u.username}">`
        : initial;

      const isCurrentUser = (getUser() && getUser().username === u.username);

      card.innerHTML = `
        <div class="contributor-header">
          <div class="contributor-info">
            <div class="contributor-avatar">${avatarHtml}</div>
            <div>
              <div class="contributor-name">
                ${u.displayName || u.username}
                ${isCurrentUser ? '<span style="font-size:10px; color:var(--accent-green); margin-left:4px;">(Vos)</span>' : ''}
              </div>
              <div style="font-size: 10px; color: var(--text-muted);">@${u.username}</div>
            </div>
          </div>
          <span class="contributor-badge">${u.words ? u.words.length : u.count} palabras</span>
        </div>
        <div class="contributor-words-wrap"></div>
      `;

      const wrap = card.querySelector('.contributor-words-wrap');
      (u.words || []).forEach(w => {
        const pill = document.createElement('span');
        pill.className = 'contributor-word-pill';
        pill.title = 'Hacé click para formar esta palabra';

        let deleteHtml = '';
        if (userIsAdmin) {
          deleteHtml = `<i class="fas fa-times remove-word-admin" title="Eliminar como administrador"></i>`;
        }

        pill.innerHTML = `<span>${w}</span>${deleteHtml}`;

        pill.addEventListener('click', () => {
          if (window.ParticlesConfig && window.ParticlesConfig.spawnWordAt) {
            window.ParticlesConfig.spawnWordAt(w, window.innerWidth / 2, window.innerHeight / 2);
          }
        });

        if (userIsAdmin) {
          const delBtn = pill.querySelector('.remove-word-admin');
          if (delBtn) {
            delBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              const idx = words.indexOf(w);
              if (idx !== -1) {
                await removeWord(idx);
              }
            });
          }
        }

        wrap.appendChild(pill);
      });

      contributorsListEl.appendChild(card);
    });
  }

  if (filterContribInput) {
    filterContribInput.addEventListener('input', (e) => {
      filterContribText = e.target.value.trim();
      renderContributors();
    });
  }

  // Cargar valores activos de ParticlesConfig en los inputs
  function syncInputsFromConfig() {
    if (!window.ParticlesConfig) return;
    const cfg = window.ParticlesConfig.get();

    if (cfg.TEXT_SIZE && !cfg.TEXT_SIZE_MAX) {
      cfg.TEXT_SIZE_MAX = cfg.TEXT_SIZE;
    }
    if (!cfg.TEXT_SIZE_MIN) {
      cfg.TEXT_SIZE_MIN = Math.max(8, Math.round((cfg.TEXT_SIZE_MAX || 36) * 0.45));
    }
    if (!cfg.FLOWFIELD_GRID_X) cfg.FLOWFIELD_GRID_X = 40;
    if (!cfg.FLOWFIELD_GRID_Y) cfg.FLOWFIELD_GRID_Y = 40;
    if (!cfg.FLOWFIELD_SCALE_X) cfg.FLOWFIELD_SCALE_X = cfg.FLOWFIELD_SCALE || 0.006;
    if (!cfg.FLOWFIELD_SCALE_Y) cfg.FLOWFIELD_SCALE_Y = cfg.FLOWFIELD_SCALE || 0.006;

    numericFields.forEach(key => {
      if (cfg[key] !== undefined) {
        const slider = document.getElementById(`param-${key}`);
        const textInput = document.getElementById(`num-${key}`);
        if (slider) slider.value = cfg[key];
        if (textInput) textInput.value = cfg[key];
      }
    });

    colorFields.forEach(key => {
      if (cfg[key]) {
        const el = document.getElementById(`param-${key}`);
        if (el) el.value = cfg[key];
      }
    });

    if (autoModeToggle && cfg.AUTO_MODE !== undefined) {
      autoModeToggle.checked = !!cfg.AUTO_MODE;
    }

    if (flowfieldToggle && cfg.FLOWFIELD_ENABLED !== undefined) {
      flowfieldToggle.checked = !!cfg.FLOWFIELD_ENABLED;
    }

    if (flowfieldVectorsToggle && cfg.FLOWFIELD_SHOW_VECTORS !== undefined) {
      flowfieldVectorsToggle.checked = !!cfg.FLOWFIELD_SHOW_VECTORS;
    }

    if (asciiToggle && cfg.ASCII_ENABLED !== undefined) {
      asciiToggle.checked = !!cfg.ASCII_ENABLED;
    }

    if (asciiNoiseOnlyToggle && cfg.ASCII_NOISE_ONLY !== undefined) {
      asciiNoiseOnlyToggle.checked = !!cfg.ASCII_NOISE_ONLY;
    }

    if (charBgToggle && cfg.CHAR_BG_ENABLED !== undefined) {
      charBgToggle.checked = !!cfg.CHAR_BG_ENABLED;
    }

    if (flyerModeToggle && cfg.FLYER_MODE_ENABLED !== undefined) {
      flyerModeToggle.checked = !!cfg.FLYER_MODE_ENABLED;
    }

    if (Array.isArray(cfg.FLYER_WORDS)) {
      flyerWords = [...cfg.FLYER_WORDS];
    }
    renderFlyerWordsList();

    if (cfg.CHARACTERS && charInput) {
      charInput.value = cfg.CHARACTERS;
    }

    if (Array.isArray(cfg.WORDS) && cfg.WORDS.length >= 20) {
      words = [...cfg.WORDS];
    } else if (window.ParticlesConfig.DEFAULTS && Array.isArray(window.ParticlesConfig.DEFAULTS.WORDS)) {
      words = [...window.ParticlesConfig.DEFAULTS.WORDS];
    }
    renderWordsList();
  }

  // Notificación automática cuando se cargan datos remotos
  window.onParticlesConfigLoaded = () => {
    syncInputsFromConfig();
    loadContributors();
  };

  // Sincronizar de inmediato
  syncInputsFromConfig();
  loadContributors();
  setTimeout(syncInputsFromConfig, 200);
  setTimeout(syncInputsFromConfig, 600);

  // Guardar Efecto (Solo para Admin)
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    const currentCfg = window.ParticlesConfig ? window.ParticlesConfig.get() : {};
    currentCfg.WORDS = [...words];

    const result = await window.ParticlesConfig.save(currentCfg);
    const isOk = result === true || (result && result.ok);

    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Efecto';

    if (isOk) {
      showToast('¡Efecto guardado y sincronizado en todo el sitio!', 'success');
    } else {
      const errMsg = (result && result.data && result.data.error) || 'Error al guardar en el servidor';
      showToast(errMsg, 'error');
    }
  });

  // Reset
  resetBtn.addEventListener('click', async () => {
    if (!confirm('¿Restablecer el efecto a los valores por defecto de fábrica?')) return;
    if (window.ParticlesConfig) {
      await window.ParticlesConfig.reset();
      syncInputsFromConfig();
      showToast('Valores por defecto restablecidos', 'info');
    }
  });
});
