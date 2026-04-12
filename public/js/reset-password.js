const params = new URLSearchParams(window.location.search);
const token = params.get('token');

const resetForm = document.getElementById('reset-form');

if (!token && resetForm) {
  resetForm.innerHTML = '<div class="text-red-400 text-center p-4 bg-red-500/10 rounded-xl">Token de recuperación faltante o inválido.</div>';
}

if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passInput = document.getElementById('reset-pass');
    const confirmInput = document.getElementById('reset-confirm');
    const password = passInput ? passInput.value : '';
    const confirm = confirmInput ? confirmInput.value : '';
    const msgEl = document.getElementById('reset-message');
    const btn = document.getElementById('submit-btn');

    if (password !== confirm) {
      if (msgEl) {
        msgEl.textContent = 'Las contraseñas no coinciden';
        msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
        msgEl.classList.remove('hidden');
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Actualizando...';
    }
    if (msgEl) msgEl.classList.add('hidden');

    try {
      const res = await fetch(CONFIG.API_URL + '/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();
      
      if (msgEl) {
        msgEl.textContent = data.message || data.error;
        msgEl.classList.remove('hidden');
        
        if (res.ok) {
          msgEl.className = 'text-green-400 text-sm text-center bg-green-500/10 rounded-lg p-3';
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 2000);
        } else {
          msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>Actualizar Contraseña';
          }
        }
      }
    } catch (err) {
      console.error("Reset password error:", err);
      if (msgEl) {
        msgEl.textContent = 'Error de conexión';
        msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
        msgEl.classList.remove('hidden');
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check mr-2"></i>Actualizar Contraseña';
      }
    }
  });
}
