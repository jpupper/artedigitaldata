"""1) p5-effect.js: sombra opcional de la letra + 'pines' de config por página
   (window.FSC_PARTICLES_PIN) que sobreviven a la config del servidor.
2) flyer.html: carga js/paginas/flyer-config.js antes de p5-effect.js.
3) flyer-1.js: al cambiar de escena las palabras anteriores se BORRAN al instante
   (antes se desvanecían y quedaban encimadas con las nuevas)."""
import io, os

PUB = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public'
P_EFFECT = os.path.join(PUB, 'js', 'p5-effect.js')
P_HTML = os.path.join(PUB, 'flyer.html')
P_FLYER = os.path.join(PUB, 'js', 'paginas', 'flyer-1.js')
P_CFG = os.path.join(PUB, 'js', 'paginas', 'flyer-config.js')

# ─────────────────────────── 1) p5-effect.js ───────────────────────────────
s = io.open(P_EFFECT, encoding='utf-8', newline='').read()
cambios = []

# 1a) defaults nuevos
viejo = """    CHAR_BG_ENABLED: false,
    CHAR_BG_COLOR: '#000000',
    CHAR_BG_OPACITY: 0.8,"""
nuevo = """    CHAR_BG_ENABLED: false,
    CHAR_BG_COLOR: '#000000',
    CHAR_BG_OPACITY: 0.8,
    // Sombra de la letra (para leer sobre fotos sin recuadro de fondo)
    CHAR_SHADOW: false,
    CHAR_SHADOW_COLOR: '#000000',
    CHAR_SHADOW_BLUR: 14,"""
if viejo in s and 'CHAR_SHADOW' not in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('defaults CHAR_SHADOW')

# 1b) helper de pines + llamada en loadRemoteConfig
viejo = """  async function loadRemoteConfig() {"""
nuevo = """  /* Permite que UNA página fije valores por encima de la config del servidor:
     window.FSC_PARTICLES_PIN = { CHAR_BG_ENABLED: false } (se declara antes de
     cargar este script; sirve para páginas especiales como el flyer). */
  function aplicarPinesPagina() {
    const pin = window.FSC_PARTICLES_PIN;
    if (!pin || typeof pin !== 'object') return;
    CFG = { ...CFG, ...pin };
    if (CFG.TEXT_SIZE_MAX !== undefined) {
      CFG.TEXT_SIZE = Number(CFG.TEXT_SIZE_MAX);
    }
    updatePalette();
  }

  async function loadRemoteConfig() {"""
if viejo in s and 'aplicarPinesPagina' not in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('helper aplicarPinesPagina')

viejo = """          localStorage.setItem('particles_p5_config', JSON.stringify(CFG));
          updatePalette();
          if (typeof window.onParticlesConfigLoaded === 'function') {"""
