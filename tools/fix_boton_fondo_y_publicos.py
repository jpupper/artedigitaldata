"""Tres arreglos:
 1) El botón "Fondo animado" también en el modal de EDITAR OBRA (edit-logic.js).
 2) El flyer: sacar la rotación de las letras (spin) y usar la MISMA animación
    (code/fisics) que está configurada en visualeffects.
 3) Galería pública y Flyer visibles para TODOS en la página de la oportunidad
    (antes sólo los veían el creador y el admin).
"""
import io, os, re

PUB = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public'
cambios = []

# ── 1) modal de editar obra ───────────────────────────────────────────────
P = os.path.join(PUB, 'js', 'edit-logic.js')
s = io.open(P, encoding='utf-8', newline='').read()
viejo = """        ${renderFields(normalizedType, 'edit', item)}
"""
nuevo = """        ${renderFields(normalizedType, 'edit', item)}
        ${(normalizedType === 'post' && typeof window.fondoObraWidgetHtml === 'function') ? window.fondoObraWidgetHtml('edit', item) : ''}
"""
if 'fondoObraWidgetHtml' not in s and viejo in s:
    s = s.replace(viejo, nuevo, 1)
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
    cambios.append('edit-logic.js: widget de fondo en el modal de obra')
elif 'fondoObraWidgetHtml' in s:
    cambios.append('edit-logic.js: ya estaba')

# bump ?v= de edit-logic.js
p_html = os.path.join(PUB, 'profile.html')
h = io.open(p_html, encoding='utf-8', newline='').read()
h2 = re.sub(r'js/edit-logic\.js\?v=\d+', 'js/edit-logic.js?v=3', h)
if h2 != h:
    io.open(p_html, 'w', encoding='utf-8', newline='').write(h2)
    cambios.append('profile.html: edit-logic.js?v=3')

# ── 2) flyer: sin rotación, misma animación que visualeffects ─────────────
P2 = os.path.join(PUB, 'js', 'paginas', 'flyer-1.js')
f = io.open(P2, encoding='utf-8', newline='').read()
viejo = """              formationMode: w.modo || 'CODE',
              spin: true,          // letras entran girando y se acomodan
            });"""
nuevo = """              // Sin formación forzada ni giro: así las letras usan la MISMA
              // animación (CODE o FISICS) que esté configurada en visualeffects.
              formationMode: w.modo,
            });"""
if viejo in f:
    f = f.replace(viejo, nuevo, 1)
    io.open(P2, 'w', encoding='utf-8', newline='').write(f)
    cambios.append('flyer-1.js: sin rotación, misma animación que el editor')

# bump ?v= de flyer-1.js en flyer.html
P3 = os.path.join(PUB, 'flyer.html')
y = io.open(P3, encoding='utf-8', newline='').read()
y2 = y.replace('js/paginas/flyer-1.js"', 'js/paginas/flyer-1.js?v=2"')
if y2 != y:
    io.open(P3, 'w', encoding='utf-8', newline='').write(y2)
    cambios.append('flyer.html: flyer-1.js?v=2')

# ── 3) oportunidad: links públicos ───────────────────────────────────────
P4 = os.path.join(PUB, 'oportunidad.html')
o = io.open(P4, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in o else '\n'
galeria = """              <a id="btn-galeria-opo" href="#" target="_blank" rel="noopener" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all font-bold text-sm">
                <i class="fas fa-images"></i>
                <span>Ver galería pública</span>
              </a>"""
flyer = """              <a id="btn-flyer-opo" href="#" target="_blank" rel="noopener" class="flex items-center gap-2 px-4 py-2 rounded-xl border border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all font-bold text-sm">
                <i class="fas fa-film"></i>
                <span>Flyer animado</span>
              </a>"""
bloque = galeria + nl + flyer + nl
o2 = o.replace(bloque, '', 1).replace(bloque.replace(nl, '\n'), '', 1) if bloque in o else o
if o2 == o:
    o2 = o.replace(galeria.replace('\n', nl) + nl + flyer.replace('\n', nl) + nl, '', 1)
if o2 != o:
    # contenedor público, siempre visible, justo antes del contenedor de edición
    ancla = '<div id="opo-edit-btn-container" class="hidden flex flex-wrap gap-2">'
    publico = ('<div id="opo-publico-btn-container" class="flex flex-wrap gap-2 mb-4">' + nl
               + galeria.replace('\n', nl) + nl + flyer.replace('\n', nl) + nl
               + '</div>' + nl + '            ')
    if ancla in o2:
        o2 = o2.replace(ancla, publico + ancla, 1)
        o2 = o2.replace('class="hidden flex flex-wrap gap-2"', 'class="hidden flex flex-wrap gap-2"', 1)
        io.open(P4, 'w', encoding='utf-8', newline='').write(o2)
        cambios.append('oportunidad.html: links públicos fuera del bloque de edición')
    else:
        cambios.append('⚠️ oportunidad.html: no encontré el contenedor de edición')
else:
    cambios.append('⚠️ oportunidad.html: no pude mover los links')

P5 = os.path.join(PUB, 'js', 'paginas', 'oportunidad-1.js')
j = io.open(P5, encoding='utf-8', newline='').read()
viejo = """          if (esCreador || userIsAdmin) {
            document.getElementById('opo-edit-btn-container').classList.remove('hidden');
            document.getElementById('btn-edit-opo').href = `crear-oportunidad.html?id=${oportunidadId}`;
            { const bg = document.getElementById('btn-galeria-opo'); if (bg) bg.href = `galeria.html?id=${oportunidadId}`; }
            { const fl = document.getElementById('btn-flyer-opo'); if (fl) fl.href = `flyer.html?id=${oportunidadId}`; }"""
nuevo = """          // Galería pública y flyer: los ve CUALQUIERA (son páginas públicas)
          { const bg = document.getElementById('btn-galeria-opo'); if (bg) bg.href = `galeria.html?id=${oportunidadId}`; }
          { const fl = document.getElementById('btn-flyer-opo'); if (fl) fl.href = `flyer.html?id=${oportunidadId}`; }

          if (esCreador || userIsAdmin) {
            document.getElementById('opo-edit-btn-container').classList.remove('hidden');
            document.getElementById('btn-edit-opo').href = `crear-oportunidad.html?id=${oportunidadId}`;"""
if viejo in j:
    j = j.replace(viejo, nuevo, 1)
    io.open(P5, 'w', encoding='utf-8', newline='').write(j)
    cambios.append('oportunidad-1.js: links públicos para todos')
elif 'Galería pública y flyer: los ve CUALQUIERA' in j:
    cambios.append('oportunidad-1.js: ya estaba')
else:
    cambios.append('⚠️ oportunidad-1.js: no encontré el bloque')

# bump ?v= de oportunidad-1.js
o3 = io.open(P4, encoding='utf-8', newline='').read()
o4 = re.sub(r'js/paginas/oportunidad-1\.js\?v=\d+', 'js/paginas/oportunidad-1.js?v=3', o3)
if o4 != o3:
    io.open(P4, 'w', encoding='utf-8', newline='').write(o4)
    cambios.append('oportunidad.html: oportunidad-1.js?v=3')

print('\n'.join('· ' + c for c in cambios))
