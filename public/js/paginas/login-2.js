// OJO: NO alcanza con "hay token". Un token vencido (o firmado con el secreto
    // anterior) mandaba al inicio sin formulario y el usuario quedaba encerrado sin
    // poder entrar. Se valida contra la API y recién ahí se redirige.
    if (isLoggedIn()) {
      apiRequest('/auth/me')
        .then(res => { if (res && res.ok) window.location.href = CONFIG.BASE + '/'; })
        .catch(() => {});
    }

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('login-error');
      errorEl.classList.add('hidden');

      const identifier = document.getElementById('login-identifier').value;
      const password = document.getElementById('login-pass').value;

      try {
        const res = await fetch(CONFIG.API_URL + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });

        const data = await res.json();
        if (!res.ok) {
          errorEl.textContent = data.error || 'Error al iniciar sesión';
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
