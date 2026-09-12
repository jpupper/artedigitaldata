// Declaraciones a nivel de script para evitar ReferenceErrors en cualquier contexto
function checkAdminStatus() {
  return typeof isAdmin === 'function' && isAdmin();
}

let filterWordInput = null;
let filterContribInput = null;
let contributorsListEl = null;
let wordsListEl = null;
let newWordInput = null;
let addWordBtn = null;
let wordsCountBadge = null;
let tabContributorsBadge = null;
let topContributorsBadge = null;
let statTotalWords = null;
let statTotalContributors = null;
let selectedClipId = null;
let selectedLayerId = null;
let selectedFlyerWordId = null;
let hasTimeline = false;

document.addEventListener('DOMContentLoaded', () => {
  // Estado del Modo Global: 'COLLABMODE' (por defecto) o 'FLYERMODE'
  window.appMode = 'COLLABMODE';

  function setupDraggablePanels() {
    const panels = [
      { id: 'left-control-panel', handleSelector: '.panel-header' },
      { id: 'right-control-panel', handleSelector: '.panel-header' },
      { id: 'timeline-panel', handleSelector: '.timeline-header' }
    ];

    panels.forEach(({ id, handleSelector }) => {
      const panel = document.getElementById(id);
      if (!panel) return;
      const handle = panel.querySelector(handleSelector) || panel;

      handle.style.cursor = 'grab';

      let isDragging = false;
      let startX = 0, startY = 0;
      let startLeft = 0, startTop = 0;

      const onMouseDown = (e) => {
        if (e.target.closest('button, input, select, textarea, .tab-btn, .tl-btn')) return;

        isDragging = true;
        handle.style.cursor = 'grabbing';

        const rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        panel.style.left = startLeft + 'px';
        panel.style.top = startTop + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.transform = 'none';

        const onMouseMove = (moveEvt) => {
          if (!isDragging) return;
          const dx = moveEvt.clientX - startX;
          const dy = moveEvt.clientY - startY;

          let newLeft = startLeft + dx;
          let newTop = startTop + dy;

          newLeft = Math.max(0, Math.min(window.innerWidth - 60, newLeft));
          newTop = Math.max(0, Math.min(window.innerHeight - 40, newTop));

          panel.style.left = newLeft + 'px';
          panel.style.top = newTop + 'px';
        };

        const onMouseUp = () => {
          isDragging = false;
          handle.style.cursor = 'grab';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      };

      handle.addEventListener('mousedown', onMouseDown);
    });
  }

  setupDraggablePanels();

  const leftPanel = document.getElementById('left-control-panel');
  const rightPanel = document.getElementById('right-control-panel');
  const toggleLeftBtn = document.getElementById('toggle-left-panel-btn');
  const toggleRightBtn = document.getElementById('toggle-right-panel-btn');
  const closeLeftBtn = document.getElementById('close-left-panel-btn');
  const closeRightBtn = document.getElementById('close-right-panel-btn');
  const toast = document.getElementById('toast');

  // Pestañas Panel Izquierdo: Letrasp5 vs Shaderfondo
  const tabBtnParamsP5 = document.getElementById('tab-btn-params-p5');
  const tabBtnParamsShader = document.getElementById('tab-btn-params-shader');
  const tabPaneParamsP5 = document.getElementById('tab-pane-params-p5');
  const tabPaneParamsShader = document.getElementById('tab-pane-params-shader');

  // Pestañas Panel Derecho: FLYERMODE vs COLLABMODE (Activo por Defecto)
  const tabBtnFlyer = document.getElementById('tab-btn-flyer');
  const tabBtnCollab = document.getElementById('tab-btn-collab');
  const tabPaneFlyer = document.getElementById('tab-pane-flyer');
  const tabPaneCollab = document.getElementById('tab-pane-collab');

  newWordInput = document.getElementById('new-word-input');
  addWordBtn = document.getElementById('add-word-btn');
  wordsListEl = document.getElementById('words-list');
  wordsCountBadge = document.getElementById('words-count-badge');
  filterWordInput = document.getElementById('filter-word-input');
  filterContribInput = document.getElementById('filter-contributors-input');
  contributorsListEl = document.getElementById('contributors-list');
  tabContributorsBadge = document.getElementById('tab-contributors-badge');
  topContributorsBadge = document.getElementById('top-contributors-badge');
  statTotalWords = document.getElementById('stat-total-words');
  statTotalContributors = document.getElementById('stat-total-contributors');

  // Función para resolver URL de la API local o remota
  function getApiUrl() {
    if (window.CONFIG && window.CONFIG.API_URL) return window.CONFIG.API_URL;
    return '/api';
  }

  // Toast helper
  let toastTimer = null;
  function showToast(msg, type = 'success') {
    if (!toast) return;
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

  // Control Pestañas Izquierda (Letrasp5 vs Shaderfondo)
  function switchLeftTab(target) {
    if (tabBtnParamsP5) tabBtnParamsP5.classList.remove('active');
    if (tabBtnParamsShader) tabBtnParamsShader.classList.remove('active');
    if (tabPaneParamsP5) tabPaneParamsP5.style.display = 'none';
    if (tabPaneParamsShader) tabPaneParamsShader.style.display = 'none';

    if (target === 'shader') {
      if (tabBtnParamsShader) tabBtnParamsShader.classList.add('active');
      if (tabPaneParamsShader) tabPaneParamsShader.style.display = 'block';
    } else {
      if (tabBtnParamsP5) tabBtnParamsP5.classList.add('active');
      if (tabPaneParamsP5) tabPaneParamsP5.style.display = 'block';
    }
  }

  if (tabBtnParamsP5) tabBtnParamsP5.addEventListener('click', () => switchLeftTab('p5'));
  if (tabBtnParamsShader) tabBtnParamsShader.addEventListener('click', () => switchLeftTab('shader'));

  // Control Pestañas Derecha (FLYERMODE vs COLLABMODE)
  function switchRightTab(targetMode) {
    window.appMode = targetMode;
    if (tabBtnFlyer) tabBtnFlyer.classList.remove('active');
    if (tabBtnCollab) tabBtnCollab.classList.remove('active');
    if (tabPaneFlyer) tabPaneFlyer.style.display = 'none';
    if (tabPaneCollab) tabPaneCollab.style.display = 'none';

    if (targetMode === 'FLYERMODE') {
      if (tabBtnFlyer) tabBtnFlyer.classList.add('active');
      if (tabPaneFlyer) tabPaneFlyer.style.display = 'block';
      applyConfigChange('FLYER_MODE_ENABLED', true);
      loadSavedFlyerSequences();
    } else {
      if (tabBtnCollab) tabBtnCollab.classList.add('active');
      if (tabPaneCollab) tabPaneCollab.style.display = 'block';
      applyConfigChange('FLYER_MODE_ENABLED', false);
    }
  }

  if (tabBtnFlyer) tabBtnFlyer.addEventListener('click', () => switchRightTab('FLYERMODE'));
  if (tabBtnCollab) tabBtnCollab.addEventListener('click', () => switchRightTab('COLLABMODE'));

  const backdrop = document.getElementById('panel-backdrop');

  function toggleLeftPanel() {
    if (leftPanel) leftPanel.classList.toggle('hidden-panel');
  }
  function toggleRightPanel() {
    if (rightPanel) rightPanel.classList.toggle('hidden-panel');
  }

  if (toggleLeftBtn) toggleLeftBtn.addEventListener('click', toggleLeftPanel);
  if (toggleRightBtn) toggleRightBtn.addEventListener('click', toggleRightPanel);
  if (closeLeftBtn) closeLeftBtn.addEventListener('click', () => leftPanel && leftPanel.classList.add('hidden-panel'));
  if (closeRightBtn) closeRightBtn.addEventListener('click', () => rightPanel && rightPanel.classList.add('hidden-panel'));

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (leftPanel) leftPanel.classList.add('hidden-panel');
      if (rightPanel) rightPanel.classList.add('hidden-panel');
    });
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
      document.body.classList.toggle('ui-hidden');
      toggleFullscreen();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      toggleLeftPanel();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleRightPanel();
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
    'LETTER_SPACING',
    'COLLAB_WORD_LIFESPAN',
    'POS_X',
    'POS_Y'
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

  window.updatePosSliders = function(x, y, isSilent = false) {
    const sliderX = document.getElementById('param-POS_X');
    const numX = document.getElementById('num-POS_X');
    const sliderY = document.getElementById('param-POS_Y');
    const numY = document.getElementById('num-POS_Y');

    if (sliderX) sliderX.value = x;
    if (numX) numX.value = x;
    if (sliderY) sliderY.value = y;
    if (numY) numY.value = y;

    applyConfigChange('POS_X', x, !isSilent);
    applyConfigChange('POS_Y', y, !isSilent);
  };

  const flyerModeToggle = document.getElementById('param-FLYER_MODE_ENABLED');
  if (flyerModeToggle) {
    flyerModeToggle.addEventListener('change', () => {
      applyConfigChange('FLYER_MODE_ENABLED', flyerModeToggle.checked);
    });
  }

  // --- GESTIÓN DE WORD LIST (FLYER) & CAPAS DE TIMELINE SEPARADAS ---
  const flyerWordInput = document.getElementById('flyer-word-input');
  const addFlyerWordBtn = document.getElementById('add-flyer-word-btn');
  const clearFlyerWordsBtn = document.getElementById('clear-flyer-words-btn');
  const flyerWordsListEl = document.getElementById('flyer-words-list');

  let flyerWords = [];
  let selectedFlyerWordId = null;
  let timelineLayers = [];
  let selectedLayerId = null;
  let selectedClipId = null;
  let selectedKeyframeIndex = null;
  let hasTimeline = false;

  // Timeline State
  let currentTimelineTime = 0.0;
  let timelineDuration = 2.0;
  let isTimelinePlaying = false;
  let lastPlayTimestamp = 0;
  let playAnimFrameId = null;

  function renderFlyerWordsList() {
    if (!flyerWordsListEl) return;
    flyerWordsListEl.innerHTML = '';

    flyerWords.forEach((item, idx) => {
      const itemObj = (typeof item === 'object' && item.text) ? item : { id: 'fw_' + idx + '_' + item, text: String(item) };
      const isActive = itemObj.id === selectedFlyerWordId || itemObj.id === window.activeFlyerWordId;
      const pill = document.createElement('div');
      pill.className = 'word-pill' + (isActive ? ' active' : '');
      pill.setAttribute('draggable', 'true');
      pill.title = 'Arrastrá esta palabra al Timeline o hacé click para seleccionarla como activa';

      pill.innerHTML = `
        <i class="fas fa-grip-vertical" style="color: #64748b; font-size: 11px; margin-right: 4px; cursor: grab;" title="Arrastrar al Timeline"></i>
        <span>${itemObj.text}</span>
        <i class="fas fa-times remove-word-btn" style="margin-left: 6px;" title="Eliminar palabra"></i>
      `;

      pill.addEventListener('dragstart', (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', itemObj.text);
          e.dataTransfer.setData('application/flyer-word-id', itemObj.id);
          e.dataTransfer.effectAllowed = 'copy';
        }
        pill.style.opacity = '0.5';
      });

      pill.addEventListener('dragend', () => {
        pill.style.opacity = '1';
      });

      const removeBtn = pill.querySelector('.remove-word-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeFlyerWord(idx);
        });
      }

      pill.addEventListener('click', () => {
        selectedFlyerWordId = itemObj.id;
        window.activeFlyerWordId = itemObj.id;
        selectedLayerId = itemObj.id;

        const flyerInput = document.getElementById('flyer-word-input');
        if (flyerInput) flyerInput.value = itemObj.text;

        updateUIForSelectedLayerProps(itemObj);
        renderFlyerWordsList();

        const matchingLayer = timelineLayers.find(l => l.id === itemObj.id || l.word === itemObj.text);
        if (matchingLayer) {
          selectedLayerId = matchingLayer.id;
          renderTimelineTracks();
        }
      });

      flyerWordsListEl.appendChild(pill);
    });

    if (flyerWords.length === 0) {
      flyerWordsListEl.innerHTML = '<div style="padding: 10px; font-size: 11px; color: #64748b; width: 100%; text-align: center;">No hay palabras en la lista del flyer</div>';
    }
  }

  function addFlyerWord(rawText, x, y) {
    let cleanWord = (rawText || '').trim().toUpperCase();
    if (!cleanWord) {
      if (Array.isArray(words) && words.length > 0) {
        cleanWord = words[flyerWords.length % words.length];
      } else {
        cleanWord = "NUEVA PALABRA";
      }
    }

    if (flyerWordInput) {
      flyerWordInput.value = cleanWord;
    }

    const sizeSlider = document.getElementById('param-TEXT_SIZE_MAX');
    const spaceSlider = document.getElementById('param-LETTER_SPACING');

    const staggerIndex = flyerWords.length;
    const offsetX = (staggerIndex % 5) * 50 - 100;
    const offsetY = (staggerIndex % 5) * 35 - 70;
    const px = (x !== undefined && x !== null) ? Math.round(x) : Math.round(window.innerWidth / 2 + offsetX);
    const py = (y !== undefined && y !== null) ? Math.round(y) : Math.round(window.innerHeight / 2 + offsetY);
    const fontSz = sizeSlider ? parseFloat(sizeSlider.value) : 36;
    const spacePx = spaceSlider ? parseFloat(spaceSlider.value) : 4;

    const commonId = 'flyer_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

    const initialClip = {
      id: commonId,
      startTime: 0.0,
      duration: 2.0,
      keyframes: []
    };

    const wordItem = {
      id: commonId,
      name: cleanWord,
      text: cleanWord,
      word: cleanWord,
      x: px,
      y: py,
      fontSize: fontSz,
      letterSpacing: spacePx,
      startTime: 0.0,
      duration: 2.0,
      clips: [initialClip],
      keyframes: []
    };

    flyerWords.push(wordItem);
    selectedFlyerWordId = wordItem.id;
    window.activeFlyerWordId = wordItem.id;

    if (!Array.isArray(timelineLayers) || timelineLayers.length === 0) {
      timelineLayers = [{ id: 'layer_' + Date.now(), name: 'Capa 1', clips: [] }];
    }
    const layer1 = timelineLayers[0];
    if (!Array.isArray(layer1.clips)) layer1.clips = [];

    const layer1Clip = {
      id: commonId,
      text: cleanWord,
      word: cleanWord,
      startTime: 0.0,
      duration: 2.0,
      x: px,
      y: py,
      fontSize: fontSz,
      letterSpacing: spacePx,
      keyframes: []
    };
    layer1.clips.push(layer1Clip);
    selectedLayerId = layer1.id;
    selectedClipId = layer1Clip.id;

    if (window.spawnWordParticles) {
      window.spawnWordParticles(cleanWord, px, py, true, commonId, { fontSize: fontSz, letterSpacing: spacePx });
    }

    applyConfigChange('FLYER_WORDS', [...flyerWords]);
    applyConfigChange('TIMELINE_LAYERS', [...timelineLayers]);
    renderFlyerWordsList();
    renderTimelineTracks();
    updateUIForSelectedLayerProps({ x: px, y: py, fontSize: fontSz, letterSpacing: spacePx });
  }

  window.addFlyerWordToList = function(text, x, y) {
    addFlyerWord(text, x, y);
  };

  window.addFlyerWordAt = function(x, y, text) {
    addFlyerWord(text, x, y);
  };

  function moveActiveFlyerWordTo(x, y) {
    if (!flyerWords || flyerWords.length === 0) return;

    let targetWord = flyerWords.find(w => typeof w === 'object' && w.id === (selectedFlyerWordId || window.activeFlyerWordId));
    if (!targetWord && selectedClipId) {
      targetWord = flyerWords.find(w => typeof w === 'object' && w.id === selectedClipId);
    }
    if (!targetWord) {
      targetWord = flyerWords[flyerWords.length - 1];
    }
    if (!targetWord || typeof targetWord !== 'object') return;

    targetWord.x = Math.round(x);
    targetWord.y = Math.round(y);

    const activeId = targetWord.id || selectedClipId || window.activeFlyerWordId;

    if (Array.isArray(timelineLayers)) {
      timelineLayers.forEach(layer => {
        if (Array.isArray(layer.clips)) {
          layer.clips.forEach(clip => {
            if (clip.id === activeId || clip.id === targetWord.id || clip.text === targetWord.text) {
              clip.x = targetWord.x;
              clip.y = targetWord.y;
            }
          });
        }
      });
    }

    const posXSlider = document.getElementById('param-POS_X');
    const posYSlider = document.getElementById('param-POS_Y');
    const posXNum = document.getElementById('num-POS_X');
    const posYNum = document.getElementById('num-POS_Y');
    if (posXSlider) posXSlider.value = targetWord.x;
    if (posYSlider) posYSlider.value = targetWord.y;
    if (posXNum) posXNum.value = targetWord.x;
    if (posYNum) posYNum.value = targetWord.y;

    if (window.updateFlyerWordParticles) {
      window.updateFlyerWordParticles(targetWord.id, {
        x: targetWord.x,
        y: targetWord.y,
        fontSize: targetWord.fontSize,
        letterSpacing: targetWord.letterSpacing
      });
      if (selectedClipId && selectedClipId !== targetWord.id) {
        window.updateFlyerWordParticles(selectedClipId, {
          x: targetWord.x,
          y: targetWord.y,
          fontSize: targetWord.fontSize,
          letterSpacing: targetWord.letterSpacing
        });
      }
    }

    applyConfigChange('FLYER_WORDS', [...flyerWords]);
    applyConfigChange('TIMELINE_LAYERS', [...timelineLayers]);
  }

  window.moveActiveFlyerWordTo = moveActiveFlyerWordTo;

  function removeFlyerWord(idx) {
    if (idx < 0 || idx >= flyerWords.length) return;
    const removed = flyerWords[idx];
    const removedId = (typeof removed === 'object' && removed.id) ? removed.id : removed;
    const removedText = (typeof removed === 'object' && removed.text) ? removed.text : String(removed);
    flyerWords.splice(idx, 1);

    if (selectedFlyerWordId === removedId) {
      selectedFlyerWordId = flyerWords.length ? (flyerWords[flyerWords.length - 1].id || flyerWords[flyerWords.length - 1]) : null;
      window.activeFlyerWordId = selectedFlyerWordId;
    }

    if (window.removeFlyerWordParticles && removedId) {
      window.removeFlyerWordParticles(removedId);
    }

    if (Array.isArray(timelineLayers)) {
      timelineLayers.forEach(layer => {
        if (Array.isArray(layer.clips)) {
          for (let cIdx = layer.clips.length - 1; cIdx >= 0; cIdx--) {
            const clip = layer.clips[cIdx];
            if (clip.id === removedId || clip.text === removedText || clip.word === removedText) {
              if (window.removeFlyerWordParticles && clip.id) {
                window.removeFlyerWordParticles(clip.id);
              }
              if (selectedClipId === clip.id) {
                selectedClipId = null;
              }
              layer.clips.splice(cIdx, 1);
            }
          }
        }
      });
    }

    applyConfigChange('FLYER_WORDS', [...flyerWords]);
    applyConfigChange('TIMELINE_LAYERS', [...timelineLayers]);
    renderFlyerWordsList();
    renderTimelineTracks();
    evaluateTimelineAtTime(currentTimelineTime);
  }

  function deleteSelectedTimelineWordOrClip() {
    let deletedSomething = false;
    let deletedName = '';

    if (selectedClipId && Array.isArray(timelineLayers)) {
      for (let l = 0; l < timelineLayers.length; l++) {
        const layer = timelineLayers[l];
        if (!Array.isArray(layer.clips)) continue;
        const cIdx = layer.clips.findIndex(c => c.id === selectedClipId);
        if (cIdx !== -1) {
          const clip = layer.clips[cIdx];
          deletedName = clip.text || clip.word || 'Clip';
          
          if (window.removeFlyerWordParticles) {
            window.removeFlyerWordParticles(clip.id);
          }
          layer.clips.splice(cIdx, 1);

          const wIdx = flyerWords.findIndex(w => (typeof w === 'object' && (w.id === clip.id || w.text === clip.text)) || w === clip.text);
          if (wIdx !== -1) {
            const removedWord = flyerWords[wIdx];
            const rId = (typeof removedWord === 'object' && removedWord.id) ? removedWord.id : removedWord;
            if (window.removeFlyerWordParticles && rId) {
              window.removeFlyerWordParticles(rId);
            }
            flyerWords.splice(wIdx, 1);
          }

          selectedClipId = null;
          deletedSomething = true;
          break;
        }
      }
    }

    if (!deletedSomething && selectedFlyerWordId) {
      const wIdx = flyerWords.findIndex(w => (typeof w === 'object' && w.id === selectedFlyerWordId) || w === selectedFlyerWordId);
      if (wIdx !== -1) {
        const removedWord = flyerWords[wIdx];
        deletedName = (typeof removedWord === 'object' && removedWord.text) ? removedWord.text : String(removedWord);
        removeFlyerWord(wIdx);
        selectedFlyerWordId = null;
        deletedSomething = true;
      }
    }

    if (deletedSomething) {
      if (selectedFlyerWordId && !flyerWords.some(w => (w.id || w) === selectedFlyerWordId)) {
        selectedFlyerWordId = flyerWords.length ? (flyerWords[flyerWords.length - 1].id || flyerWords[flyerWords.length - 1]) : null;
      }
      window.activeFlyerWordId = selectedFlyerWordId || selectedClipId || null;

      applyConfigChange('FLYER_WORDS', [...flyerWords]);
      applyConfigChange('TIMELINE_LAYERS', [...timelineLayers]);
      renderFlyerWordsList();
      renderTimelineTracks();
      evaluateTimelineAtTime(currentTimelineTime);
      showToast(`Palabra "${deletedName}" eliminada del timeline`, 'info');
    }
  }

  function clearAllFlyerWords() {
    flyerWords = [];
    selectedFlyerWordId = null;
    window.activeFlyerWordId = null;
    if (window.clearAllFlyerParticles) {
      window.clearAllFlyerParticles();
    }
    applyConfigChange('FLYER_WORDS', []);
    renderFlyerWordsList();
    renderTimelineTracks();
  }

  if (addFlyerWordBtn && flyerWordInput) {
    addFlyerWordBtn.addEventListener('click', () => {
      addFlyerWord(flyerWordInput.value);
    });

    flyerWordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addFlyerWord(flyerWordInput.value);
      }
    });

    // Edición en vivo de la palabra activa desde el campo de texto
    flyerWordInput.addEventListener('input', () => {
      const newText = flyerWordInput.value.trim().toUpperCase();
      if (!newText || !selectedFlyerWordId) return;

      const itemObj = flyerWords.find(w => typeof w === 'object' && w.id === selectedFlyerWordId);
      if (itemObj) {
        itemObj.text = newText;
        itemObj.name = newText;
        itemObj.word = newText;
        const px = itemObj.x !== undefined ? itemObj.x : Math.round(window.innerWidth / 2);
        const py = itemObj.y !== undefined ? itemObj.y : Math.round(window.innerHeight / 2);

        if (window.updateFlyerWordParticles) {
          window.updateFlyerWordParticles(itemObj.id, {
            text: newText,
            x: px,
            y: py,
            fontSize: itemObj.fontSize,
            letterSpacing: itemObj.letterSpacing
          });
        }

        const matchingLayer = timelineLayers.find(l => l.id === itemObj.id);
        if (matchingLayer) {
          matchingLayer.text = newText;
          matchingLayer.name = newText;
          matchingLayer.word = newText;
          renderTimelineTracks();
        }

        applyConfigChange('FLYER_WORDS', [...flyerWords]);
        renderFlyerWordsList();
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

  // --- LÓGICA DE CAPAS DE TIMELINE E INTERPOLACIÓN ---
  function getInterpolatedLayerProperties(targetObj, t, parentLayer = {}) {
    const kfs = (targetObj && Array.isArray(targetObj.keyframes) && targetObj.keyframes.length > 0)
      ? targetObj.keyframes
      : (parentLayer && Array.isArray(parentLayer.keyframes) && parentLayer.keyframes.length > 0)
        ? parentLayer.keyframes
        : null;

    const fallbackX = (targetObj && targetObj.x !== undefined) ? targetObj.x : (parentLayer.x !== undefined ? parentLayer.x : Math.round(window.innerWidth / 2));
    const fallbackY = (targetObj && targetObj.y !== undefined) ? targetObj.y : (parentLayer.y !== undefined ? parentLayer.y : Math.round(window.innerHeight / 2));
    const fallbackFontSize = (targetObj && targetObj.fontSize !== undefined) ? targetObj.fontSize : (parentLayer.fontSize !== undefined ? parentLayer.fontSize : 36);
    const fallbackSpacing = (targetObj && targetObj.letterSpacing !== undefined) ? targetObj.letterSpacing : (parentLayer.letterSpacing !== undefined ? parentLayer.letterSpacing : 4);

    if (!kfs || kfs.length === 0) {
      return {
        x: fallbackX,
        y: fallbackY,
        fontSize: fallbackFontSize,
        letterSpacing: fallbackSpacing
      };
    }

    const sortedKfs = [...kfs].sort((a, b) => a.time - b.time);
    if (t <= sortedKfs[0].time) return { ...sortedKfs[0] };
    if (t >= sortedKfs[sortedKfs.length - 1].time) return { ...sortedKfs[sortedKfs.length - 1] };

    for (let i = 0; i < sortedKfs.length - 1; i++) {
      const kf1 = sortedKfs[i];
      const kf2 = sortedKfs[i + 1];
      if (t >= kf1.time && t <= kf2.time) {
        const f = (t - kf1.time) / (kf2.time - kf1.time || 1);
        return {
          x: kf1.x + (kf2.x - kf1.x) * f,
          y: kf1.y + (kf2.y - kf1.y) * f,
          fontSize: Math.round(kf1.fontSize + (kf2.fontSize - kf1.fontSize) * f),
          letterSpacing: Math.round(kf1.letterSpacing + (kf2.letterSpacing - kf1.letterSpacing) * f)
        };
      }
    }

    return { ...sortedKfs[0] };
  }

  function updateUIForSelectedLayerProps(props) {
    if (!props) return;
    const posXSlider = document.getElementById('param-POS_X');
    const posXNum = document.getElementById('num-POS_X');
    const posYSlider = document.getElementById('param-POS_Y');
    const posYNum = document.getElementById('num-POS_Y');
    const sizeSlider = document.getElementById('param-TEXT_SIZE_MAX');
    const sizeNum = document.getElementById('num-TEXT_SIZE_MAX');
    const spaceSlider = document.getElementById('param-LETTER_SPACING');
    const spaceNum = document.getElementById('num-LETTER_SPACING');

    if (props.x !== undefined) {
      const vx = Math.round(props.x);
      if (posXSlider) posXSlider.value = vx;
      if (posXNum) posXNum.value = vx;
    }
    if (props.y !== undefined) {
      const vy = Math.round(props.y);
      if (posYSlider) posYSlider.value = vy;
      if (posYNum) posYNum.value = vy;
    }
    if (props.fontSize !== undefined) {
      const vf = Math.round(props.fontSize);
      if (sizeSlider) sizeSlider.value = vf;
      if (sizeNum) sizeNum.value = vf;
    }
    if (props.letterSpacing !== undefined) {
      const vs = Math.round(props.letterSpacing);
      if (spaceSlider) spaceSlider.value = vs;
      if (spaceNum) spaceNum.value = vs;
    }
  }

  function evaluateTimelineAtTime(t) {
    if (!Array.isArray(timelineLayers)) return;

    timelineLayers.forEach(layerObj => {
      if (!Array.isArray(layerObj.clips)) layerObj.clips = [];

      layerObj.clips.forEach(clipObj => {
        const s = clipObj.startTime !== undefined ? clipObj.startTime : 0.0;
        const d = clipObj.duration || 2.0;
        const isActive = !hasTimeline || (t >= s && t <= (s + d));

        let props;
        if (isActive) {
          props = getInterpolatedLayerProperties(clipObj, t, layerObj);
          props.visible = true;
        } else {
          props = {
            x: clipObj.x !== undefined ? clipObj.x : (layerObj.x || window.innerWidth / 2),
            y: clipObj.y !== undefined ? clipObj.y : (layerObj.y || window.innerHeight / 2),
            fontSize: clipObj.fontSize || 36,
            letterSpacing: clipObj.letterSpacing || 4,
            visible: false
          };
        }
        props.text = clipObj.text || clipObj.word || 'PALABRA';

        if (clipObj.id === selectedClipId || clipObj.id === window.activeFlyerWordId) {
          if (props.visible) {
            updateUIForSelectedLayerProps(props);
          }
        }

        if (window.updateFlyerWordParticles) {
          window.updateFlyerWordParticles(clipObj.id, props);
        }
      });
    });
  }

  function updateTimelineReadout() {
    const readout = document.getElementById('tl-time-readout');
    if (readout) {
      const curSec = currentTimelineTime.toFixed(2).padStart(5, '0');
      const durSec = timelineDuration.toFixed(2).padStart(5, '0');
      readout.textContent = `00:${curSec} / 00:${durSec}`;
    }

    const playhead = document.getElementById('timeline-playhead');
    const rulerTarget = document.getElementById('ruler-lane') || document.getElementById('timeline-ruler');
    if (playhead && rulerTarget) {
      const width = rulerTarget.clientWidth;
      const pxPos = (currentTimelineTime / timelineDuration) * width;
      playhead.style.left = pxPos + 'px';
    }

    evaluateTimelineAtTime(currentTimelineTime);
  }

  let isTimelineLooping = true;

  function tickTimeline(now) {
    if (!isTimelinePlaying) return;
    const delta = (now - lastPlayTimestamp) / 1000;
    lastPlayTimestamp = now;

    currentTimelineTime += delta;
    if (currentTimelineTime >= timelineDuration) {
      if (isTimelineLooping) {
        currentTimelineTime = 0.0;
      } else {
        currentTimelineTime = timelineDuration;
        isTimelinePlaying = false;
        const playBtn = document.getElementById('tl-btn-play');
        if (playBtn) {
          playBtn.innerHTML = '<i class="fas fa-play"></i>';
          playBtn.classList.remove('active');
        }
        updateTimelineReadout();
        return;
      }
    }

    updateTimelineReadout();
    playAnimFrameId = requestAnimationFrame(tickTimeline);
  }

  function togglePlayTimeline() {
    isTimelinePlaying = !isTimelinePlaying;
    const playBtn = document.getElementById('tl-btn-play');
    if (playBtn) {
      playBtn.innerHTML = isTimelinePlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
      playBtn.classList.toggle('active', isTimelinePlaying);
    }

    if (isTimelinePlaying) {
      lastPlayTimestamp = performance.now();
      playAnimFrameId = requestAnimationFrame(tickTimeline);
    } else if (playAnimFrameId) {
      cancelAnimationFrame(playAnimFrameId);
    }
  }

  const tlPlayBtn = document.getElementById('tl-btn-play');
  if (tlPlayBtn) tlPlayBtn.addEventListener('click', togglePlayTimeline);

  const tlLoopBtn = document.getElementById('tl-btn-loop');
  if (tlLoopBtn) {
    tlLoopBtn.classList.toggle('active', isTimelineLooping);
    tlLoopBtn.addEventListener('click', () => {
      isTimelineLooping = !isTimelineLooping;
      tlLoopBtn.classList.toggle('active', isTimelineLooping);
      showToast(isTimelineLooping ? 'Loop activado' : 'Loop desactivado', 'info');
    });
  }

  const tlTimeReadout = document.getElementById('tl-time-readout');
  if (tlTimeReadout) {
    tlTimeReadout.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (tlTimeReadout.querySelector('input')) return;

      const currentVal = Math.round(timelineDuration);
      const input = document.createElement('input');
      input.type = 'number';
      input.value = currentVal;
      input.min = '1';
      input.max = '300';
      input.style.cssText = 'background: #0f172a; color: #00f2fe; border: 1px solid #00f2fe; border-radius: 4px; padding: 2px 4px; font-size: 11px; font-weight: 700; width: 60px; outline: none; text-align: center;';

      tlTimeReadout.textContent = '';
      tlTimeReadout.appendChild(input);
      input.focus();
      input.select();

      let finished = false;
      const commit = () => {
        if (finished) return;
        finished = true;
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0 && val <= 300) {
          timelineDuration = Number(val.toFixed(2));
          showToast(`Duración del timeline ajustada a ${timelineDuration}s`, 'success');
        } else {
          showToast('Duración inválida (1s - 300s)', 'error');
        }
        updateTimelineReadout();
        renderTimelineTracks();
      };

      input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
          evt.preventDefault();
          commit();
        } else if (evt.key === 'Escape') {
          finished = true;
          updateTimelineReadout();
        }
      });
      input.addEventListener('blur', commit);
    });
  }

  const tlRewindBtn = document.getElementById('tl-btn-rewind');
  if (tlRewindBtn) {
    tlRewindBtn.addEventListener('click', () => {
      currentTimelineTime = 0.0;
      updateTimelineReadout();
    });
  }

  const rulerTarget = document.getElementById('ruler-lane') || document.getElementById('timeline-ruler');
  const durationHandle = document.getElementById('timeline-duration-handle');

  if (durationHandle) {
    let isDraggingDuration = false;
    let startX = 0;
    let startDuration = 10;
    let laneWidth = 500;

    const handleDurationStart = (e) => {
      e.stopPropagation();
      isDraggingDuration = true;
      startX = e.touches ? e.touches[0].clientX : e.clientX;
      startDuration = timelineDuration;
      const rulerLane = document.getElementById('ruler-lane');
      laneWidth = rulerLane ? (rulerLane.clientWidth || 500) : 500;
      durationHandle.classList.add('dragging');
    };

    const handleDurationMove = (e) => {
      if (!isDraggingDuration) return;
      const currentX = e.touches ? e.touches[0].clientX : e.clientX;
      const deltaPx = currentX - startX;
      const secondsPerPx = startDuration / (laneWidth || 1);
      let newDur = startDuration + (deltaPx * secondsPerPx);
      newDur = Math.max(1.0, Math.min(300.0, Number(newDur.toFixed(2))));

      timelineDuration = newDur;
      updateTimelineReadout();
      renderTimelineTracks();
      evaluateTimelineAtTime(currentTimelineTime);
    };

    const handleDurationEnd = () => {
      if (isDraggingDuration) {
        isDraggingDuration = false;
        durationHandle.classList.remove('dragging');
        showToast(`Duración ajustada a ${timelineDuration}s`, 'info');
      }
    };

    durationHandle.addEventListener('mousedown', (e) => {
      handleDurationStart(e);
      const onMove = (moveEvt) => handleDurationMove(moveEvt);
      const onUp = () => {
        handleDurationEnd();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    durationHandle.addEventListener('touchstart', (e) => {
      handleDurationStart(e);
      const onTouchMove = (moveEvt) => handleDurationMove(moveEvt);
      const onTouchEnd = () => {
        handleDurationEnd();
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
    }, { passive: true });
  }

  if (rulerTarget) {
    let isDraggingRuler = false;
    const handleRulerScrub = (e) => {
      if (e.target && (e.target.closest('#timeline-duration-handle') || e.target.classList.contains('timeline-duration-handle'))) return;
      const rect = rulerTarget.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      currentTimelineTime = (offsetX / rect.width) * timelineDuration;
      updateTimelineReadout();
    };

    rulerTarget.addEventListener('mousedown', (e) => {
      if (e.target && (e.target.closest('#timeline-duration-handle') || e.target.classList.contains('timeline-duration-handle'))) return;
      isDraggingRuler = true;
      handleRulerScrub(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isDraggingRuler) handleRulerScrub(e);
    });
    window.addEventListener('mouseup', () => {
      isDraggingRuler = false;
    });

    rulerTarget.addEventListener('touchstart', (e) => {
      if (e.target && (e.target.closest('#timeline-duration-handle') || e.target.classList.contains('timeline-duration-handle'))) return;
      isDraggingRuler = true;
      handleRulerScrub(e);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.target && (e.target.closest('#timeline-duration-handle') || e.target.classList.contains('timeline-duration-handle'))) return;
      if (isDraggingRuler) handleRulerScrub(e);
    }, { passive: true });
    window.addEventListener('touchend', () => {
      isDraggingRuler = false;
    });
  }

  function renderTimelineTracks() {
    const tracksEl = document.getElementById('timeline-tracks');
    if (!tracksEl) return;
    tracksEl.innerHTML = '';

    if (!Array.isArray(timelineLayers) || timelineLayers.length === 0) {
      timelineLayers = [
        {
          id: 'layer_' + Date.now(),
          name: 'Capa 1',
          clips: []
        }
      ];
    }

    timelineLayers.forEach((layerObj, layerIndex) => {
      if (!Array.isArray(layerObj.clips)) layerObj.clips = [];

      const row = document.createElement('div');
      row.className = 'timeline-track-row';

      const label = document.createElement('div');
      label.className = 'track-label' + (layerObj.id === selectedLayerId ? ' active-track' : '');

      const spanText = document.createElement('span');
      spanText.className = 'track-label-span';
      spanText.style.cssText = 'pointer-events: auto; cursor: pointer; flex: 1; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-weight: 700;';
      spanText.textContent = layerObj.name || ('Capa ' + (layerIndex + 1));
      spanText.title = 'Doble click para cambiar el nombre de esta capa';

      label.appendChild(spanText);

      // Botón para eliminar capa
      const delLayerBtn = document.createElement('button');
      delLayerBtn.className = 'btn-del-layer';
      delLayerBtn.style.cssText = 'background: none; border: none; color: #ef4444; font-size: 11px; cursor: pointer; padding: 2px 4px; opacity: 0.7; margin-left: 4px; pointer-events: auto;';
      delLayerBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
      delLayerBtn.title = 'Eliminar esta capa';
      delLayerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = timelineLayers.findIndex(l => l.id === layerObj.id);
        if (idx !== -1) {
          const removedName = layerObj.name || ('Capa ' + (idx + 1));
          timelineLayers.splice(idx, 1);
          if (timelineLayers.length === 0) {
            timelineLayers = [{ id: 'layer_' + Date.now(), name: 'Capa 1', clips: [] }];
          }
          if (selectedLayerId === layerObj.id) {
            selectedLayerId = timelineLayers[0].id;
          }
          renderTimelineTracks();
          evaluateTimelineAtTime(currentTimelineTime);
          showToast(`Capa "${removedName}" eliminada`, 'info');
        }
      });
      label.appendChild(delLayerBtn);

      // Doble Click en Label: Renombrar la CAPA
      const startLayerRename = (e) => {
        if (e) e.stopPropagation();
        if (label.querySelector('input')) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = layerObj.name || ('Capa ' + (layerIndex + 1));
        input.style.cssText = 'background: #0f172a; color: #00f2fe; border: 1px solid #00f2fe; border-radius: 4px; padding: 2px 4px; font-size: 11px; font-weight: 700; width: 80px; outline: none; box-shadow: 0 0 6px rgba(0,242,254,0.4);';

        spanText.replaceWith(input);
        input.focus();
        input.select();

        let finished = false;
        const commit = () => {
          if (finished) return;
          finished = true;
          const cleanName = input.value.trim() || layerObj.name || ('Capa ' + (layerIndex + 1));
          layerObj.name = cleanName;

          renderTimelineTracks();
          showToast(`Capa renombrada a "${cleanName}"`, 'success');
        };

        input.addEventListener('keydown', (evt) => {
          if (evt.key === 'Enter') {
            evt.preventDefault();
            commit();
          } else if (evt.key === 'Escape') {
            finished = true;
            renderTimelineTracks();
          }
        });
        input.addEventListener('blur', commit);
      };

      label.addEventListener('click', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.closest('.btn-del-layer'))) return;
        selectedLayerId = layerObj.id;
        renderTimelineTracks();
      });

      label.addEventListener('dblclick', (e) => {
        if (e.target && e.target.closest('.btn-del-layer')) return;
        e.stopPropagation();
        startLayerRename(e);
      });

      const lane = document.createElement('div');
      lane.className = 'track-lane';
      lane.title = 'Doble click en área vacía para agregar un nuevo clip, o arrastrá una palabra aquí';

      // Arrastrar palabra de la lista y soltarla directamente en esta capa
      lane.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        lane.style.background = 'rgba(0, 242, 254, 0.15)';
      });

      lane.addEventListener('dragleave', () => {
        lane.style.background = '';
      });

      lane.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        lane.style.background = '';
        const droppedText = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
        if (!droppedText || !droppedText.trim()) return;

        const cleanDropped = droppedText.trim().toUpperCase();
        const rect = lane.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const dropTime = Number(((offsetX / rect.width) * timelineDuration).toFixed(2));

        const newClip = {
          id: 'clip_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          text: cleanDropped,
          word: cleanDropped,
          startTime: dropTime,
          duration: 2.0,
          x: Math.round(window.innerWidth / 2),
          y: Math.round(window.innerHeight / 2),
          fontSize: 36,
          letterSpacing: 4,
          keyframes: []
        };
        layerObj.clips.push(newClip);
        selectedLayerId = layerObj.id;
        selectedClipId = newClip.id;
        window.activeFlyerWordId = newClip.id;

        if (window.spawnWordParticles) {
          window.spawnWordParticles(cleanDropped, newClip.x, newClip.y, true, newClip.id, { fontSize: newClip.fontSize, letterSpacing: newClip.letterSpacing });
        }

        renderTimelineTracks();
        evaluateTimelineAtTime(currentTimelineTime);
        showToast(`Clip "${cleanDropped}" agregado a "${layerObj.name}" en 00:${dropTime.toFixed(2)}s`, 'success');
      });

      // Doble click en área vacía de la pista agrega un nuevo clip a esta capa
      lane.addEventListener('dblclick', (e) => {
        if (e.target.closest('.timeline-clip')) return;
        e.stopPropagation();
        const rect = lane.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const clickTime = Number(((offsetX / rect.width) * timelineDuration).toFixed(2));

        const defaultPromptText = (flyerWordInput && flyerWordInput.value.trim()) ? flyerWordInput.value.trim().toUpperCase() : 'NUEVA PALABRA';
        const userText = prompt('Ingresá el texto para la nueva palabra en esta capa:', defaultPromptText);
        if (userText === null) return;
        const activeText = userText.trim().toUpperCase() || 'NUEVA PALABRA';

        const newClip = {
          id: 'clip_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          text: activeText,
          word: activeText,
          startTime: clickTime,
          duration: 2.0,
          x: Math.round(window.innerWidth / 2),
          y: Math.round(window.innerHeight / 2),
          fontSize: 36,
          letterSpacing: 4,
          keyframes: []
        };
        layerObj.clips.push(newClip);
        selectedLayerId = layerObj.id;
        selectedClipId = newClip.id;
        window.activeFlyerWordId = newClip.id;

        if (window.spawnWordParticles) {
          window.spawnWordParticles(activeText, newClip.x, newClip.y, true, newClip.id, { fontSize: newClip.fontSize, letterSpacing: newClip.letterSpacing });
        }

        renderTimelineTracks();
        evaluateTimelineAtTime(currentTimelineTime);
        showToast(`Nuevo clip "${activeText}" agregado a la capa "${layerObj.name}" en 00:${clickTime.toFixed(2)}s`, 'success');
      });

      // Renderizar cada clip de la capa
      layerObj.clips.forEach(clipObj => {
        const clip = document.createElement('div');
        clip.className = 'timeline-clip' + (clipObj.id === selectedClipId ? ' selected-clip' : '');
        const clipLeft = (clipObj.startTime / timelineDuration) * 100;
        const clipWidth = ((clipObj.duration || 2.0) / timelineDuration) * 100;
        clip.style.left = clipLeft + '%';
        clip.style.width = clipWidth + '%';

        const handleLeft = document.createElement('div');
        handleLeft.className = 'clip-trim-handle handle-left';
        handleLeft.title = 'Arrastrar para recortar tiempo de inicio';

        const clipTextSpan = document.createElement('span');
        clipTextSpan.style.cssText = 'pointer-events:none; flex:1; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; padding: 0 4px; font-weight: 700;';
        clipTextSpan.textContent = clipObj.text || clipObj.word || 'PALABRA';

        const handleRight = document.createElement('div');
        handleRight.className = 'clip-trim-handle handle-right';
        handleRight.title = 'Arrastrar para recortar duración';

        clip.appendChild(handleLeft);
        clip.appendChild(clipTextSpan);
        clip.appendChild(handleRight);

        // Doble Click en Clip: Editar el TEXTO del clip
        const startClipTextEdit = (evt) => {
          if (evt) evt.stopPropagation();
          if (clip.querySelector('input')) return;

          const input = document.createElement('input');
          input.type = 'text';
          input.value = clipObj.text || 'PALABRA';
          input.style.cssText = 'background: #0f172a; color: #00f2fe; border: 1px solid #00f2fe; border-radius: 4px; padding: 1px 4px; font-size: 10px; font-weight: 700; width: 90%; outline: none; z-index: 50; box-shadow: 0 0 6px rgba(0,242,254,0.4);';

          clipTextSpan.replaceWith(input);
          input.focus();
          input.select();

          let finished = false;
          const commit = () => {
            if (finished) return;
            finished = true;
            const cleanText = input.value.trim().toUpperCase() || clipObj.text || 'PALABRA';
            clipObj.text = cleanText;
            clipObj.word = cleanText;

            if (flyerWordInput) flyerWordInput.value = cleanText;

            if (window.updateFlyerWordParticles) {
              window.updateFlyerWordParticles(clipObj.id, {
                text: cleanText,
                x: clipObj.x || window.innerWidth / 2,
                y: clipObj.y || window.innerHeight / 2,
                fontSize: clipObj.fontSize,
                letterSpacing: clipObj.letterSpacing
              });
            }

            renderTimelineTracks();
            evaluateTimelineAtTime(currentTimelineTime);
            showToast(`Texto del clip actualizado a "${cleanText}"`, 'success');
          };

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              finished = true;
              renderTimelineTracks();
            }
          });
          input.addEventListener('blur', commit);
        };

        clip.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          startClipTextEdit(e);
        });

        // Arrastre del clip (horizontal y cambio entre capas)
        let isDraggingClip = false;
        let startClipX = 0;
        let startClipY = 0;
        let origStartTime = 0;
        let origLayerIndex = layerIndex;
        let fixedLaneWidth = 500;

        const handleClipStart = (clientX, clientY) => {
          isDraggingClip = true;
          startClipX = clientX;
          startClipY = clientY;
          origStartTime = clipObj.startTime;
          origLayerIndex = layerIndex;
          fixedLaneWidth = lane.getBoundingClientRect().width || lane.clientWidth || 500;
          selectedLayerId = layerObj.id;
          selectedClipId = clipObj.id;
          window.activeFlyerWordId = clipObj.id;
          if (flyerWordInput) flyerWordInput.value = clipObj.text || 'PALABRA';
          updateUIForSelectedLayerProps(clipObj);
        };

        const handleClipMove = (clientX, clientY) => {
          if (!isDraggingClip) return;
          const deltaPxX = clientX - startClipX;
          const deltaPxY = clientY - startClipY;

          const deltaTime = (deltaPxX / fixedLaneWidth) * timelineDuration;
          let newStartTime = Math.max(0, Math.min(timelineDuration - (clipObj.duration || 2.0), origStartTime + deltaTime));
          clipObj.startTime = Number(newStartTime.toFixed(2));

          clip.style.left = ((clipObj.startTime / timelineDuration) * 100) + '%';

          const rowHeight = 35;
          const rowOffset = Math.round(deltaPxY / rowHeight);
          if (rowOffset !== 0) {
            const targetLayerIndex = Math.max(0, Math.min(timelineLayers.length - 1, origLayerIndex + rowOffset));
            if (targetLayerIndex !== origLayerIndex && timelineLayers[targetLayerIndex]) {
              const srcIndex = layerObj.clips.indexOf(clipObj);
              if (srcIndex !== -1) {
                layerObj.clips.splice(srcIndex, 1);
                timelineLayers[targetLayerIndex].clips.push(clipObj);
                renderTimelineTracks();
                return;
              }
            }
          }

          currentTimelineTime = clipObj.startTime;
          updateTimelineReadout();
          evaluateTimelineAtTime(currentTimelineTime);
        };

        const handleClipEnd = () => {
          if (isDraggingClip) {
            isDraggingClip = false;
            renderTimelineTracks();
            applyConfigChange('TIMELINE_LAYERS', [...timelineLayers]);
          }
        };

        clip.addEventListener('mousedown', (e) => {
          if (e.target && e.target.classList.contains('clip-trim-handle')) return;
          e.stopPropagation();
          handleClipStart(e.clientX, e.clientY);

          const onMouseMove = (moveEvent) => handleClipMove(moveEvent.clientX, moveEvent.clientY);
          const onMouseUp = () => {
            handleClipEnd();
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        // Recorte Izquierdo
        handleLeft.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const origStartTimeLeft = clipObj.startTime;
          const origDuration = clipObj.duration || 2.0;
          const origEndTime = origStartTimeLeft + origDuration;
          const fixedLaneWidth = lane.getBoundingClientRect().width || lane.clientWidth || 500;

          const onMouseMove = (moveEvent) => {
            const deltaPx = moveEvent.clientX - startX;
            const deltaTime = (deltaPx / fixedLaneWidth) * timelineDuration;
            let newStartTime = Math.max(0, Math.min(origEndTime - 0.5, origStartTimeLeft + deltaTime));
            clipObj.startTime = Number(newStartTime.toFixed(2));
            clipObj.duration = Number((origEndTime - clipObj.startTime).toFixed(2));

            clip.style.left = ((clipObj.startTime / timelineDuration) * 100) + '%';
            clip.style.width = ((clipObj.duration / timelineDuration) * 100) + '%';

            updateTimelineReadout();
            evaluateTimelineAtTime(currentTimelineTime);
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            renderTimelineTracks();
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        // Recorte Derecho
        handleRight.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const origDuration = clipObj.duration || 2.0;
          const fixedLaneWidth = lane.getBoundingClientRect().width || lane.clientWidth || 500;

          const onMouseMove = (moveEvent) => {
            const deltaPx = moveEvent.clientX - startX;
            const deltaTime = (deltaPx / fixedLaneWidth) * timelineDuration;
            let newDuration = Math.max(0.5, Math.min(timelineDuration - clipObj.startTime, origDuration + deltaTime));
            clipObj.duration = Number(newDuration.toFixed(2));

            clip.style.width = ((clipObj.duration / timelineDuration) * 100) + '%';

            updateTimelineReadout();
            evaluateTimelineAtTime(currentTimelineTime);
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            renderTimelineTracks();
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        clip.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedLayerId = layerObj.id;
          selectedClipId = clipObj.id;
          window.activeFlyerWordId = clipObj.id;
          if (flyerWordInput) flyerWordInput.value = clipObj.text || 'PALABRA';
          renderTimelineTracks();
        });

        lane.appendChild(clip);
      });

      if (Array.isArray(layerObj.keyframes)) {
        layerObj.keyframes.forEach((kf, kfIdx) => {
          const marker = document.createElement('div');
          marker.className = 'keyframe-marker' + (layerObj.id === selectedLayerId && selectedKeyframeIndex === kfIdx ? ' selected-kf' : '');
          const kfLeft = (kf.time / timelineDuration) * 100;
          marker.style.left = kfLeft + '%';
          marker.title = `Keyframe a los ${kf.time.toFixed(2)}s`;

          marker.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedLayerId = layerObj.id;
            selectedKeyframeIndex = kfIdx;
            currentTimelineTime = kf.time;
            updateTimelineReadout();
            renderTimelineTracks();
          });

          lane.appendChild(marker);
        });
      }

      row.appendChild(label);
      row.appendChild(lane);
      tracksEl.appendChild(row);
    });

    if (timelineLayers.length === 0) {
      tracksEl.innerHTML = '<div style="padding: 16px; font-size: 11px; color: #64748b; text-align: center;">No hay capas agregadas. Podés arrastrar palabras de la WordList o hacer click en "+ Agregar Capa".</div>';
    }
  }

  function addTimelineLayer(customName) {
    const layerName = (customName && typeof customName === 'string') ? customName.trim() : ('Capa ' + (timelineLayers.length + 1));
    const newLayer = {
      id: 'layer_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: layerName,
      clips: []
    };
    timelineLayers.push(newLayer);
    selectedLayerId = newLayer.id;
    renderTimelineTracks();
    showToast(`Capa "${layerName}" agregada`, 'success');
  }

  function setupTimelineDragAndDrop() {
    const timelinePanel = document.getElementById('timeline-panel');
    const tracksContainer = document.getElementById('timeline-tracks');

    [timelinePanel, tracksContainer].forEach(el => {
      if (!el) return;

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        el.classList.add('timeline-drag-hover');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('timeline-drag-hover');
      });

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('timeline-drag-hover');
        const droppedText = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
        if (!droppedText || !droppedText.trim()) return;

        const cleanDropped = droppedText.trim().toUpperCase();

        if (!Array.isArray(timelineLayers) || timelineLayers.length === 0) {
          addTimelineLayer();
        }
        let targetLayer = timelineLayers.find(l => l.id === selectedLayerId) || timelineLayers[0];

        const newClip = {
          id: 'clip_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          text: cleanDropped,
          word: cleanDropped,
          startTime: Number(currentTimelineTime.toFixed(2)),
          duration: 2.0,
          x: Math.round(window.innerWidth / 2),
          y: Math.round(window.innerHeight / 2),
          fontSize: 36,
          letterSpacing: 4,
          keyframes: []
        };
        if (!Array.isArray(targetLayer.clips)) targetLayer.clips = [];
        targetLayer.clips.push(newClip);
        selectedClipId = newClip.id;
        window.activeFlyerWordId = newClip.id;

        if (window.spawnWordParticles) {
          window.spawnWordParticles(cleanDropped, newClip.x, newClip.y, true, newClip.id);
        }
        renderTimelineTracks();
        evaluateTimelineAtTime(currentTimelineTime);
        showToast(`Clip "${cleanDropped}" agregado a "${targetLayer.name}"`, 'success');
      });
    });
  }
  setupTimelineDragAndDrop();

  const addLayerBtn = document.getElementById('tl-btn-add-layer');
  if (addLayerBtn) {
    addLayerBtn.addEventListener('click', () => {
      addTimelineLayer();
    });
  }

  const addKfBtn = document.getElementById('tl-btn-add-kf');
  if (addKfBtn) {
    addKfBtn.addEventListener('click', () => {
      if (!selectedLayerId) {
        showToast('Seleccioná primero una capa de la línea de tiempo para agregar un keyframe.', 'info');
        return;
      }
      const layerObj = timelineLayers.find(l => l.id === selectedLayerId);
      if (!layerObj) return;

      if (!Array.isArray(layerObj.keyframes)) layerObj.keyframes = [];

      const curTime = Number(currentTimelineTime.toFixed(2));
      const existingKfIndex = layerObj.keyframes.findIndex(kf => Math.abs(kf.time - curTime) < 0.15);

      const posXSlider = document.getElementById('param-POS_X');
      const posYSlider = document.getElementById('param-POS_Y');
      const sizeSlider = document.getElementById('param-TEXT_SIZE_MAX');
      const spaceSlider = document.getElementById('param-LETTER_SPACING');

      const px = posXSlider ? parseFloat(posXSlider.value) : layerObj.x;
      const py = posYSlider ? parseFloat(posYSlider.value) : layerObj.y;
      const fontSz = sizeSlider ? parseFloat(sizeSlider.value) : layerObj.fontSize;
      const spacePx = spaceSlider ? parseFloat(spaceSlider.value) : layerObj.letterSpacing;

      const newKf = {
        time: curTime,
        x: px,
        y: py,
        fontSize: fontSz,
        letterSpacing: spacePx
      };

      if (existingKfIndex !== -1) {
        layerObj.keyframes[existingKfIndex] = newKf;
        selectedKeyframeIndex = existingKfIndex;
        showToast(`Keyframe actualizado a los ${curTime}s en ${layerObj.name}`, 'success');
      } else {
        layerObj.keyframes.push(newKf);
        layerObj.keyframes.sort((a, b) => a.time - b.time);
        selectedKeyframeIndex = layerObj.keyframes.findIndex(kf => kf.time === curTime);
        showToast(`Keyframe agregado a los ${curTime}s en ${layerObj.name}`, 'success');
      }

      renderTimelineTracks();
    });
  }

  const delKfBtn = document.getElementById('tl-btn-del-kf');
  if (delKfBtn) {
    delKfBtn.addEventListener('click', () => {
      if (!selectedLayerId) return;
      const layerIdx = timelineLayers.findIndex(l => l.id === selectedLayerId);
      if (layerIdx === -1) return;

      const layerObj = timelineLayers[layerIdx];
      if (selectedKeyframeIndex !== null && Array.isArray(layerObj.keyframes) && layerObj.keyframes[selectedKeyframeIndex]) {
        layerObj.keyframes.splice(selectedKeyframeIndex, 1);
        selectedKeyframeIndex = null;
        showToast('Keyframe eliminado.', 'info');
      } else {
        timelineLayers.splice(layerIdx, 1);
        if (window.removeFlyerWordParticles) {
          window.removeFlyerWordParticles(layerObj.id);
        }
        selectedLayerId = null;
        selectedKeyframeIndex = null;
        showToast(`Capa "${layerObj.name}" eliminada.`, 'info');
      }
      renderTimelineTracks();
    });
  }

  function updateHasTimelineUI() {
    const btnToggleHasTimeline = document.getElementById('btn-toggle-hastimeline');
    if (btnToggleHasTimeline) {
      btnToggleHasTimeline.classList.toggle('active', hasTimeline);
      btnToggleHasTimeline.innerHTML = hasTimeline
        ? '<i class="fas fa-toggle-on"></i> Timeline ON'
        : '<i class="fas fa-toggle-off"></i> Timeline OFF';
      btnToggleHasTimeline.style.background = hasTimeline
        ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.3), rgba(0, 230, 118, 0.3))'
        : 'rgba(255, 255, 255, 0.08)';
      btnToggleHasTimeline.style.borderColor = hasTimeline ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.2)';
      btnToggleHasTimeline.style.color = hasTimeline ? 'var(--accent-cyan)' : '#cbd5e1';
    }
  }

  const btnToggleHasTimeline = document.getElementById('btn-toggle-hastimeline');
  if (btnToggleHasTimeline) {
    btnToggleHasTimeline.addEventListener('click', () => {
      hasTimeline = !hasTimeline;
      updateHasTimelineUI();

      if (hasTimeline) {
        renderTimelineTracks();
        updateTimelineReadout();
        if (!isTimelinePlaying) {
          togglePlayTimeline();
        }
        showToast('Modo Timeline ACTIVADO (responderá a la línea de tiempo)', 'success');
      } else {
        if (isTimelinePlaying) {
          togglePlayTimeline();
        }
        evaluateTimelineAtTime(currentTimelineTime);
        showToast('Modo Timeline DESACTIVADO (todas las palabras fijas en pantalla)', 'info');
      }
    });
  }

  const btnToggleTimelinePanel = document.getElementById('btn-toggle-timeline-panel');
  const timelinePanel = document.getElementById('timeline-panel');
  if (btnToggleTimelinePanel && timelinePanel) {
    btnToggleTimelinePanel.addEventListener('click', () => {
      const isOpen = timelinePanel.classList.toggle('active');
      btnToggleTimelinePanel.classList.toggle('active', isOpen);
      btnToggleTimelinePanel.innerHTML = isOpen
        ? '<i class="fas fa-film"></i> Ocultar UI'
        : '<i class="fas fa-film"></i> Ver Timeline';
      if (isOpen) {
        renderTimelineTracks();
        updateTimelineReadout();
      }
    });
  }

  const tlBtnClose = document.getElementById('tl-btn-close');
  if (tlBtnClose && timelinePanel) {
    tlBtnClose.addEventListener('click', () => {
      timelinePanel.classList.remove('active');
      if (btnToggleTimelinePanel) {
        btnToggleTimelinePanel.classList.remove('active');
        btnToggleTimelinePanel.innerHTML = '<i class="fas fa-film"></i> Ver Timeline';
      }
    });
  }

  // --- FUNCIÓN SOLAPAMIENTO / SECUENCIACIÓN DE CAPA 1 (Shift + T) ---
  function staggerLayer1Clips(customOverlapVal) {
    if (!Array.isArray(timelineLayers) || timelineLayers.length === 0 || !timelineLayers[0]) return;
    const layer1 = timelineLayers[0];
    if (!Array.isArray(layer1.clips) || layer1.clips.length === 0) {
      showToast('No hay palabras en Capa 1 para acomodar.', 'info');
      return;
    }

    const slider = document.getElementById('tl-slider-overlap');
    const readout = document.getElementById('tl-val-overlap');
    const overlapVal = (customOverlapVal !== undefined && customOverlapVal !== null)
      ? parseFloat(customOverlapVal)
      : (slider ? parseFloat(slider.value) : 20);

    if (readout) readout.textContent = `${overlapVal}%`;
    if (slider && customOverlapVal !== undefined) slider.value = overlapVal;

    const overlapFraction = Math.max(0, Math.min(1.0, overlapVal / 100));
    let maxRequiredDuration = 2.0;

    layer1.clips.forEach((clipObj, idx) => {
      const dur = clipObj.duration || 2.0;
      const step = dur * (1 - overlapFraction);
      clipObj.startTime = Number((idx * step).toFixed(2));
      const clipEnd = clipObj.startTime + dur;
      if (clipEnd > maxRequiredDuration) {
        maxRequiredDuration = clipEnd;
      }
    });

    timelineDuration = Number(maxRequiredDuration.toFixed(2));

    updateTimelineReadout();
    renderTimelineTracks();
    evaluateTimelineAtTime(currentTimelineTime);
    showToast(`Palabras de Capa 1 acomodadas (${overlapVal}% solapamiento). Duración: ${timelineDuration}s (Shift+T)`, 'success');
  }

  window.staggerLayer1Clips = staggerLayer1Clips;

  const overlapSlider = document.getElementById('tl-slider-overlap');
  if (overlapSlider) {
    overlapSlider.addEventListener('input', () => {
      staggerLayer1Clips(overlapSlider.value);
    });
  }

  const btnStaggerClips = document.getElementById('btn-stagger-clips');
  if (btnStaggerClips) {
    btnStaggerClips.addEventListener('click', () => {
      staggerLayer1Clips();
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
  function applyConfigChange(key, val, isUserSliderDrag = false) {
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

    // Actualizar partículas de la palabra activa en vivo ÚNICAMENTE si el usuario arrastra manualmente los sliders
    if (['TEXT_SIZE_MAX', 'LETTER_SPACING', 'POS_X', 'POS_Y'].includes(key) && isUserSliderDrag && window.activeFlyerWordId && window.updateFlyerWordParticles) {
      const cfg = window.ParticlesConfig ? window.ParticlesConfig.get() : {};
      const matchingWord = flyerWords.find(w => typeof w === 'object' && w.id === (window.activeFlyerWordId || selectedFlyerWordId));
      const newFontSize = key === 'TEXT_SIZE_MAX' ? val : (matchingWord && matchingWord.fontSize ? matchingWord.fontSize : (cfg.TEXT_SIZE_MAX || 36));
      const newSpacing = key === 'LETTER_SPACING' ? val : (matchingWord && matchingWord.letterSpacing ? matchingWord.letterSpacing : (cfg.LETTER_SPACING || 10));
      const newX = key === 'POS_X' ? val : (matchingWord && matchingWord.x !== undefined ? matchingWord.x : (cfg.POS_X || (window.innerWidth / 2)));
      const newY = key === 'POS_Y' ? val : (matchingWord && matchingWord.y !== undefined ? matchingWord.y : (cfg.POS_Y || (window.innerHeight / 2)));

      if (matchingWord) {
        matchingWord.x = newX;
        matchingWord.y = newY;
        matchingWord.fontSize = newFontSize;
        matchingWord.letterSpacing = newSpacing;
      }

      window.updateFlyerWordParticles(window.activeFlyerWordId, {
        fontSize: newFontSize,
        letterSpacing: newSpacing,
        x: newX,
        y: newY
      });
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
      applyConfigChange(key, val, true);
    });

    textInput.addEventListener('change', () => {
      let val = parseFloat(textInput.value);
      if (isNaN(val)) val = parseFloat(slider.value);
      val = Math.min(Math.max(val, parseFloat(slider.min)), parseFloat(slider.max));
      slider.value = val;
      textInput.value = val;
      applyConfigChange(key, val, true);
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
      if (Array.isArray(activeCfg.WORDS) && activeCfg.WORDS.length > 0) {
        return [...activeCfg.WORDS];
      }
      if (window.ParticlesConfig.DEFAULTS && Array.isArray(window.ParticlesConfig.DEFAULTS.WORDS)) {
        return [...window.ParticlesConfig.DEFAULTS.WORDS];
      }
    }
    return [
      "UNITY", "UNREAL", "GODOT", "TOUCHDESIGNER", "PROCESSING", "P5", "THREE",
      "BABYLON", "SHADERS", "GLSL", "FULLSCREEN", "ARTE", "DIGITAL", "DATA"
    ];
  }

  let words = getInitialWords();
  let filterText = '';

  function renderWordsList() {
    if (!wordsListEl) return;
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

  const addWordBtnEl = document.getElementById('add-word-btn') || document.getElementById('addWordBtn');
  const newWordInputEl = document.getElementById('new-word-input') || document.getElementById('newWordInput');

  if (addWordBtnEl && newWordInputEl) {
    addWordBtnEl.addEventListener('click', () => {
      if (newWordInputEl.value) {
        handleAddWords(newWordInputEl.value);
        newWordInputEl.value = '';
      }
    });

    newWordInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (newWordInputEl.value) {
          handleAddWords(newWordInputEl.value);
          newWordInputEl.value = '';
        }
      }
    });
  }

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
      if (contributorsData) {
        if (Array.isArray(contributorsData.recent)) {
          contributorsData.recent.forEach(item => {
            const w = (typeof item === 'string' ? item : item.word || '').toUpperCase().trim();
            if (w && !words.includes(w)) {
              words.push(w);
            }
          });
        }
        if (Array.isArray(contributorsData.byUser)) {
          contributorsData.byUser.forEach(u => {
            if (Array.isArray(u.words)) {
              u.words.forEach(item => {
                const w = (typeof item === 'string' ? item : item.word || '').toUpperCase().trim();
                if (w && !words.includes(w)) {
                  words.push(w);
                }
              });
            }
          });
        }
        renderWordsList();
      }
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
      flyerWords = cfg.FLYER_WORDS.map((w, idx) => {
        if (typeof w === 'object' && w && w.text) {
          return {
            id: w.id || ('fw_' + Date.now() + '_' + idx),
            name: w.name || w.text,
            text: String(w.text).toUpperCase(),
            word: String(w.text).toUpperCase(),
            x: w.x !== undefined ? w.x : (window.innerWidth / 2),
            y: w.y !== undefined ? w.y : (window.innerHeight / 2),
            fontSize: w.fontSize || 36,
            letterSpacing: w.letterSpacing !== undefined ? w.letterSpacing : 10,
            startTime: w.startTime !== undefined ? w.startTime : 0.0,
            duration: w.duration !== undefined ? w.duration : 2.0,
            keyframes: Array.isArray(w.keyframes) ? w.keyframes : []
          };
        } else {
          const strVal = String(w).toUpperCase();
          return {
            id: 'fw_' + Date.now() + '_' + idx + '_' + strVal,
            name: strVal,
            text: strVal,
            word: strVal,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            fontSize: 36,
            letterSpacing: 10,
            startTime: 0.0,
            duration: 10.0,
            keyframes: []
          };
        }
      });
    }
    renderFlyerWordsList();
    renderTimelineTracks();

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

  // Atajo de teclado: Barra Espaciadora (Play/Pausa), Shift + T (Acomodar palabras), y Supr/Delete (Borrar palabra del timeline)
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInput = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.isContentEditable
    );

    if (e.key === 'Delete' || e.key === 'Del' || e.code === 'Delete' || e.key === 'Backspace') {
      if (!isInput && (selectedClipId || selectedFlyerWordId)) {
        e.preventDefault();
        deleteSelectedTimelineWordOrClip();
        return;
      }
    }

    if (e.shiftKey && (e.key === 't' || e.key === 'T' || e.code === 'KeyT')) {
      if (!isInput) {
        e.preventDefault();
        staggerLayer1Clips();
      }
      return;
    }

    if (e.code === 'Space' || e.key === ' ') {
      if (!isInput) {
        e.preventDefault();
        togglePlayTimeline();
      }
    }
  });

  // Helper para recuperar token de autenticación
  function getAuthToken() {
    if (typeof window.getToken === 'function') {
      const t = window.getToken();
      if (t) return t;
    }
    return localStorage.getItem('artedigitaldata_token') || localStorage.getItem('token');
  }

  // Helper de conexión API con tolerancia a fallas de ruta e inspección de contenido JSON
  async function fetchWithApiFallback(relPath, options = {}) {
    const base = getApiUrl();
    let url = relPath.startsWith('http') ? relPath : (base.endsWith('/') ? base.slice(0, -1) : base) + (relPath.startsWith('/') ? relPath : '/' + relPath);
    let res;
    try {
      res = await fetch(url, options);
    } catch (e) {
      console.warn('[Fetch Warning] Falló URL primaria:', url, e);
    }

    if (!res || (res.status === 404 && url.includes('/artedigitaldata/api'))) {
      const altUrl = url.replace('/artedigitaldata/api', '/api');
      try { res = await fetch(altUrl, options); } catch (e) {}
    } else if (!res || (res.status === 404 && url.includes('/api') && !url.includes('/artedigitaldata/api'))) {
      const altUrl = url.replace('/api', '/artedigitaldata/api');
      try { res = await fetch(altUrl, options); } catch (e) {}
    }

    if (!res) {
      throw new Error('No se pudo establecer conexión con el servidor API.');
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (res.status === 404) {
        throw new Error(`La ruta de la API (${relPath}) no está activa en el servidor o devuelve 404.`);
      }
      throw new Error(`El servidor devolvió una respuesta no esperada (${res.status}).`);
    }

    return res;
  }

  // Guardar y Cargar Proyectos de Efectos Visuales (Flyer Mode) por Usuario
  let currentVisualEffectId = new URLSearchParams(window.location.search).get('id') || new URLSearchParams(window.location.search).get('outputeffect') || null;

  async function saveUserVisualEffect(forceNew = false) {
    const token = getAuthToken();
    if (!token) {
      alert('Debes iniciar sesión para guardar tus efectos visuales.');
      window.location.href = '/login.html';
      return;
    }

    let defaultTitle = 'Mi Proyecto Flyer';
    if (flyerWords.length > 0) {
      defaultTitle = flyerWords.map(w => w.text || w.word).filter(Boolean).slice(0, 3).join(' ');
    }

    const isUpdate = !forceNew && !!currentVisualEffectId;
    let title = null;
    if (!isUpdate || forceNew) {
      title = prompt(forceNew ? 'Nombre de la nueva secuencia:' : 'Nombre de este proyecto de efecto visual:', defaultTitle);
      if (!title || !title.trim()) return;
    }

    const payload = {
      title: title ? title.trim() : undefined,
      flyerWords: flyerWords,
      timelineLayers: timelineLayers,
      timelineDuration: timelineDuration,
      hasTimeline: hasTimeline,
      config: window.ParticlesConfig ? window.ParticlesConfig.get() : {}
    };

    const endpoint = isUpdate ? `/visualeffects/${currentVisualEffectId}` : '/visualeffects';
    const method = isUpdate ? 'PUT' : 'POST';

    try {
      const res = await fetchWithApiFallback(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      const savedEffect = data.effect || data;
      currentVisualEffectId = savedEffect._id || currentVisualEffectId;

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('id', currentVisualEffectId);
      window.history.replaceState({}, '', newUrl.toString());

      showToast(isUpdate ? '¡Secuencia actualizada!' : '¡Nueva secuencia guardada!', 'success');
      loadSavedFlyerSequences();
    } catch (err) {
      console.error('[Save Visual Effect Error]', err);
      showToast(err.message || 'Error al guardar efecto visual', 'error');
    }
  }

  async function loadUserVisualEffect(id) {
    if (!id) return;
    try {
      const res = await fetchWithApiFallback(`/visualeffects/${id}`);
      if (!res.ok) return;
      const effect = await res.json();
      if (effect) {
        currentVisualEffectId = effect._id || id;

        // Actualizar URL en la barra de direcciones con el ID y el nombre/slug de la secuencia
        const newUrl = new URL(window.location.href);
        if (newUrl.pathname.includes('outputeffect.html')) {
          newUrl.searchParams.set('outputeffect', currentVisualEffectId);
        } else {
          newUrl.searchParams.set('id', currentVisualEffectId);
        }
        if (effect.title) {
          const slug = effect.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          newUrl.searchParams.set('name', slug || effect.title);
        }
        window.history.replaceState({}, '', newUrl.toString());

        const outputTitleEl = document.getElementById('output-title');
        if (outputTitleEl) {
          outputTitleEl.textContent = effect.title || 'Secuencia';
        }

        if (effect.timelineDuration) {
          timelineDuration = Number(effect.timelineDuration);
        }
        if (Array.isArray(effect.timelineLayers) && effect.timelineLayers.length > 0) {
          timelineLayers = effect.timelineLayers;
        } else {
          timelineLayers = [{ id: 'layer_' + Date.now(), name: 'Capa 1', clips: [] }];
        }
        if (Array.isArray(effect.flyerWords) && effect.flyerWords.length > 0) {
          flyerWords = effect.flyerWords;
          renderFlyerWordsList();
          renderTimelineTracks();
          updateTimelineReadout();
          if (window.spawnWordParticles) {
            window.clearAllFlyerParticles();
            flyerWords.forEach(w => {
              window.spawnWordParticles(
                w.text || w.word,
                w.x || window.innerWidth / 2,
                w.y || window.innerHeight / 2,
                true,
                w.id,
                w.fontSize,
                w.color
              );
            });
          }
          showToast(`Proyecto "${effect.title || 'Flyer'}" cargado`, 'info');
        }

        hasTimeline = (effect.hasTimeline !== undefined) ? Boolean(effect.hasTimeline) : false;
        updateHasTimelineUI();

        if (hasTimeline) {
          if (!isTimelinePlaying) {
            togglePlayTimeline();
          }
        } else {
          if (isTimelinePlaying) {
            togglePlayTimeline();
          }
          evaluateTimelineAtTime(currentTimelineTime);
        }
      }
    } catch (err) {
      console.error('[Load Visual Effect Error]', err);
    }
  }

  window.copyOutputLink = (id) => {
    const url = `${window.location.origin}/outputeffect.html?outputeffect=${id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('¡Enlace de salida copiado al portapapeles!', 'success');
      }).catch(() => {
        showToast(`Enlace: ${url}`, 'info');
      });
    } else {
      prompt('Copiá este enlace de salida:', url);
    }
  };

  window.renameVisualEffect = async (id, currentTitle) => {
    const newTitle = prompt('Nuevo nombre para esta secuencia guardada:', currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTitle) return;

    const token = getAuthToken();
    if (!token) {
      showToast('Iniciá sesión para modificar tus secuencias', 'error');
      return;
    }

    try {
      const res = await fetchWithApiFallback(`/visualeffects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      if (!res.ok) throw new Error('Error al actualizar nombre');
      showToast('¡Nombre de la secuencia actualizado!', 'success');
      loadSavedFlyerSequences();
    } catch (err) {
      console.error('[Rename Error]', err);
      showToast(err.message || 'Error al modificar el nombre', 'error');
    }
  };

  async function loadSavedFlyerSequences() {
    const container = document.getElementById('flyer-saved-sequences-list');
    if (!container) return;
    const token = getAuthToken();
    if (!token) {
      container.innerHTML = `
        <div style="font-size: 11px; color: #94a3b8; text-align: center; padding: 10px;">
          <a href="login.html" style="color: var(--accent-cyan); font-weight:700;">Iniciá sesión</a> para ver tus secuencias guardadas.
        </div>`;
      return;
    }

    try {
      const res = await fetchWithApiFallback('/visualeffects/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al obtener secuencias');
      const effects = await res.json();
      if (!Array.isArray(effects) || effects.length === 0) {
        container.innerHTML = `
          <div style="font-size: 11px; color: #94a3b8; text-align: center; padding: 10px;">
            No tenés secuencias guardadas aún.
          </div>`;
        return;
      }

      container.innerHTML = effects.map(fx => {
        const wordCount = (fx.flyerWords || []).length;
        const dateStr = new Date(fx.createdAt).toLocaleDateString();
        const outputUrl = `outputeffect.html?outputeffect=${fx._id}`;
        const escapedTitle = (fx.title || 'Secuencia').replace(/'/g, "\\'");
        return `
          <div ondblclick="window.renameVisualEffect('${fx._id}', '${escapedTitle}')" style="display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 10px; font-size: 11px; cursor: pointer;" title="Doble click para renombrar esta secuencia">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px;">
                <strong style="color: #fff; font-size: 12px; display: block;" title="Doble click para modificar el nombre">${fx.title}</strong>
                <div style="font-size: 10px; color: #94a3b8;"><i class="fas fa-layer-group mr-1"></i>${wordCount} ${wordCount === 1 ? 'capa' : 'capas'} • ${dateStr}</div>
              </div>
              <div style="display: flex; gap: 4px;" onclick="event.stopPropagation();" ondblclick="event.stopPropagation();">
                <button onclick="window.loadVisualEffectById('${fx._id}')" class="btn-toggle-ui" style="padding: 4px 8px; font-size: 10px; background: rgba(224, 64, 251, 0.2); border-color: var(--accent-magenta); color: var(--accent-magenta); cursor: pointer;" title="Cargar en el editor">
                  <i class="fas fa-play"></i> Cargar
                </button>
                <a href="${outputUrl}" target="_blank" class="btn-toggle-ui" style="padding: 4px 8px; font-size: 10px; background: rgba(0, 242, 254, 0.2); border-color: var(--accent-cyan); color: var(--accent-cyan); cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 3px;" title="Abrir reproducción independiente en loop">
                  <i class="fas fa-external-link-alt"></i> Output
                </a>
                <button onclick="window.copyOutputLink('${fx._id}')" class="btn-toggle-ui" style="padding: 4px 8px; font-size: 10px; background: rgba(255, 255, 255, 0.1); border-color: rgba(255,255,255,0.2); color: #fff; cursor: pointer;" title="Copiar enlace ?outputeffect=${fx._id}">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
            <div style="font-size: 9px; color: #64748b; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ?outputeffect=${fx._id}
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div style="font-size: 11px; color: #ff5252; text-align: center; padding: 6px;">${err.message || 'Error al cargar secuencias.'}</div>`;
    }
  }

  window.loadVisualEffectById = (id) => {
    loadUserVisualEffect(id);
  };

  const btnSaveFx = document.getElementById('btn-save-fx');
  if (btnSaveFx) {
    btnSaveFx.addEventListener('click', async () => {
      await saveUserVisualEffect(false);
      loadSavedFlyerSequences();
    });
  }

  const btnSaveFlyer = document.getElementById('btn-save-flyer');
  if (btnSaveFlyer) {
    btnSaveFlyer.addEventListener('click', async () => {
      await saveUserVisualEffect(false);
      loadSavedFlyerSequences();
    });
  }

  const btnSaveFlyerNew = document.getElementById('btn-save-flyer-new');
  if (btnSaveFlyerNew) {
    btnSaveFlyerNew.addEventListener('click', async () => {
      await saveUserVisualEffect(true);
      loadSavedFlyerSequences();
    });
  }

  const btnNewFlyer = document.getElementById('btn-new-flyer');
  if (btnNewFlyer) {
    btnNewFlyer.addEventListener('click', () => {
      currentVisualEffectId = null;
      flyerWords = [];
      timelineLayers = [];
      selectedFlyerWordId = null;
      selectedLayerId = null;
      window.activeFlyerWordId = null;
      if (window.clearAllFlyerParticles) window.clearAllFlyerParticles();
      renderFlyerWordsList();
      renderTimelineTracks();
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('id');
      newUrl.searchParams.delete('outputeffect');
      window.history.replaceState({}, '', newUrl.toString());
      showToast('Nueva secuencia lista para diseñar', 'info');
    });
  }

  async function saveP5ConfigToServer(btnElement) {
    if (!window.ParticlesConfig) return;
    const btn = btnElement || document.getElementById('btn-save-collab-top');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Guardando...';
    }

    const currentCfg = window.ParticlesConfig.get();
    const sizeVal = currentCfg.TEXT_SIZE_MAX || currentCfg.TEXT_SIZE || 36;
    currentCfg.TEXT_SIZE = sizeVal;
    currentCfg.TEXT_SIZE_MAX = sizeVal;
    if (!currentCfg.TEXT_SIZE_MIN || currentCfg.TEXT_SIZE_MIN > sizeVal) {
      currentCfg.TEXT_SIZE_MIN = Math.max(8, Math.round(sizeVal * 0.45));
    }
    currentCfg.WORDS = [...words];

    const result = await window.ParticlesConfig.save(currentCfg);
    const isOk = result === true || (result && result.ok);

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }

    if (isOk) {
      showToast('¡Parámetros de letras P5 guardados en el servidor!', 'success');
    } else {
      const errMsg = (result && result.data && result.data.error) || 'Error al guardar en el servidor';
      showToast(errMsg, 'error');
    }
  }

  const btnSaveCollabTop = document.getElementById('btn-save-collab-top');
  if (btnSaveCollabTop) {
    btnSaveCollabTop.addEventListener('click', async () => {
      await saveP5ConfigToServer(btnSaveCollabTop);
    });
  }

  const btnSaveCollab = document.getElementById('btn-save-collab');
  if (btnSaveCollab) {
    btnSaveCollab.addEventListener('click', async () => {
      await saveP5ConfigToServer(btnSaveCollab);
    });
  }

  if (currentVisualEffectId) {
    loadUserVisualEffect(currentVisualEffectId);
  }

  loadSavedFlyerSequences();

  // Reset
  const resetBtn = document.getElementById('reset-defaults-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm('¿Restablecer el efecto a los valores por defecto de fábrica?')) return;
      if (window.ParticlesConfig) {
        await window.ParticlesConfig.reset();
        syncInputsFromConfig();
        showToast('Valores por defecto restablecidos', 'info');
      }
    });
  }

  if (window.location.pathname.includes('outputeffect.html')) {
    window.addEventListener('click', () => {
      togglePlayTimeline();
    });
  }
});
