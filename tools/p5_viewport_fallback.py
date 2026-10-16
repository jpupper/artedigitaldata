"""p5-effect: si el proyecto no trae viewportBase en la raíz, usar el que quedó
guardado en config.VIEWPORT_BASE (formato elegido en el importador del editor)."""
import io

P = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public\js\p5-effect.js'
s = io.open(P, encoding='utf-8', newline='').read()
cambios = []

viejo = """            const fvProyecto = (typeof window.FSC_FACTOR_VIEWPORT === 'function')
              ? window.FSC_FACTOR_VIEWPORT(effect.viewportBase)
              : null;"""
nuevo = """            const baseProyecto = effect.viewportBase
              || (effect.config && effect.config.VIEWPORT_BASE)
              || null;
            const fvProyecto = (typeof window.FSC_FACTOR_VIEWPORT === 'function')
              ? window.FSC_FACTOR_VIEWPORT(baseProyecto)
              : null;"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('base del proyecto desde config.VIEWPORT_BASE (timeline)')

viejo = """          const fvSpawn = (typeof window.FSC_FACTOR_VIEWPORT === 'function')
            ? (window.FSC_FACTOR_VIEWPORT(effect.viewportBase) || { sx: 1, sy: 1, s: 1 })
            : { sx: 1, sy: 1, s: 1 };"""
nuevo = """          const baseSpawn = effect.viewportBase
            || (effect.config && effect.config.VIEWPORT_BASE)
            || null;
          const fvSpawn = (typeof window.FSC_FACTOR_VIEWPORT === 'function')
            ? (window.FSC_FACTOR_VIEWPORT(baseSpawn) || { sx: 1, sy: 1, s: 1 })
            : { sx: 1, sy: 1, s: 1 };"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('base del proyecto desde config.VIEWPORT_BASE (spawn)')

if cambios:
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('p5-effect.js:', cambios if cambios else 'ya estaba')
