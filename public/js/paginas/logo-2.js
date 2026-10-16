const STORAGE_KEY = 'artedigital_logo_interactive_transform';

    // Estado global de transformación
    const state = {
      scale: 1.0,
      x: 0,
      y: 0,
      rotation: 0
    };

    // Referencias al DOM
    const logoBox = document.getElementById('logo-box');
    const hudPanel = document.getElementById('hud-panel');
    const toggleHudBtn = document.getElementById('toggle-hud-btn');
    const toastMsg = document.getElementById('toast-msg');
    const toastText = document.getElementById('toast-text');

    // Elementos de Entrada HUD
    const rangeScale = document.getElementById('range-scale');
    const rangeX = document.getElementById('range-x');
    const rangeY = document.getElementById('range-y');
    const rangeRot = document.getElementById('range-rot');

    // Elementos de Valor HUD
    const valScale = document.getElementById('val-scale');
    const valX = document.getElementById('val-x');
    const valY = document.getElementById('val-y');
    const valRot = document.getElementById('val-rot');

    // Aplicar transformación actual al CSS y al HUD
    function updateTransform() {
      logoBox.style.transform = `translate3d(${state.x}px, ${state.y}px, 0px) scale(${state.scale}) rotate(${state.rotation}deg)`;
      
      rangeScale.value = state.scale;
      valScale.textContent = `${state.scale.toFixed(2)}x`;

      rangeX.value = state.x;
      valX.textContent = `${Math.round(state.x)} px`;

      rangeY.value = state.y;
      valY.textContent = `${Math.round(state.y)} px`;

      rangeRot.value = state.rotation;
      valRot.textContent = `${Math.round(state.rotation)}°`;
    }

    // Mostrar Toast de Notificación
    let toastTimer = null;
    function showToast(message) {
      if (toastText) toastText.textContent = message;
      if (toastMsg) {
        toastMsg.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          toastMsg.classList.remove('show');
        }, 2500);
      }
    }

    function getLogoApiUrl() {
      if (window.CONFIG && window.CONFIG.API_URL) return window.CONFIG.API_URL;
      const path = window.location.pathname;
      if (path.includes('/artedigitaldata')) {
        return '/artedigitaldata/api';
      }
      return '/api';
    }

    // Guardar transformación en Servidor (logointeractiveconfig.json y DB)
    async function saveTransform() {
      const payload = {
        scale: state.scale,
        x: state.x,
        y: state.y,
        rotation: state.rotation
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}

      try {
        const apiBase = getLogoApiUrl();
        let res = await fetch(`${apiBase}/public/logo-interactive-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res || !res.ok) {
          const altBase = apiBase.includes('/artedigitaldata') ? '/api' : '/artedigitaldata/api';
          res = await fetch(`${altBase}/public/logo-interactive-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => null);
        }

        if (res && res.ok) {
          showToast('¡Configuración guardada en logointeractiveconfig.json y Servidor!');
        } else {
          showToast('Configuración guardada en almacenamiento local');
        }
      } catch (err) {
        console.error('Error al guardar transformación:', err);
        showToast('Guardado en caché local');
      }
    }

    // Cargar transformación guardada desde Servidor (logointeractiveconfig.json)
    async function loadSavedTransform() {
      let loaded = false;
      const t = Date.now();
      const urlsToTry = [
        'logointeractiveconfig.json?t=' + t,
        './logointeractiveconfig.json?t=' + t,
        '/artedigitaldata/logointeractiveconfig.json?t=' + t,
        getLogoApiUrl() + '/public/logo-interactive-config?t=' + t
      ];

      for (const url of urlsToTry) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
              if (typeof data.scale === 'number') state.scale = data.scale;
              if (typeof data.x === 'number') state.x = data.x;
              if (typeof data.y === 'number') state.y = data.y;
              if (typeof data.rotation === 'number') state.rotation = data.rotation;
              updateTransform();
              loaded = true;
              break;
            }
          }
        } catch (e) {}
      }

      if (!loaded) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
              if (typeof parsed.scale === 'number') state.scale = parsed.scale;
              if (typeof parsed.x === 'number') state.x = parsed.x;
              if (typeof parsed.y === 'number') state.y = parsed.y;
              if (typeof parsed.rotation === 'number') state.rotation = parsed.rotation;
              updateTransform();
            }
          }
        } catch (e) {}
      }
    }
    document.addEventListener('DOMContentLoaded', loadSavedTransform);

    // Eventos de los Sliders
    rangeScale.addEventListener('input', (e) => {
      state.scale = parseFloat(e.target.value);
      updateTransform();
    });

    rangeX.addEventListener('input', (e) => {
      state.x = parseFloat(e.target.value);
      updateTransform();
    });

    rangeY.addEventListener('input', (e) => {
      state.y = parseFloat(e.target.value);
      updateTransform();
    });

    rangeRot.addEventListener('input', (e) => {
      state.rotation = parseFloat(e.target.value);
      updateTransform();
    });

    function resetTransform() {
      state.scale = 1.0;
      state.x = 0;
      state.y = 0;
      state.rotation = 0;
      updateTransform();
      showToast('Transformación restablecida');
    }

    function centerLogo() {
      state.x = 0;
      state.y = 0;
      updateTransform();
      showToast('Logo centrado en pantalla');
    }

    function toggleHUD() {
      hudPanel.classList.toggle('minimized');
    }
    toggleHudBtn.addEventListener('click', toggleHUD);

    // Tecla H para ocultar/mostrar HUD
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'h') {
        toggleHUD();
      }
    });

    // === GESTOS DE ARRASTRE Y RUEDA (DRAG & WHEEL) ===
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    function onPointerDown(e) {
      isDragging = true;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      
      startX = clientX;
      startY = clientY;
      initialX = state.x;
      initialY = state.y;
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      state.x = initialX + deltaX;
      state.y = initialY + deltaY;
      updateTransform();
    }

    function onPointerUp() {
      isDragging = false;
    }

    // Eventos Mouse y Touch en el Logo Box
    logoBox.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    logoBox.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Doble click para centrar
    logoBox.addEventListener('dblclick', () => {
      resetTransform();
    });

    // Zoom con Rueda de Ratón (Wheel)
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? -0.08 : 0.08;
      state.scale = Math.min(Math.max(0.1, state.scale + zoomFactor), 4.0);
      updateTransform();
    }, { passive: false });

    // Inicializar estado y cargar configuración guardada si existe
    loadSavedTransform();