nuevo = """          localStorage.setItem('particles_p5_config', JSON.stringify(CFG));
          updatePalette();
          aplicarPinesPagina();
          if (typeof window.onParticlesConfigLoaded === 'function') {"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('pines aplicados tras la config remota')

# 1c) pines también al set() manual
viejo = """      updatePalette();

      if (newConfig.CODE_ENTRY_DURATION !== undefined) {"""
nuevo = """      updatePalette();
      aplicarPinesPagina();

      if (newConfig.CODE_ENTRY_DURATION !== undefined) {"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('pines aplicados en ParticlesConfig.set')

# 1d) sombra en el display de WordParticle (el que dibuja las palabras del flyer)
viejo = """      const displayChar = (this.formationMode === 'CODE' && !this.isFormed && this.currentGlitchChar)
        ? this.currentGlitchChar
        : this.char;

      text(displayChar, 0, 0);
      pop();"""
nuevo = """      const displayChar = (this.formationMode === 'CODE' && !this.isFormed && this.currentGlitchChar)
        ? this.currentGlitchChar
        : this.char;

      // Sombra suave opcional: deja leer la letra sobre una foto sin recuadro negro
      const conSombra = Boolean(CFG.CHAR_SHADOW) && typeof drawingContext !== 'undefined' && drawingContext;
      if (conSombra) {
        drawingContext.shadowColor = CFG.CHAR_SHADOW_COLOR || '#000000';
        drawingContext.shadowBlur = Number(CFG.CHAR_SHADOW_BLUR) || 14;
      }
      text(displayChar, 0, 0);
      if (conSombra) {
        drawingContext.shadowBlur = 0;
      }
      pop();"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('sombra en WordParticle.display')

if cambios:
    io.open(P_EFFECT, 'w', encoding='utf-8', newline='').write(s)
print('p5-effect.js:', cambios)

# ─────────────────────── 2) archivo de config del flyer ────────────────────
cfg = """/* Configuración del sistema de partículas SÓLO para la página del flyer.
   Ojo: tiene que declararse ANTES de cargar js/p5-effect.js.
   Los 'pines' pisan la config del servidor, así el flyer puede verse distinto
   (sin recuadro negro detrás de las letras y con sombra para leer sobre la foto)
   sin cambiar el resto del sitio. */
window.FSC_PARTICLES_PIN = {
  CHAR_BG_ENABLED: false,
  CHAR_SHADOW: true,
  CHAR_SHADOW_COLOR: '#000000',
  CHAR_SHADOW_BLUR: 16,
  LETTER_SPACING: 3
};
"""
io.open(P_CFG, 'w', encoding='utf-8', newline='').write(cfg)
print('creado js/paginas/flyer-config.js')

# ───────────────────────── 3) flyer.html: linkearlo ───────────────────────
h = io.open(P_HTML, encoding='utf-8', newline='').read()
if 'flyer-config.js' not in h:
    for ancla in ["""  <script src="js/p5-effect.js?v=""", """  <script src="js/p5-effect.js">"""]:
        i = h.find(ancla)
        if i != -1:
            linea = '  <script src="js/paginas/flyer-config.js"></script>\r\n'
            h = h[:i] + linea + h[i:]
            io.open(P_HTML, 'w', encoding='utf-8', newline='').write(h)
            print('flyer.html: flyer-config.js antes de p5-effect.js ✓')
            break
    else:
        print('⚠️ no encontré el script de p5-effect en flyer.html')

# ─────────────────── 4) flyer-1.js: borrar al instante ────────────────────
f = io.open(P_FLYER, encoding='utf-8', newline='').read()
cambios2 = []

viejo = """  function limpiarPalabras() {
    if (typeof window.clearAllFlyerParticles === 'function') window.clearAllFlyerParticles();
  }"""
nuevo = """  /** Saca las palabras de la escena anterior. Se BORRAN al instante (no se
      desvanecen) porque si no quedan encimadas con las de la escena nueva. */
  function limpiarPalabras() {
    if (typeof window.removeFlyerWordParticles === 'function') {
      idsEscena.forEach(function (id) {
        try { window.removeFlyerWordParticles(id); } catch (e) { }
      });
    }
    idsEscena = [];
    if (typeof window.clearAllFlyerParticles === 'function') window.clearAllFlyerParticles();
  }"""
if viejo in f:
    f = f.replace(viejo, nuevo, 1); cambios2.append('limpiarPalabras borra al instante')

viejo = """  var escenas = [], totalMs = 0, datos = null;"""
nuevo = """  var escenas = [], totalMs = 0, datos = null, idsEscena = [];"""
if viejo in f:
    f = f.replace(viejo, nuevo, 1); cambios2.append('lista idsEscena')

viejo = """        try {
          window.spawnWordParticles(trozo.toUpperCase(), W * (w.x !== undefined ? w.x : 0.5), y,
            true, 'fly_' + (contadorPalabras++) + '_' + i, {"""
nuevo = """        var idPalabra = 'fly_' + (contadorPalabras++) + '_' + i;
        idsEscena.push(idPalabra);
        try {
          window.spawnWordParticles(trozo.toUpperCase(), W * (w.x !== undefined ? w.x : 0.5), y,
            true, idPalabra, {"""
if viejo in f:
    f = f.replace(viejo, nuevo, 1); cambios2.append('registro de ids por escena')

if cambios2:
    io.open(P_FLYER, 'w', encoding='utf-8', newline='').write(f)
print('flyer-1.js:', cambios2)
