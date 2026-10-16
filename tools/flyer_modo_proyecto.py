"""Modo 'proyecto guardado' en el flyer: el link puede traer ?proyecto=<id> y en
ese caso reproduce el proyecto editable (palabras + imágenes con su timeline)
usando el motor de p5-effect, en lugar de la secuencia automática."""
import io, os

PUB = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public'
P_CFG = os.path.join(PUB, 'js', 'paginas', 'flyer-config.js')
P_FLYER = os.path.join(PUB, 'js', 'paginas', 'flyer-1.js')

# ── flyer-config.js ───────────────────────────────────────────────────────
cfg = """/* Configuración del sistema de partículas SÓLO para la página del flyer.
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
"""
io.open(P_CFG, 'w', encoding='utf-8', newline='').write(cfg)
print('flyer-config.js: pines + viewport + proyecto ✓')

# ── flyer-1.js ────────────────────────────────────────────────────────────
f = io.open(P_FLYER, encoding='utf-8', newline='').read()
cambios = []

viejo = """  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');"""
nuevo = """  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
  var idProyecto = params.get('proyecto') || window.FSC_PROYECTO_ID || null;"""
if viejo in f:
    f = f.replace(viejo, nuevo, 1); cambios.append('lee ?proyecto=')

viejo = """  function reiniciar() {
    t = 0;"""
nuevo = """  function reiniciar() {
    if (idProyecto) return;          // en modo proyecto manda la timeline del editor
    t = 0;"""
if viejo in f:
    f = f.replace(viejo, nuevo, 1); cambios.append('reiniciar no pisa el proyecto')

viejo = """  function limpiarPalabras() {"""
nuevo = """  function limpiarPalabras() {
    if (idProyecto) return;"""
if viejo in f:
    f = f.replace(viejo, nuevo, 1); cambios.append('limpiarPalabras no pisa el proyecto')

# modo proyecto + arranque
viejo = """  configurarParticulas();
  // El reloj empieza recién cuando p5 está listo (si no, las palabras no salen)
  (function esperarP5(intento) {
    if (p5Listo() || (intento || 0) > 120) { requestAnimationFrame(frame); return; }
    setTimeout(function () { esperarP5((intento || 0) + 1); }, 200);
  })(0);"""
nuevo = """  /** Modo proyecto guardado: lo reproduce el motor de p5-effect (lee
      /visualeffects/<id>, arma las palabras y anima imágenes + palabras con la
      timeline). Acá sólo queda la interfaz de grabación. */
  function modoProyecto() {
    $('#fly-titulo').textContent = 'Flyer (proyecto guardado)';
    $('#fly-meta').textContent = 'Se reproduce solo con la timeline del editor · grabá cuando arranque';
    elEstado.classList.add('ui-hidden');
    elBarra.classList.remove('ui-hidden');
    var pct = 0;
    setInterval(function () {                     // barra de progreso orientativa
      pct = (pct + 0.4) % 100;
      if (elBarraFill) elBarraFill.style.width = pct.toFixed(1) + '%';
    }, 500);
  }

  configurarParticulas();
  if (idProyecto) {
    modoProyecto();
  } else {
    // El reloj empieza recién cuando p5 está listo (si no, las palabras no salen)
    (function esperarP5(intento) {
      if (p5Listo() || (intento || 0) > 120) { requestAnimationFrame(frame); return; }
      setTimeout(function () { esperarP5((intento || 0) + 1); }, 200);
    })(0);
  }"""
if viejo in f:
    f = f.replace(viejo, nuevo, 1); cambios.append('modo proyecto + arranque')

if cambios:
    io.open(P_FLYER, 'w', encoding='utf-8', newline='').write(f)
print('flyer-1.js:', cambios)
