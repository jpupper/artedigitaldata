"""p5-effect.js — soporte de proyectos guardados con IMÁGENES en la timeline:
 1) El reproductor puede abrir un proyecto por id (?proyecto=<id> o FSC_PROYECTO_ID),
    no sólo la secuencia 'default-front'.
 2) Al abrir un proyecto carga sus IMAGE_LAYERS en window.activeImageLayers (antes
    no se cargaban: las imágenes nunca aparecían en el reproductor).
 3) window.FSC_EVAL_IMAGENES(t, capas): ventana visible + keyframes de las imágenes
    sobre la timeline; se llama en el loop de la timeline.
 4) Soporte de ajuste 'cover' (la imagen tapa toda la pantalla sin deformarse)."""
import io, os

P = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public\js\p5-effect.js'
s = io.open(P, encoding='utf-8', newline='').read()
cambios = []

# ── 1) proyecto por id + no salir en páginas de flyer si hay proyecto ──────
viejo = """  async function initDefaultFrontVisualEffect() {
    if (window.location.pathname.includes('visualeffects.html') || window.location.pathname.includes('outputeffect.html') || window.location.pathname.includes('outputeffect') || esPaginaFlyer()) return;"""
nuevo = """  async function initDefaultFrontVisualEffect() {
    // Un proyecto puntual (flyer) se puede pedir con ?proyecto=<id> o FSC_PROYECTO_ID
    const idProyecto = window.FSC_PROYECTO_ID ||
      new URLSearchParams(window.location.search).get('proyecto');
    if (window.location.pathname.includes('visualeffects.html') || window.location.pathname.includes('outputeffect.html') || window.location.pathname.includes('outputeffect')) return;
    if (esPaginaFlyer() && !idProyecto) return;"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('lee ?proyecto= / FSC_PROYECTO_ID')

viejo = """          const res = await fetch(`${cleanBase}/visualeffects/default-front`);"""
nuevo = """          const res = await fetch(`${cleanBase}/visualeffects/` + (idProyecto ? encodeURIComponent(idProyecto) : 'default-front'));"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('pide el proyecto pedido')

viejo = """              if (data && (data.isDefaultFront || data._id)) {
                effect = data;
                break;
              }"""
nuevo = """              if (data && (data.isDefaultFront || data._id || Array.isArray(data.timelineLayers))) {
                effect = data;
                break;
              }"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('acepta proyectos por id')

viejo = """      if (!effect || !effect.isDefaultFront) return;

      console.log('[Front VisualEffect] Cargando secuencia default:', effect.title);"""
nuevo = """      if (!effect) return;
      if (!idProyecto && !effect.isDefaultFront) return;

      console.log('[Front VisualEffect] Cargando secuencia:', effect.title);"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('no exige isDefaultFront si hay proyecto')

# ── 2) cargar las imágenes del proyecto ───────────────────────────────────
viejo = """      // 1. Aplicar la configuración guardada (colores, shader, modos, etc.)
      if (effect.config && typeof effect.config === 'object') {
        if (window.ParticlesConfig && typeof window.ParticlesConfig.set === 'function') {
          window.ParticlesConfig.set(effect.config);
        }"""
