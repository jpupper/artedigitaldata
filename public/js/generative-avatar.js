// Generative Avatar — Arte Digital Data
// Genera un mini sistema generativo en espiral (SVG) único y determinístico por usuario,
// para reemplazar la "letra vacía" de quienes no subieron foto de perfil.
//
// API pública:
//   window.GenerativeAvatar.svg(seed)                  -> markup SVG
//   window.GenerativeAvatar.dataUri(seed)              -> data:image/svg+xml
//   window.GenerativeAvatar.markup(user, opts)         -> <img> (usa user.avatar si existe)
//   window.GenerativeAvatar.render(el, user, opts)     -> inyecta el avatar dentro de un elemento
//   window.generativeAvatarUri(seed)                   -> atajo de dataUri
(function (window) {
  const cache = new Map();
  const SIZE = 128;

  function hashSeed(value) {
    const str = String(value || 'artedigitaldata');
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // Mezcla final para que semillas parecidas ("ana"/"anb") den resultados distintos
    h ^= h >>> 15;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Paleta derivada de la semilla: esquema analógico, complementario o triádico
  function buildPalette(rnd) {
    const baseHue = Math.floor(rnd() * 360);
    const spread = 25 + Math.floor(rnd() * 40);
    const scheme = Math.floor(rnd() * 3);
    const offset = scheme === 0 ? spread : scheme === 1 ? 180 : 120;
    const sat = 68 + Math.floor(rnd() * 28);
    const light = 54 + Math.floor(rnd() * 16);

    const h1 = baseHue;
    const h2 = (baseHue + offset) % 360;
    const h3 = (baseHue + 360 - spread) % 360;

    return {
      hue: baseHue,
      primary: 'hsl(' + h1 + ' ' + sat + '% ' + light + '%)',
      secondary: 'hsl(' + h2 + ' ' + Math.max(45, sat - 10) + '% ' + Math.max(45, light - 8) + '%)',
      accent: 'hsl(' + h3 + ' ' + Math.min(98, sat + 8) + '% ' + Math.min(74, light + 10) + '%)',
      bgCenter: 'hsl(' + h1 + ' ' + Math.round(sat * 0.7) + '% 22%)',
      bgOuter: 'hsl(' + ((h1 + 200) % 360) + ' 45% 5%)'
    };
  }

  function buildSvg(seed) {
    const rnd = mulberry32(hashSeed(seed));
    const pal = buildPalette(rnd);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const maxRadius = SIZE * 0.42;

    const arms = 2 + Math.floor(rnd() * 3);              // 2 a 4 brazos
    const turns = 2.1 + rnd() * 2.4;                     // vueltas de la espiral
    const growth = 0.5 + rnd() * 0.55;                   // exponente: espiral más abierta o más cerrada
    const waveAmp = 0.025 + rnd() * 0.11;                // "onda": modulación radial
    const waveFreq = 1 + Math.floor(rnd() * 4);
    const phase = rnd() * Math.PI * 2;
    const spinDuration = (14 + rnd() * 22).toFixed(1);
    const spinDir = rnd() < 0.5 ? 1 : -1;
    const steps = 38 + Math.floor(rnd() * 22);
    const strokeWidth = (SIZE * (0.035 + rnd() * 0.03)).toFixed(2);
    const gradId = 'ga' + hashSeed(seed).toString(36);

    const paths = [];
    const sparkles = [];

    for (let a = 0; a < arms; a++) {
      const armAngle = (a / arms) * Math.PI * 2 + phase;
      const points = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const radius = maxRadius * Math.pow(t, growth);
        const angle = armAngle + t * turns * Math.PI * 2 + waveAmp * Math.sin(t * waveFreq * Math.PI * 2);
        points.push([
          cx + Math.cos(angle) * radius,
          cy + Math.sin(angle) * radius
        ]);
      }

      const d = points
        .map(function (p, idx) { return (idx ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); })
        .join(' ');

      paths.push(
        '<path d="' + d + '" fill="none" stroke="' + (a % 2 === 0 ? pal.primary : pal.secondary) +
        '" stroke-width="' + strokeWidth + '" stroke-linecap="round" opacity="0.92"/>'
      );

      // Puntos/pixelado que siguen la espiral y se agrandan hacia afuera
      for (let i = 3; i <= steps; i += 3) {
        const p = points[i];
        const ratio = i / steps;
        const r = (SIZE * 0.008) + ratio * (SIZE * 0.026);
        sparkles.push(
          '<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="' + r.toFixed(2) +
          '" fill="' + pal.accent + '" opacity="' + (0.35 + ratio * 0.55).toFixed(2) + '"/>'
        );
      }
    }

    // Núcleo brillante
    const coreR = (SIZE * (0.045 + rnd() * 0.03)).toFixed(2);
    const core = '<circle cx="' + cx + '" cy="' + cy + '" r="' + coreR + '" fill="' + pal.accent + '" opacity="0.9"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (Number(coreR) * 2.4).toFixed(2) + '" fill="' + pal.accent + '" opacity="0.18"/>';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SIZE + ' ' + SIZE + '" width="' + SIZE + '" height="' + SIZE + '" role="img">' +
      '<defs>' +
        '<radialGradient id="' + gradId + 'bg" cx="50%" cy="46%" r="68%">' +
          '<stop offset="0%" stop-color="' + pal.bgCenter + '" stop-opacity="0.95"/>' +
          '<stop offset="65%" stop-color="' + pal.bgOuter + '" stop-opacity="1"/>' +
          '<stop offset="100%" stop-color="#04050a" stop-opacity="1"/>' +
        '</radialGradient>' +
        '<linearGradient id="' + gradId + 'stroke" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" stop-color="' + pal.primary + '"/>' +
          '<stop offset="100%" stop-color="' + pal.secondary + '"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<rect width="' + SIZE + '" height="' + SIZE + '" fill="url(#' + gradId + 'bg)"/>' +
      '<g>' +
        '<animateTransform attributeName="transform" attributeType="XML" type="rotate" ' +
          'from="0 ' + cx + ' ' + cy + '" to="' + (spinDir * 360) + ' ' + cx + ' ' + cy + '" ' +
          'dur="' + spinDuration + 's" repeatCount="indefinite"/>' +
        paths.join('') +
        sparkles.join('') +
      '</g>' +
      core +
      '</svg>';
  }

  function svg(seed) {
    return buildSvg(seed);
  }

  function dataUri(seed) {
    const key = String(seed || 'artedigitaldata');
    if (cache.has(key)) return cache.get(key);
    const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(buildSvg(key));
    cache.set(key, uri);
    return uri;
  }

  function seedOf(user) {
    if (!user) return 'artedigitaldata';
    if (typeof user === 'string') return user;
    return user.username || user.displayName || user.label || user.name || user._id || user.id || 'artedigitaldata';
  }

  function escapeAttr(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Devuelve el markup del avatar: foto si existe, si no el espiral generativo
  function markup(user, options) {
    const opts = options || {};
    const className = opts.className || 'w-full h-full object-cover';
    const seed = opts.seed || seedOf(user);
    const label = escapeAttr(opts.alt || seedOf(user));
    const avatarUrl = user && typeof user === 'object' ? user.avatar : null;

    if (avatarUrl) {
      const src = (typeof window.sanitizeUrl === 'function') ? window.sanitizeUrl(avatarUrl) : avatarUrl;
      const fallback = dataUri(seed);
      return '<img src="' + escapeAttr(src) + '" alt="' + label + '" class="' + className +
        '" onerror="this.onerror=null;this.src=\'' + fallback + '\'">';
    }

    return '<img src="' + dataUri(seed) + '" alt="' + label + '" class="' + className + '" title="Avatar generativo de ' + label + '">';
  }

  function render(el, user, options) {
    if (!el) return;
    el.innerHTML = markup(user, options);
  }

  window.GenerativeAvatar = {
    svg: svg,
    dataUri: dataUri,
    markup: markup,
    render: render,
    seedOf: seedOf
  };

  // Atajo global
  window.generativeAvatarUri = dataUri;
})(window);
