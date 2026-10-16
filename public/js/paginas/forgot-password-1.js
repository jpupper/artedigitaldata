document.getElementById('forgot-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value;
      const msgEl = document.getElementById('forgot-message');
      const btn = document.getElementById('submit-btn');

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
      msgEl.classList.add('hidden');

      try {
        const res = await fetch(CONFIG.API_URL + '/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        
        msgEl.textContent = data.message || data.error;
        msgEl.classList.remove('hidden');
        
        if (res.ok) {
          msgEl.className = 'text-green-400 text-sm text-center bg-green-500/10 rounded-lg p-3';
          document.getElementById('forgot-form').reset();
        } else {
          msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
        }
      } catch (err) {
        msgEl.textContent = 'Error de conexión';
        msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
        msgEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar Link';
      }
    });
