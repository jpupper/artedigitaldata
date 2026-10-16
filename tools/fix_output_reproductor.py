"""SOLO OUTPUT: la página usaba el camino de la timeline del editor (no dibujaba
nada: pantalla negra). Ahora usa el MISMO reproductor que flyer.html, que ya está
verificado con proyectos con imágenes (palabras + fotos + timeline).

1) outputeffect.html carga un JS chico que declara el proyecto del link.
2) p5-effect.js deja reproducir en la página de output cuando hay proyecto.
3) particulas.js no carga el efecto por su cuenta en esa página (evita pelea).
"""
import io, os

PROJ = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
PUB = PROJ + r'\public'
cambios = []

# ── 1) JS de la página de output ──────────────────────────────────────────
js = """/* Página SOLO OUTPUT: reproduce el proyecto del link con el reproductor del
   sistema (el mismo que usa flyer.html), que entiende palabras + imágenes +
   timeline y respeta el formato (viewportBase) guardado.

   - ?outputeffect=<id>  → reproduce ese proyecto
   - ?id=<id>            → igual
   El motor NO debe cargar el efecto por su cuenta (ver FSC_OUTPUT_PLAYER). */
(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('outputeffect') || params.get('id');

    // Le avisa a js/particulas.js que el reproductor del sistema ya se ocupa
    window.FSC_OUTPUT_PLAYER = true;

    if (id) {
      window.FSC_PROYECTO_ID = id;
    }
  } catch (e) { }
})();
"""
io.open(PUB + r'\js\paginas\output-proyecto.js', 'w', encoding='utf-8', newline='').write(js)
cambios.append('js/paginas/output-proyecto.js (nuevo)')

# ── 2) linkearlo antes de p5-effect.js ───────────────────────────────────
P_HTML = PUB + r'\outputeffect.html'
h = io.open(P_HTML, encoding='utf-8', newline='').read()
if 'output-proyecto.js' not in h:
    ancla = '<script src="js/p5-effect.js'
    i = h.find(ancla)
    if i != -1:
        nl = '\r\n' if '\r\n' in h else '\n'
        h = h[:i] + '  <script src="js/paginas/output-proyecto.js"></script>' + nl + h[i:]
        io.open(P_HTML, 'w', encoding='utf-8', newline='').write(h)
        cambios.append('outputeffect.html: carga output-proyecto.js')

# ── 3) p5-effect.js: permitir reproducir en la página de output ──────────
P_E = PUB + r'\js\p5-effect.js'
s = io.open(P_E, encoding='utf-8', newline='').read()
viejo = """    if (window.location.pathname.includes('visualeffects.html') || window.location.pathname.includes('outputeffect.html') || window.location.pathname.includes('outputeffect')) return;
    if (esPaginaFlyer() && !idProyecto) return;"""
nuevo = """    if (window.location.pathname.includes('visualeffects.html')) return;
    const esPaginaOutput = window.location.pathname.includes('outputeffect.html') ||
                           window.location.pathname.includes('outputeffect');
    // En la página de SOLO OUTPUT ahora reproduce el mismo reproductor de proyectos
    if (esPaginaOutput && !idProyecto) return;
    if (esPaginaFlyer() && !idProyecto) return;"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1)
    io.open(P_E, 'w', encoding='utf-8', newline='').write(s)
    cambios.append('p5-effect.js: el reproductor corre en la página de output')

# ── 4) particulas.js: no cargar el efecto si el reproductor se ocupa ─────
P_P = PUB + r'\js\particulas.js'
r = io.open(P_P, encoding='utf-8', newline='').read()
viejo = """    const paramId = new URLSearchParams(window.location.search).get('outputeffect') || new URLSearchParams(window.location.search).get('id');
    if (paramId) {
      loadUserVisualEffect(paramId);
    }"""
nuevo = """    const paramId = new URLSearchParams(window.location.search).get('outputeffect') || new URLSearchParams(window.location.search).get('id');
    if (paramId && !window.FSC_OUTPUT_PLAYER) {
      loadUserVisualEffect(paramId);
    }"""
if viejo in r:
    r = r.replace(viejo, nuevo, 1)
    io.open(P_P, 'w', encoding='utf-8', newline='').write(r)
    cambios.append('particulas.js: no pelea por cargar el efecto')

print('\n'.join('· ' + c for c in cambios) if cambios else '· sin cambios')
