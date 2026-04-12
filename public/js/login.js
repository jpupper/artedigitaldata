if (typeof isLoggedIn !== 'undefined' && isLoggedIn()) {
  window.location.href = CONFIG.BASE + '/';
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.classList.add('hidden');

    const identifierInput = document.getElementById('login-identifier');
    const passInput = document.getElementById('login-pass');

    const identifier = identifierInput ? identifierInput.value : '';
    const password = passInput ? passInput.value : '';

    try {
      const res = await fetch(CONFIG.API_URL + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await res.json();
      if (!res.ok) {
        if (errorEl) {
          errorEl.textContent = data.error || 'Error al iniciar sesión';
          errorEl.classList.remove('hidden');
        }
        return;
      }

      setToken(data.token);
      setUser(data.user);
      window.location.href = CONFIG.BASE + '/';
    } catch (err) {
      console.error("Login error:", err);
      if (errorEl) {
        errorEl.textContent = 'Error de conexión con el servidor';
        errorEl.classList.remove('hidden');
      }
    }
  });
}
