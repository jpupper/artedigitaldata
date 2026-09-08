// Redirección y compatibilidad para p5-global.js
// Carga p5-effect.js que contiene el motor reactivo con sincronización local y remota.
(function() {
  if (!window.ParticlesConfig) {
    const script = document.createElement('script');
    script.src = 'js/p5-effect.js';
    document.head.appendChild(script);
  }
})();
