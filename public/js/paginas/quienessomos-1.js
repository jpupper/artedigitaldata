// --- Obras Slideshow ---
    let slideshowInterval;
    let currentSlide = 0;
    let obrasSlides = [];

    document.addEventListener('DOMContentLoaded', async () => {
      await loadObrasSlideshow();
    });

    async function loadObrasSlideshow() {
      const container = document.getElementById('obras-slideshow');
      try {
        const res = await fetch(CONFIG.API_URL + '/posts');
        const posts = await res.json();
        // Solo posts con imagen para el slideshow
        const obras = posts.filter(p => p.imageUrl);

        if (!obras.length) {
          container.innerHTML = `
            <div class="w-full h-full flex items-center justify-center">
              <div class="text-center text-gray-500">
                <i class="fas fa-image text-5xl text-cyan-400/20 mb-3"></i>
                <p>Aun no hay obras en la comunidad. ¡Se la primera en publicar!</p>
                <a href="/create.html" class="inline-block mt-3 text-cyan-400 hover:underline text-sm font-bold">
                  <i class="fas fa-plus-circle mr-1"></i>Publicar obra
                </a>
              </div>
            </div>`;
          return;
        }

        obrasSlides = obras;
        buildSlideshow(container, obras);
        startAutoSlide();
      } catch (err) {
        console.error('Error loading obras:', err);
        container.innerHTML = `
          <div class="w-full h-full flex items-center justify-center">
            <div class="text-center text-red-400">
              <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
              <p>Error cargando obras</p>
            </div>
          </div>`;
      }
    }

    function buildSlideshow(container, obras) {
      const slidesHTML = obras.map((obra, i) => `
        <div class="slideshow-slide">
          <a href="/post.html?id=${obra._id}" class="block w-full h-full relative">
            <img src="${sanitizeUrl(obra.imageUrl)}" alt="${escapeAttr(obra.title)}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
              <h3 class="text-white font-bold text-lg md:text-xl">${escapeHTML(obra.title)}</h3>
              <p class="text-gray-300 text-sm">por ${escapeHTML(obra.author?.username || 'Anonimo')}</p>
            </div>
          </a>
        </div>
      `).join('');

      container.innerHTML = `
        <div class="slideshow-track" id="slideshow-track">
          ${slidesHTML}
        </div>
        <button class="slide-arrow prev" onclick="prevSlide()">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button class="slide-arrow next" onclick="nextSlide()">
          <i class="fas fa-chevron-right"></i>
        </button>
        <div class="slide-dots" id="slide-dots">
          ${obras.map((_, i) => `<div class="slide-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></div>`).join('')}
        </div>
      `;
    }

    function goToSlide(index) {
      currentSlide = index;
      const track = document.getElementById('slideshow-track');
      if (track) track.style.transform = `translateX(-${index * 100}%)`;

      const dots = document.querySelectorAll('.slide-dot');
      dots.forEach((d, i) => d.classList.toggle('active', i === index));

      resetAutoSlide();
    }

    function nextSlide() {
      const next = (currentSlide + 1) % obrasSlides.length;
      goToSlide(next);
    }

    function prevSlide() {
      const prev = (currentSlide - 1 + obrasSlides.length) % obrasSlides.length;
      goToSlide(prev);
    }

    function startAutoSlide() {
      slideshowInterval = setInterval(nextSlide, 4000);
    }

    function resetAutoSlide() {
      clearInterval(slideshowInterval);
      startAutoSlide();
    }

    // Helpers
    function escapeHTML(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function escapeAttr(str) {
      if (!str) return '';
      return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
