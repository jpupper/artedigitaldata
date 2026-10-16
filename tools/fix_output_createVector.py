"""Arregla SOLO OUTPUT (outputeffect.html?outputeffect=<id>): las palabras no se
dibujaban porque se pedían partículas ANTES de que p5 publicara sus globales
('createVector is not defined').

1) p5-effect.js: si p5 todavía no arrancó, spawnWordParticles y
   updateFlyerWordParticles se reintentan solos (antes reventaban).
2) particulas.js: en la página de output, esperar a que p5 esté listo antes de
   cargar el efecto."""
import io

PROJ = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
PUB = PROJ + r'\public'
cambios = []

# ── 1) p5-effect.js ───────────────────────────────────────────────────────
P = PUB + r'\js\p5-effect.js'
s = io.open(P, encoding='utf-8', newline='').read()

if 'p5ListoParaParticulas' not in s:
    ancla = """  function _p5Shim(name, fallback) {"""
    nuevo = """  /** p5 publica sus globales (createVector, width, ...) recién cuando arranca el
      sketch. Si alguien pide partículas antes, reintentamos en vez de romper con
      "createVector is not defined" (pasaba en la página de SOLO OUTPUT). */
  function p5ListoParaParticulas() {
    return typeof window.createVector === 'function';
  }
  function reintentarCuandoP5(fn, intento) {
    intento = intento || 0;
    if (intento > 30) return;
    setTimeout(function () { fn(intento + 1); }, 200);
  }

  function _p5Shim(name, fallback) {"""
    if ancla in s:
        s = s.replace(ancla, nuevo, 1); cambios.append('helper p5ListoParaParticulas')

    viejo = """  function spawnWordParticles(word, targetCenterX, targetCenterY, isFlyer = false, flyerId = null, wordConfig = {}) {
    if (!word || typeof word !== 'string') return;"""
    nuevo = """  function spawnWordParticles(word, targetCenterX, targetCenterY, isFlyer = false, flyerId = null, wordConfig = {}) {
    if (!word || typeof word !== 'string') return;
    if (!p5ListoParaParticulas()) {
      reintentarCuandoP5(function () {
        spawnWordParticles(word, targetCenterX, targetCenterY, isFlyer, flyerId, wordConfig);
      });
      return;
    }"""
    if viejo in s:
        s = s.replace(viejo, nuevo, 1); cambios.append('spawnWordParticles se reintenta')

    viejo = """  function updateFlyerWordParticles(flyerId, newProps = {}) {
    if (!flyerId) return;"""
    nuevo = """  function updateFlyerWordParticles(flyerId, newProps = {}) {
    if (!flyerId) return;
    if (!p5ListoParaParticulas()) {
      reintentarCuandoP5(function () { updateFlyerWordParticles(flyerId, newProps); });
      return;
    }"""
    if viejo in s:
        s = s.replace(viejo, nuevo, 1); cambios.append('updateFlyerWordParticles se reintenta')

    if cambios:
        io.open(P, 'w', encoding='utf-8', newline='').write(s)

# ── 2) particulas.js: esperar a p5 en la página de output ────────────────
P2 = PUB + r'\js\particulas.js'
r = io.open(P2, encoding='utf-8', newline='').read()
viejo = """    const paramId = new URLSearchParams(window.location.search).get('outputeffect') || new URLSearchParams(window.location.search).get('id');
    if (paramId) {
      loadUserVisualEffect(paramId);
    }"""
nuevo = """    const paramId = new URLSearchParams(window.location.search).get('outputeffect') || new URLSearchParams(window.location.search).get('id');
    if (paramId) {
      // Esperar a que p5 publique sus globales: si no, las palabras revientan
      const cargarCuandoP5 = (intento) => {
        if (typeof window.createVector === 'function' || (intento || 0) > 80) {
          loadUserVisualEffect(paramId);
          return;
        }
        setTimeout(() => cargarCuandoP5((intento || 0) + 1), 150);
      };
      cargarCuandoP5(0);
    }"""
if viejo in r:
    r = r.replace(viejo, nuevo, 1); cambios.append('particulas.js: el output espera a p5')
    io.open(P2, 'w', encoding='utf-8', newline='').write(r)

print('\n'.join('· ' + c for c in cambios) if cambios else '· sin cambios')
