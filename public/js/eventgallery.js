/**
 * Event Gallery — Character Select (Mortal Kombat Style)
 * Displays event participants with animated stage focus + grid selector
 */

class EventGallery {
  constructor() {
    this.evento = null;
    this.participants = [];
    this.currentIndex = 0;
    this.autoplayEnabled = true;
    this.autoplayInterval = null;
    this.autoplayDuration = 4000;
    this.progressAnimation = null;
    this.transitioning = false;

    this.stageEl = null;
    this.gridEl = null;
    this.progressBar = null;
    this.autoplayBtn = null;
  }

  async init() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    if (!eventId) {
      this.renderError('No se proporcionó un ID de evento.');
      return;
    }

    await this.loadEvent(eventId);
  }

  async loadEvent(eventId) {
    try {
      const res = await fetch(`${CONFIG.API_URL}/eventos/${eventId}`);
      if (!res.ok) throw new Error('Evento no encontrado');
      this.evento = await res.json();
      this.participants = (this.evento.participants || []).filter(p => p && (p.username || p._id));

      document.title = `Galería: ${this.evento.title} — Arte Digital Data`;

      if (this.participants.length === 0) {
        this.renderEmpty();
        return;
      }

      this.renderLayout();
      this.selectParticipant(0, false);
      this.startAutoplay();
    } catch (err) {
      this.renderError(err.message);
    }
  }

  renderLayout() {
    const loadingEl = document.getElementById('eg-loading');
    if (loadingEl) loadingEl.remove();

    const wrapper = document.getElementById('eg-wrapper');
    wrapper.innerHTML = '';

    // Header
    const header = document.createElement('header');
    header.className = 'eg-header';
    header.innerHTML = `
      <div class="eg-event-title">${this.escHtml(this.evento.title)}</div>
      <div class="eg-select-label">Seleccioná un artista para destacarlo</div>
    `;
    wrapper.appendChild(header);

    // Controls bar
    const controls = document.createElement('div');
    controls.className = 'flex items-center justify-center gap-4 py-3';
    this.autoplayBtn = document.createElement('button');
    this.autoplayBtn.className = 'eg-autoplay-btn playing';
    this.autoplayBtn.innerHTML = '<i class="fas fa-play"></i> Auto';
    this.autoplayBtn.addEventListener('click', () => this.toggleAutoplay());
    controls.appendChild(this.autoplayBtn);

    const backBtn = document.createElement('a');
    backBtn.href = `evento.html?id=${this.evento._id}`;
    backBtn.className = 'eg-autoplay-btn';
    backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Volver al Evento';
    controls.appendChild(backBtn);
    wrapper.appendChild(controls);

    // Stage
    const stageWrap = document.createElement('section');
    stageWrap.className = 'eg-stage';
    const stageBg = document.createElement('div');
    stageBg.className = 'eg-stage-bg-glow';
    stageBg.id = 'eg-stage-bg';
    stageWrap.appendChild(stageBg);

    this.stageEl = document.createElement('div');
    this.stageEl.id = 'eg-stage-card';
    this.stageEl.className = 'eg-stage-card';
    stageWrap.appendChild(this.stageEl);
    wrapper.appendChild(stageWrap);

    // Grid section
    const gridSection = document.createElement('section');
    gridSection.className = 'eg-grid-section';

    const gridTitle = document.createElement('div');
    gridTitle.className = 'eg-grid-title';
    gridTitle.textContent = `${this.participants.length} Participante${this.participants.length !== 1 ? 's' : ''}`;
    gridSection.appendChild(gridTitle);

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'eg-grid';
    this.gridEl.id = 'eg-grid';

    this.participants.forEach((p, i) => {
      const chip = this.buildChip(p, i);
      this.gridEl.appendChild(chip);
    });

    gridSection.appendChild(this.gridEl);
    wrapper.appendChild(gridSection);

    // Progress bar
    const pbWrap = document.createElement('div');
    pbWrap.className = 'eg-progress-bar-wrap';
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'eg-progress-bar';
    this.progressBar.id = 'eg-progress-bar';
    pbWrap.appendChild(this.progressBar);
    document.body.appendChild(pbWrap);
  }

  buildChip(participant, index) {
    const chip = document.createElement('div');
    chip.className = 'eg-chip';
    chip.dataset.index = index;
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-label', participant.displayName || participant.username || 'Artista');

    const indicator = document.createElement('div');
    indicator.className = 'eg-chip-active-indicator';
    chip.appendChild(indicator);

    if (participant.avatar) {
      const img = document.createElement('img');
      img.src = participant.avatar;
      img.alt = participant.username || '';
      img.className = 'eg-chip-avatar';
      img.loading = 'lazy';
      chip.appendChild(img);
    } else {
      const initial = document.createElement('div');
      initial.className = 'eg-chip-initial';
      initial.textContent = (participant.displayName || participant.username || '?')[0].toUpperCase();
      chip.appendChild(initial);
    }

    const label = document.createElement('div');
    label.className = 'eg-chip-label';
    label.textContent = participant.displayName || participant.username || 'Artista';
    chip.appendChild(label);

    chip.addEventListener('click', () => {
      this.stopAutoplay();
      this.selectParticipant(index, true);
    });

    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.stopAutoplay();
        this.selectParticipant(index, true);
      }
    });

    return chip;
  }

  selectParticipant(index, animate = true) {
    if (this.transitioning && animate) return;

    this.currentIndex = ((index % this.participants.length) + this.participants.length) % this.participants.length;
    const p = this.participants[this.currentIndex];

    this.updateGridActive(this.currentIndex);
    this.renderStage(p, animate);
    this.scrollChipIntoView(this.currentIndex);
  }

  renderStage(participant, animate) {
    if (!this.stageEl) return;

    if (animate) {
      this.transitioning = true;
      this.stageEl.classList.add('leaving');
      setTimeout(() => {
        this.stageEl.classList.remove('leaving');
        this.transitioning = false;
        this.doRenderStage(participant);
      }, 250);
    } else {
      this.doRenderStage(participant);
    }
  }

  doRenderStage(participant) {
    const name = participant.displayName || participant.username || 'Artista';
    const username = participant.username || '';

    this.stageEl.innerHTML = `
      <div class="eg-stage-avatar" id="eg-stage-avatar">
        ${participant.avatar
          ? `<img src="${this.escHtml(participant.avatar)}" alt="${this.escHtml(name)}">`
          : `<span>${name[0].toUpperCase()}</span>`}
      </div>
      <div>
        <div class="eg-stage-name">${this.escHtml(name)}</div>
        ${username ? `<div class="eg-stage-username">@${this.escHtml(username)}</div>` : ''}
      </div>
      <div class="eg-stage-nav">
        <button class="eg-nav-btn" id="eg-prev-btn" aria-label="Anterior">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="eg-stage-counter">${this.currentIndex + 1} / ${this.participants.length}</span>
        <button class="eg-nav-btn" id="eg-next-btn" aria-label="Siguiente">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      ${username ? `<a href="profile.html?user=${this.escHtml(username)}" class="eg-profile-btn">
        <i class="fas fa-user"></i> Ver Perfil
      </a>` : ''}
    `;

    document.getElementById('eg-prev-btn').addEventListener('click', () => {
      this.stopAutoplay();
      this.selectParticipant(this.currentIndex - 1, true);
    });

    document.getElementById('eg-next-btn').addEventListener('click', () => {
      this.stopAutoplay();
      this.selectParticipant(this.currentIndex + 1, true);
    });
  }

  updateGridActive(activeIndex) {
    if (!this.gridEl) return;
    this.gridEl.querySelectorAll('.eg-chip').forEach((chip, i) => {
      chip.classList.toggle('active', i === activeIndex);
    });
  }

  scrollChipIntoView(index) {
    if (!this.gridEl) return;
    const chips = this.gridEl.querySelectorAll('.eg-chip');
    if (chips[index]) {
      chips[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  startAutoplay() {
    if (!this.autoplayEnabled) return;
    this.resetProgress();
    this.autoplayInterval = setInterval(() => {
      this.selectParticipant(this.currentIndex + 1, true);
      this.resetProgress();
    }, this.autoplayDuration);
  }

  stopAutoplay() {
    this.autoplayEnabled = false;
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
    if (this.progressBar) {
      this.progressBar.style.transition = 'none';
      this.progressBar.style.width = '0%';
    }
    if (this.autoplayBtn) {
      this.autoplayBtn.classList.remove('playing');
      this.autoplayBtn.innerHTML = '<i class="fas fa-play"></i> Auto';
    }
  }

  resumeAutoplay() {
    this.autoplayEnabled = true;
    if (this.autoplayBtn) {
      this.autoplayBtn.classList.add('playing');
      this.autoplayBtn.innerHTML = '<i class="fas fa-play"></i> Auto';
    }
    this.startAutoplay();
  }

  toggleAutoplay() {
    if (this.autoplayEnabled) {
      this.stopAutoplay();
    } else {
      this.resumeAutoplay();
    }
  }

  resetProgress() {
    if (!this.progressBar) return;
    this.progressBar.style.transition = 'none';
    this.progressBar.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.progressBar.style.transition = `width ${this.autoplayDuration}ms linear`;
        this.progressBar.style.width = '100%';
      });
    });
  }

  renderEmpty() {
    const loadingEl = document.getElementById('eg-loading');
    if (loadingEl) loadingEl.remove();
    const wrapper = document.getElementById('eg-wrapper');
    wrapper.innerHTML = `
      <div class="eg-loading">
        <i class="fas fa-users-slash text-4xl" style="color: #333;"></i>
        <div>Este evento no tiene participantes registrados</div>
        <a href="calendario.html" style="color: #00F5FF; font-size: 0.75rem; letter-spacing: 0.1em; text-decoration: none; margin-top: 0.5rem;">
          ← Volver al Calendario
        </a>
      </div>
    `;
  }

  renderError(message) {
    const loadingEl = document.getElementById('eg-loading');
    if (loadingEl) loadingEl.remove();
    const wrapper = document.getElementById('eg-wrapper');
    wrapper.innerHTML = `
      <div class="eg-loading">
        <i class="fas fa-exclamation-triangle text-4xl" style="color: #ff3b30;"></i>
        <div>${this.escHtml(message)}</div>
        <a href="calendario.html" style="color: #00F5FF; font-size: 0.75rem; letter-spacing: 0.1em; text-decoration: none; margin-top: 0.5rem;">
          ← Volver al Calendario
        </a>
      </div>
    `;
  }

  escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const gallery = new EventGallery();
  gallery.init();
});
