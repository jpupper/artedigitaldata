/**
 * Image Cropper & Feed Preview Modal for Arte Digital Data
 * Permite recortar, trasladar, escalar y rotar imágenes antes de publicarlas.
 */

(function () {
  let modalContainer = null;
  let canvas = null;
  let ctx = null;
  let currentFile = null;
  let activeImage = null;
  let resolvePromise = null;
  let rejectPromise = null;

  // Estado de transformación
  const state = {
    scale: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    aspectRatio: 1.0, // 1.0 (1:1), 0.8 (4:5), 1.777 (16:9)
    targetWidth: 1080,
    targetHeight: 1080
  };

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;

  function initModal() {
    if (modalContainer) return;

    modalContainer = document.createElement('div');
    modalContainer.id = 'image-cropper-modal';
    modalContainer.className = 'fixed inset-0 z-[9999] hidden flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all duration-300';
    modalContainer.innerHTML = `
      <div class="relative w-full max-w-xl bg-[#0c101c] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,242,254,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div class="flex items-center gap-2">
            <i class="fas fa-crop-alt text-cyan-400 text-lg"></i>
            <h3 class="text-sm font-extrabold uppercase tracking-wider text-white">Ajustar Imagen para Feed</h3>
          </div>
          <button type="button" id="cropper-close-btn" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all">
            <i class="fas fa-times text-sm"></i>
          </button>
        </div>

        <!-- Body / Stage -->
        <div class="p-4 flex-1 flex flex-col items-center justify-center overflow-y-auto">
          <!-- Ratio Selector Pills -->
          <div class="flex items-center gap-2 mb-3">
            <span class="text-[10px] font-bold text-gray-400 uppercase mr-1">Proporción:</span>
            <button type="button" data-ratio="1" class="cropper-ratio-btn px-3 py-1 rounded-lg text-xs font-bold border border-cyan-500/40 bg-cyan-500/20 text-cyan-400 transition-all hover:scale-105 active">1:1 Cuadrado</button>
            <button type="button" data-ratio="0.8" class="cropper-ratio-btn px-3 py-1 rounded-lg text-xs font-bold border border-white/10 bg-white/5 text-gray-300 transition-all hover:scale-105">4:5 Retrato</button>
            <button type="button" data-ratio="1.777" class="cropper-ratio-btn px-3 py-1 rounded-lg text-xs font-bold border border-white/10 bg-white/5 text-gray-300 transition-all hover:scale-105">16:9 Wide</button>
          </div>

          <!-- Viewport Box con Borde Neón y Sombra Feed -->
          <div class="relative w-full max-w-[360px] aspect-square flex items-center justify-center bg-black/90 border-2 border-cyan-500/40 rounded-xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none" id="cropper-viewport">
            <canvas id="cropper-canvas" class="w-full h-full block"></canvas>
            <div class="absolute inset-0 pointer-events-none border border-dashed border-cyan-400/30 rounded-xl"></div>
            <div class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[9px] text-cyan-400 font-mono pointer-events-none">Arrastrá & Scroll para Zoom</div>
          </div>

          <!-- Controls Sliders -->
          <div class="w-full max-w-[380px] mt-4 space-y-3">
            <!-- Escala / Zoom -->
            <div>
              <div class="flex justify-between text-xs text-gray-400 mb-1 font-semibold">
                <span><i class="fas fa-search-plus text-cyan-400 mr-1"></i>Zoom / Escala</span>
                <span id="cropper-val-scale" class="font-mono text-cyan-400">1.00x</span>
              </div>
              <input type="range" id="cropper-range-scale" min="0.2" max="4.0" step="0.01" value="1.0" class="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer">
            </div>

            <!-- Rotación -->
            <div>
              <div class="flex justify-between text-xs text-gray-400 mb-1 font-semibold">
                <span><i class="fas fa-sync-alt text-pink-400 mr-1"></i>Rotación</span>
                <span id="cropper-val-rot" class="font-mono text-pink-400">0°</span>
              </div>
              <input type="range" id="cropper-range-rot" min="0" max="360" step="1" value="0" class="w-full accent-pink-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer">
            </div>

            <!-- Quick Action Buttons -->
            <div class="flex items-center justify-center gap-2 pt-1">
              <button type="button" id="cropper-btn-center" class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-400 transition-all">
                <i class="fas fa-crosshairs mr-1"></i>Centrar
              </button>
              <button type="button" id="cropper-btn-reset" class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-pink-500/20 hover:text-pink-400 transition-all">
                <i class="fas fa-undo mr-1"></i>Reset
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-white/10 bg-white/5 flex items-center justify-end gap-3">
          <button type="button" id="cropper-cancel-btn" class="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            Cancelar
          </button>
          <button type="button" id="cropper-apply-btn" class="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all transform hover:scale-105">
            <i class="fas fa-check mr-1.5"></i>Aplicar y Usar Imagen
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalContainer);

    canvas = document.getElementById('cropper-canvas');
    ctx = canvas.getContext('2d');

    // Wire listeners
    document.getElementById('cropper-close-btn').addEventListener('click', cancelCropper);
    document.getElementById('cropper-cancel-btn').addEventListener('click', cancelCropper);
    document.getElementById('cropper-apply-btn').addEventListener('click', applyCropper);

    const rangeScale = document.getElementById('cropper-range-scale');
    const rangeRot = document.getElementById('cropper-range-rot');

    rangeScale.addEventListener('input', (e) => {
      state.scale = parseFloat(e.target.value);
      renderCanvas();
    });

    rangeRot.addEventListener('input', (e) => {
      state.rotation = parseFloat(e.target.value);
      renderCanvas();
    });

    document.getElementById('cropper-btn-center').addEventListener('click', () => {
      state.x = 0;
      state.y = 0;
      renderCanvas();
    });

    document.getElementById('cropper-btn-reset').addEventListener('click', () => {
      state.scale = 1.0;
      state.x = 0;
      state.y = 0;
      state.rotation = 0;
      rangeScale.value = 1.0;
      rangeRot.value = 0;
      renderCanvas();
    });

    // Ratios buttons
    const ratioBtns = modalContainer.querySelectorAll('.cropper-ratio-btn');
    ratioBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        ratioBtns.forEach((b) => {
          b.classList.remove('active', 'border-cyan-500/40', 'bg-cyan-500/20', 'text-cyan-400');
          b.classList.add('border-white/10', 'bg-white/5', 'text-gray-300');
        });
        btn.classList.add('active', 'border-cyan-500/40', 'bg-cyan-500/20', 'text-cyan-400');
        btn.classList.remove('border-white/10', 'bg-white/5', 'text-gray-300');

        const ratio = parseFloat(btn.dataset.ratio);
        state.aspectRatio = ratio;
        updateViewportAspect();
        renderCanvas();
      });
    });

    // Drag & Drop / Pan Events
    const viewport = document.getElementById('cropper-viewport');

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
      const dx = clientX - startX;
      const dy = clientY - startY;
      state.x = initialX + dx;
      state.y = initialY + dy;
      renderCanvas();
    }

    function onPointerUp() {
      isDragging = false;
    }

    viewport.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    viewport.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Mouse Wheel Zoom
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? -0.05 : 0.05;
      state.scale = Math.min(Math.max(0.2, state.scale + zoomFactor), 4.0);
      rangeScale.value = state.scale;
      renderCanvas();
    }, { passive: false });
  }

  function updateViewportAspect() {
    const viewport = document.getElementById('cropper-viewport');
    if (!viewport) return;
    if (state.aspectRatio === 1) {
      viewport.style.aspectRatio = '1 / 1';
      state.targetWidth = 1080;
      state.targetHeight = 1080;
    } else if (state.aspectRatio < 1) {
      viewport.style.aspectRatio = '4 / 5';
      state.targetWidth = 1080;
      state.targetHeight = 1350;
    } else {
      viewport.style.aspectRatio = '16 / 9';
      state.targetWidth = 1920;
      state.targetHeight = 1080;
    }
  }

  function renderCanvas() {
    if (!canvas || !ctx || !activeImage) return;

    const valScaleEl = document.getElementById('cropper-val-scale');
    const valRotEl = document.getElementById('cropper-val-rot');
    if (valScaleEl) valScaleEl.textContent = `${state.scale.toFixed(2)}x`;
    if (valRotEl) valRotEl.textContent = `${Math.round(state.rotation)}°`;

    const rect = canvas.parentElement.getBoundingClientRect();
    const width = rect.width || 360;
    const height = rect.height || (360 / state.aspectRatio);

    canvas.width = width * (window.devicePixelRatio || 1);
    canvas.height = height * (window.devicePixelRatio || 1);

    ctx.save();
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    // Clear background
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Center origin
    const centerX = width / 2 + state.x;
    const centerY = height / 2 + state.y;

    ctx.translate(centerX, centerY);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.scale(state.scale, state.scale);

    // Calculate base draw size fitting the viewport
    const imgAspect = activeImage.width / activeImage.height;
    let drawW = width;
    let drawH = width / imgAspect;

    if (drawH < height) {
      drawH = height;
      drawW = height * imgAspect;
    }

    ctx.drawImage(activeImage, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  function openCropper(file) {
    initModal();
    currentFile = file;
    state.scale = 1.0;
    state.x = 0;
    state.y = 0;
    state.rotation = 0;
    state.aspectRatio = 1.0;

    const rangeScale = document.getElementById('cropper-range-scale');
    const rangeRot = document.getElementById('cropper-range-rot');
    if (rangeScale) rangeScale.value = 1.0;
    if (rangeRot) rangeRot.value = 0;

    updateViewportAspect();

    return new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          activeImage = img;
          modalContainer.classList.remove('hidden');
          requestAnimationFrame(() => renderCanvas());
        };
        img.onerror = () => {
          reject(new Error('No se pudo cargar la imagen'));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function cancelCropper() {
    if (modalContainer) modalContainer.classList.add('hidden');
    if (rejectPromise) rejectPromise(new Error('Cancelado por el usuario'));
    resolvePromise = null;
    rejectPromise = null;
  }

  function applyCropper() {
    if (!activeImage) return;

    // Render full resolution high quality image blob
    const offCanvas = document.createElement('canvas');
    offCanvas.width = state.targetWidth;
    offCanvas.height = state.targetHeight;
    const offCtx = offCanvas.getContext('2d');

    offCtx.fillStyle = '#050811';
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

    const scaleFactor = state.targetWidth / (canvas.parentElement.getBoundingClientRect().width || 360);

    const centerX = offCanvas.width / 2 + state.x * scaleFactor;
    const centerY = offCanvas.height / 2 + state.y * scaleFactor;

    offCtx.save();
    offCtx.translate(centerX, centerY);
    offCtx.rotate((state.rotation * Math.PI) / 180);
    offCtx.scale(state.scale, state.scale);

    const imgAspect = activeImage.width / activeImage.height;
    let drawW = offCanvas.width;
    let drawH = offCanvas.width / imgAspect;

    if (drawH < offCanvas.height) {
      drawH = offCanvas.height;
      drawW = offCanvas.height * imgAspect;
    }

    offCtx.drawImage(activeImage, -drawW / 2, -drawH / 2, drawW, drawH);
    offCtx.restore();

    offCanvas.toBlob((blob) => {
      if (!blob) {
        cancelCropper();
        return;
      }
      const croppedFile = new File([blob], currentFile.name || 'cropped_post.png', {
        type: 'image/png',
        lastModified: Date.now()
      });

      if (modalContainer) modalContainer.classList.add('hidden');
      if (resolvePromise) resolvePromise(croppedFile);
      resolvePromise = null;
      rejectPromise = null;
    }, 'image/png', 0.95);
  }

  // Interceptar cambios en inputs de archivo de imágenes
  function attachToInput(inputEl) {
    if (!inputEl || inputEl.dataset.cropperAttached) return;
    inputEl.dataset.cropperAttached = 'true';

    inputEl.addEventListener('change', async (e) => {
      const file = inputEl.files && inputEl.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      if (inputEl.dataset.croppingInProgress) return;

      try {
        inputEl.dataset.croppingInProgress = 'true';
        const croppedFile = await openCropper(file);
        
        // Reemplazar archivos en el input mediante DataTransfer
        const dt = new DataTransfer();
        dt.items.add(croppedFile);
        inputEl.files = dt.files;
      } catch (err) {
        // Si cancela, conservar archivo original o limpiar
      } finally {
        delete inputEl.dataset.croppingInProgress;
      }
    });
  }

  // Auto-attach a cualquier input file relevante en la página
  function autoAttachAll() {
    const inputs = document.querySelectorAll('input[type="file"][accept*="image"], input[type="file"][name="file"]');
    inputs.forEach(attachToInput);
  }

  document.addEventListener('DOMContentLoaded', autoAttachAll);

  // Exponer API global
  window.ImageCropper = {
    open: openCropper,
    attach: attachToInput,
    autoAttachAll: autoAttachAll
  };
})();
