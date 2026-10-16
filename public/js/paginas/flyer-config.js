/* Configuración del sistema de partículas SÓLO para la página del flyer.
   Ojo: tiene que declararse ANTES de cargar js/p5-effect.js.

   - Los 'pines' pisan la config del servidor: el flyer se ve sin recuadro negro
     detrás de las letras y con una sombra suave para leer sobre las fotos,
     sin cambiar el aspecto del resto del sitio.
   - El flyer se DISEÑA sobre una pantalla de referencia de 1080x1920 (vertical):
     el reproductor escala posiciones, tamaños y tipografías a la pantalla real.
   - Si el link trae ?proyecto=<id>, se reproduce ese proyecto guardado (el que se
     edita en visualeffects.html) en lugar de la secuencia automática.
*/
window.FSC_PARTICLES_PIN = {
  CHAR_BG_ENABLED: false,
  CHAR_SHADOW: true,
  CHAR_SHADOW_COLOR: '#000000',
  CHAR_SHADOW_BLUR: 16,
  LETTER_SPACING: 3
};

window.FSC_VIEWPORT_BASE = [1080, 1920];

window.FSC_PROYECTO_ID = (function () {
  try {
    return new URLSearchParams(window.location.search).get('proyecto') || null;
  } catch (e) {
    return null;
  }
})();