nuevo = """      // 1. Aplicar la configuración guardada (colores, shader, modos, etc.)
      if (effect.config && typeof effect.config === 'object') {
        if (window.ParticlesConfig && typeof window.ParticlesConfig.set === 'function') {
          window.ParticlesConfig.set(effect.config);
        }
        // Capas de IMAGEN del proyecto: antes no se cargaban y por eso las fotos
        // de un proyecto guardado no aparecían nunca en el reproductor.
        if (Array.isArray(effect.config.IMAGE_LAYERS)) {
          window.activeImageLayers = effect.config.IMAGE_LAYERS.map(img => ({ ...img, visible: true }));
        }"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('carga IMAGE_LAYERS del proyecto')

# ── 3) evaluador de imágenes en la timeline (global) ──────────────────────
viejo = """  /** Avanza las capas de IMAGEN según la timeline"""
if viejo not in s:
    ancla = """  function drawActiveImageLayers() {"""
    nuevo = """  /** Avanza las capas de IMAGEN según la timeline: cada capa puede tener clips
      con startTime/duration (cuándo se ve) y keyframes (x, y, scale, rotation,
      alpha) que se interpolan. Lo usan el reproductor y la página del flyer.
      También aplica el ajuste 'cover' (la imagen tapa la pantalla sin deformar). */
  window.FSC_EVAL_IMAGENES = function (t, capasTimeline) {
    if (!Array.isArray(capasTimeline) || !capasTimeline.length) return;
    const imgs = window.activeImageLayers || [];
    if (!imgs.length) return;

    const numero = v => (v === undefined || v === null || v === '') ? undefined : Number(v);
    const mezcla = (a, b, f, k) => {
      const va = numero(a[k]), vb = numero(b[k]);
      if (va === undefined && vb === undefined) return undefined;
      if (va === undefined) return vb;
      if (vb === undefined) return va;
      return va + (vb - va) * f;
    };

    capasTimeline.forEach(layerObj => {
      const clips = Array.isArray(layerObj.clips) ? layerObj.clips : [];
      const esImagen = layerObj.type === 'image' || clips.some(c => c && c.imageId);
      if (!esImagen) return;

      const imgId = layerObj.imageId || (clips[0] && clips[0].imageId);
      const img = imgs.find(i => i.id === imgId || i.id === layerObj.id);
      if (!img) return;

      const activo = clips.find(c => {
        const ini = Number(c.startTime) || 0;
        const dur = Number(c.duration) || 2;
        return t >= ini && t <= ini + dur;
      });

      if (!activo) { img.visible = false; return; }
      img.visible = true;

      ['x', 'y', 'scale', 'rotation', 'alpha'].forEach(k => {
        if (activo[k] !== undefined) img[k] = Number(activo[k]);
      });

      const keys = (Array.isArray(activo.keyframes) ? activo.keyframes : [])
        .filter(k => k && k.time !== undefined)
        .sort((a, b) => a.time - b.time);
      if (!keys.length) return;

      let props = null;
      if (t <= keys[0].time) {
        props = keys[0];
      } else if (t >= keys[keys.length - 1].time) {
        props = keys[keys.length - 1];
      } else {
        for (let i = 0; i < keys.length - 1; i++) {
          if (t >= keys[i].time && t <= keys[i + 1].time) {
            const f = (t - keys[i].time) / ((keys[i + 1].time - keys[i].time) || 1);
            props = {};
            ['x', 'y', 'scale', 'rotation', 'alpha'].forEach(k => {
              const v = mezcla(keys[i], keys[i + 1], f, k);
              if (v !== undefined) props[k] = v;
            });
            break;
          }
        }
      }
      if (props) {
        ['x', 'y', 'scale', 'rotation', 'alpha'].forEach(k => {
          if (props[k] !== undefined) img[k] = Number(props[k]);
        });
      }
    });
  };

  function drawActiveImageLayers() {"""
    if ancla in s:
        s = s.replace(ancla, nuevo, 1); cambios.append('FSC_EVAL_IMAGENES (imágenes en la timeline)')

# ── 4) llamarlo en el loop de la timeline ────────────────────────────────
viejo = """              frontTimelineTime = (frontTimelineTime + delta) % timelineDuration;
              evaluateFrontTimeline(frontTimelineTime);"""
nuevo = """              frontTimelineTime = (frontTimelineTime + delta) % timelineDuration;
              evaluateFrontTimeline(frontTimelineTime);
              if (typeof window.FSC_EVAL_IMAGENES === 'function') {
                window.FSC_EVAL_IMAGENES(frontTimelineTime, timelineLayers);
              }"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append('evalúa imágenes en el loop')

# ── 5) ajuste 'cover' al dibujar ─────────────────────────────────────────
viejo = """      push();
      const posX = layer.x !== undefined ? layer.x : (width ? width / 2 : 960);
      const posY = layer.y !== undefined ? layer.y : (height ? height / 2 : 540);
      translate(posX, posY);
      rotate(radians(layer.rotation || 0));
      scale(layer.scale !== undefined ? layer.scale : 1.0);"""
nuevo = """      push();
      const posX = layer.x !== undefined ? layer.x : (width ? width / 2 : 960);
      const posY = layer.y !== undefined ? layer.y : (height ? height / 2 : 540);
      translate(posX, posY);
      rotate(radians(layer.rotation || 0));

      // ajuste 'cover': la imagen tapa toda la pantalla sin deformarse
      if (layer.ajuste === 'cover' && rawImg.naturalWidth) {
        if (!layer._fitCover) {
          layer._fitCover = Math.max((width || 1920) / rawImg.naturalWidth, (height || 1080) / rawImg.naturalHeight);
        }
        scale(layer._fitCover * (layer.scale !== undefined ? layer.scale : 1.0));
      } else {
        scale(layer.scale !== undefined ? layer.scale : 1.0);
      }"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1); cambios.append("ajuste 'cover'")

if cambios:
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('p5-effect.js:', cambios)
