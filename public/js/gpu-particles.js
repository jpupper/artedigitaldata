// GPU Particle Engine con Three.js + GPGPU (WebGL2 Shaders Fix)
// Arte Digital Data

(function(window) {
  // Definición integrada de GPUComputationRenderer
  function EmbeddedGPUComputationRenderer( pxReqWidth, pxReqHeight, renderer ) {
    this.variables = [];
    this.currentTextureIndex = 0;

    var scene = new THREE.Scene();
    var camera = new THREE.Camera();
    camera.position.z = 1;

    var passThruUniforms = {
      passThruTexture: { value: null }
    };

    var passThruShader = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL1,
      uniforms: passThruUniforms,
      vertexShader: "void main() {\n\tgl_Position = vec4( position, 1.0 );\n}\n",
      fragmentShader: "uniform sampler2D passThruTexture;\nvoid main() {\n\tvec2 uv = gl_FragCoord.xy / resolution.xy;\n\tgl_FragColor = texture2D( passThruTexture, uv );\n}\n"
    });

    var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), passThruShader );
    scene.add( mesh );

    this.addVariable = function ( variableName, computeShader, initialTexture ) {
      var material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL1,
        uniforms: {
          resolution: { value: new THREE.Vector2( pxReqWidth, pxReqHeight ) }
        },
        vertexShader: "void main() {\n\tgl_Position = vec4( position, 1.0 );\n}\n",
        fragmentShader: computeShader
      });

      var variable = {
        name: variableName,
        initialTexture: initialTexture,
        material: material,
        renderTargets: [],
        wrapS: null,
        wrapT: null,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter
      };

      this.variables.push( variable );
      return variable;
    };

    this.setVariableDependencies = function ( variable, dependencies ) {
      variable.dependencies = dependencies;
    };

    this.init = function () {
      if ( ! renderer.capabilities.isWebGL2 && ! renderer.extensions.get( "OES_texture_float" ) ) {
        return "No OES_texture_float support";
      }

      for ( var i = 0; i < this.variables.length; i ++ ) {
        var variable = this.variables[ i ];
        variable.renderTargets[ 0 ] = this.createRenderTarget( pxReqWidth, pxReqHeight, variable.wrapS, variable.wrapT, variable.minFilter, variable.magFilter );
        variable.renderTargets[ 1 ] = this.createRenderTarget( pxReqWidth, pxReqHeight, variable.wrapS, variable.wrapT, variable.minFilter, variable.magFilter );

        this.renderTexture( variable.initialTexture, variable.renderTargets[ 0 ] );
        this.renderTexture( variable.initialTexture, variable.renderTargets[ 1 ] );

        var uniforms = variable.material.uniforms;
        if ( variable.dependencies !== null ) {
          for ( var d = 0; d < variable.dependencies.length; d ++ ) {
            var dep = variable.dependencies[ d ];
            if ( dep.name in uniforms ) {
              console.warn( 'Variable name collision: ' + dep.name );
            }
            uniforms[ dep.name ] = { value: null };
          }
        }
      }

      this.currentTextureIndex = 0;
      return null;
    };

    this.compute = function () {
      var currentTextureIndex = this.currentTextureIndex;
      var nextTextureIndex = this.currentTextureIndex === 0 ? 1 : 0;

      for ( var i = 0; i < this.variables.length; i ++ ) {
        var variable = this.variables[ i ];

        if ( variable.dependencies !== null ) {
          var uniforms = variable.material.uniforms;
          for ( var d = 0; d < variable.dependencies.length; d ++ ) {
            var dep = variable.dependencies[ d ];
            uniforms[ dep.name ].value = dep.renderTargets[ currentTextureIndex ].texture;
          }
        }

        this.doRenderTarget( variable.material, variable.renderTargets[ nextTextureIndex ] );
      }

      this.currentTextureIndex = nextTextureIndex;
    };

    this.getCurrentRenderTarget = function ( variable ) {
      return variable.renderTargets[ this.currentTextureIndex ];
    };

    this.getAlternateRenderTarget = function ( variable ) {
      return variable.renderTargets[ this.currentTextureIndex === 0 ? 1 : 0 ];
    };

    this.createRenderTarget = function ( sizeX, sizeY, wrapS, wrapT, minFilter, magFilter ) {
      sizeX = sizeX || pxReqWidth;
      sizeY = sizeY || pxReqHeight;
      wrapS = wrapS || THREE.ClampToEdgeWrapping;
      wrapT = wrapT || THREE.ClampToEdgeWrapping;
      minFilter = minFilter || THREE.NearestFilter;
      magFilter = magFilter || THREE.NearestFilter;

      var renderTarget = new THREE.WebGLRenderTarget( sizeX, sizeY, {
        wrapS: wrapS,
        wrapT: wrapT,
        minFilter: minFilter,
        magFilter: magFilter,
        format: THREE.RGBAFormat,
        type: ( /(iPad|iPhone|iPod)/g.test( navigator.userAgent ) ) ? THREE.HalfFloatType : THREE.FloatType,
        depthBuffer: false
      } );

      return renderTarget;
    };

    this.createTexture = function () {
      var data = new Float32Array( pxReqWidth * pxReqHeight * 4 );
      var texture = new THREE.DataTexture( data, pxReqWidth, pxReqHeight, THREE.RGBAFormat, THREE.FloatType );
      texture.needsUpdate = true;
      return texture;
    };

    this.renderTexture = function ( input, output ) {
      passThruUniforms.passThruTexture.value = input;
      this.doRenderTarget( passThruShader, output );
      passThruUniforms.passThruTexture.value = null;
    };

    this.doRenderTarget = function ( material, output ) {
      var currentRenderTarget = renderer.getRenderTarget();
      mesh.material = material;
      renderer.setRenderTarget( output );
      renderer.render( scene, camera );
      mesh.material = passThruShader;
      renderer.setRenderTarget( currentRenderTarget );
    };
  }

  let scene, camera, renderer;
  let gpuCompute, positionVariable, velocityVariable;
  let positionUniforms, velocityUniforms;
  let targetTexture = null;
  let attractorTimer = null;
  let particlesMesh;
  let charAtlasTexture;
  let particleCount = 20000;
  let textureWidth = 142;

  let mouse = new THREE.Vector2(-9999, -9999);

  const DEFAULT_WORDS = [
    "GPU", "SHADERS", "THREEJS", "GPGPU", "PARALLEL", "COMPUTE", "INSTANCING",
    "CYBER", "NEON", "MATRIX", "VECTOR", "CANVAS", "GLSL", "WEBGL", "LATAM"
  ];

  const config = {
    PARTICLE_COUNT: 20000,
    MAX_SPEED: 8.0,
    FRICTION: 0.96,
    MOUSE_FORCE: 2.5,
    MOUSE_RADIUS: 120.0,
    FLOWFIELD_ENABLED: true,
    FLOWFIELD_FORCE: 0.8,
    FLOWFIELD_SCALE: 0.005,
    ATTRACTOR_FORCE: 2.0,
    FONT_SIZE: 22,
    COLOR_1: '#00f2fe',
    COLOR_2: '#ff9100',
    COLOR_3: '#e040fb',
    COLOR_4: '#00e676'
  };

  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&*+-/;:,. ";

  // Generar textura Atlas de la tipografía
  function createCharAtlas() {
    const canvas = document.createElement('canvas');
    const cols = 8;
    const rows = 8;
    const charSize = 64;
    canvas.width = cols * charSize;
    canvas.height = rows * charSize;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '900 44px "Outfit", "JetBrains Mono", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    for (let i = 0; i < CHARS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * charSize + charSize / 2;
      const y = row * charSize + charSize / 2;
      ctx.fillText(CHARS[i], x, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  // --- Shaders GLSL Corregidos (GLSL1 Compatible) ---
  const positionShader = `
    uniform float u_time;
    uniform float u_delta;
    uniform sampler2D texturePosition;
    uniform sampler2D textureVelocity;

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 pos = texture2D( texturePosition, uv );
      vec4 vel = texture2D( textureVelocity, uv );

      pos.xyz += vel.xyz * u_delta;

      gl_FragColor = vec4( pos.xyz, 1.0 );
    }
  `;

  const velocityShader = `
    uniform float u_time;
    uniform float u_delta;
    uniform vec2 u_mouse;
    uniform float u_mouseForce;
    uniform float u_mouseRadius;
    uniform float u_flowfieldEnabled;
    uniform float u_flowfieldForce;
    uniform float u_flowfieldScale;
    uniform float u_friction;
    uniform float u_maxSpeed;
    uniform sampler2D u_targetTexture;
    uniform float u_attractorActive;

    uniform sampler2D texturePosition;
    uniform sampler2D textureVelocity;

    vec2 getFlow(vec2 p, float scale, float time) {
      float angle = sin(p.x * scale * 10.0 + time * 0.5) * 3.14159265 + 
                    cos(p.y * scale * 10.0 + time * 0.3) * 3.14159265;
      return vec2(cos(angle), sin(angle));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec3 pos = texture2D( texturePosition, uv ).xyz;
      vec3 vel = texture2D( textureVelocity, uv ).xyz;

      vec3 acc = vec3(0.0);

      // Repulsión de mouse
      vec2 dMouse = pos.xy - u_mouse;
      float distMouse = length(dMouse);
      if (distMouse < u_mouseRadius && distMouse > 0.001) {
        vec2 forceDir = normalize(dMouse);
        float forceStr = (1.0 - distMouse / u_mouseRadius) * u_mouseForce * 80.0;
        acc.xy += forceDir * forceStr;
      }

      // Flowfield
      if (u_flowfieldEnabled > 0.5) {
        vec2 flowVector = getFlow(pos.xy, u_flowfieldScale, u_time) * u_flowfieldForce * 15.0;
        acc.xy += flowVector;
      }

      // Atractor de palabra
      if (u_attractorActive > 0.01) {
        vec3 targetPos = texture2D(u_targetTexture, uv).xyz;
        vec3 dTarget = targetPos - pos;
        float distTarget = length(dTarget);
        if (distTarget > 1.0) {
          vec3 steer = normalize(dTarget) * min(distTarget * 5.0, u_maxSpeed * 15.0) - vel;
          acc += steer * u_attractorActive * 0.35;
        }
      }

      // Soft boundary rebound
      float boundX = resolution.x * 0.55;
      float boundY = resolution.y * 0.55;
      if (pos.x > boundX) acc.x -= 200.0;
      if (pos.x < -boundX) acc.x += 200.0;
      if (pos.y > boundY) acc.y -= 200.0;
      if (pos.y < -boundY) acc.y += 200.0;

      vel += acc * u_delta;
      vel *= u_friction;

      float speed = length(vel);
      if (speed > u_maxSpeed * 20.0) {
        vel = normalize(vel) * u_maxSpeed * 20.0;
      }

      gl_FragColor = vec4( vel, 1.0 );
    }
  `;

  const renderVertexShader = `
    attribute vec2 a_charUV;
    attribute vec4 a_color;
    attribute vec2 a_gpuUV;

    uniform sampler2D u_posTexture;
    uniform sampler2D u_velTexture;
    uniform float u_fontSize;

    varying vec2 v_charUV;
    varying vec4 v_color;

    void main() {
      v_charUV = a_charUV + uv * vec2(0.125, 0.125);
      v_color = a_color;

      vec3 pos = texture2D(u_posTexture, a_gpuUV).xyz;

      vec3 transformed = position * u_fontSize;
      transformed += pos;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `;

  const renderFragmentShader = `
    uniform sampler2D u_atlasTexture;
    varying vec2 v_charUV;
    varying vec4 v_color;

    void main() {
      vec4 texColor = texture2D(u_atlasTexture, v_charUV);
      float alpha = texColor.r;
      if (alpha < 0.05) discard;
      gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
    }
  `;

  function initEngine(totalParticles) {
    const container = document.getElementById('gpu-canvas-container');
    if (!container) return;

    container.innerHTML = '';
    particleCount = totalParticles || config.PARTICLE_COUNT;
    textureWidth = Math.ceil(Math.sqrt(particleCount));

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.OrthographicCamera(
      -window.innerWidth / 2, window.innerWidth / 2,
      window.innerHeight / 2, -window.innerHeight / 2,
      1, 1000
    );
    camera.position.z = 500;

    const GPUConstructor = (typeof THREE !== 'undefined' && THREE.GPUComputationRenderer) 
      ? THREE.GPUComputationRenderer 
      : (window.GPUComputationRenderer || EmbeddedGPUComputationRenderer);

    gpuCompute = new GPUConstructor(textureWidth, textureWidth, renderer);

    const dtPos = gpuCompute.createTexture();
    const dtVel = gpuCompute.createTexture();

    fillInitialTextures(dtPos, dtVel);

    positionVariable = gpuCompute.addVariable('texturePosition', positionShader, dtPos);
    velocityVariable = gpuCompute.addVariable('textureVelocity', velocityShader, dtVel);

    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);

    positionUniforms = positionVariable.material.uniforms;
    velocityUniforms = velocityVariable.material.uniforms;

    positionUniforms['u_time'] = { value: 0 };
    positionUniforms['u_delta'] = { value: 0.016 };

    targetTexture = gpuCompute.createTexture();

    velocityUniforms['u_time'] = { value: 0 };
    velocityUniforms['u_delta'] = { value: 0.016 };
    velocityUniforms['u_mouse'] = { value: new THREE.Vector2(-9999, -9999) };
    velocityUniforms['u_mouseForce'] = { value: config.MOUSE_FORCE };
    velocityUniforms['u_mouseRadius'] = { value: config.MOUSE_RADIUS };
    velocityUniforms['u_flowfieldEnabled'] = { value: config.FLOWFIELD_ENABLED ? 1.0 : 0.0 };
    velocityUniforms['u_flowfieldForce'] = { value: config.FLOWFIELD_FORCE };
    velocityUniforms['u_flowfieldScale'] = { value: config.FLOWFIELD_SCALE };
    velocityUniforms['u_friction'] = { value: config.FRICTION };
    velocityUniforms['u_maxSpeed'] = { value: config.MAX_SPEED };
    velocityUniforms['u_targetTexture'] = { value: targetTexture };
    velocityUniforms['u_attractorActive'] = { value: 0.0 };

    const error = gpuCompute.init();
    if (error !== null) {
      console.error('GPGPU Error:', error);
    }

    createInstancedParticlesMesh();
    setupEvents();
  }

  function fillInitialTextures(texturePos, textureVel) {
    const posArr = texturePos.image.data;
    const velArr = textureVel.image.data;

    for (let k = 0; k < posArr.length; k += 4) {
      posArr[k] = (Math.random() - 0.5) * window.innerWidth;
      posArr[k + 1] = (Math.random() - 0.5) * window.innerHeight;
      posArr[k + 2] = 0;
      posArr[k + 3] = 1;

      velArr[k] = (Math.random() - 0.5) * 30.0;
      velArr[k + 1] = (Math.random() - 0.5) * 30.0;
      velArr[k + 2] = 0;
      velArr[k + 3] = 1;
    }
  }

  function createInstancedParticlesMesh() {
    if (particlesMesh) scene.remove(particlesMesh);

    charAtlasTexture = createCharAtlas();

    const geometry = new THREE.InstancedBufferGeometry();
    const planeGeo = new THREE.PlaneBufferGeometry(1, 1);
    geometry.index = planeGeo.index;
    geometry.attributes.position = planeGeo.attributes.position;
    geometry.attributes.uv = planeGeo.attributes.uv;

    const count = textureWidth * textureWidth;
    const gpuUVs = new Float32Array(count * 2);
    const charUVs = new Float32Array(count * 2);
    const colors = new Float32Array(count * 4);

    const palette = [
      new THREE.Color(config.COLOR_1),
      new THREE.Color(config.COLOR_2),
      new THREE.Color(config.COLOR_3),
      new THREE.Color(config.COLOR_4)
    ];

    const cols = 8;
    const rows = 8;
    const tileW = 1.0 / cols;
    const tileH = 1.0 / rows;

    for (let i = 0; i < count; i++) {
      const x = ((i % textureWidth) + 0.5) / textureWidth;
      const y = (Math.floor(i / textureWidth) + 0.5) / textureWidth;
      gpuUVs[i * 2] = x;
      gpuUVs[i * 2 + 1] = y;

      const charIdx = Math.floor(Math.random() * CHARS.length);
      const col = charIdx % cols;
      const row = Math.floor(charIdx / cols);

      charUVs[i * 2] = col * tileW;
      charUVs[i * 2 + 1] = 1.0 - (row + 1) * tileH;

      const colChoice = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 4] = colChoice.r;
      colors[i * 4 + 1] = colChoice.g;
      colors[i * 4 + 2] = colChoice.b;
      colors[i * 4 + 3] = 0.95;
    }

    geometry.setAttribute('a_gpuUV', new THREE.InstancedBufferAttribute(gpuUVs, 2));
    geometry.setAttribute('a_charUV', new THREE.InstancedBufferAttribute(charUVs, 2));
    geometry.setAttribute('a_color', new THREE.InstancedBufferAttribute(colors, 4));

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL1,
      vertexShader: renderVertexShader,
      fragmentShader: renderFragmentShader,
      uniforms: {
        u_posTexture: { value: null },
        u_velTexture: { value: null },
        u_atlasTexture: { value: charAtlasTexture },
        u_fontSize: { value: config.FONT_SIZE }
      },
      transparent: true,
      depthWrite: false
    });

    particlesMesh = new THREE.Mesh(geometry, material);
    scene.add(particlesMesh);
  }

  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 60;

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    frameCount++;
    if (frameCount % 15 === 0) {
      fps = Math.round(1 / (dt || 0.016));
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = `${fps} FPS (${particleCount.toLocaleString()} Partículas GPU)`;
    }

    positionUniforms['u_time'].value = now * 0.001;
    positionUniforms['u_delta'].value = dt;
    velocityUniforms['u_time'].value = now * 0.001;
    velocityUniforms['u_delta'].value = dt;

    gpuCompute.compute();

    particlesMesh.material.uniforms.u_posTexture.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
    particlesMesh.material.uniforms.u_velTexture.value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;

    renderer.render(scene, camera);
  }

  function setupEvents() {
    window.addEventListener('resize', () => {
      camera.left = -window.innerWidth / 2;
      camera.right = window.innerWidth / 2;
      camera.top = window.innerHeight / 2;
      camera.bottom = -window.innerHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX - window.innerWidth / 2;
      mouse.y = -(e.clientY - window.innerHeight / 2);

      if (velocityUniforms) {
        velocityUniforms['u_mouse'].value.set(mouse.x, mouse.y);
      }
    });

    window.addEventListener('click', (e) => {
      if (e.target.closest('.control-panel') || e.target.closest('button') || e.target.closest('input') || e.target.closest('.top-bar')) return;
      const words = config.WORDS || DEFAULT_WORDS;
      const randomWord = words[Math.floor(Math.random() * words.length)];
      spawnWordAttractor(randomWord, mouse.x, mouse.y);
    });
  }

  function generateTextPoints(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '900 110px "Outfit", "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const validPoints = [];

    const step = text.length > 8 ? 6 : 4;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const idx = (y * canvas.width + x) * 4;
        if (imgData[idx] > 128) {
          validPoints.push({
            x: (x - canvas.width / 2) * 1.2,
            y: -(y - canvas.height / 2) * 1.2
          });
        }
      }
    }
    return validPoints;
  }

  function spawnWordAttractor(word, clickX, clickY) {
    if (!velocityUniforms || !targetTexture) return;
    const points = generateTextPoints(word);
    if (!points.length) return;

    const count = textureWidth * textureWidth;
    const data = targetTexture.image.data;

    const targetX = clickX !== undefined ? clickX : 0;
    const targetY = clickY !== undefined ? clickY : 0;

    for (let i = 0; i < count; i++) {
      const pt = points[i % points.length];
      data[i * 4] = targetX + pt.x;
      data[i * 4 + 1] = targetY + pt.y;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 1;
    }
    targetTexture.needsUpdate = true;

    if (attractorTimer) clearTimeout(attractorTimer);
    velocityUniforms['u_attractorActive'].value = 1.0;

    attractorTimer = setTimeout(() => {
      let active = 1.0;
      const fadeInterval = setInterval(() => {
        active -= 0.05;
        if (active <= 0) {
          active = 0;
          clearInterval(fadeInterval);
        }
        if (velocityUniforms) velocityUniforms['u_attractorActive'].value = active;
      }, 50);
    }, 4500);
  }

  window.GPUApp = {
    init: (count) => {
      initEngine(count);
      animate();
    },
    updateConfig: (key, val) => {
      config[key] = val;
      if (key === 'PARTICLE_COUNT') {
        initEngine(val);
      } else if (key === 'FONT_SIZE' && particlesMesh) {
        particlesMesh.material.uniforms.u_fontSize.value = val;
      } else if (velocityUniforms) {
        if (key === 'MOUSE_FORCE') velocityUniforms['u_mouseForce'].value = val;
        if (key === 'MOUSE_RADIUS') velocityUniforms['u_mouseRadius'].value = val;
        if (key === 'FLOWFIELD_ENABLED') velocityUniforms['u_flowfieldEnabled'].value = val ? 1.0 : 0.0;
        if (key === 'FLOWFIELD_FORCE') velocityUniforms['u_flowfieldForce'].value = val;
        if (key === 'FLOWFIELD_SCALE') velocityUniforms['u_flowfieldScale'].value = val;
        if (key === 'MAX_SPEED') velocityUniforms['u_maxSpeed'].value = val;
      }
    },
    spawnWord: (word, x, y) => {
      spawnWordAttractor(word, x !== undefined ? x : 0, y !== undefined ? y : 0);
    },
    getConfig: () => ({ ...config }),
    DEFAULT_WORDS
  };
})(window);
