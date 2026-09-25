(function initTermsConsentModal() {
  // Solo se solicita el consentimiento a usuarios autenticados (después de registrarse o iniciar sesión)
  function checkAndRenderModal() {
    if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return;
    if (localStorage.getItem('artedigital_terms_accepted') === 'true') return;
    if (document.getElementById('artedigital-terms-modal')) return;

    const basePath = (window.CONFIG ? CONFIG.BASE : '');

    const modal = document.createElement('div');
    modal.id = 'artedigital-terms-modal';
    modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300';
    
    modal.innerHTML = `
      <div class="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#12121a] border border-cyan-500/40 shadow-[0_0_60px_rgba(0,242,254,0.2)] text-gray-200 font-sans">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl shrink-0">
            <i class="fas fa-scroll"></i>
          </div>
          <div>
            <h3 class="font-black text-white text-base sm:text-lg tracking-tight">Términos, Privacidad y Manifiesto</h3>
            <p class="text-[11px] text-cyan-400 uppercase tracking-widest font-black">Comunidad Arte Digital Data</p>
          </div>
        </div>

        <p class="text-xs text-gray-300 leading-relaxed mb-4">
          ¡Bienvenido a la comunidad! Para poder interactuar, publicar y participar en la plataforma, solicitamos que confirmes tu acuerdo con nuestros 
          <a href="${basePath}/terminos" target="_blank" class="text-cyan-400 underline font-bold hover:text-cyan-300">Términos y Condiciones</a>, 
          nuestra <a href="${basePath}/privacidad" target="_blank" class="text-cyan-400 underline font-bold hover:text-cyan-300">Política de Privacidad</a> 
          (almacenamiento técnico) y el cumplimiento obligatorio de nuestro 
          <a href="${basePath}/manifiesto.html" target="_blank" class="text-cyan-400 underline font-bold hover:text-cyan-300">Manifiesto Fundacional</a>.
        </p>

        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 mb-5">
          <input type="checkbox" id="terms-agree-check" class="mt-0.5 w-4 h-4 accent-cyan-500 cursor-pointer rounded shrink-0">
          <label for="terms-agree-check" class="text-xs font-medium text-gray-200 cursor-pointer select-none leading-tight">
            He leído y acepto cumplir los Términos, la Política de Privacidad y las normas comunitarias del Manifiesto.
          </label>
        </div>

        <button id="btn-accept-terms-modal" disabled class="w-full py-3 rounded-xl bg-gray-800 text-gray-500 font-black uppercase text-xs tracking-wider transition-all cursor-not-allowed">
          Aceptar y Continuar
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    const checkbox = document.getElementById('terms-agree-check');
    const submitBtn = document.getElementById('btn-accept-terms-modal');

    checkbox?.addEventListener('change', () => {
      if (checkbox.checked) {
        submitBtn.disabled = false;
        submitBtn.className = 'w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(0,242,254,0.4)]';
      } else {
        submitBtn.disabled = true;
        submitBtn.className = 'w-full py-3 rounded-xl bg-gray-800 text-gray-500 font-black uppercase text-xs tracking-wider transition-all cursor-not-allowed';
      }
    });

    submitBtn?.addEventListener('click', () => {
      if (!checkbox.checked) return;
      localStorage.setItem('artedigital_terms_accepted', 'true');
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndRenderModal);
  } else {
    checkAndRenderModal();
  }

  // Escuchar por si el usuario inicia sesión durante la navegación
  window.addEventListener('storage', checkAndRenderModal);
})();
