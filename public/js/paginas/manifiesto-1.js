// TOC mobile toggle
    function openToc() {
      document.getElementById('toc-sidebar').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeToc() {
      document.getElementById('toc-sidebar').classList.remove('open');
      document.body.style.overflow = '';
    }

    // Back to top button
    window.addEventListener('scroll', () => {
      const btn = document.getElementById('back-to-top');
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    });

    // Active TOC link highlight on scroll
    const sections = document.querySelectorAll('.manifesto-section[id], #individuo-sociedad, #caso-concreto, #postura-ideologica, #nfts-blockchain, #relacion-comunidades, #introduccion, #politica-personas, #reglas-whatsapp, #politica-instituciones, #politica-universidades, #politica-partidos, #politica-marcas, #politica-trabajo-corpo');
    // Actually just use the section elements and the sub-divs that have IDs
    const allAnchorTargets = document.querySelectorAll('[id]');
    const tocLinks = document.querySelectorAll('.toc-link');

    function updateActiveToc() {
      let current = '';
      allAnchorTargets.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < 200) {
          current = el.getAttribute('id');
        }
      });

      tocLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === '#' + current) {
          link.classList.add('active');
        }
      });
    }

    window.addEventListener('scroll', updateActiveToc);
    updateActiveToc();
