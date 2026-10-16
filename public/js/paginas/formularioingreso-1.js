function previewAvatar(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        const preview = document.getElementById('avatar-preview');
        preview.style.backgroundImage = 'url(' + ev.target.result + ')';
        preview.style.display = 'block';
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        document.getElementById('avatar-placeholder').style.display = 'none';
        document.getElementById('clear-avatar').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }

    function clearAvatar() {
      document.getElementById('avatar-input').value = '';
      document.getElementById('avatar-preview').style.display = 'none';
      document.getElementById('avatar-preview').style.backgroundImage = '';
      document.getElementById('avatar-placeholder').style.display = 'flex';
      document.getElementById('clear-avatar').classList.add('hidden');
    }

    function showError(msg) {
      const el = document.getElementById('form-error');
      el.textContent = msg;
      el.classList.remove('hidden');
    }

    function hideError() {
      document.getElementById('form-error').classList.add('hidden');
    }

    async function handleSubmit(e) {
      e.preventDefault();
      hideError();

      const username = document.getElementById('username').value.trim();
      const displayName = document.getElementById('displayName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const bio = document.getElementById('bio').value.trim();
      const socialWhatsapp = document.getElementById('social-whatsapp').value.trim();
      const socialInstagram = document.getElementById('social-instagram').value.trim();
      const socialFacebook = document.getElementById('social-facebook').value.trim();
      const socialX = document.getElementById('social-x').value.trim();
      const socialBehance = document.getElementById('social-behance').value.trim();
      const socialGithub = document.getElementById('social-github').value.trim();
      const avatarFile = document.getElementById('avatar-input').files[0];

      if (!username || !email || !password) {
        showError('Completá los campos obligatorios: nombre de usuario, email y contraseña.');
        return;
      }

      if (password.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';

      // Show loading overlay
      document.getElementById('loading-overlay').classList.remove('hidden');

      try {
        // 1. Register the user
        const registerRes = await fetch(CONFIG.API_URL + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });

        const registerData = await registerRes.json();
        if (!registerRes.ok) {
          document.getElementById('loading-overlay').classList.add('hidden');
          showError(registerData.error || 'Error al registrarse');
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> Crear cuenta y unirme a la comunidad';
          return;
        }

        // Save auth token globally
        const token = registerData.token;

        // 2. Upload avatar if provided
        let avatarUrl = '';
        if (avatarFile) {
          try {
            const formData = new FormData();
            formData.append('file', avatarFile);
            const uploadRes = await fetch(CONFIG.API_URL + '/upload', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + token },
              body: formData
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              avatarUrl = uploadData.url || '';
            }
          } catch (uploadErr) {
            console.warn('Avatar upload failed, continuing without it', uploadErr);
          }
        }

        // 3. Update profile with bio, displayName, socials, avatar
        const socials = {};
        if (socialWhatsapp) socials.whatsapp = socialWhatsapp;
        if (socialInstagram) socials.instagram = socialInstagram;
        if (socialFacebook) socials.facebook = socialFacebook;
        if (socialX) socials.x = socialX;
        if (socialBehance) socials.behance = socialBehance;
        if (socialGithub) socials.github = socialGithub;

        const profileUpdate = {};
        if (bio) profileUpdate.bio = bio;
        if (displayName) profileUpdate.displayName = displayName;
        if (avatarUrl) profileUpdate.avatar = avatarUrl;
        if (Object.keys(socials).length > 0) profileUpdate.socials = socials;

        if (Object.keys(profileUpdate).length > 0) {
          try {
            await fetch(CONFIG.API_URL + '/profile/me', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify(profileUpdate)
            });
          } catch (profileErr) {
            console.warn('Profile update failed, continuing', profileErr);
          }
        }

        // 4. Show success
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('form-section').style.display = 'none';
        document.getElementById('success-message').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (err) {
        document.getElementById('loading-overlay').classList.add('hidden');
        showError('Error de conexión con el servidor. Verificá tu conexión e intentá de nuevo.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Crear cuenta y unirme a la comunidad';
      }

      return false;
    }
