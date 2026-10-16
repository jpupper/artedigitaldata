let currentEvent = null;
    let ticketCreated = null;
    let pendingTicketData = null; // Stores data for free ticket confirmation

    document.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const eventId = urlParams.get('event');

      if (!eventId) {
        showError('No se especificó un evento');
        return;
      }

      await loadEvent(eventId);
    });

    async function loadEvent(eventId) {
      try {
        const res = await fetch(`${CONFIG.API_URL}/eventos/${eventId}`);
        if (!res.ok) throw new Error();
        const ev = await res.json();
        currentEvent = ev;
        renderEvent(ev);
      } catch (err) {
        showError('No se pudo cargar el evento');
      }
    }

    function renderEvent(ev) {
      document.getElementById('loading').classList.add('hidden');
      
      // Check if tickets are enabled
      if (!ev.ticketConfig?.enabled) {
        showError('Este evento no tiene sistema de entradas activado');
        return;
      }

      // Check if event is in the past
      const eventDate = new Date(ev.date);
      const now = new Date();
      if (eventDate < now) {
        showError('Este evento ya ha finalizado');
        return;
      }

      document.getElementById('content').classList.remove('hidden');
      document.title = `Comprar Entrada - ${ev.title}`;

      // Event image
      const imgContainer = document.getElementById('event-image');
      if (ev.imageUrl) {
        imgContainer.innerHTML = `<img src="${sanitizeUrl(ev.imageUrl)}" class="w-full h-full object-cover" alt="${escapeHTML(ev.title)}">`;
      } else {
        imgContainer.innerHTML = `<i class="fas fa-calendar-alt text-6xl text-magenta-500/20"></i>`;
      }

      const eventId = new URLSearchParams(window.location.search).get('event');
      document.getElementById('event-title').innerText = ev.title;
      document.getElementById('event-title-link').href = `evento.html?id=${eventId}`;
      document.getElementById('event-date').innerHTML = `<i class="fas fa-calendar text-magenta-500"></i> ${new Date(ev.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`;

      const locEl = document.getElementById('event-location');
      const loc = ev.location || '';
      const isLocUrl = /^https?:\/\//i.test(loc);
      if (isLocUrl) {
        const isGMaps = /google\.com\/maps|maps\.google|maps\.app\.goo\.gl/i.test(loc);
        locEl.innerHTML = `<a href="${sanitizeUrl(loc)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all font-bold text-xs">
          <i class="fas ${isGMaps ? 'fa-map-marker-alt' : 'fa-external-link-alt'}"></i>
          ${isGMaps ? 'Ver en Google Maps' : 'Ver ubicación'}
        </a>`;
      } else {
        locEl.innerHTML = loc ? `<i class="fas fa-map-marker-alt text-cyan-500"></i> ${escapeHTML(loc)}` : '';
      }

      // Purchase message banner
      if (ev.ticketConfig.purchaseMessage) {
        const banner = document.createElement('div');
        banner.className = 'rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30 px-5 py-4 mb-6 flex items-start gap-3';
        banner.innerHTML = `<i class="fas fa-star text-fuchsia-400 mt-0.5 shrink-0"></i><p class="text-fuchsia-200 text-sm leading-relaxed">${escapeHTML(ev.ticketConfig.purchaseMessage)}</p>`;
        document.getElementById('purchase-form').parentElement.insertBefore(banner, document.getElementById('buyer-summary'));
      }

      if (ev.ticketConfig.mode === 'manual') {
        const manualHint = document.createElement('div');
        manualHint.className = 'rounded-2xl bg-yellow-500/10 border border-yellow-500/20 px-5 py-4 mb-6 flex items-start gap-3';
        manualHint.innerHTML = `<i class="fas fa-hand-holding-usd text-yellow-400 mt-0.5 shrink-0"></i><p class="text-yellow-100 text-sm leading-relaxed">Este evento está en modo manual. El mensaje de compra debe incluir CBU/alias de MercadoPago y avisar que el administrador te enviará la entrada luego de la transferencia.</p>`;
        document.getElementById('purchase-form').parentElement.insertBefore(manualHint, document.getElementById('buyer-summary'));
      }

      // Price display
      const priceDisplay = document.getElementById('ticket-price');
      const btnText = document.getElementById('btn-text');
      const formTitle = document.getElementById('form-title');
      
      if (ev.ticketConfig.isContribution) {
        priceDisplay.innerText = 'A TU ELECCIÓN';
        btnText.innerText = 'CONTRIBUIR Y RESERVAR';
        formTitle.innerText = 'Bono Contribución';
        const contribSection = document.getElementById('contribution-section');
        contribSection.classList.remove('hidden');
        // Pre-fill with event price as suggested default
        if (ev.ticketConfig.price > 0) {
          document.getElementById('contribution-amount').value = ev.ticketConfig.price;
        }
      } else if (ev.ticketConfig.price === 0) {
        priceDisplay.innerText = 'GRATIS';
        btnText.innerText = 'RESERVAR ENTRADA';
        formTitle.innerText = 'Reservar Entrada';
      } else {
        priceDisplay.innerText = `$${ev.ticketConfig.price} ARS`;
      }

      // Show logged-in user info
      const user = getUser();
      if (user) {
        const avatarEl = document.getElementById('buyer-avatar');
        if (user.avatar) {
          avatarEl.innerHTML = `<img src="${sanitizeUrl(user.avatar)}" class="w-full h-full object-cover rounded-full">`;
        } else {
          avatarEl.innerText = (user.displayName || user.username || '?')[0].toUpperCase();
        }
        document.getElementById('buyer-display-name').innerText = user.displayName || user.username || '';
        const emailDisplay = document.getElementById('buyer-display-email');
        emailDisplay.innerText = user.email || '';

        // Always show buyer-info-section so the user can see/edit their email
        // This is critical when SSO login happens and user.email is not yet loaded
        const buyerInfoSection = document.getElementById('buyer-info-section');
        buyerInfoSection.classList.remove('hidden');
        if (user.email) {
          document.getElementById('buyer-email').value = user.email;
        }
        if (user.displayName || user.username) {
          document.getElementById('buyer-name').value = user.displayName || user.username;
        }
      }

      // Form submission
      document.getElementById('purchase-form').addEventListener('submit', handlePurchase);
    }

    async function handlePurchase(e) {
      e.preventDefault();

      // FIRST: check if user is logged in
      const user = getUser();
      if (!user) {
        showLoginRequiredModal();
        return;
      }

      const nameInput = document.getElementById('buyer-name')?.value.trim() || '';
      const emailInput = document.getElementById('buyer-email')?.value.trim() || '';
      const phoneInput = document.getElementById('buyer-phone')?.value.trim() || '';

      const name = nameInput || user?.displayName || user?.username || '';
      const email = emailInput || user?.email || '';
      const phone = phoneInput || '';

      try {
        if (!email) {
          throw new Error('Debes ingresar un correo electrónico para recibir la entrada.');
        }
        // --- CONTRIBUTION MODE ---
        if (currentEvent.ticketConfig.isContribution) {
          const rawValue = document.getElementById('contribution-amount').value;
          const amount = parseFloat(rawValue) || 0;
          console.log(`[Contribution] Raw input value: "${rawValue}", parsed amount: ${amount}`);

          if (amount > 0) {
            // Pay via MercadoPago with the chosen contribution amount
            showStatus('Procesando', 'Preparando el pago...');
            const prefHeaders = { 'Content-Type': 'application/json' };
            const prefToken = getToken();
            if (prefToken) prefHeaders['Authorization'] = `Bearer ${prefToken}`;
            const res = await fetch(`${CONFIG.API_URL}/tickets/event/${currentEvent._id}/create-preference`, {
              method: 'POST',
              headers: prefHeaders,
              body: JSON.stringify({ ownerName: name, ownerEmail: email, ownerPhone: phone, amount })
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Error al crear preferencia de pago');
            }
            const data = await res.json();
            if (data.initPoint) {
              redirectToPayment(data);
              return; // Add return to prevent executing the fallback paid event logic
            } else {
              throw new Error('No se pudo obtener el link de pago');
            }
          } else {
            // Amount is 0 — show custom modal instead of confirm
            pendingTicketData = { name, email, phone };
            showFreeTicketModal();
            return;
          }
        }

        // --- FREE EVENT ---
        if (currentEvent.ticketConfig.price === 0) {
          showStatus('Procesando', 'Generando tu entrada...');
          await createFreeTicket(name, email, phone);
          return;
        }

        // --- PAID EVENT (non-contribution) --- always go through MercadoPago or manual purchase request
        showStatus('Procesando', 'Preparando el pago...');
        const paidHeaders = { 'Content-Type': 'application/json' };
        const paidToken = getToken();
        if (paidToken) paidHeaders['Authorization'] = `Bearer ${paidToken}`;
        const res = await fetch(`${CONFIG.API_URL}/tickets/event/${currentEvent._id}/create-preference`, {
          method: 'POST',
          headers: paidHeaders,
          body: JSON.stringify({ ownerName: name, ownerEmail: email, ownerPhone: phone })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al crear preferencia de pago');
        }

        const data = await res.json();
        if (data.manualMode) {
          showManualPaymentResult(data);
          return;
        }
        if (data.initPoint) {
          redirectToPayment(data);
        } else {
          throw new Error('No se pudo obtener el link de pago');
        }

      } catch (err) {
        hideStatus();
        showErrorModal(err.message);
      }
    }

    function redirectToPayment(data) {
      if (data.usePaymentLink) {
        // Manual payment link: show the ticket immediately, open payment in new tab
        window.open(data.initPoint, '_blank');
        window.location.href = `ticket-success.html?ticket=${data.code}`;
      } else {
        // MercadoPago API preference: redirect entirely to MP checkout
        window.location.href = data.initPoint;
      }
    }

    function showManualPaymentResult(data) {
      const result = document.getElementById('manual-payment-result');
      const text = document.getElementById('manual-payment-text');
      const linkContainer = document.getElementById('manual-link-container');
      const manualLink = document.getElementById('manual-payment-link');
      const cbuContainer = document.getElementById('manual-cbu-container');
      const cbuInfo = document.getElementById('manual-payment-info');
      const submitBtn = document.getElementById('submit-btn');

      if (!result || !text || !submitBtn) return;
      hideStatus();
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
      text.innerText = 'Tu solicitud de entrada ha sido registrada. Completa el pago con los datos a continuación y espera a que el administrador confirme tu entrada.';

      if (data.initPoint) {
        linkContainer.classList.remove('hidden');
        manualLink.href = data.initPoint;
        manualLink.innerText = 'Abrir pago en MercadoPago';
      } else {
        linkContainer.classList.add('hidden');
      }

      if (data.manualPaymentInfo) {
        cbuContainer.classList.remove('hidden');
        cbuInfo.innerText = data.manualPaymentInfo;
      } else {
        cbuContainer.classList.add('hidden');
      }

      result.classList.remove('hidden');
      document.getElementById('payment-container')?.classList.add('hidden');
    }

    async function createFreeTicket(name, email, phone) {
      const headers = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${CONFIG.API_URL}/tickets/event/${currentEvent._id}/create-free`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ownerName: name, ownerEmail: email, ownerPhone: phone })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear la entrada');
      }

      const ticket = await res.json();
      window.location.href = `ticket-success.html?ticket=${ticket.code}`;
    }

    function showError(msg) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error').classList.remove('hidden');
      document.getElementById('error-msg').innerText = msg;
    }

    function showStatus(title, msg) {
      const overlay = document.getElementById('status-overlay');
      document.getElementById('status-title').innerText = title;
      document.getElementById('status-msg').innerText = msg;
      overlay.classList.remove('hidden');

      overlay.classList.add('flex');
    }

    function hideStatus() {
      const overlay = document.getElementById('status-overlay');
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    }

    // Free ticket confirmation modal functions
    function showFreeTicketModal() {
      const modal = document.getElementById('free-ticket-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    async function closeFreeTicketModal(confirmed) {
      const modal = document.getElementById('free-ticket-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');

      if (confirmed && pendingTicketData) {
        // User chose to get free ticket
        showStatus('Procesando', 'Generando tu entrada...');
        try {
          await createFreeTicket(pendingTicketData.name, pendingTicketData.email, pendingTicketData.phone);
        } catch (err) {
          hideStatus();
          showErrorModal(err.message);
        }
      } else {
        // User chose to contribute - focus on the amount input
        const amountInput = document.getElementById('contribution-amount');
        if (amountInput) {
          amountInput.focus();
          amountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a subtle highlight animation
          amountInput.classList.add('ring-2', 'ring-magenta-500');
          setTimeout(() => amountInput.classList.remove('ring-2', 'ring-magenta-500'), 2000);
        }
      }
      pendingTicketData = null;
    }

    // Login required modal functions
    function showLoginRequiredModal() {
      const modal = document.getElementById('login-required-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeLoginRequiredModal() {
      const modal = document.getElementById('login-required-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    // Error modal functions (replaces alert)
    function showErrorModal(msg) {
      document.getElementById('error-modal-msg').innerText = msg;
      const modal = document.getElementById('error-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeErrorModal() {
      const modal = document.getElementById('error-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
