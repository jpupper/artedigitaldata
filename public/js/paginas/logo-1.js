function initLogoAuraShader() {
      const canvas = document.getElementById('logo-aura-canvas');
      if (!canvas) return;
      const gl = canvas.getContext('webgl', { alpha: true, antialias: true }) || canvas.getContext('experimental-webgl', { alpha: true });
      if (!gl) return;

      const vertShaderSrc = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      const fragShaderSrc = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
          float r = length(uv);
          float angle = atan(uv.y, uv.x);

          float baseRadius = 0.355;

          float t = u_time * 0.85;
          vec2 noiseCoord1 = vec2(cos(angle) * 2.2 + t * 0.35, sin(angle) * 2.2 - t * 0.3);
          vec2 noiseCoord2 = vec2(cos(angle) * 4.4 - t * 0.5, sin(angle) * 4.4 + t * 0.45);
          float n1 = snoise(noiseCoord1);
          float n2 = snoise(noiseCoord2) * 0.5;
          float totalNoise = (n1 + n2) * 0.045;

          float displacedRadius = baseRadius + totalNoise;

          float dist = abs(r - displacedRadius);
          float line = smoothstep(0.011, 0.001, dist);
          float glow = smoothstep(0.065, 0.005, dist) * 0.55;
          float aura = line + glow;

          float innerMask = smoothstep(baseRadius - 0.06, baseRadius - 0.02, r);
          aura *= innerMask;

          vec3 cyan = vec3(0.0, 0.95, 1.0);
          vec3 magenta = vec3(0.92, 0.22, 0.98);
          vec3 violet = vec3(0.45, 0.15, 0.95);

          float colorShift = sin(angle * 2.0 + u_time * 1.3) * 0.5 + 0.5;
          vec3 color = mix(cyan, magenta, colorShift);
          color = mix(color, violet, 0.28 * cos(angle * 3.0 - u_time * 0.7));

          vec3 finalColor = color * (line * 1.6 + glow * 0.9);
          float alpha = clamp(aura, 0.0, 1.0) * 0.95;

          gl_FragColor = vec4(finalColor * alpha, alpha);
        }
      `;

      function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.warn('Aura shader error:', gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      }

      const vert = createShader(gl, gl.VERTEX_SHADER, vertShaderSrc);
      const frag = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSrc);
      if (!vert || !frag) return;

      const program = gl.createProgram();
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  1, -1, -1,  1,
        -1,  1,  1, -1,  1,  1
      ]), gl.STATIC_DRAW);

      const posLoc = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const timeLoc = gl.getUniformLocation(program, 'u_time');
      const resLoc = gl.getUniformLocation(program, 'u_resolution');

      function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round((rect.width || 340) * dpr);
        canvas.height = Math.round((rect.height || 340) * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      window.addEventListener('resize', resize);
      resize();

      function render(t) {
        gl.uniform1f(timeLoc, t * 0.001);
        gl.uniform2f(resLoc, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
      }
      requestAnimationFrame(render);
    }

    document.addEventListener('DOMContentLoaded', initLogoAuraShader);
