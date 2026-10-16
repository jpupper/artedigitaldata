"""Arreglos (2ª pasada, línea por línea para respetar CRLF):
 1) edit-logic.js: widget "Fondo animado" en el modal de editar obra.
 3) oportunidad: links de galería y flyer públicos (fuera del bloque de edición).
"""
import io, os

PUB = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public'

# ── 1) edit-logic.js ──────────────────────────────────────────────────────
P = os.path.join(PUB, 'js', 'edit-logic.js')
lineas = io.open(P, encoding='utf-8', newline='').read().split('\n')
if not any('fondoObraWidgetHtml' in l for l in lineas):
    for k, l in enumerate(lineas):
        if '${renderFields(normalizedType' in l:
            sangria = l[:len(l) - len(l.lstrip())]
            widget = sangria + "${(normalizedType === 'post' && typeof window.fondoObraWidgetHtml === 'function') ? window.fondoObraWidgetHtml('edit', item) : ''}"
            lineas.insert(k + 1, widget)
            io.open(P, 'w', encoding='utf-8', newline='').write('\n'.join(lineas))
            print('· edit-logic.js: widget de fondo agregado al modal de obra (línea %d)' % (k + 2))
            break
    else:
        print('⚠️ edit-logic.js: no encontré renderFields')
else:
    print('· edit-logic.js: ya tenía el widget')

# ── 3) oportunidad.html: links públicos ──────────────────────────────────
P2 = os.path.join(PUB, 'oportunidad.html')
ls = io.open(P2, encoding='utf-8', newline='').read().split('\n')
if not any('opo-publico-btn-container' in l for l in ls):
    i_gal = next((k for k, l in enumerate(ls) if 'id="btn-galeria-opo"' in l), None)
    i_fly = next((k for k, l in enumerate(ls) if 'id="btn-flyer-opo"' in l), None)
    if i_gal is not None and i_fly is not None:
        i_fin = next((k for k in range(i_fly, len(ls)) if '</a>' in ls[k]), None)
        bloque = ls[i_gal:i_fin + 1]
        del ls[i_gal:i_fin + 1]
        i_edit = next(k for k, l in enumerate(ls) if 'opo-edit-btn-container' in l)
        publico = ['            <div id="opo-publico-btn-container" class="flex flex-wrap gap-2 mb-4">'] + bloque + ['            </div>']
        ls[i_edit:i_edit] = publico
        io.open(P2, 'w', encoding='utf-8', newline='').write('\n'.join(ls))
        print('· oportunidad.html: los 2 links quedaron en un contenedor público (líneas %d-%d)' % (i_edit, i_edit + len(publico)))
    else:
        print('⚠️ oportunidad.html: no encontré los links')
else:
    print('· oportunidad.html: ya estaba')

# ── 3b) oportunidad-1.js: que se llenen para todos ───────────────────────
P3 = os.path.join(PUB, 'js', 'paginas', 'oportunidad-1.js')
ls2 = io.open(P3, encoding='utf-8', newline='').read().split('\n')
if not any('los ve CUALQUIERA' in l for l in ls2):
    i_if = next((k for k, l in enumerate(ls2) if 'if (esCreador || userIsAdmin) {' in l and 'opo-edit-btn-container' in ls2[k + 1]), None)
    if i_if is not None:
        # saco las dos líneas de hrefs de adentro del if y las pongo antes
        i_bg = next((k for k, l in enumerate(ls2) if k > i_if and 'btn-galeria-opo' in l), None)
        i_fl = next((k for k, l in enumerate(ls2) if k > i_if and 'btn-flyer-opo' in l), None)
        if i_bg is not None and i_fl is not None:
            lineas_bg = [ls2[i_bg], ls2[i_fl]]
            for k in sorted([i_bg, i_fl], reverse=True):
                del ls2[k]
            i_if2 = next(k for k, l in enumerate(ls2) if 'if (esCreador || userIsAdmin) {' in l and 'opo-edit-btn-container' in ls2[k + 1])
            sangria = ls2[i_if2][:len(ls2[i_if2]) - len(ls2[i_if2].lstrip())]
            cabecera = [sangria + '// Galería pública y flyer: los ve CUALQUIERA (son páginas públicas)'] + lineas_bg + ['']
            ls2[i_if2:i_if2] = cabecera
            io.open(P3, 'w', encoding='utf-8', newline='').write('\n'.join(ls2))
            print('· oportunidad-1.js: hrefs públicos movidos fuera del if (línea %d)' % (i_if2 + 1))
        else:
            print('⚠️ oportunidad-1.js: no encontré los hrefs')
    else:
        print('⚠️ oportunidad-1.js: no encontré el if de edición')
else:
    print('· oportunidad-1.js: ya estaba')
