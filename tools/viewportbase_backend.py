"""Guarda también viewportBase (el 'formato' del flyer: [1080,1920] vertical,
[1920,1080] pantalla, etc.) en el modelo y las rutas de efectos."""
import io

PROJ = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
cambios = []

# ── modelo ────────────────────────────────────────────────────────────────
P = PROJ + r'\src\models\VisualEffect.ts'
s = io.open(P, encoding='utf-8', newline='').read()
if 'viewportBase' not in s:
    s = s.replace("""  hasTimeline?: boolean;""",
                  """  hasTimeline?: boolean;
  /** Formato de diseño del flyer: [ancho, alto] de la pantalla de referencia. */
  viewportBase?: number[];""", 1)
    s = s.replace("""    hasTimeline: { type: Boolean, default: false },""",
                  """    hasTimeline: { type: Boolean, default: false },
    viewportBase: { type: [Number], default: undefined },""", 1)
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
    cambios.append('modelo: campo viewportBase')

# ── rutas ─────────────────────────────────────────────────────────────────
P2 = PROJ + r'\src\routes\visualeffects.ts'
r = io.open(P2, encoding='utf-8', newline='').read()
if 'viewportBase' not in r:
    r = r.replace("""    const { title, flyerWords, timelineLayers, timelineDuration, hasTimeline, config } = req.body;""",
                  """    const { title, flyerWords, timelineLayers, timelineDuration, hasTimeline, config, viewportBase } = req.body;""")
    r = r.replace("""      timelineLayers: timelineLayers || [],""",
                  """      timelineLayers: timelineLayers || [],
      viewportBase: Array.isArray(viewportBase) && viewportBase.length === 2 ? viewportBase.map(Number) : undefined,""", 1)
    r = r.replace("""    if (timelineLayers !== undefined) updateFields.timelineLayers = timelineLayers;""",
                  """    if (timelineLayers !== undefined) updateFields.timelineLayers = timelineLayers;
    if (Array.isArray(viewportBase) && viewportBase.length === 2) updateFields.viewportBase = viewportBase.map(Number);""", 1)
    io.open(P2, 'w', encoding='utf-8', newline='').write(r)
    cambios.append('rutas: viewportBase en POST y PUT')

print('\n'.join('· ' + c for c in cambios) if cambios else '· ya estaba')
print('viewportBase en modelo:', 'viewportBase' in io.open(P, encoding='utf-8').read())
print('viewportBase en rutas :', io.open(P2, encoding='utf-8').read().count('viewportBase'))
