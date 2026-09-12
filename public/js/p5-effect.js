// Configuración Global y Efecto de Partículas p5.js
// Arte Digital Data

(function(window) {
  // Auto-cargar ascii-shader-bg.js si no está cargado en la página
  if (!window.AsciiShaderBG && !document.querySelector('script[src*="ascii-shader-bg.js"]')) {
    const script = document.createElement('script');
    const currentPath = window.location.pathname;
    const folderPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
    script.src = folderPath + 'js/ascii-shader-bg.js';
    script.async = false;
    document.head.appendChild(script);
  }

  // Valores por defecto
  const DEFAULT_CONFIG = {
    TEXT_SIZE: 36,
    TEXT_SIZE_MIN: 16,
    TEXT_SIZE_MAX: 36,
    BG_ALPHA: 50,
    SPAWN_RADIUS_MIN: 20,
    SPAWN_RADIUS_MAX: 100,
    SPAWN_INTERVAL_MS: 40,
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
    AUTO_MODE: false,
    AUTO_INTERVAL_SEC: 2.5,
    FLOWFIELD_ENABLED: false,
    FLOWFIELD_FORCE: 0.4,
    FLOWFIELD_GRID_X: 40,
    FLOWFIELD_GRID_Y: 40,
    FLOWFIELD_SCALE_X: 0.006,
    FLOWFIELD_SCALE_Y: 0.006,
    FLOWFIELD_SCALE: 0.006,
    FLOWFIELD_SPEED: 0.002,
    FLOWFIELD_SHOW_VECTORS: false,
    ASCII_ENABLED: true,
    ASCII_NOISE_ONLY: false,
    ASCII_OPACITY: 0.35,
    ASCII_CHAR_SIZE: 14,
    ASCII_GLYPH_SCALE: 0.85,
    ASCII_TILE: 3.0,
    ASCII_SPEED: 1.0,
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
      if (newConfig.AUTO_MODE && !CFG.AUTO_MODE) {
        autoTimer = 999999;
      }
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
    container.style.zIndex = '1';
    container.style.pointerEvents = 'none';
    return container;
  }

  let particles = [];
  let palette = [];
  let currentWordIndex = -1;
  let autoTimer = 0;
  let lastMouseSpawnTime = 0;
  let flowZoff = 0;

  function drawFlowfieldGrid(zoff) {
    if (!CFG.FLOWFIELD_SHOW_VECTORS) return;
    const gridX = Math.max(10, (CFG.FLOWFIELD_GRID_X !== undefined) ? Number(CFG.FLOWFIELD_GRID_X) : 40);
    const gridY = Math.max(10, (CFG.FLOWFIELD_GRID_Y !== undefined) ? Number(CFG.FLOWFIELD_GRID_Y) : 40);
    const scaleX = (CFG.FLOWFIELD_SCALE_X !== undefined) ? Number(CFG.FLOWFIELD_SCALE_X) : ((CFG.FLOWFIELD_SCALE !== undefined) ? Number(CFG.FLOWFIELD_SCALE) : 0.006);
    const scaleY = (CFG.FLOWFIELD_SCALE_Y !== undefined) ? Number(CFG.FLOWFIELD_SCALE_Y) : ((CFG.FLOWFIELD_SCALE !== undefined) ? Number(CFG.FLOWFIELD_SCALE) : 0.006);

    stroke(0, 242, 254, 35);
    strokeWeight(1);
    const vecLen = Math.min(gridX, gridY) * 0.45;

    for (let y = gridY / 2; y < windowHeight; y += gridY) {
      for (let x = gridX / 2; x < windowWidth; x += gridX) {
        const angle = noise(x * scaleX, y * scaleY, zoff) * TWO_PI * 4;
        const v = p5.Vector.fromAngle(angle).mult(vecLen);
        line(x, y, x + v.x, y + v.y);
      }
    }
    noStroke();
  }

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

    // Las letras que forman las palabras siempre usan el tamaño máximo
    const wordFontSize = (CFG.TEXT_SIZE_MAX !== undefined) ? Number(CFG.TEXT_SIZE_MAX) : (CFG.TEXT_SIZE || 36);
    let spacing = Math.max(12, wordFontSize * 0.68);
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
    canvas.style('z-index', '1');
    canvas.style('pointer-events', 'none');
    
    textFont('monospace');
    textSize(CFG.TEXT_SIZE);
    textAlign(CENTER, CENTER);

    updatePalette();
  };

  window.draw = function() {
    // Opacidad de fondo para regular el efecto de feedback / estela
    const bgAlpha = (CFG.BG_ALPHA !== undefined) ? Number(CFG.BG_ALPHA) : 50;
    if (CFG.ASCII_ENABLED) {
      clear();
    } else if (bgAlpha >= 255) {
      clear();
    } else if (bgAlpha > 0) {
      // Velo semitransparente con el color de fondo para feedback progresivo
      background(9, 10, 15, bgAlpha);
    }
    // Si bgAlpha === 0, no se limpia el fondo (estela / feedback permanente)

    if (!palette.length) updatePalette();

    const mouseVel = createVector(mouseX - pmouseX, mouseY - pmouseY);
    const speed = mouseVel.mag();
    const spawnIntervalMs = (CFG.SPAWN_INTERVAL_MS !== undefined) ? Number(CFG.SPAWN_INTERVAL_MS) : 40;
    const now = millis();
    
    // Partículas generadas por movimiento de mouse con throttling (cooldown)
    if (speed > 0.5 && (now - lastMouseSpawnTime >= spawnIntervalMs)) {
      lastMouseSpawnTime = now;
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

    // Modo Automático: genera palabras automáticamente en lugares random y mantiene letras en movimiento
    if (CFG.AUTO_MODE) {
      autoTimer++;
      const intervalSec = (CFG.AUTO_INTERVAL_SEC !== undefined) ? Number(CFG.AUTO_INTERVAL_SEC) : 2.5;
      const targetFrames = Math.max(30, Math.round(intervalSec * 60));

      if (autoTimer >= targetFrames) {
        autoTimer = 0;
        const words = Array.isArray(CFG.WORDS) && CFG.WORDS.length ? CFG.WORDS : DEFAULT_CONFIG.WORDS;
        if (words.length > 0) {
          let nextIdx = floor(random(words.length));
          if (words.length > 1 && nextIdx === currentWordIndex) {
            nextIdx = (nextIdx + 1) % words.length;
          }
          currentWordIndex = nextIdx;
          const chosenWord = words[currentWordIndex];

          // Posición aleatoria dentro de márgenes seguros de pantalla
          const padX = constrain(windowWidth * 0.2, 80, 260);
          const padY = constrain(windowHeight * 0.2, 80, 220);
          const randX = random(padX, windowWidth - padX);
          const randY = random(padY, windowHeight - padY);

          spawnWordParticles(chosenWord, randX, randY);
        }
      }

      // Spawneo de letras distribuidas desde todos lados (no un walker)
      if (frameCount % 4 === 0) {
        let spawnX, spawnY, spawnVel;
        if (random() < 0.5) {
          // Posición aleatoria en cualquier parte de la pantalla
          spawnX = random(windowWidth);
          spawnY = random(windowHeight);
          spawnVel = p5.Vector.random2D().mult(random(0.5, 2.0));
        } else {
          // Entran desde los bordes de la pantalla
          const side = floor(random(4));
          if (side === 0) { // Arriba
            spawnX = random(windowWidth);
            spawnY = -15;
            spawnVel = createVector(random(-1.5, 1.5), random(1, 3));
          } else if (side === 1) { // Derecha
            spawnX = windowWidth + 15;
            spawnY = random(windowHeight);
            spawnVel = createVector(random(-3, -1), random(-1.5, 1.5));
          } else if (side === 2) { // Abajo
            spawnX = random(windowWidth);
            spawnY = windowHeight + 15;
            spawnVel = createVector(random(-1.5, 1.5), random(-3, -1));
          } else { // Izquierda
            spawnX = -15;
            spawnY = random(windowHeight);
            spawnVel = createVector(random(1, 3), random(-1.5, 1.5));
          }
        }
        particles.push(new Particle(spawnX, spawnY, spawnVel));
      }
    }

    // Actualizar y dibujar Flowfield si está activo
    if (CFG.FLOWFIELD_ENABLED) {
      const spd = (CFG.FLOWFIELD_SPEED !== undefined) ? Number(CFG.FLOWFIELD_SPEED) : 0.002;
      flowZoff += spd;

      if (CFG.FLOWFIELD_SHOW_VECTORS) {
        drawFlowfieldGrid(flowZoff);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // El flowfield afecta a todas las partículas EXCEPTO a las que forman palabras
      if (CFG.FLOWFIELD_ENABLED && !(p instanceof WordParticle)) {
        p.applyFlowfield(flowZoff);
      }

      p.applyRepulsion(particles);
      p.update();
      p.display();
      
      if (p.isDead()) {
        particles.splice(i, 1);
      }
    }
  };

  let lastTouchTimestamp = 0;

  // Click handler para generar palabras con atractor
  window.mousePressed = function(e) {
    // Si fue precedido inmediatamente por un evento touch (emulación de click móvil), ignorar
    if (Date.now() - lastTouchTimestamp < 650) {
      return;
    }

    // Si el click fue sobre un input, botón, panel o elementos interactivos, no spawnear palabra
    if (e && e.target && (
      e.target.closest('#control-panel') || 
      e.target.closest('header') || 
      e.target.closest('button') || 
      e.target.closest('input') || 
      e.target.closest('a') ||
      e.target.closest('#panel-backdrop')
    )) {
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

  // Soporte Touch para dispositivos móviles
  window.touchStarted = function(e) {
    // Si el toque fue sobre elementos interactivos de la interfaz, permitir acción normal
    if (e && e.target && (
      e.target.closest('#control-panel') || 
      e.target.closest('header') || 
      e.target.closest('button') || 
      e.target.closest('input') || 
      e.target.closest('a') ||
      e.target.closest('#panel-backdrop')
    )) {
      return true;
    }

    lastTouchTimestamp = Date.now();

    const words = Array.isArray(CFG.WORDS) && CFG.WORDS.length ? CFG.WORDS : DEFAULT_CONFIG.WORDS;
    if (!words.length) return false;

    let nextIdx = floor(random(words.length));
    if (words.length > 1 && nextIdx === currentWordIndex) {
      nextIdx = (nextIdx + 1) % words.length;
    }
    currentWordIndex = nextIdx;

    // Obtener coordenadas de toque de forma precisa
    let tx = mouseX;
    let ty = mouseY;
    if (touches && touches.length > 0) {
      tx = touches[0].x;
      ty = touches[0].y;
    } else if (e && e.touches && e.touches.length > 0) {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    }

    spawnWordParticles(words[currentWordIndex], tx, ty);
    return false; // Previene scroll no deseado y emulación sintética del mouse en el canvas
  };

  window.touchMoved = function(e) {
    // Permitir scroll normal dentro de paneles o listas
    if (e && e.target && (
      e.target.closest('#control-panel') || 
      e.target.closest('#panel-backdrop')
    )) {
      return true;
    }
    // En el canvas prevenimos scroll y pull-to-refresh
    return false;
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
      
      // Tamaño aleatorio entre mínimo y máximo para letras sueltas
      const minSize = (CFG.TEXT_SIZE_MIN !== undefined) ? Number(CFG.TEXT_SIZE_MIN) : 16;
      const maxSize = (CFG.TEXT_SIZE_MAX !== undefined) ? Number(CFG.TEXT_SIZE_MAX) : (CFG.TEXT_SIZE || 36);
      this.baseSize = random(Math.min(minSize, maxSize), Math.max(minSize, maxSize));

      // Animación de entrada: escala de 0 a 1 durante el primer 15% de su vida
      this.age = 0;
      const totalLife = Math.max(1, 255 / this.decay);
      this.scaleInDuration = Math.max(1, totalLife * 0.15);
      this.scale = 0;

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

    applyFlowfield(zoff) {
      if (!CFG.FLOWFIELD_ENABLED) return;
      const gridX = Math.max(10, (CFG.FLOWFIELD_GRID_X !== undefined) ? Number(CFG.FLOWFIELD_GRID_X) : 40);
      const gridY = Math.max(10, (CFG.FLOWFIELD_GRID_Y !== undefined) ? Number(CFG.FLOWFIELD_GRID_Y) : 40);
      const scaleX = (CFG.FLOWFIELD_SCALE_X !== undefined) ? Number(CFG.FLOWFIELD_SCALE_X) : ((CFG.FLOWFIELD_SCALE !== undefined) ? Number(CFG.FLOWFIELD_SCALE) : 0.006);
      const scaleY = (CFG.FLOWFIELD_SCALE_Y !== undefined) ? Number(CFG.FLOWFIELD_SCALE_Y) : ((CFG.FLOWFIELD_SCALE !== undefined) ? Number(CFG.FLOWFIELD_SCALE) : 0.006);
      const force = (CFG.FLOWFIELD_FORCE !== undefined) ? Number(CFG.FLOWFIELD_FORCE) : 0.4;

      const cellX = floor(this.pos.x / gridX) * gridX + gridX / 2;
      const cellY = floor(this.pos.y / gridY) * gridY + gridY / 2;

      const angle = noise(cellX * scaleX, cellY * scaleY, zoff) * TWO_PI * 4;
      const flow = p5.Vector.fromAngle(angle).mult(force);
      this.acc.add(flow);
    }

    update() {
      // Progresión de escala (0 -> 1 en el primer 15% de vida)
      this.age++;
      if (this.age < this.scaleInDuration) {
        this.scale = this.age / this.scaleInDuration;
      } else {
        this.scale = 1;
      }

      this.vel.add(this.acc);
      this.vel.limit(CFG.MAX_SPEED);
      this.pos.add(this.vel);
      this.acc.mult(0);
      this.lifespan -= this.decay;

      // Si el flowfield está activo, wrap suave en los bordes para flujo continuo
      if (CFG.FLOWFIELD_ENABLED) {
        if (this.pos.x < -20) this.pos.x = windowWidth + 10;
        else if (this.pos.x > windowWidth + 20) this.pos.x = -10;
        if (this.pos.y < -20) this.pos.y = windowHeight + 10;
        else if (this.pos.y > windowHeight + 20) this.pos.y = -10;
      }
    }

    display() {
      if (this.scale <= 0.01) return;
      this.baseColor.setAlpha(this.lifespan);
      fill(this.baseColor); 
      textSize(this.baseSize * this.scale);
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
      this.holdTime = 80; // frames manteniéndose formadas
      this.decay = 2.2;
      this.maxSpeed = Math.max(8, CFG.MAX_SPEED * 2.0);
      this.maxForce = Math.max(0.6, CFG.MAX_FORCE * 1.5);
      this.noiseSeed = random(1000);

      // Las letras que forman palabras SIEMPRE eligen el tamaño MÁXIMO
      const minSize = (CFG.TEXT_SIZE_MIN !== undefined) ? Number(CFG.TEXT_SIZE_MIN) : 16;
      const maxSize = (CFG.TEXT_SIZE_MAX !== undefined) ? Number(CFG.TEXT_SIZE_MAX) : (CFG.TEXT_SIZE || 36);
      this.baseSize = Math.max(minSize, maxSize);

      // Animación de entrada: escala de 0 a 1 durante el primer 15% de su vida total
      this.age = 0;
      const totalWordLife = 30 + this.holdTime + (255 / this.decay);
      this.scaleInDuration = Math.max(1, totalWordLife * 0.15);
      this.scale = 0;

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
      // Las letras de las palabras no se repelen entre sí para formarse con total precisión sin rebotar
    }

    update() {
      // Progresión de escala (0 -> 1 durante el primer 15% de vida)
      this.age++;
      if (this.age < this.scaleInDuration) {
        this.scale = this.age / this.scaleInDuration;
      } else {
        this.scale = 1;
      }

      // Atractor (Arrive hacia la posición asignada de la letra)
      const desired = p5.Vector.sub(this.target, this.pos);
      const d = desired.mag();

      const slowRadius = 60;
      if (d < slowRadius) {
        // Frenado progresivo al acercarse (easing suave)
        const speed = map(d, 0, slowRadius, 0, this.maxSpeed);
        desired.setMag(speed);
      } else {
        desired.setMag(this.maxSpeed);
      }

      const steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce);
      this.acc.add(steer);

      this.vel.add(this.acc);

      // Amortiguación progresiva al acercarse para asentar la letra sin sobrepasos ni rebotes
      if (d < 18) {
        this.vel.mult(0.85);
      }
      if (d < 3) {
        this.vel.mult(0.35);
      }

      this.pos.add(this.vel);
      this.acc.mult(0);

      // Una vez que llega y se forma la palabra
      if (d < 5) {
        if (this.holdTime > 0) {
          this.holdTime--;
        } else {
          this.lifespan -= this.decay;
          // Al terminar el tiempo de retención, las letras se dispersan suavemente
          this.vel.add(p5.Vector.random2D().mult(0.3));
        }
      } else {
        // En camino decae muy lentamente para dar tiempo a que se forme
        this.lifespan -= 0.15;
      }
    }

    display() {
      if (this.scale <= 0.01) return;
      this.baseColor.setAlpha(this.lifespan);
      fill(this.baseColor);
      textSize(this.baseSize * this.scale);

      // Ondulación sutil visual mientras la palabra está formada para darle dinamismo sin desarmar la palabra
      const d = p5.Vector.dist(this.pos, this.target);
      const floatY = (d < 5 && this.holdTime > 0) ? sin(frameCount * 0.08 + this.noiseSeed) * 1.5 : 0;
      text(this.char, this.pos.x, this.pos.y + floatY);
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
