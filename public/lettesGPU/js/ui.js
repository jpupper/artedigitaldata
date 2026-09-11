// Manejador de Interfaz y Cliente Local (localStorage)
// Arte Digital Data - lettesGPU Prototype

document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('control-panel');
  const toggleBtn = document.getElementById('toggle-panel-btn');
  const closeBtn = document.getElementById('close-panel-btn');
  const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');
  const newWordInput = document.getElementById('new-word-input');
  const addWordBtn = document.getElementById('add-word-btn');
  const wordsListEl = document.getElementById('words-list');

  // Cargar palabras desde localStorage
  function getSavedWords() {
    try {
      const saved = localStorage.getItem('lettesGPU_words');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return window.GPUApp ? window.GPUApp.DEFAULT_WORDS : ["GPU", "SHADERS", "MATRIX"];
  }

  let words = getSavedWords();

  function saveWords() {
    try {
      localStorage.setItem('lettesGPU_words', JSON.stringify(words));
    } catch (e) {}
  }

  function renderWords() {
    wordsListEl.innerHTML = '';
    words.forEach((word, idx) => {
      const pill = document.createElement('div');
      pill.className = 'word-pill';
      pill.title = 'Hacé click para probar esta palabra en la GPU';
      pill.innerHTML = `
        <span>${word}</span>
        <i class="fas fa-times remove-word-btn" title="Eliminar palabra"></i>
      `;

      pill.querySelector('.remove-word-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        words.splice(idx, 1);
        saveWords();
        renderWords();
      });

      pill.addEventListener('click', () => {
        if (window.GPUApp) window.GPUApp.spawnWord(word);
      });

      wordsListEl.appendChild(pill);
    });
  }

  addWordBtn.addEventListener('click', () => {
    const val = newWordInput.value.trim().toUpperCase();
    if (val && !words.includes(val)) {
      words.push(val);
      saveWords();
      renderWords();
      newWordInput.value = '';
    }
  });

  newWordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = newWordInput.value.trim().toUpperCase();
      if (val && !words.includes(val)) {
        words.push(val);
        saveWords();
        renderWords();
        newWordInput.value = '';
      }
    }
  });

  // Panel Toggle
  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('hidden-panel');
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.add('hidden-panel');
  });

  // Fullscreen Handler & Key F
  function updateFullscreenButtonState() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    const span = fullscreenBtn.querySelector('span');
    const icon = fullscreenBtn.querySelector('i');
    if (isFullscreen) {
      if (icon) icon.className = 'fas fa-compress';
      if (span) span.textContent = 'Salir Fullscreen';
    } else {
      if (icon) icon.className = 'fas fa-expand';
      if (span) span.textContent = 'Fullscreen';
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', updateFullscreenButtonState);

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }

    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      document.body.classList.toggle('ui-hidden');
      toggleFullscreen();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      panel.classList.toggle('hidden-panel');
    }
  });

  // Mapeo Sliders <-> Variables
  const numericFields = [
    'PARTICLE_COUNT',
    'MAX_SPEED',
    'MOUSE_FORCE',
    'MOUSE_RADIUS',
    'FLOWFIELD_FORCE',
    'FONT_SIZE'
  ];

  numericFields.forEach(key => {
    const slider = document.getElementById(`param-${key}`);
    const numInput = document.getElementById(`num-${key}`);
    if (!slider || !numInput) return;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      numInput.value = val;
      if (window.GPUApp) window.GPUApp.updateConfig(key, val);
    });

    numInput.addEventListener('input', () => {
      let val = parseFloat(numInput.value);
      if (isNaN(val)) return;
      slider.value = val;
      if (window.GPUApp) window.GPUApp.updateConfig(key, val);
    });
  });

  const flowToggle = document.getElementById('param-FLOWFIELD_ENABLED');
  if (flowToggle) {
    flowToggle.addEventListener('change', () => {
      if (window.GPUApp) window.GPUApp.updateConfig('FLOWFIELD_ENABLED', flowToggle.checked);
    });
  }

  renderWords();

  // Inicializar Motor GPU
  if (window.GPUApp) {
    window.GPUApp.init(20000);
  }
});
