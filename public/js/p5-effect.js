// Configuración Global y Efecto de Partículas p5.js
// Arte Digital Data

(function(window) {
  // Valores por defecto
  const DEFAULT_CONFIG = {
    TEXT_SIZE: 30,
    BG_ALPHA: 50,
    SPAWN_RADIUS_MIN: 20,
    SPAWN_RADIUS_MAX: 100,
    MAX_SPEED: 4,
    MAX_FORCE: 0.6,
    REPULSION_RADIUS: 5,
    LIFESPAN_DECAY_MIN: 1.0,
    LIFESPAN_DECAY_MAX: 2.5,
    MOUSE_FORCE_MULT: 1.1,
    MOUSE_FORCE_MIN: 0.2,
    MOUSE_FORCE_MAX: 2,
    DISPERSION_MIN: 0,
    DISPERSION_MAX: 0.5,
    SPAWN_COUNT_MIN: 1,
    SPAWN_COUNT_MAX: 2,
    COLOR_1: '#40c4ff', // Cyan
    COLOR_2: '#ff9100', // Naranja
    COLOR_3: '#e040fb', // Magenta
    COLOR_4: '#00e676', // Verde
    WORDS: [
      // Categories
      "ENGINES", "FRAMEWORKS", "IA", "SHADERS", "DB", "IDES", "LANGUAGES", "LLM", 
      "FRONTEND", "OS", "SOPORTES", "PROTOCOLOS", "SOFTWARE-MULTIMEDIA", "ENTORNOS", 
      "GLOSARIO", "SENSORES", "PROTOCOLOREVISION",

      // Engines
      "UNITY", "UNREAL", "GODOT", "TOUCHDESIGNER", "PROCESSING", "OPENFRAMEWORKS",

      // Frameworks
      "P5", "THREE", "BABYLON", "TONE", "ML5", "HYDRA", "XAMPP",

      // IA
      "COMFY", "N8N", "PINOKIO", "CLAWBOT", "MOLTBOOK",

      // Shaders
      "SHADERTOY", "GLSL", "HLSL", "BOOKOFSHADERS", "EJEMPLOS-SHADERS", "EDITOR-SHADERS-LIVE",

      // DB
      "FIREBASE", "MONGODB", "SQL",

      // IDEs
      "CURSOR", "TRAE", "V0", "WINDSURF", "VISUAL-STUDIO", "ANTIGRAVITY", "HERMES ONE", 
      "FREEBUFF", "OPENCODE", "CLAUDE", "CLAUDE IDE", "JPAGENTS",

      // Languages
      "CPP", "CSHARP", "PHP", "JAVASCRIPT", "PYTHON", "TYPESCRIPT", "JAVA", "HTML", 
      "CSS", "JSON", "R", "ARDUINO", "ASSEMBLER",

      // LLM
      "CHATGPT", "DEEPSEEK", "GEMINI", "KIMI",

      // Frontend
      "REACT", "VUE", "SVELTE", "ANGULAR", "NEXTJS",

      // OS
      "WINDOWS", "LINUX", "MAC", "ANDROID", "IOS",

      // Soportes
      "PANTALLA-TOUCH", "INSTALACIONES-FISICAS", "RASPBERRY-PI", "PANTALLA-LED", "PROYECTOR", 
      "SITIO-WEB", "COMPILADO-APK", "VIRTUAL-PRODUCTION", "VR", "AR", "SONIDO", "VIDEOJUEGOS", "MAPPING", "NFT",

      // Protocolos
      "WEBSOCKETS", "SPOUT", "SYPHON", "NDI", "WEBRTC", "OSC", "API", "MIDI",

      // Software Multimedia
      "RESOLUME", "BLENDER", "PAQUETE-ADOBE", "OBS", "CINEMA4D", "ABLETON", "PUREDATA", "GUIPPER", "GITBASH",

      // Entornos
      "DOCKER", "VENV", "CONDA", "NODEJS", "VPS",

      // Glosario
      "LIVECODING", "VIBECODING", "PROGRAMACION", "PROMPTING", "CONSOLA", "SCRIPT", 
      "COMPILADO-INTERPRETADO", "DRIVERS", "MCP", "REPOSITORIO", "GITHUB", "GIT", "PRUEBA",

      // Sensores
      "KINECTV1", "KINECTV2", "AZURE KINECT DK", "RPLIDAR", "CAMARARGB", "ORBBEC FEMTO BOLT / FEMTO MEGA",

      // Protocolo revision
      "SEDENTARISMOCOGNITIVO", "PERDIDAONTOLOGICADELARTISTA", "LAESTETICADELAIA", "UNCANNYVALLEY",

      // Conceptos culturales, técnicos y comunitarios
      "CARICIAS SIGNIFICATIVAS", "REPLY:742", "ANÓNIMO", "CIBERPERSON", "TRANSHUMANISMO", 
      "UNIDAD LATINOAMERICANA", "CYBORGS", "TRANSEXUAL", "PANSEXUAL", "BISEXUAL", "LESBIANA", 
      "HOMOSEXUAL", "GAY", "LGBT", "LGTBYQ", "PLACER", "RESPONSABILIDAD AFECTIVA", "RELACIONES LIBRES", 
      "POLIAMOR", "POLIAMOROSO", "CUIDADO", "AUTOCUIDADO", "SONREÍR", "NO CAER EN EL VACÍO", 
      "DARLE SENTIDO A LAS COSAS", "UNIR TODOS LOS PUNTOS", "LA REALIDAD ES UNA SOLA", 
      "LA ÚNICA VERDAD ES LA REALIDAD", "UNIVERSIDAD LIBRE GRATUITA Y DE CALIDAD", "UBA", 
      "UNA MULTIMEDIALES", "UNSAM", "UNTREF", "UNLAM", "SAN JUAN", "FIESTA NACIONAL DEL SOL", 
      "CALOR INFERNAL", "PANTALLAS LEDS GIGANTES", "POLVO", "VIENTO ZONDA", "LOS ARRIEROS", 
      "ASADO", "VINO", "CONECCIÓN", "DESCONEXIÓN", "CABLE DE RED", "UTP", "CABLE DE FUENTES", 
      "BRACITO DEL LIDAR", "EXTENSORES USB", "OCULUS QUEST", "NOTEBOOKS", "KINECT", "LIDAR", 
      "CAMARA RGB", "PC 4090", "LOS PENDRIVES DE CHARLY", "SOFTWARE LIBRE", "NODOS", 
      "REDES DE NODOS", "DIAGRAMA DE CONEXION", "EMULADOR", "PLANOS DE LOCACION", 
      "EL INTERNET DE LA RURAL ES INFERNAL", "LLEGAR A TIEMPO", "LLEGAR", "MANDAR PRESUPUESTO", 
      "TENES FACTURA A,B O C?", "PRECIO X CANTIDAD", "MONTAJE", "GUARDIA TECNICA", 
      "RASPBERRY PIE", "DESARROLLO LOCAL", "SERVIDOR LOCAL", "IP LOCAL", "127.0.0.1", "PUERTO", 
      "RUN.BAT", "INSTALL.BAT", ".ENV", "APIKEY", "KEY", "API ROUTE", "SOCKETS", "PHPMYADMIN", 
      "HANDCODE", "VIBECODE", "CÓDIGO ARTESANAL", "NODE", "SERVER.JS", "INDEX.HTML", 
      "STYLE.CSS", "JAVASCRIPT.JS", "SCRIPT.JS", "FONT.TTF", "MODEL.OBJ", "MODEL.GLTF", 
      "EXITOS2000.WAV", "DREAMCORE", "HARDCORE", "SYNTHCORE", "SOFTCORE", "CHILLSTEP", 
      "8 HOURS OF RELAXATION MUSIC", "EVERYNOISEATONCE", "MÚSICA", "GÉNEROS MUSICALES", 
      "TANGO", "ROCK", "MÚSICA ELECTRÓNICA", "ROCK NACIONAL", "GUSTAVO CERATI", 
      "PATRICIO REY Y SUS REDONDITOS DE RICOTA", "SKY", "EL INDIO", "SOLO TE PIDO QUE SE VUELVAN A JUNTAR", 
      "VIOLENCIA ES MENTIR", "GAUCHITO GIL", "MATE", "DULCE DE LECHE", "CANCHA", "MAÍZ", 
      "MEJORAMIENTO", "INCAS", "AZTECAS", "MAYAS", "KIPU", "BASES DE DATOS", "TELARES", 
      "CÓDICES", "TEXTOS", "LIBROS", "INFORMACIÓN", "HISTORIA", "POLÍTICA", "SOCIOLOGÍA", 
      "ECONOMÍA", "INDUSTRIA", "MODELO AGROEXPORTADOR", "DESCOLONIZACIÓN", "LAICO", 
      "GRATUITO", "EDUCACIÓN PÚBLICA GRATUITA Y DE CALIDAD", "UNA", "IMAGE CAMPUS", "CLASES", 
      "PEDAGOGÍA", "DUOLINGO", "APRENDER IDIOMAS", "APRENDER CHINO", "YO YA SE HABLAR EN INGLÉS", 
      "LOS ACENTOS SIEMPRE ME COSTARON", "LENGUAJE", "ANÁLISIS SINTÁCTICO", 
      "PALABRAS PALABRAS PALABRAS", "TEATRO", "IMPROVISACIÓN", "MÉTODO STANILAVSKY", 
      "CHÉJOV", "HAMLET X 9000", "IMPRO", "CONECTAR CON EL AQUÍ AHORA", "TRANSITARLO", 
      "VIVIRLO", "PASARLO POR EL CUERPO", "RELAJARSE", "YERBA QUE NO DA ACIDEZ", 
      "ENCURTIDOS", "PICA", "DELI & WINE", "MARCAS", "CONTRATOS DE CONFIDENCIALIDAD", 
      "PRODUCTORA", "PRODUCTORA AUDIOVISUAL", "TECNOPOLIS", "CIENCIA ARTE Y TECNOLOGÍA", 
      "COMUNICACIONES", "RADIO", "CINE", "REEL", "FORMATO VERTICAL", "FORMATO HORIZONTAL", 
      "16:9", "1:1", "PANTALLA", "SALIDA", "MONITOR 1", "MONITOR 2", "NO ME RECONOCE EL CABLE HDMI", 
      "HDMI A DISPLAY PORT", "MINI HDMI", "RED A HDMI", "¿PROBASTE CONECTANDO Y DESCONECTANDO?", 
      "REINICIA EL ROUTER Y ESPERA 30 SEGUNDOS", "¿PAGASTE LA FACTURA?", "¿TE LLEGA LA SEÑAL?", 
      "FÍJATE LA CONEXIÓN A INTERNET QUE TENÉS", "DNS", "IP FIJA", "MÁSCARA DE SUBRED 255.255.255.0", 
      "IPCONFIG", "IPV4", "IPV6", "QR", "FORMATEAR PC", "FORMATEAR ROUTER", "DOOMSCROLLING", 
      "DOPAMINA", "SEROTONINA", "SUPERAR", "MEJORAR", "CONVERTIRSE EN MEJOR PERSONA", 
      "INTEGRIDAD", "ÉTICA", "MORAL", "SALVACIÓN", "WORDS", "PHONOCENTRICO", "IDEOGRAMAS", 
      "LENGUAJE FONÉTICO", "IDEAS PARA PROMPTS", "PROMPTEAR", "MEJORAR PROMPT", "ENHANCE PROMPT", 
      "4K", "HIGH DEFINITION", "BLOOM", "BLUR", "LIGHTING3D", "IMAGE PROCESSING", 
      "PROCESAMIENTO DE IMAGEN", "INPUT", "OUTPUT", "ENTRADA", "PERIFÉRICO DE ENTRADA", 
      "PERIFÉRICO DE SALIDA", "ESPERAR", "PACIENCIA", "ANSIEDAD", "QUEDARNOS CALLADOS", 
      "PENSAR", "ACCIONAR", "SER CONSCIENTE", "SER CONSECUENTE", "ARCHIVO", "ARCHIVADO", 
      "DATO", ".JSON", "CARTA DOCUMENTO", "QUE SE YO ESTOY SHE LOCO", "SOSTENER", 
      "MEMBRESÍAS", "PAY PER MONTH", "PROGRAMA", "INADI", "NOS CAE BIEN", "ME QUEDA OTRA PUNTA", 
      "CONTRATAR", "CONOCIDO", "REFERIDO", "CHARLAR"
    ],
    CHARACTERS: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&*+-/;:,. "
  };

  // Configuración activa
  let CFG = { ...DEFAULT_CONFIG };

  // Intentar cargar de localStorage de inmediato para evitar flashes
  try {
    const saved = localStorage.getItem('particles_p5_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      CFG = { ...CFG, ...parsed };
      // Si la lista guardada no existe o tiene menos de 20 palabras (versión anterior vieja), forzar las nuevas palabras completas
      if (!Array.isArray(CFG.WORDS) || CFG.WORDS.length < 20) {
        CFG.WORDS = [...DEFAULT_CONFIG.WORDS];
        localStorage.setItem('particles_p5_config', JSON.stringify(CFG));
      }
    } else {
      CFG.WORDS = [...DEFAULT_CONFIG.WORDS];
      localStorage.setItem('particles_p5_config', JSON.stringify(CFG));
    }
  } catch (e) {}

  // Función para obtener URL de la API
  function getApiUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const base = (window.CONFIG && window.CONFIG.BASE) ? window.CONFIG.BASE : '/artedigitaldata';
      return window.location.origin + base + '/api';
    }
    if (window.CONFIG && window.CONFIG.API_URL) return window.CONFIG.API_URL;
    return '/api';
  }

  // Cargar configuración desde el backend asincrónicamente
  async function loadRemoteConfig() {
    try {
      const res = await fetch(getApiUrl() + '/public/particles-config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.config) {
          CFG = { ...CFG, ...data.config };
          if (!Array.isArray(CFG.WORDS) || CFG.WORDS.length < 20) {
            CFG.WORDS = [...DEFAULT_CONFIG.WORDS];
          }
          localStorage.setItem('particles_p5_config', JSON.stringify(CFG));
          updatePalette();
          if (typeof window.onParticlesConfigLoaded === 'function') {
            window.onParticlesConfigLoaded(CFG);
          }
        }
      }
    } catch (e) {
      // Usar config local si falla la red
    }
  }

  // Guardar configuración en backend y localStorage
  async function saveRemoteConfig(newConfig) {
    CFG = { ...CFG, ...newConfig };
    if (!Array.isArray(CFG.WORDS) || !CFG.WORDS.length) {
      CFG.WORDS = [...DEFAULT_CONFIG.WORDS];
    }
    localStorage.setItem('particles_p5_config', JSON.stringify(CFG));
    updatePalette();

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('artedigitaldata_token');
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
      }

      // Probar URL directa
      let endpoint = getApiUrl() + '/public/particles-config';
      let res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(CFG)
      });

      // Si da 404 por prefijo de proxy (/artedigitaldata/api vs /api)
      if (res.status === 404 && endpoint.includes('/artedigitaldata/api')) {
        const altEndpoint = endpoint.replace('/artedigitaldata/api', '/api');
        res = await fetch(altEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(CFG)
        });
      } else if (res.status === 404 && !endpoint.includes('/artedigitaldata/api')) {
        const altEndpoint = endpoint.replace('/api', '/artedigitaldata/api');
        res = await fetch(altEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(CFG)
        });
      }

      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      console.warn('[Particles] Error guardando config en servidor:', e);
      return { ok: false, error: e };
    }
  }

  // Exponer API global
  window.ParticlesConfig = {
    get: () => ({ ...CFG }),
    set: (newConfig) => {
      CFG = { ...CFG, ...newConfig };
      if (!Array.isArray(CFG.WORDS) || !CFG.WORDS.length) {
        CFG.WORDS = [...DEFAULT_CONFIG.WORDS];
      }
      updatePalette();
    },
    save: saveRemoteConfig,
    reset: () => {
      CFG = { ...DEFAULT_CONFIG };
      updatePalette();
      return saveRemoteConfig(DEFAULT_CONFIG);
    },
    loadRemote: loadRemoteConfig,
    spawnWordAt: (word, x, y) => {
      spawnWordParticles(word, x, y);
    },
    DEFAULTS: DEFAULT_CONFIG
  };

  // Cargar del servidor
  loadRemoteConfig();

  // Asegurar contenedor canvas
  function ensureCanvasContainer() {
    let container = document.getElementById('p5-canvas');
    if (!container) {
      container = document.getElementById('p5-global-canvas');
    }
    if (!container) {
      container = document.createElement('div');
      container.id = 'p5-canvas';
      document.body.prepend(container);
    }
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '0';
    container.style.pointerEvents = 'none';
    return container;
  }

  let particles = [];
  let palette = [];
  let currentWordIndex = -1;

  function updatePalette() {
    if (typeof color === 'function') {
      palette = [
        color(CFG.COLOR_1 || '#40c4ff'),
        color(CFG.COLOR_2 || '#ff9100'),
        color(CFG.COLOR_3 || '#e040fb'),
        color(CFG.COLOR_4 || '#00e676')
      ];
    }
  }

  // Spawnea una palabra centrada en (targetCenterX, targetCenterY)
  function spawnWordParticles(word, targetCenterX, targetCenterY) {
    if (!word || typeof word !== 'string') return;
    const chars = word.trim().toUpperCase().split('');
    if (!chars.length) return;

    // Calcular espaciado por letra según TEXT_SIZE
    let spacing = Math.max(12, CFG.TEXT_SIZE * 0.68);
    let totalWidth = (chars.length - 1) * spacing;
    
    // Si la palabra/frase excede el ancho de la ventana, reducir espaciado dinámicamente para que entre
    const maxAllowedWidth = windowWidth * 0.90;
    if (totalWidth > maxAllowedWidth) {
      spacing = maxAllowedWidth / (chars.length - 1);
      totalWidth = (chars.length - 1) * spacing;
    }

    // Asegurar que quede dentro de la pantalla horizontalmente
    let startX = targetCenterX - totalWidth / 2;
    if (startX < 20) {
      startX = 20;
    } else if (startX + totalWidth > windowWidth - 20) {
      startX = windowWidth - 20 - totalWidth;
    }

    const startY = constrain(targetCenterY, 40, windowHeight - 40);

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === ' ') continue;

      const targetX = startX + i * spacing;
      const targetY = startY;

      // Nacen dispersas en un radio alrededor del click
      const angle = random(TWO_PI);
      const dist = random(60, 240);
      const spawnX = targetCenterX + cos(angle) * dist;
      const spawnY = targetCenterY + sin(angle) * dist;

      particles.push(new WordParticle(ch, spawnX, spawnY, targetX, targetY));
    }
  }

  // Clases y p5 setup
  window.setup = function() {
    const container = ensureCanvasContainer();
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent(container.id);
    canvas.style('position', 'fixed');
    canvas.style('top', '0');
    canvas.style('left', '0');
    canvas.style('z-index', '0');
    canvas.style('pointer-events', 'none');
    
    textFont('monospace');
    textSize(CFG.TEXT_SIZE);
    textAlign(CENTER, CENTER);

    updatePalette();
  };

  window.draw = function() {
    clear();

    if (!palette.length) updatePalette();

    const mouseVel = createVector(mouseX - pmouseX, mouseY - pmouseY);
    const speed = mouseVel.mag();
    
    // Si se mueve el mouse con velocidad, generar partículas ambientales normales
    if (speed > 0.5) {
      let spawnCount = floor(map(constrain(speed, 0, 50), 0, 50, CFG.SPAWN_COUNT_MIN, CFG.SPAWN_COUNT_MAX));
      if (speed === 0) spawnCount = CFG.SPAWN_COUNT_MIN;

      for (let i = 0; i < spawnCount; i++) {
        const angle = random(TWO_PI);
        const r = random(CFG.SPAWN_RADIUS_MIN, CFG.SPAWN_RADIUS_MAX);
        const spawnX = mouseX + cos(angle) * r;
        const spawnY = mouseY + sin(angle) * r;
        
        particles.push(new Particle(spawnX, spawnY, mouseVel));
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.applyRepulsion(particles);
      p.update();
      p.display();
      
      if (p.isDead()) {
        particles.splice(i, 1);
      }
    }
  };

  // Click handler para generar palabras con atractor
  window.mousePressed = function(e) {
    // Si el click fue sobre un input, botón o panel, no spawnear palabra
    if (e && e.target && (e.target.closest('#control-panel') || e.target.closest('header') || e.target.closest('button') || e.target.closest('input') || e.target.closest('a'))) {
      return;
    }

    const words = Array.isArray(CFG.WORDS) && CFG.WORDS.length ? CFG.WORDS : DEFAULT_CONFIG.WORDS;
    if (!words.length) return;

    // Elegir palabra distinta a la anterior
    let nextIdx = floor(random(words.length));
    if (words.length > 1 && nextIdx === currentWordIndex) {
      nextIdx = (nextIdx + 1) % words.length;
    }
    currentWordIndex = nextIdx;

    const chosenWord = words[currentWordIndex];
    spawnWordParticles(chosenWord, mouseX, mouseY);
  };

  // Soporte Touch
  window.touchStarted = function(e) {
    if (e && e.target && (e.target.closest('#control-panel') || e.target.closest('header') || e.target.closest('button') || e.target.closest('input') || e.target.closest('a'))) {
      return;
    }
    const words = Array.isArray(CFG.WORDS) && CFG.WORDS.length ? CFG.WORDS : DEFAULT_CONFIG.WORDS;
    if (!words.length) return;

    let nextIdx = floor(random(words.length));
    if (words.length > 1 && nextIdx === currentWordIndex) {
      nextIdx = (nextIdx + 1) % words.length;
    }
    currentWordIndex = nextIdx;

    spawnWordParticles(words[currentWordIndex], touches[0]?.x || mouseX, touches[0]?.y || mouseY);
  };

  window.windowResized = function() {
    resizeCanvas(windowWidth, windowHeight);
  };

  // Partícula normal ambiental
  class Particle {
    constructor(x, y, mVel) {
      this.pos = createVector(x, y);
      
      let dir = mVel.copy(); 
      let speedMult = constrain(mVel.mag() * CFG.MOUSE_FORCE_MULT, CFG.MOUSE_FORCE_MIN, CFG.MOUSE_FORCE_MAX);
      
      if (dir.magSq() > 0) {
        dir.normalize();
      } else {
        dir = p5.Vector.random2D();
      }
      
      this.vel = p5.Vector.add(dir.mult(speedMult), p5.Vector.random2D().mult(random(CFG.DISPERSION_MIN, CFG.DISPERSION_MAX)));
      this.acc = createVector(0, 0);
      
      this.lifespan = 255;
      this.decay = random(CFG.LIFESPAN_DECAY_MIN, CFG.LIFESPAN_DECAY_MAX); 
      this.char = (CFG.CHARACTERS && CFG.CHARACTERS.length) ? CFG.CHARACTERS.charAt(floor(random(CFG.CHARACTERS.length))) : '*';
      
      let colorPos = random(1);
      if (!palette.length) updatePalette();

      if (colorPos < 0.33) {
        this.baseColor = lerpColor(palette[0], palette[1], map(colorPos, 0, 0.33, 0, 1));
      } else if (colorPos < 0.66) {
        this.baseColor = lerpColor(palette[1], palette[2], map(colorPos, 0.33, 0.66, 0, 1));
      } else {
        this.baseColor = lerpColor(palette[2], palette[3], map(colorPos, 0.66, 1, 0, 1));
      }
    }

    applyRepulsion(others) {
      let steer = createVector(0, 0);
      let count = 0;

      for (let other of others) {
        if (other !== this && !(other instanceof WordParticle)) {
          let d = p5.Vector.dist(this.pos, other.pos);
          if (d > 0 && d < CFG.REPULSION_RADIUS) {
            let diff = p5.Vector.sub(this.pos, other.pos);
            diff.normalize();
            diff.div(d); 
            steer.add(diff);
            count++;
          }
        }
      }

      if (count > 0) {
        steer.div(count);
        steer.normalize();
        steer.mult(CFG.MAX_SPEED);
        steer.sub(this.vel);
        steer.limit(CFG.MAX_FORCE);
        this.acc.add(steer);
      }
    }

    update() {
      this.vel.add(this.acc);
      this.vel.limit(CFG.MAX_SPEED);
      this.pos.add(this.vel);
      this.acc.mult(0);
      this.lifespan -= this.decay;
    }

    display() {
      this.baseColor.setAlpha(this.lifespan);
      fill(this.baseColor); 
      textSize(CFG.TEXT_SIZE);
      text(this.char, this.pos.x, this.pos.y);
    }

    isDead() {
      return this.lifespan <= 0;
    }
  }

  // Partícula con atractor para formar palabras
  class WordParticle {
    constructor(char, x, y, targetX, targetY) {
      this.char = char;
      this.pos = createVector(x, y);
      this.target = createVector(targetX, targetY);
      this.vel = p5.Vector.random2D().mult(random(2, 6));
      this.acc = createVector(0, 0);

      this.lifespan = 255;
      // Las partículas de palabra se mantienen vivas mientras se forman y un momento más
      this.holdTime = 70; // frames manteniéndose formadas
      this.decay = 2.2;
      this.maxSpeed = Math.max(7, CFG.MAX_SPEED * 1.8);
      this.maxForce = Math.max(0.4, CFG.MAX_FORCE * 1.2);

      // Color vibrante de la paleta
      let colorPos = random(1);
      if (!palette.length) updatePalette();
      if (colorPos < 0.33) {
        this.baseColor = lerpColor(palette[0], palette[1], map(colorPos, 0, 0.33, 0, 1));
      } else if (colorPos < 0.66) {
        this.baseColor = lerpColor(palette[1], palette[2], map(colorPos, 0.33, 0.66, 0, 1));
      } else {
        this.baseColor = lerpColor(palette[2], palette[3], map(colorPos, 0.66, 1, 0, 1));
      }
    }

    applyRepulsion(others) {
      // Repulsión suave solo si están muy encima
      let steer = createVector(0, 0);
      let count = 0;
      for (let other of others) {
        if (other !== this && other instanceof WordParticle) {
          let d = p5.Vector.dist(this.pos, other.pos);
          if (d > 0 && d < 12) {
            let diff = p5.Vector.sub(this.pos, other.pos);
            diff.normalize();
            diff.div(d);
            steer.add(diff);
            count++;
          }
        }
      }
      if (count > 0) {
        steer.div(count);
        steer.mult(0.2);
        this.acc.add(steer);
      }
    }

    update() {
      // Comportamiento de Atractor (Arrive hacia la posición de la letra)
      const desired = p5.Vector.sub(this.target, this.pos);
      const d = desired.mag();

      if (d < 50) {
        // Frenar al acercarse al atractor (easing/arrive)
        const speed = map(d, 0, 50, 0, this.maxSpeed);
        desired.setMag(speed);
      } else {
        desired.setMag(this.maxSpeed);
      }

      const steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce);
      this.acc.add(steer);

      this.vel.add(this.acc);
      this.pos.add(this.vel);
      this.acc.mult(0);

      // Una vez que llega muy cerca, decrementa holdTime y luego decae
      if (d < 4) {
        if (this.holdTime > 0) {
          this.holdTime--;
        } else {
          this.lifespan -= this.decay;
        }
      } else {
        // En camino decae muy lento
        this.lifespan -= 0.3;
      }
    }

    display() {
      this.baseColor.setAlpha(this.lifespan);
      fill(this.baseColor);
      textSize(CFG.TEXT_SIZE * 1.1); // Ligeramente más destacada
      text(this.char, this.pos.x, this.pos.y);
    }

    isDead() {
      return this.lifespan <= 0;
    }
  }

  // Escuchar cambios de localStorage entre pestañas
  window.addEventListener('storage', (e) => {
    if (e.key === 'particles_p5_config' && e.newValue) {
      try {
        CFG = { ...CFG, ...JSON.parse(e.newValue) };
        updatePalette();
      } catch (err) {}
    }
  });

})(window);
