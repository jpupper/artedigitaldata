const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      document.getElementById('reset-form').innerHTML = '<div class="text-red-400 text-center p-4 bg-red-500/10 rounded-xl">Token de recuperación faltante o inválido.</div>';
    }

    document.getElementById('reset-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('reset-pass').value;
      const confirm = document.getElementById('reset-confirm').value;
      const msgEl = document.getElementById('reset-message');
      const btn = document.getElementById('submit-btn');

      if (password !== confirm) {
        msgEl.textContent = 'Las contraseñas no coinciden';
        msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
        msgEl.classList.remove('hidden');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Actualizando...';
      msgEl.classList.add('hidden');

      let response;
      try {
        response = await fetch(CONFIG.API_URL + '/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password })
        });

        const data = await response.json();
        
        msgEl.textContent = data.message || data.error;
        msgEl.classList.remove('hidden');
        
        if (response.ok) {
          msgEl.className = 'text-green-400 text-sm text-center bg-green-500/10 rounded-lg p-3';
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 2000);
        } else {
          msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
        }
      } catch (err) {
        msgEl.textContent = 'Error de conexión';
        msgEl.className = 'text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3';
        msgEl.classList.remove('hidden');
      } finally {
        if (!response || !response.ok) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>Actualizar Contraseña';
        }
      }
    });
