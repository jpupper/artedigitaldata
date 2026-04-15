/**
 * Event Gallery — Character Select (Mortal Kombat Style)
 * Slide 0: Event flyer. Slides 1-N: participants with bio.
 */

class EventGallery {
  constructor() {
    this.evento = null;
    this.slides = [];       // [{ type: 'event' | 'participant', data: ... }]
    this.currentIndex = 0;
    this.autoplayEnabled = true;
    this.autoplayInterval = null;
    this.autoplayDuration = 5000;
    this.transitioning = false;

    this.stageEl = null;
    this.gridEl = null;
    this.progressBar = null;
    this.autoplayBtn = null;
  }

  async init() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (!eventId) { this.renderError('No se proporcionó un ID de evento.'); return; }
    await this.loadEvent(eventId);
  }

  async loadEvent(eventId) {
    try {
      const res = await fetch(CONFIG.API_URL + '/eventos/' + eventId);
      if (!res.ok) throw new Error('Evento no encontrado');
      this.evento = await res.json();

      document.title = 'Galería: ' + this.evento.title + ' — Arte Digital Data';

      const participants = (this.evento.participants || []).filter(p => p && (p.username || p._id));

      // Build slides: event first, then participants
      this.slides = [{ type: 'event', data: this.evento }];
      participants.forEach(p => this.slides.push({ type: 'participant', data: p }));

      this.renderLayout();
      this.selectSlide(0, false);
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

    // Header — event title only, no subtitle
    const header = document.createElement('header');
    header.className = 'eg-header';
    header.innerHTML = '<div class="eg-event-title">' + this.escHtml(this.evento.title) + '</div>';
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
    backBtn.href = 'evento.html?id=' + this.evento._id;
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

    // Grid
    const gridSection = document.createElement('section');
    gridSection.className = 'eg-grid-section';

    const totalParticipants = this.slides.filter(s => s.type === 'participant').length;
    const gridTitle = document.createElement('div');
    gridTitle.className = 'eg-grid-title';
    gridTitle.textContent = totalParticipants + ' Participante' + (totalParticipants !== 1 ? 's' : '');
    gridSection.appendChild(gridTitle);

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'eg-grid';
    this.gridEl.id = 'eg-grid';

    this.slides.forEach((slide, i) => {
      this.gridEl.appendChild(this.buildChip(slide, i));
    });

    gridSection.appendChild(this.gridEl);
    wrapper.appendChild(gridSection);

    // Progress bar
    const pbWrap = document.createElement('div');
    pbWrap.className = 'eg-progress-bar-wrap';
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'eg-progress-bar';
    pbWrap.appendChild(this.progressBar);
    document.body.appendChild(pbWrap);
  }

  buildChip(slide, index) {
    const chip = document.createElement('div');
    chip.className = 'eg-chip';
    chip.dataset.index = index;
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');

    const indicator = document.createElement('div');
    indicator.className = 'eg-chip-active-indicator';
    chip.appendChild(indicator);

    if (slide.type === 'event') {
      // Event flyer chip
      if (slide.data.imageUrl) {
        const img = document.createElement('img');
        img.src = slide.data.imageUrl;
        img.alt = slide.data.title;
        img.className = 'eg-chip-avatar';
        img.loading = 'lazy';
        chip.appendChild(img);
      } else {
        const ico = document.createElement('div');
        ico.className = 'eg-chip-initial';
        ico.innerHTML = '<i class="fas fa-calendar-alt" style="font-size:1.6rem;color:#FF00E0"></i>';
        chip.appendChild(ico);
      }
      const label = document.createElement('div');
      label.className = 'eg-chip-label';
      label.textContent = 'EVENTO';
      chip.appendChild(label);
      chip.setAttribute('aria-label', 'Flyer del evento');
    } else {
      // Participant chip
      const p = slide.data;
      const name = p.displayName || p.username || 'Artista';
      chip.setAttribute('aria-label', name);

      if (p.avatar) {
        const img = document.createElement('img');
        img.src = p.avatar;
        img.alt = name;
        img.className = 'eg-chip-avatar';
        img.loading = 'lazy';
        chip.appendChild(img);
      } else {
        const initial = document.createElement('div');
        initial.className = 'eg-chip-initial';
        initial.textContent = name[0].toUpperCase();
        chip.appendChild(initial);
      }
      const label = document.createElement('div');
      label.className = 'eg-chip-label';
      label.textContent = name;
      chip.appendChild(label);
    }

    chip.addEventListener('click', () => {
      this.stopAutoplay();
      this.selectSlide(index, true);
    });
    chip.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.stopAutoplay();
        this.selectSlide(index, true);
      }
    });

    return chip;
  }

  selectSlide(index, animate) {
    if (this.transitioning && animate) return;
    this.currentIndex = ((index % this.slides.length) + this.slides.length) % this.slides.length;
    this.updateGridActive(this.currentIndex);
    this.renderStage(this.slides[this.currentIndex], animate);
    this.scrollChipIntoView(this.currentIndex);
  }

  renderStage(slide, animate) {
    if (!this.stageEl) return;
    if (animate) {
      this.transitioning = true;
      this.stageEl.classList.add('leaving');
      setTimeout(() => {
        this.stageEl.classList.remove('leaving');
        this.transitioning = false;
        this.doRenderStage(slide);
      }, 250);
    } else {
      this.doRenderStage(slide);
    }
  }

  doRenderStage(slide) {
    if (slide.type === 'event') {
      this.doRenderEventSlide(slide.data);
    } else {
      this.doRenderParticipantSlide(slide.data);
    }
  }

  doRenderEventSlide(ev) {
    const date = ev.date ? new Date(ev.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const location = ev.location || '';

    const avatarHtml = ev.imageUrl
      ? '<img src="' + this.escHtml(ev.imageUrl) + '" alt="' + this.escHtml(ev.title) + '" style="width:100%;height:100%;object-fit:cover;">'
      : '<i class="fas fa-calendar-alt" style="font-size:3rem;color:#FF00E0"></i>';

    const navHtml = this.buildNavHtml();

    this.stageEl.innerHTML =
      '<div class="eg-stage-avatar eg-stage-avatar--event">' + avatarHtml + '</div>'
      + '<div class="eg-stage-info">'
      +   '<div class="eg-stage-name">' + this.escHtml(ev.title) + '</div>'
      +   (date ? '<div class="eg-stage-username"><i class="fas fa-calendar mr-1"></i>' + date + '</div>' : '')
      +   (location ? '<div class="eg-stage-username" style="margin-top:4px"><i class="fas fa-map-marker-alt mr-1"></i>' + this.escHtml(location) + '</div>' : '')
      + '</div>'
      + navHtml;

    this.attachNavListeners();
  }

  doRenderParticipantSlide(p) {
    const name = p.displayName || p.username || 'Artista';
    const username = p.username || '';
    const bio = p.bio || '';

    const avatarHtml = p.avatar
      ? '<img src="' + this.escHtml(p.avatar) + '" alt="' + this.escHtml(name) + '" style="width:100%;height:100%;object-fit:cover;">'
      : '<span>' + name[0].toUpperCase() + '</span>';

    const socialsHtml = this.buildSocialsHtml(p.socials);
    const navHtml = this.buildNavHtml();

    this.stageEl.innerHTML =
      '<div class="eg-stage-avatar">' + avatarHtml + '</div>'
      + '<div class="eg-stage-info">'
      +   '<div class="eg-stage-name">' + this.escHtml(name) + '</div>'
      +   (username ? '<div class="eg-stage-username">@' + this.escHtml(username) + '</div>' : '')
      +   (bio ? '<p class="eg-stage-bio">' + this.escHtml(bio) + '</p>' : '')
      +   (socialsHtml ? '<div class="eg-stage-socials">' + socialsHtml + '</div>' : '')
      +   (username ? '<a href="profile.html?user=' + this.escHtml(username) + '" class="eg-profile-btn"><i class="fas fa-user"></i> Ver Perfil</a>' : '')
      + '</div>'
      + navHtml;

    this.attachNavListeners();
  }

  buildNavHtml() {
    return '<div class="eg-stage-nav">'
      + '<button class="eg-nav-btn" id="eg-prev-btn" aria-label="Anterior"><i class="fas fa-chevron-left"></i></button>'
      + '<span class="eg-stage-counter">' + (this.currentIndex + 1) + ' / ' + this.slides.length + '</span>'
      + '<button class="eg-nav-btn" id="eg-next-btn" aria-label="Siguiente"><i class="fas fa-chevron-right"></i></button>'
      + '</div>';
  }

  attachNavListeners() {
    const prev = document.getElementById('eg-prev-btn');
    const next = document.getElementById('eg-next-btn');
    if (prev) prev.addEventListener('click', () => { this.stopAutoplay(); this.selectSlide(this.currentIndex - 1, true); });
    if (next) next.addEventListener('click', () => { this.stopAutoplay(); this.selectSlide(this.currentIndex + 1, true); });
  }

  buildSocialsHtml(socials) {
    if (!socials) return '';
    const links = [];
    if (socials.instagram) links.push('<a href="https://instagram.com/' + this.escHtml(socials.instagram) + '" target="_blank" class="eg-social-btn"><i class="fab fa-instagram"></i></a>');
    if (socials.facebook)  links.push('<a href="' + this.escHtml(socials.facebook) + '" target="_blank" class="eg-social-btn"><i class="fab fa-facebook"></i></a>');
    if (socials.whatsapp)  links.push('<a href="https://wa.me/' + this.escHtml(socials.whatsapp) + '" target="_blank" class="eg-social-btn"><i class="fab fa-whatsapp"></i></a>');
    return links.join('');
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
    if (chips[index]) chips[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  startAutoplay() {
    if (!this.autoplayEnabled) return;
    this.resetProgress();
    this.autoplayInterval = setInterval(() => {
      this.selectSlide(this.currentIndex + 1, true);
      this.resetProgress();
    }, this.autoplayDuration);
  }

  stopAutoplay() {
    this.autoplayEnabled = false;
    clearInterval(this.autoplayInterval);
    this.autoplayInterval = null;
    if (this.progressBar) { this.progressBar.style.transition = 'none'; this.progressBar.style.width = '0%'; }
    if (this.autoplayBtn) { this.autoplayBtn.classList.remove('playing'); this.autoplayBtn.innerHTML = '<i class="fas fa-play"></i> Auto'; }
  }

  resumeAutoplay() {
    this.autoplayEnabled = true;
    if (this.autoplayBtn) { this.autoplayBtn.classList.add('playing'); this.autoplayBtn.innerHTML = '<i class="fas fa-play"></i> Auto'; }
    this.startAutoplay();
  }

  toggleAutoplay() {
    if (this.autoplayEnabled) { this.stopAutoplay(); } else { this.resumeAutoplay(); }
  }

  resetProgress() {
    if (!this.progressBar) return;
    this.progressBar.style.transition = 'none';
    this.progressBar.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.progressBar.style.transition = 'width ' + this.autoplayDuration + 'ms linear';
        this.progressBar.style.width = '100%';
      });
    });
  }

  renderEmpty() {
    const loadingEl = document.getElementById('eg-loading');
    if (loadingEl) loadingEl.remove();
    document.getElementById('eg-wrapper').innerHTML =
      '<div class="eg-loading"><i class="fas fa-users-slash" style="font-size:2.5rem;color:#333;"></i>'
      + '<div>Este evento no tiene participantes registrados</div>'
      + '<a href="calendario.html" style="color:#00F5FF;font-size:.75rem;letter-spacing:.1em;text-decoration:none;margin-top:.5rem;">← Volver al Calendario</a></div>';
  }

  renderError(message) {
    const loadingEl = document.getElementById('eg-loading');
    if (loadingEl) loadingEl.remove();
    document.getElementById('eg-wrapper').innerHTML =
      '<div class="eg-loading"><i class="fas fa-exclamation-triangle" style="font-size:2.5rem;color:#ff3b30;"></i>'
      + '<div>' + this.escHtml(message) + '</div>'
      + '<a href="calendario.html" style="color:#00F5FF;font-size:.75rem;letter-spacing:.1em;text-decoration:none;margin-top:.5rem;">← Volver al Calendario</a></div>';
  }

  escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const gallery = new EventGallery();
  gallery.init();
});
