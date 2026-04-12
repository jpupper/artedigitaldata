if (typeof isLoggedIn !== 'undefined' && isLoggedIn()) {
  window.location.href = CONFIG.BASE + '/';
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('reg-error');
    if (errorEl) errorEl.classList.add('hidden');

    const usernameInput = document.getElementById('reg-username');
    const emailInput = document.getElementById('reg-email');
    const passInput = document.getElementById('reg-pass');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passInput ? passInput.value : '';

    try {
      const res = await fetch(CONFIG.API_URL + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        if (errorEl) {
          errorEl.textContent = data.error || 'Error al registrarse';
          errorEl.classList.remove('hidden');
        }
        return;
      }

      setToken(data.token);
      setUser(data.user);
      window.location.href = CONFIG.BASE + '/';
    } catch (err) {
      console.error("Register error:", err);
      if (errorEl) {
        errorEl.textContent = 'Error de conexión con el servidor';
        errorEl.classList.remove('hidden');
      }
    }
  });
}
