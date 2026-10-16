if (isLoggedIn()) window.location.href = CONFIG.BASE + '/';

    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('reg-error');
      errorEl.classList.add('hidden');

      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-pass').value;

      try {
        const res = await fetch(CONFIG.API_URL + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        if (!res.ok) {
          errorEl.textContent = data.error || 'Error al registrarse';
          errorEl.classList.remove('hidden');
          return;
        }

        setToken(data.token);
        setUser(data.user);
        window.location.href = CONFIG.BASE + '/';
      } catch {
        errorEl.textContent = 'Error de conexión con el servidor';
        errorEl.classList.remove('hidden');
      }
    });
