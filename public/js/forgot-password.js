const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('forgot-email');
    const email = emailInput ? emailInput.value : '';
    const msgEl = document.getElementById('forgot-message');
    const btn = document.getElementById('submit-btn');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
    }
    if (msgEl) msgEl.classList.add('hidden');

    try {
      const res = await fetch(CONFIG.API_URL + '/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      
      if (msgEl) {
        msgEl.textContent = data.message || data.error;
        msgEl.classList.remove('hidden');
        
        if (res.ok) {
          msgEl.className = 'text-green-400 text-sm text-center bg-green-500/10 rounded-lg p-3';
          forgotForm.reset();
        } else {
          msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
        }
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      if (msgEl) {
        msgEl.textContent = 'Error de conexión';
        msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
        msgEl.classList.remove('hidden');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar Link';
      }
    }
  });
}
