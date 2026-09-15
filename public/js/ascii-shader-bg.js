// WebGL ASCII & Noise Background Shader Renderer
// Arte Digital Data - FBO Noise-to-ASCII Pipeline Architecture

(function(window) {
  let canvas = null;
  let gl = null;
  let animFrameId = null;
  let isRunning = false;
  let positionBuffer = null;
  let noiseFbo = null;
  let noiseFboTexture = null;

  let vsSource = `#version 300 es
in vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}`;

  let noiseFsSource = `#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_tile;
uniform float u_opacity;
uniform float u_speed;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

float fbm(vec3 p) {
    float val = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 4; i++) {
        val += amp * snoise(p);
        p *= 2.03;
        amp *= 0.5;
    }
    float norm = val * 0.5 + 0.5;
    return clamp((norm - 0.15) / 0.7, 0.0, 1.0);
}

vec3 getPaletteColor(float t) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.333) {
        return mix(u_color1, u_color2, t / 0.333);
    } else if (t < 0.666) {
        return mix(u_color2, u_color3, (t - 0.333) / 0.333);
    } else {
        return mix(u_color3, u_color4, (t - 0.666) / 0.334);
    }
}

void main() {
    vec2 pix = gl_FragCoord.xy;
    vec2 st = pix / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;

    float gray = fbm(vec3(st * (u_tile * 0.5), u_time * u_speed * 0.15));
    vec3 col = getPaletteColor(gray);
    fragColor = vec4(col * u_opacity, u_opacity);
}`;

  let asciiFsSource = `#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform sampler2D u_noiseTexture;
uniform sampler2D iChannel0;
uniform float u_charSize;
uniform float u_glyphScale;
uniform float u_opacity;

float character(int n, vec2 p) {
    p = floor(p);
    if (p.x >= 0.0 && p.x <= 4.0 && p.y >= 0.0 && p.y <= 4.0) {
        int a = int(p.x) + 5 * int(p.y);
        if (((n >> a) & 1) == 1) return 1.0;
    }
    return 0.0;
}

int getCharBitmask(float gray) {
    int chars[32];
    chars[0]  = 0;        // (espacio)
    chars[1]  = 4096;     // .
    chars[2]  = 131072;   // ,
    chars[3]  = 65600;    // :
    chars[4]  = 67648;    // ;
    chars[5]  = 32641183; // I
    chars[6]  = 4329631;  // T
    chars[7]  = 32539681; // L
    chars[8]  = 147584;   // +
    chars[9]  = 332772;   // *
    chars[10] = 31491102; // C
    chars[11] = 1096767;  // F
    chars[12] = 16267294; // S
    chars[13] = 4539953;  // V
    chars[14] = 1097255;  // P
    chars[15] = 32554047; // E
    chars[16] = 18415150; // A
    chars[17] = 7652647;  // D
    chars[18] = 18415153; // H
    chars[19] = 18128177; // K
    chars[20] = 18437745; // N
    chars[21] = 18136623; // R
    chars[22] = 15255086; // O
    chars[23] = 15255089; // U
    chars[24] = 18157905; // X
    chars[25] = 32575775; // Z
    chars[26] = 16301619; // B
    chars[27] = 32044094; // G
    chars[28] = 18142766; // Q
    chars[29] = 18405233; // M
    chars[30] = 18732593; // W
    chars[31] = 11512810; // #

    int idx = int(clamp(gray * 31.0, 0.0, 31.0));
    return chars[idx];
}

void main() {
    vec2 pix = gl_FragCoord.xy;
    float charSize = max(4.0, u_charSize);
    vec2 cellCoord = floor(pix / charSize);
    vec2 cellCenter = (cellCoord + 0.5) * charSize;
    vec2 cellUV = cellCenter / u_resolution.xy;
    
    vec4 noiseColor = texture(u_noiseTexture, cellUV);
    if (noiseColor.a <= 0.0001) {
        noiseColor = texture(iChannel0, cellUV);
    }

    float gray = dot(noiseColor.rgb, vec3(0.299, 0.587, 0.114));
    
    int n = getCharBitmask(gray);
    if (n == 0 || noiseColor.a <= 0.001) {
        fragColor = vec4(0.0);
        return;
    }

    vec2 localUV = mod(pix, charSize) / charSize;
    float scale = max(0.1, u_glyphScale);
    vec2 p = (localUV - 0.5) / scale + 0.5;
    p *= 5.0;
    p.y = 4.0 - p.y;

    float charMask = character(n, p);
    fragColor = vec4(noiseColor.rgb * charMask * u_opacity, noiseColor.a * charMask * u_opacity);
}`;

  let asciiProgramInfo = null;
  let noiseProgramInfo = null;
  let blitProgramInfo = null;

  let blitVsSource = `#version 300 es
in vec2 position;
out vec2 v_uv;
void main() {
    v_uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

  let blitFsSource = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_bufferTexture;
uniform float u_opacity;
void main() {
    vec4 col = texture(u_bufferTexture, v_uv);
    fragColor = vec4(col.rgb * u_opacity, col.a * u_opacity);
}`;

  function hexToRgb(hex) {
    if (!hex) return [0, 1, 1];
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[AsciiShaderBG] Error compilando shader:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function buildProgramInfo(vsCode, fsCode) {
    if (!gl) return null;
    const vs = createShader(gl, gl.VERTEX_SHADER, vsCode);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsCode);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[AsciiShaderBG] Error vinculando programa:', gl.getProgramInfoLog(prog));
      return null;
    }

    return {
      program: prog,
      uniforms: {
        u_resolution: gl.getUniformLocation(prog, 'u_resolution'),
        u_time: gl.getUniformLocation(prog, 'u_time'),
        u_charSize: gl.getUniformLocation(prog, 'u_charSize'),
        u_tile: gl.getUniformLocation(prog, 'u_tile'),
        u_opacity: gl.getUniformLocation(prog, 'u_opacity'),
        u_speed: gl.getUniformLocation(prog, 'u_speed'),
        u_color1: gl.getUniformLocation(prog, 'u_color1'),
        u_color2: gl.getUniformLocation(prog, 'u_color2'),
        u_color3: gl.getUniformLocation(prog, 'u_color3'),
        u_color4: gl.getUniformLocation(prog, 'u_color4'),
        u_noiseTexture: gl.getUniformLocation(prog, 'u_noiseTexture'),
        iChannel0: gl.getUniformLocation(prog, 'iChannel0'),
        u_glyphScale: gl.getUniformLocation(prog, 'u_glyphScale'),
        u_fontMode: gl.getUniformLocation(prog, 'u_fontMode')
      }
    };
  }

  function initFBO(width, height) {
    if (!gl) return;
    if (noiseFbo) gl.deleteFramebuffer(noiseFbo);
    if (noiseFboTexture) gl.deleteTexture(noiseFboTexture);

    noiseFboTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, noiseFboTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    noiseFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, noiseFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, noiseFboTexture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  let activeGenerativeShader = 'noise.frag';
  let generativeShaderCache = {};
  let customGenerativeShaders = {};
  let activeGenerativeShaderUniforms = [];

  // Cargar custom shaders guardados en localStorage
  try {
    const savedCustoms = localStorage.getItem('custom_generative_shaders');
    if (savedCustoms) {
      customGenerativeShaders = JSON.parse(savedCustoms);
      for (const name in customGenerativeShaders) {
        generativeShaderCache[name] = customGenerativeShaders[name];
      }
    }
  } catch (err) {}

  function preprocessShaderCode(code) {
    if (!code) return '';
    
    // Inyectar o reemplazar #pragma include / #include o proveer mapr
    if (code.includes('#pragma include') || code.includes('#include') || code.includes('mapr(')) {
      const maprDef = `\nfloat mapr(float value, float minOut, float maxOut) {\n    return minOut + clamp(value, 0.0, 1.0) * (maxOut - minOut);\n}\n`;
      if (!code.includes('float mapr(')) {
        code = maprDef + code;
      }
      code = code.replace(/#pragma\s+include\s+["'][^"']+["']/g, '');
      code = code.replace(/#include\s+["'][^"']+["']/g, '');
    }
    
    // Reemplazar compatibilidad iResolution e iTime
    code = code.replace(/\biResolution\b/g, 'u_resolution');
    code = code.replace(/\biTime\b/g, 'u_time');
    
    return code;
  }

  function extractGenerativeUniforms(fsCode) {
    const EXCLUDED = ['u_resolution', 'iResolution', 'u_time', 'iTime', 'u_noiseTexture', 'iChannel0', 'u_charSize', 'u_glyphScale', 'u_fontMode', 'u_opacity'];
    const uniforms = [];
    const seen = new Set();

    const lines = fsCode.split('\n');
    for (let line of lines) {
      const commentIdx = line.indexOf('//');
      if (commentIdx !== -1) line = line.substring(0, commentIdx);
      
      const match = line.match(/uniform\s+(?:highp\s+|mediump\s+|lowp\s+)?(float|int|vec2|vec3|vec4|bool)\s+([a-zA-Z0-9_]+)\s*(?:=\s*([^;]+))?\s*;/);
      if (match) {
        const type = match[1];
        const name = match[2];
        const defaultValStr = match[3] ? match[3].trim() : null;
        if (!EXCLUDED.includes(name) && !seen.has(name)) {
          seen.add(name);
          uniforms.push({
            name,
            type,
            defaultValueStr: defaultValStr
          });
        }
      }
    }
    return uniforms;
  }

  function notifyGenerativeShaderChanged() {
    if (typeof window.onGenerativeShaderChanged === 'function') {
      window.onGenerativeShaderChanged(activeGenerativeShader, activeGenerativeShaderUniforms);
    }
    window.dispatchEvent(new CustomEvent('generative-shader-changed', {
      detail: {
        shaderName: activeGenerativeShader,
        uniforms: activeGenerativeShaderUniforms
      }
    }));
  }

  async function loadGenerativeShader(shaderName) {
    if (!shaderName) shaderName = 'noise.frag';

    let code = generativeShaderCache[shaderName] || customGenerativeShaders[shaderName];

    if (!code) {
      const currentPath = window.location.pathname;
      const folderPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      const candidatePaths = [
        folderPath + 'shaders/generative/',
        'shaders/generative/',
        './shaders/generative/',
        '../shaders/generative/',
        '/artedigitaldata/shaders/generative/',
        (window.CONFIG && window.CONFIG.BASE ? window.CONFIG.BASE + '/shaders/generative/' : '/shaders/generative/')
      ];

      for (const basePath of candidatePaths) {
        try {
          const res = await fetch(basePath + shaderName + '?t=' + Date.now());
          if (res.ok) {
            code = await res.text();
            break;
          }
        } catch (err) {}
      }
    }

    if (code) {
      const processedCode = preprocessShaderCode(code);
      const newNoise = buildProgramInfo(vsSource, processedCode);
      if (newNoise) {
        noiseFsSource = processedCode;
        noiseProgramInfo = newNoise;
        activeGenerativeShader = shaderName;
        generativeShaderCache[shaderName] = processedCode;
        activeGenerativeShaderUniforms = extractGenerativeUniforms(processedCode);
        console.log('[AsciiShaderBG] Shader generativo cargado:', shaderName, 'Uniforms:', activeGenerativeShaderUniforms);
        notifyGenerativeShaderChanged();
        return true;
      }
    }
    return false;
  }

  function registerCustomShader(shaderName, shaderCode) {
    if (!shaderName) shaderName = 'custom_' + Date.now() + '.frag';
    if (!shaderName.endsWith('.frag')) shaderName += '.frag';

    const processed = preprocessShaderCode(shaderCode);
    customGenerativeShaders[shaderName] = processed;
    generativeShaderCache[shaderName] = processed;

    try {
      localStorage.setItem('custom_generative_shaders', JSON.stringify(customGenerativeShaders));
    } catch(err){}

    return loadGenerativeShader(shaderName);
  }

  async function loadExternalShaders() {
    const currentPath = window.location.pathname;
    const folderPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

    const candidatePaths = [
      folderPath + 'shaders/',
      'shaders/',
      './shaders/',
      '../shaders/',
      '/artedigitaldata/shaders/',
      (window.CONFIG && window.CONFIG.BASE ? window.CONFIG.BASE + '/shaders/' : '/shaders/')
    ];

    const genShaderToLoad = activeGenerativeShader || 'noise.frag';

    for (const basePath of candidatePaths) {
      try {
        const [vsRes, noiseRes, asciiRes] = await Promise.all([
          fetch(basePath + 'common.vert'),
          fetch(basePath + 'generative/' + genShaderToLoad).catch(() => fetch(basePath + 'noise.frag')),
          fetch(basePath + 'ascii.frag')
        ]);

        if (vsRes.ok && noiseRes.ok && asciiRes.ok) {
          vsSource = await vsRes.text();
          noiseFsSource = await noiseRes.text();
          asciiFsSource = await asciiRes.text();

          const newAscii = buildProgramInfo(vsSource, asciiFsSource);
          const newNoise = buildProgramInfo(vsSource, noiseFsSource);
          if (newAscii && newNoise) {
            asciiProgramInfo = newAscii;
            noiseProgramInfo = newNoise;
            generativeShaderCache[genShaderToLoad] = noiseFsSource;
            activeGenerativeShader = genShaderToLoad;
            activeGenerativeShaderUniforms = extractGenerativeUniforms(noiseFsSource);
            console.log('[AsciiShaderBG] Shaders externos cargados exitosamente desde:', basePath, 'Uniforms:', activeGenerativeShaderUniforms);
            notifyGenerativeShaderChanged();
            return;
          }
        }
      } catch (err) {}
    }
  }

  function initWebGL() {
    canvas = document.getElementById('ascii-bg-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'ascii-bg-canvas';
      document.body.prepend(canvas);
    }
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.touchAction = 'pan-y';

    gl = canvas.getContext('webgl2', { alpha: true, antialias: false, preserveDrawingBuffer: false });
    if (!gl) {
      console.warn('[AsciiShaderBG] WebGL2 no soportado.');
      return false;
    }

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]), gl.STATIC_DRAW);

    asciiProgramInfo = buildProgramInfo(vsSource, asciiFsSource);
    noiseProgramInfo = buildProgramInfo(vsSource, noiseFsSource);
    blitProgramInfo = buildProgramInfo(blitVsSource, blitFsSource);

    activeGenerativeShader = 'noise.frag';
    activeGenerativeShaderUniforms = extractGenerativeUniforms(noiseFsSource);
    notifyGenerativeShaderChanged();

    loadExternalShaders();

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return true;
  }

  function resizeCanvas() {
    if (!canvas || !gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    initFBO(canvas.width, canvas.height);
  }

  let startTime = performance.now();

  function render() {
    if (!isRunning || !gl) return;

    const cfg = (window.ParticlesConfig && window.ParticlesConfig.get) ? window.ParticlesConfig.get() : {};
    const opacity = cfg.ASCII_OPACITY !== undefined ? Number(cfg.ASCII_OPACITY) : 0.35;

    if (cfg.ASCII_ENABLED === false || opacity <= 0.0001) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      animFrameId = requestAnimationFrame(render);
      return;
    }

    if (!noiseProgramInfo || !noiseProgramInfo.program || !asciiProgramInfo || !asciiProgramInfo.program) {
      animFrameId = requestAnimationFrame(render);
      return;
    }

    const targetShader = cfg.GENERATIVE_SHADER || 'noise.frag';
    if (targetShader !== activeGenerativeShader) {
      loadGenerativeShader(targetShader);
    }

    const elapsed = (performance.now() - startTime) / 1000.0;

    // --- PASO 1: Renderizar shader generativo dentro del FBO (Textura de Entrada) ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, noiseFbo);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(noiseProgramInfo.program);

    let posLoc = gl.getAttribLocation(noiseProgramInfo.program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const speed = cfg.ASCII_SPEED !== undefined ? Number(cfg.ASCII_SPEED) : 1.0;
    const tile = cfg.ASCII_TILE !== undefined ? Number(cfg.ASCII_TILE) : 3.0;
    const charSize = cfg.ASCII_CHAR_SIZE !== undefined ? Number(cfg.ASCII_CHAR_SIZE) : 14;
    const glyphScale = cfg.ASCII_GLYPH_SCALE !== undefined ? Number(cfg.ASCII_GLYPH_SCALE) : 0.85;

    // Uniforms globales estándar
    const resLoc = gl.getUniformLocation(noiseProgramInfo.program, 'u_resolution');
    if (resLoc) gl.uniform2f(resLoc, canvas.width, canvas.height);
    const timeLoc = gl.getUniformLocation(noiseProgramInfo.program, 'u_time');
    if (timeLoc) gl.uniform1f(timeLoc, elapsed);

    // Uniform opacidad (si existe en el shader)
    const opLoc = gl.getUniformLocation(noiseProgramInfo.program, 'u_opacity');
    if (opLoc) gl.uniform1f(opLoc, 1.0);

    // Bucle de binding dinámico para todos los uniforms del shader activo
    if (Array.isArray(activeGenerativeShaderUniforms)) {
      activeGenerativeShaderUniforms.forEach(u => {
        const loc = gl.getUniformLocation(noiseProgramInfo.program, u.name);
        if (!loc) return;

        let val = cfg[u.name];
        if (val === undefined && window.ParticlesConfig && window.ParticlesConfig.get) {
          val = window.ParticlesConfig.get()[u.name];
        }

        if (val === undefined) {
          if (u.name === 'zoom') val = 0.8;
          else if (u.name === 'tile') val = (activeGenerativeShader === 'starnest.frag' ? 0.85 : (cfg.ASCII_TILE !== undefined ? cfg.ASCII_TILE : 3.0));
          else if (u.name === 'u_tile') val = cfg.ASCII_TILE !== undefined ? cfg.ASCII_TILE : 3.0;
          else if (u.name === 'speed' || u.name === 'u_speed') val = cfg.ASCII_SPEED !== undefined ? cfg.ASCII_SPEED : 1.0;
          else if (u.name === 'speedx' || u.name === 'speedy') val = 0.5;
          else if (u.name === 'iterations') val = 0.5;
          else if (u.name === 'volsteps') val = 0.6;
          else if (u.name === 'formuparam') val = 0.53;
          else if (u.name === 'stepsize') val = 0.1;
          else if (u.name === 'brightness') val = 0.5;
          else if (u.name === 'darkmatter') val = 0.3;
          else if (u.name === 'distfading') val = 0.73;
          else if (u.name === 'saturation') val = 0.85;
          else if (u.name === 'ma1') val = 0.5;
          else if (u.name === 'ma2') val = 0.8;
          else if (u.name === 'u_color1') val = cfg.COLOR_1 || '#40c4ff';
          else if (u.name === 'u_color2') val = cfg.COLOR_2 || '#ff9100';
          else if (u.name === 'u_color3') val = cfg.COLOR_3 || '#e040fb';
          else if (u.name === 'u_color4') val = cfg.COLOR_4 || '#00e676';
          else val = u.defaultValueStr ? Number(u.defaultValueStr) || 0.5 : 0.5;
        }

        if (u.type === 'float') {
          gl.uniform1f(loc, Number(val));
        } else if (u.type === 'int') {
          gl.uniform1i(loc, Math.round(Number(val)));
        } else if (u.type === 'bool') {
          gl.uniform1i(loc, val ? 1 : 0);
        } else if (u.type === 'vec3') {
          if (typeof val === 'string') {
            const rgb = hexToRgb(val);
            gl.uniform3f(loc, rgb[0], rgb[1], rgb[2]);
          } else if (Array.isArray(val)) {
            gl.uniform3f(loc, val[0] || 0, val[1] || 0, val[2] || 0);
          } else {
            gl.uniform3f(loc, 0.5, 0.5, 0.5);
          }
        } else if (u.type === 'vec2') {
          if (Array.isArray(val)) gl.uniform2f(loc, val[0] || 0, val[1] || 0);
          else gl.uniform2f(loc, Number(val) || 0, Number(val) || 0);
        } else if (u.type === 'vec4') {
          if (Array.isArray(val)) gl.uniform4f(loc, val[0] || 0, val[1] || 0, val[2] || 0, val[3] || 0);
          else gl.uniform4f(loc, 0, 0, 0, 1);
        }
      });
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- PASO 2: Renderizar a Pantalla ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (cfg.ASCII_NOISE_ONLY) {
      // Dibujar directamente la textura generada en FBO usando blitProgramInfo
      if (blitProgramInfo && blitProgramInfo.program) {
        gl.useProgram(blitProgramInfo.program);

        posLoc = gl.getAttribLocation(blitProgramInfo.program, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, noiseFboTexture);
        const uTex = gl.getUniformLocation(blitProgramInfo.program, 'u_bufferTexture');
        if (uTex) gl.uniform1i(uTex, 0);
        const uOp = gl.getUniformLocation(blitProgramInfo.program, 'u_opacity');
        if (uOp) gl.uniform1f(uOp, opacity);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    } else {
      // ascii.frag recibe el FBO (noiseFboTexture) como la entrada sampler2D (u_noiseTexture)
      gl.useProgram(asciiProgramInfo.program);

      posLoc = gl.getAttribLocation(asciiProgramInfo.program, 'position');
      gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const uAscii = asciiProgramInfo.uniforms;
      gl.uniform2f(uAscii.u_resolution, canvas.width, canvas.height);
      if (uAscii.u_charSize) {
        gl.uniform1f(uAscii.u_charSize, (isNaN(charSize) ? 14 : charSize) * (window.devicePixelRatio || 1));
      }
      if (uAscii.u_glyphScale) {
        gl.uniform1f(uAscii.u_glyphScale, isNaN(glyphScale) ? 0.85 : glyphScale);
      }
      const fontMode = cfg.ASCII_FONT_MODE !== undefined ? Number(cfg.ASCII_FONT_MODE) : 0;
      if (uAscii.u_fontMode) {
        gl.uniform1i(uAscii.u_fontMode, isNaN(fontMode) ? 0 : fontMode);
      }
      gl.uniform1f(uAscii.u_opacity, opacity);

      // Vincular textura del FBO
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, noiseFboTexture);
      if (uAscii.u_noiseTexture) gl.uniform1i(uAscii.u_noiseTexture, 0);
      if (uAscii.iChannel0) gl.uniform1i(uAscii.iChannel0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    animFrameId = requestAnimationFrame(render);
  }

  function start() {
    if (isRunning) return;
    if (!gl) {
      if (!initWebGL()) return;
    }
    isRunning = true;
    if (canvas) canvas.style.display = 'block';
    render();
  }

  function stop() {
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (canvas) canvas.style.display = 'none';
  }

  async function reloadShaders(showNotice = true) {
    console.log('%c[AsciiShaderBG] ⚡ RECARGANDO SHADERS DESDE DISCO...', 'background: #29b6f6; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
    const timestamp = Date.now();
    const currentPath = window.location.pathname;
    const folderPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

    const candidatePaths = [
      folderPath + 'shaders/',
      'shaders/',
      './shaders/',
      '../shaders/',
      '/artedigitaldata/shaders/',
      (window.CONFIG && window.CONFIG.BASE ? window.CONFIG.BASE + '/shaders/' : '/shaders/')
    ];

    for (const basePath of candidatePaths) {
      try {
        const [vsRes, noiseRes, asciiRes] = await Promise.all([
          fetch(basePath + 'common.vert?t=' + timestamp),
          fetch(basePath + 'noise.frag?t=' + timestamp),
          fetch(basePath + 'ascii.frag?t=' + timestamp)
        ]);

        if (vsRes.ok && noiseRes.ok && asciiRes.ok) {
          const newVs = await vsRes.text();
          const newNoiseFs = await noiseRes.text();
          const newAsciiFs = await asciiRes.text();

          const newAscii = buildProgramInfo(newVs, newAsciiFs);
          const newNoise = buildProgramInfo(newVs, newNoiseFs);
          if (newAscii && newNoise) {
            vsSource = newVs;
            noiseFsSource = newNoiseFs;
            asciiFsSource = newAsciiFs;
            asciiProgramInfo = newAscii;
            noiseProgramInfo = newNoise;
            console.log('%c[AsciiShaderBG] ¡SHADERS RECARGADOS EXITOSAMENTE DESDE: ' + basePath + '!', 'background: #00e676; color: #050b14; font-weight: bold; padding: 6px 10px; border-radius: 4px;');
            activeGenerativeShaderUniforms = extractGenerativeUniforms(noiseFsSource);
            notifyGenerativeShaderChanged();
            if (showNotice && typeof window.showToast === 'function') {
              window.showToast('<i class="fas fa-bolt" style="color:var(--accent-cyan);"></i> Shaders recargados en vivo ⚡', 'success');
            }
            return true;
          }
        }
      } catch (err) {
        console.error('[AsciiShaderBG] Error recargando shaders desde ' + basePath + ':', err);
      }
    }
    console.error('[AsciiShaderBG] ❌ No se pudieron encontrar ni recompilar los shaders desde ninguna ruta.');
    if (showNotice && typeof window.showToast === 'function') {
      window.showToast('<i class="fas fa-exclamation-triangle"></i> Error al recargar shaders', 'error');
    }
    return false;
  }

  window.AsciiShaderBG = {
    start,
    stop,
    init: initWebGL,
    reloadShaders,
    loadGenerativeShader,
    registerCustomShader,
    getActiveGenerativeShader: () => activeGenerativeShader,
    getActiveUniforms: () => activeGenerativeShaderUniforms,
    getCustomShaders: () => customGenerativeShaders,
    setVisible: (visible) => {
      if (visible) start();
      else stop();
    }
  };

  // Listener global para la tecla R/r sin bloquear por sliders de la UI
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
      const active = document.activeElement;
      const isTextInput = active && (
        (active.tagName === 'INPUT' && ['text', 'search', 'password', 'email', 'url'].includes((active.type || 'text').toLowerCase())) ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      );
      if (!isTextInput) {
        e.preventDefault();
        reloadShaders(true);
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    start();
  });
})(window);
