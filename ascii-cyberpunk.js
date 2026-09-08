// ============================================================
// ASCII CYBERPUNK FIELD — efecto de caracteres ASCII reactivo
// al mouse/touch con paleta de "ARTE DIGITAL".
// Fondo negro, caracteres que se concentran donde está el mouse.
// ============================================================
// PENSADO PARA IR COMO FONDO DE PÁGINA (ver uso al final).

// --- Paleta extraída de la imagen ---
const ASCII_PALETTE = [
  [255, 0, 255],    // magenta neón #FF00FF
  [0, 255, 255],    // cyan eléctrico #00FFFF
  [255, 255, 0],    // amarillo neón #FFFF00
  [153, 0, 255],    // púrpura #9900FF
  [51, 255, 51],    // verde lima #33FF33
  [255, 255, 255],  // blanco #FFFFFF
];

// Repertorio de caracteres (código / glitch / UI, como la imagen)
const ASCII_CHARS = [
  '0','1','#','@','%','&','{','}','[',']','<','>',
  '+','=','/','\\','|','*','!','?','.',',',':',';',
  '(','_','-','~','^','$','\u03B1','\u03B2','\u03A9','\u0394',
  ':)',':D','(o_o)'
];

let asciiParticles = [];
let asciiP5; // p5 instance

// Configuración
const ASCII_CONFIG = {
  count: 260,        // cantidad de caracteres
  fontSize: 15,      // tamaño base de fuente
  minSize: 11,
  maxSize: 30,
  speed: 1.2,        // velocidad base de deriva
  attractRadius: 160,// radio de atracción hacia el mouse
  jitter: 0.6,       // vibración para look glitch
};

function createAsciiBackground(parentSelector) {
  // Instancia p5 aislada (no contamina el resto de la página)
  asciiP5 = new p5((p) => {
    p.setup = () => {
      const host = p.select(parentSelector);
      const cw = host ? host.elt.clientWidth : window.innerWidth;
      const ch = host ? host.elt.clientHeight : window.innerHeight;
      let cv = p.createCanvas(cw, ch);
      cv.style('display', 'block');
      cv.position(0, 0);
      // queda por detrás del contenido
      if (host) cv.parent(host);
      p.pixelDensity(1);
      p.textFont('monospace');
      p.textAlign(p.CENTER, p.CENTER);
      p.background(0);
      for (let i = 0; i < ASCII_CONFIG.count; i++) {
        asciiParticles.push(makeParticle(p, cw, ch));
      }
      p.noStroke();
    };

    p.windowResized = () => {
      const host = p.select(parentSelector);
      const cw = host ? host.elt.clientWidth : window.innerWidth;
      const ch = host ? host.elt.clientHeight : window.innerHeight;
      p.resizeCanvas(cw, ch);
    };

    p.draw = () => {
      p.background(0, 0, 0, 45); // estela sutil (comet trail)
      const mx = p.mouseX, my = p.mouseY;
      for (const pa of asciiParticles) {
        // Deriva aleatoria lenta
        pa.vx += p.random(-ASCII_CONFIG.jitter, ASCII_CONFIG.jitter);
        pa.vy += p.random(-ASCII_CONFIG.jitter, ASCII_CONFIG.jitter);
        // Limitar velocidad de deriva
        const sp = p.dist(0, 0, pa.vx, pa.vy);
        if (sp > ASCII_CONFIG.speed) {
          pa.vx *= ASCII_CONFIG.speed / sp;
          pa.vy *= ASCII_CONFIG.speed / sp;
        }
        pa.x += pa.vx;
        pa.y += pa.vy;

        // ATRACCIÓN hacia el mouse (se concentran ahí)
        const d = p.dist(pa.x, pa.y, mx, my);
        if (d < ASCII_CONFIG.attractRadius && d > 0) {
          const force = p.map(d, 0, ASCII_CONFIG.attractRadius, 0.35, 0);
          pa.x += ((mx - pa.x) / d) * force;
          pa.y += ((my - pa.y) / d) * force;
          // al acercarse, crece y se vuelve más brillante
          pa.size = p.map(d, ASCII_CONFIG.attractRadius, 0,
            ASCII_CONFIG.minSize, ASCII_CONFIG.maxSize);
        } else {
          // lejos: tamaño base
          pa.size += (ASCII_CONFIG.fontSize - pa.size) * 0.05;
        }

        // Reaparecer en el lado opuesto si se sale
        if (pa.x < -30) pa.x = p.width + 30;
        if (pa.x > p.width + 30) pa.x = -30;
        if (pa.y < -30) pa.y = p.height + 30;
        if (pa.y > p.height + 30) pa.y = -30;

        // El color varía según la cercanía (paleta + glitch de tamaño)
        let col;
        if (d < ASCII_CONFIG.attractRadius) {
          // cerca del mouse: mezcla hacia blanco brillante
          const t = p.map(d, ASCII_CONFIG.attractRadius, 0, 0, 0.7);
          col = blendColor(p, pa.col, [255, 255, 255], t);
          pa.glitch = p.random() < 0.3; // parpadea al concentrarse
        } else {
          col = pa.col;
          pa.glitch = p.random() < 0.05;
        }

        p.fill(col[0], col[1], col[2], 230);
        p.textSize(pa.size);

        // de vez en cuando cambia de carácter (look glitch)
        if (p.random() < 0.01) {
          pa.ch = p.random(ASCII_CHARS);
        }
        let ch = pa.glitch ? p.random(ASCII_CHARS) : pa.ch;

        p.text(ch, pa.x, pa.y);
      }
    };
  });
}

function makeParticle(p, w, h) {
  return {
    x: p.random(w),
    y: p.random(h),
    vx: p.random(-ASCII_CONFIG.speed, ASCII_CONFIG.speed),
    vy: p.random(-ASCII_CONFIG.speed, ASCII_CONFIG.speed),
    size: ASCII_CONFIG.fontSize,
    col: ASCII_PALETTE[Math.floor(p.random(ASCII_PALETTE.length))],
    ch: ASCII_CHARS[Math.floor(p.random(ASCII_CHARS.length))],
    glitch: false,
  };
}

function blendColor(p, c1, c2, t) {
  return [
    Math.round(p.lerp(c1[0], c2[0], t)),
    Math.round(p.lerp(c1[1], c2[1], t)),
    Math.round(p.lerp(c1[2], c2[2], t)),
  ];
}

// ============================================================
// USO COMO FONDO DE PÁGINA:
// 1) Incluí p5 antes de este script:
//    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
// 2) Llamá esto cuando el DOM esté listo:
//    createAsciiBackground('#ascii-bg');
// 3) En tu CSS, el contenedor debe ser position:fixed/absolute con z-index:-1:
//    #ascii-bg { position: fixed; inset: 0; z-index: -1; pointer-events: none; }
// ============================================================
