"""p5-effect.js — el proyecto se diseña sobre una pantalla de referencia
(FSC_VIEWPORT_BASE o effect.viewportBase) y el reproductor escala posiciones,
tamaños y tipografías a la pantalla real. También soporta posiciones relativas
(rel: true → x,y son fracciones 0..1) y tamaño relativo de imagen (scale =
fracción de la altura de pantalla). Sin base declarada, no escala nada
(los proyectos viejos se siguen viendo igual)."""
import io

P = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public\js\p5-effect.js'
s = io.open(P, encoding='utf-8', newline='').read()
cambios = []

# ── 1) helper de factor de viewport (global) ─────────────────────────────
ancla = """  window.FSC_EVAL_IMAGENES = function (t, capasTimeline) {"""
nuevo = """  /** Factor de escala del proyecto: se diseña sobre FSC_VIEWPORT_BASE (ej. 1080x1920)
      y se ve igual en cualquier pantalla. Devuelve null si no hay base declarada. */
  window.FSC_FACTOR_VIEWPORT = function (base) {
    const b = base || window.FSC_VIEWPORT_BASE || null;
    if (!b || !b[0] || !b[1]) return null;
    const w = (typeof width !== 'undefined' && width) || window.innerWidth || b[0];
    const h = (typeof height !== 'undefined' && height) || window.innerHeight || b[1];
    return { sx: w / b[0], sy: h / b[1], s: Math.min(w / b[0], h / b[1]) };
  };

  window.FSC_EVAL_IMAGENES = function (t, capasTimeline) {"""
if ancla in s and 'FSC_FACTOR_VIEWPORT' not in s:
    s = s.replace(ancla, nuevo, 1); cambios.append('FSC_FACTOR_VIEWPORT')

# ── 2) imágenes: rel (fracciones) ────────────────────────────────────────
viejo = """      ['x', 'y', 'scale', 'rotation', 'alpha'].forEach(k => {
        if (activo[k] !== undefined) img[k] = Number(activo[k]);
      });

      const keys = (Array.isArray(activo.keyframes) ? activo.keyframes : [])"""
nuevo = """      const esRel = activo.rel === true || layerObj.rel === true;
      const ponProp = (destino, k, v) => {
        if (v === undefined || v === null || v === '') return;
        if (esRel && (k === 'x' || k === 'y')) {
          destino[k] = Number(v) * (k === 'x' ? ((typeof width !== 'undefined' && width) || 1080) : ((typeof height !== 'undefined' && height) || 1920));
        } else {
          destino[k] = Number(v);
        }
      };
      ['x', 'y', 'scale', 'rotation', 'alpha'].forEach(k => ponProp(img, k, activo[k]));

      const keys = (Array.isArray(activo.keyframes) ? activo.keyframes : [])"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('imágenes con posiciones relativas')

viejo = """      if (props) {
        ['x', 'y', 'scale', 'rotation', 'alpha'].forEach(k => {
          if (props[k] !== undefined) img[k] = Number(props[k]);
        });
      }"""
nuevo = """      if (props) {
        ['x', 'y', 'scale', 'rotation', 'alpha'].forEach(k => ponProp(img, k, props[k]));
      }"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('keyframes de imagen relativos')

# ── 3) imágenes: tamaño relativo (scale = fracción de la altura) ─────────
viejo = """      // ajuste 'cover': la imagen tapa toda la pantalla sin deformarse
      if (layer.ajuste === 'cover' && rawImg.naturalWidth) {
        if (!layer._fitCover) {
          layer._fitCover = Math.max((width || 1920) / rawImg.naturalWidth, (height || 1080) / rawImg.naturalHeight);
        }
        scale(layer._fitCover * (layer.scale !== undefined ? layer.scale : 1.0));
      } else {
        scale(layer.scale !== undefined ? layer.scale : 1.0);
      }"""
nuevo = """      // ajuste 'cover': la imagen tapa toda la pantalla sin deformarse
      if (layer.ajuste === 'cover' && rawImg.naturalWidth) {
        if (!layer._fitCover) {
          layer._fitCover = Math.max((width || 1920) / rawImg.naturalWidth, (height || 1080) / rawImg.naturalHeight);
        }
        scale(layer._fitCover * (layer.scale !== undefined ? layer.scale : 1.0));
      } else if (layer.rel && rawImg.naturalHeight) {
        // tamaño relativo: 'scale' = fracción de la altura de la pantalla
        scale(((height || 1920) * (layer.scale !== undefined ? layer.scale : 1.0)) / rawImg.naturalHeight);
      } else {
        scale(layer.scale !== undefined ? layer.scale : 1.0);
      }"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('imágenes con tamaño relativo')

# ── 4) palabras: escalar según el viewport del proyecto ──────────────────
viejo = """            function evaluateFrontTimeline(t) {
              timelineLayers.forEach(layerObj => {"""
nuevo = """            const fvProyecto = (typeof window.FSC_FACTOR_VIEWPORT === 'function')
              ? window.FSC_FACTOR_VIEWPORT(effect.viewportBase)
              : null;

            function evaluateFrontTimeline(t) {
              timelineLayers.forEach(layerObj => {"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('factor de viewport en la timeline')

viejo = """                  if (typeof window.updateFlyerWordParticles === 'function') {
                    window.updateFlyerWordParticles(clipObj.id, props);
                  }"""
nuevo = """                  // Escalar el diseño del proyecto a la pantalla real
                  if (fvProyecto) {
                    if (props.x !== undefined) props.x = props.x * fvProyecto.sx;
                    if (props.y !== undefined) props.y = props.y * fvProyecto.sy;
                    if (props.fontSize !== undefined) props.fontSize = Math.round(props.fontSize * fvProyecto.s);
                    if (props.letterSpacing !== undefined) props.letterSpacing = Math.max(1, Math.round(props.letterSpacing * fvProyecto.s));
                  }

                  if (typeof window.updateFlyerWordParticles === 'function') {
                    window.updateFlyerWordParticles(clipObj.id, props);
                  }"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('palabras escaladas al viewport')

viejo = """            window.spawnWordParticles(wordText, posX, posY, true, w.id, {
              fontSize: w.fontSize,
              letterSpacing: w.letterSpacing,"""
nuevo = """            window.spawnWordParticles(wordText, posX, posY, true, w.id, {
              fontSize: w.fontSize ? Math.round(w.fontSize * fvSpawn.s) : w.fontSize,
              letterSpacing: w.letterSpacing ? Math.max(1, Math.round(w.letterSpacing * fvSpawn.s)) : w.letterSpacing,"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('spawn escalado al viewport')

viejo = """          window.clearAllFlyerParticles();
          sequenceWords.forEach(w => {"""
nuevo = """          window.clearAllFlyerParticles();
          const fvSpawn = (typeof window.FSC_FACTOR_VIEWPORT === 'function')
            ? (window.FSC_FACTOR_VIEWPORT(effect.viewportBase) || { sx: 1, sy: 1, s: 1 })
            : { sx: 1, sy: 1, s: 1 };
          sequenceWords.forEach(w => {"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('factor para el spawn inicial')

if cambios:
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('p5-effect.js:', cambios)
