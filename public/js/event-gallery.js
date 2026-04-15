/**
 * EventGallery - Sistema de galería tipo flyer para participantes de eventos
 * Muestra participantes uno por uno con foto, nombre y bio en formato publicitario
 */

class EventGallery {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.participants = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.interval = null;
    
    // Configuración
    this.options = {
      autoPlay: options.autoPlay !== false,
      interval: options.interval || 4000,
      showControls: options.showControls !== false,
      showIndicators: options.showIndicators !== false,
      transitionEffect: options.transitionEffect || 'slide',
      ...options
    };
    
    this.init();
  }
  
  init() {
    if (!this.container) return;
    this.render();
    this.attachEvents();
  }
  
  setParticipants(participants) {
    this.participants = participants.filter(p => p && (p.avatar || p.username));
    this.currentIndex = 0;
    this.renderSlide();
    this.updateIndicators();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="event-gallery relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-black/80 to-black/40 backdrop-blur-xl border border-white/10">
        <!-- Slides Container -->
        <div class="event-gallery-slides relative aspect-[4/5] sm:aspect-[16/9] md:aspect-[2/1]">
          ${this.renderSlides()}
        </div>
        
        ${this.options.showControls ? this.renderControls() : ''}
        ${this.options.showIndicators ? this.renderIndicators() : ''}
        
        <!-- Progress Bar -->
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div class="event-gallery-progress h-full bg-gradient-to-r from-magenta-500 to-cyan-500 w-0 transition-all duration-300"></div>
        </div>
      </div>
    `;
    
    this.slidesContainer = this.container.querySelector('.event-gallery-slides');
    this.progressBar = this.container.querySelector('.event-gallery-progress');
  }
  
  renderSlides() {
    if (this.participants.length === 0) {
      return `
        <div class="absolute inset-0 flex items-center justify-center text-gray-500">
          <div class="text-center">
            <i class="fas fa-users text-4xl mb-4 opacity-50"></i>
            <p class="text-sm">No hay participantes para mostrar</p>
          </div>
        </div>
      `;
    }
    
    return this.participants.map((p, index) => this.renderSlide(p, index)).join('');
  }
  
  renderSlide(participant, index) {
    const isActive = index === this.currentIndex;
    const avatar = participant.avatar || '/img/default-avatar.png';
    const name = participant.displayName || participant.username || 'Artista';
    const bio = participant.bio || participant.description || '';
    const role = participant.role || 'Participante';
    
    return `
      <div class="event-gallery-slide absolute inset-0 transition-all duration-700 ease-out ${isActive ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-full z-0'}"
           data-index="${index}">
        
        <!-- Background Image with Blur -->
        <div class="absolute inset-0">
          <img src="${avatar}" alt="" 
               class="w-full h-full object-cover opacity-30 scale-110 blur-xl"
               onerror="this.style.display='none'">
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        </div>
        
        <!-- Content -->
        <div class="relative z-10 h-full flex flex-col md:flex-row items-center justify-center p-6 sm:p-8 md:p-12 gap-6 md:gap-12">
          
          <!-- Avatar Section -->
          <div class="flex-shrink-0">
            <div class="relative">
              <!-- Glow Effect -->
              <div class="absolute -inset-2 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-full opacity-50 blur-lg animate-pulse"></div>
              
              <!-- Avatar Image -->
              <div class="relative w-32 h-32 sm:w-40 sm:h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                <img src="${avatar}" alt="${name}" 
                     class="w-full h-full object-cover"
                     onerror="this.src='/img/default-avatar.png'">
              </div>
              
              <!-- Role Badge -->
              <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-magenta-500/80 to-cyan-500/80 rounded-full text-xs font-bold text-white whitespace-nowrap backdrop-blur-sm">
                ${role}
              </div>
            </div>
          </div>
          
          <!-- Info Section -->
          <div class="flex-1 text-center md:text-left max-w-lg">
            <h3 class="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-2 sm:mb-4 tracking-tight">
              ${name}
            </h3>
            
            ${participant.username ? `
              <p class="text-magenta-400 text-sm sm:text-base font-medium mb-4">
                @${participant.username}
              </p>
            ` : ''}
            
            ${bio ? `
              <p class="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed line-clamp-4 md:line-clamp-6">
                ${bio}
              </p>
            ` : `
              <p class="text-gray-500 text-sm italic">
                Artista participante en este evento
              </p>
            `}
            
            <!-- Social Links if available -->
            ${this.renderSocialLinks(participant)}
          </div>
        </div>
        
        <!-- Decorative Elements -->
        <div class="absolute top-4 left-4 w-20 h-20 border-l-2 border-t-2 border-magenta-500/30 rounded-tl-3xl"></div>
        <div class="absolute bottom-4 right-4 w-20 h-20 border-r-2 border-b-2 border-cyan-500/30 rounded-br-3xl"></div>
      </div>
    `;
  }
  
  renderSocialLinks(participant) {
    const links = [];
    if (participant.instagram) links.push({ icon: 'fab fa-instagram', url: `https://instagram.com/${participant.instagram}`, color: 'text-pink-500' });
    if (participant.twitter) links.push({ icon: 'fab fa-twitter', url: `https://twitter.com/${participant.twitter}`, color: 'text-blue-400' });
    if (participant.website) links.push({ icon: 'fas fa-globe', url: participant.website, color: 'text-cyan-400' });
    
    if (links.length === 0) return '';
    
    return `
      <div class="flex items-center justify-center md:justify-start gap-4 mt-6">
        ${links.map(link => `
          <a href="${link.url}" target="_blank" rel="noopener noreferrer" 
             class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all ${link.color}">
            <i class="${link.icon}"></i>
          </a>
        `).join('')}
      </div>
    `;
  }
  
  renderControls() {
    return `
      <!-- Navigation Controls -->
      <button class="event-gallery-prev absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-20 group">
        <i class="fas fa-chevron-left group-hover:-translate-x-1 transition-transform"></i>
      </button>
      
      <button class="event-gallery-next absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-20 group">
        <i class="fas fa-chevron-right group-hover:translate-x-1 transition-transform"></i>
      </button>
      
      <!-- Play/Pause Button -->
      <button class="event-gallery-play absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-20">
        <i class="fas fa-pause event-gallery-pause-icon"></i>
        <i class="fas fa-play event-gallery-play-icon hidden"></i>
      </button>
    `;
  }
  
  renderIndicators() {
    return `
      <!-- Indicators -->
      <div class="event-gallery-indicators absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        ${this.participants.map((_, index) => `
          <button class="event-gallery-indicator w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${index === this.currentIndex ? 'bg-magenta-500 w-6 sm:w-8' : 'bg-white/30 hover:bg-white/50'}"
                  data-index="${index}"></button>
        `).join('')}
      </div>
    `;
  }
  
  renderSlide() {
    if (!this.slidesContainer) return;
    
    const slides = this.slidesContainer.querySelectorAll('.event-gallery-slide');
    slides.forEach((slide, index) => {
      if (index === this.currentIndex) {
        slide.classList.remove('opacity-0', 'translate-x-full', '-translate-x-full', 'z-0');
        slide.classList.add('opacity-100', 'translate-x-0', 'z-10');
      } else if (index < this.currentIndex) {
        slide.classList.remove('opacity-100', 'translate-x-0', 'z-10');
        slide.classList.add('opacity-0', '-translate-x-full', 'z-0');
      } else {
        slide.classList.remove('opacity-100', 'translate-x-0', 'z-10', '-translate-x-full');
        slide.classList.add('opacity-0', 'translate-x-full', 'z-0');
      }
    });
    
    this.updateIndicators();
    this.updateProgress();
  }
  
  updateIndicators() {
    if (!this.options.showIndicators) return;
    
    const indicators = this.container.querySelectorAll('.event-gallery-indicator');
    indicators.forEach((indicator, index) => {
      if (index === this.currentIndex) {
        indicator.classList.remove('bg-white/30', 'hover:bg-white/50');
        indicator.classList.add('bg-magenta-500', 'w-6', 'sm:w-8');
      } else {
        indicator.classList.remove('bg-magenta-500', 'w-6', 'sm:w-8');
        indicator.classList.add('bg-white/30', 'hover:bg-white/50');
      }
    });
  }
  
  updateProgress() {
    if (!this.progressBar) return;
    
    if (this.isPlaying && this.participants.length > 0) {
      this.progressBar.style.width = '0%';
      this.progressBar.style.transition = 'none';
      
      setTimeout(() => {
        this.progressBar.style.transition = `width ${this.options.interval}ms linear`;
        this.progressBar.style.width = '100%';
      }, 50);
    } else {
      this.progressBar.style.width = '0%';
      this.progressBar.style.transition = 'none';
    }
  }
  
  attachEvents() {
    // Previous button
    const prevBtn = this.container.querySelector('.event-gallery-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prev());
    }
    
    // Next button
    const nextBtn = this.container.querySelector('.event-gallery-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.next());
    }
    
    // Play/Pause button
    const playBtn = this.container.querySelector('.event-gallery-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlay());
    }
    
    // Indicators
    const indicators = this.container.querySelectorAll('.event-gallery-indicator');
    indicators.forEach(indicator => {
      indicator.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.goTo(index);
      });
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.container.contains(document.activeElement)) return;
      
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
      if (e.key === ' ') {
        e.preventDefault();
        this.togglePlay();
      }
    });
    
    // Touch/Swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    
    this.container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    this.container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe(touchStartX, touchEndX);
    }, { passive: true });
    
    // Auto-start if enabled
    if (this.options.autoPlay && this.participants.length > 1) {
      this.play();
    }
  }
  
  handleSwipe(startX, endX) {
    const diff = startX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        this.next();
      } else {
        this.prev();
      }
    }
  }
  
  next() {
    if (this.participants.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.participants.length;
    this.renderSlide();
    this.resetTimer();
  }
  
  prev() {
    if (this.participants.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.participants.length) % this.participants.length;
    this.renderSlide();
    this.resetTimer();
  }
  
  goTo(index) {
    if (index < 0 || index >= this.participants.length) return;
    this.currentIndex = index;
    this.renderSlide();
    this.resetTimer();
  }
  
  play() {
    this.isPlaying = true;
    this.updatePlayButton();
    this.interval = setInterval(() => this.next(), this.options.interval);
    this.updateProgress();
  }
  
  pause() {
    this.isPlaying = false;
    this.updatePlayButton();
    clearInterval(this.interval);
    this.updateProgress();
  }
  
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  updatePlayButton() {
    const pauseIcon = this.container.querySelector('.event-gallery-pause-icon');
    const playIcon = this.container.querySelector('.event-gallery-play-icon');
    
    if (pauseIcon && playIcon) {
      if (this.isPlaying) {
        pauseIcon.classList.remove('hidden');
        playIcon.classList.add('hidden');
      } else {
        pauseIcon.classList.add('hidden');
        playIcon.classList.remove('hidden');
      }
    }
  }
  
  resetTimer() {
    if (this.isPlaying) {
      clearInterval(this.interval);
      this.interval = setInterval(() => this.next(), this.options.interval);
      this.updateProgress();
    }
  }
  
  destroy() {
    clearInterval(this.interval);
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for global use
window.EventGallery = EventGallery;
